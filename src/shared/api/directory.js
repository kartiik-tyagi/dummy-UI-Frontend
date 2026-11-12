import { logger } from '../lib/logger'
import { palettes } from '../theme/palettes'
import { marks, swatchById, swatches } from '../theme/swatches'
import { ApiError } from './errors'
import {
  accessFor,
  addDirectoryUser,
  changePassword as writePassword,
  listDirectoryUsers,
  mapService,
  osmService,
  registerTeamThemes,
  removeDirectoryUser,
  setAppointmentTeam,
  updateDirectoryUser,
} from './fixtures'

const FLAG_LIST = [
  { key: 'layerOpacity', label: 'Layer opacity', group: 'Map' },
  { key: 'featureTable', label: 'Feature table', group: 'Map' },
  { key: 'propertiesPanel', label: 'Properties', group: 'Map' },
  { key: 'drawingTools', label: 'Drawing', group: 'Map' },
  { key: 'measurementTools', label: 'Measure', group: 'Map' },
  { key: 'teamMapIcons', label: 'Team markers', group: 'Map' },
  { key: 'mapSettings', label: 'Map settings', group: 'Map' },
  { key: 'planningCanvas', label: 'Planning board', group: 'Plan' },
  { key: 'planningExport', label: 'Plan export', group: 'Plan' },
  { key: 'planningShare', label: 'Share a plan', group: 'Plan' },
  { key: 'planningReview', label: 'Plan comments', group: 'Plan' },
  { key: 'planningPromote', label: 'Promote to zone', group: 'Plan' },
  { key: 'geofenceAlerts', label: 'Geofence alerts', group: 'Exercise' },
  { key: 'alertSound', label: 'Alert tone', group: 'Exercise' },
  { key: 'alertsPanel', label: 'Alerts', group: 'Exercise' },
  { key: 'sessionReplay', label: 'Session record and replay', group: 'Exercise' },
  { key: 'scenarioPlayback', label: 'Scenario playback', group: 'Exercise' },
  { key: 'simulationExtras', label: 'Simulation speed and playback', group: 'Exercise' },
  { key: 'liveStream', label: 'Live position stream', group: 'Exercise' },
  { key: 'statusBadge', label: 'Live status', group: 'Exercise' },
  { key: 'zonesAdmin', label: 'Zones catalogue', group: 'Administration' },
  { key: 'routesAdmin', label: 'Routes catalogue', group: 'Administration' },
  { key: 'adminPanel', label: 'Users, teams, and roles', group: 'Administration' },
  { key: 'demoMode', label: 'Demo badge', group: 'Administration' },
]

const flags = Object.fromEntries(FLAG_LIST.map((item) => [item.key, true]))

const teams = [
  { id: 'blue', name: 'Blue force', swatchId: 'blue', themeId: 'field-night', icon: 'shield' },
  { id: 'red', name: 'Red force', swatchId: 'red', themeId: 'watch-night', icon: 'flag' },
]

registerTeamThemes((teamId) => teams.find((item) => item.id === teamId)?.themeId || null)

const roles = [
  { id: 'control', name: 'Exercise control' },
  { id: 'joint', name: 'Joint direction' },
  { id: 'theatre', name: 'Theatre picture' },
  { id: 'air', name: 'Air picture' },
  { id: 'maritime', name: 'Maritime picture' },
]

let features = [
  { id: 'unit-1', name: 'Blue lead', featureType: 'unit', layerId: 'units', teamId: 'blue', geometry: { type: 'Point', coordinates: [80.2, 26.4] }, properties: {} },
  { id: 'unit-2', name: 'Red contact', featureType: 'unit', layerId: 'units', teamId: 'red', geometry: { type: 'Point', coordinates: [83.1, 24.8] }, properties: {} },
  { id: 'route-1', name: 'Northern road', featureType: 'route', layerId: 'routes', teamId: 'blue', geometry: { type: 'LineString', coordinates: [[80.2, 26.4], [81.5, 25.6], [82.4, 24.9]] }, properties: { curved: false } },
  { id: 'zone-1', name: 'Holding area', featureType: 'zone', layerId: 'zones', teamId: 'blue', geometry: { type: 'Polygon', coordinates: [[[79.6, 26.8], [80.8, 26.8], [80.8, 25.9], [79.6, 25.9], [79.6, 26.8]]] }, properties: {} },
  { id: 'zone-2', name: 'Contact box', featureType: 'zone', layerId: 'zones', teamId: 'red', geometry: { type: 'Polygon', coordinates: [[[83.5, 25.2], [84.3, 25.2], [84.3, 24.4], [83.5, 24.4], [83.5, 25.2]]] }, properties: {} },
]

let graphics = [
  {
    id: 'graphic-1',
    name: 'Objective north',
    ownerId: 'apex',
    shapeType: 'rectangle',
    teamId: 'blue',
    geometry: { type: 'Polygon', coordinates: [[[81.2, 26.2], [82.0, 26.2], [82.0, 25.6], [81.2, 25.6], [81.2, 26.2]]] },
    properties: {
      strokeColor: marks.objective,
      fillColor: marks.objective,
      strokeWidth: 2,
      fillOpacity: 0.2,
      sharedWith: [],
      comments: [],
      echelonId: 'company',
      echelonBearingDeg: 0,
      layer: 'objectives',
      phase: 'plan',
    },
  },
]

const opacity = {}
let past = []
let future = []
let alertMuted = false
let recordings = []
let draftRecording = null
let capture = null
let replay = null
let announced = new Map()

const scenario = {
  name: 'Northern Approach',
  description: 'Blue lead moves toward the holding area.',
  durationSec: 60,
  t: 0,
  playing: false,
  entities: [
    {
      id: 'track-1',
      name: 'Blue lead',
      color: swatchById('blue').color,
      track: [
        { t: 0, lon: 80.2, lat: 26.4 },
        { t: 30, lon: 80.6, lat: 26.1 },
        { t: 60, lon: 81.1, lat: 25.8 },
      ],
    },
  ],
}

let simulation = { cadenceMs: 1000, mode: 'TIME', playback: false, seekSec: 0, durationSec: 7200 }
let stream = { status: 'offline', enabled: false, wsUrl: 'ws://127.0.0.1:8080/ws', topic: '/topic/jayant.positions' }
let settings = {
  source: 'wms',
  geoserverUrl: mapService,
  osmUrl: osmService,
  wmsLayer: 'ne:countries',
  defaultZoom: 5,
  homeToken: 0,
  views: { picture: null, planning: null },
}
let planView = 'mine'
let tick = 0
let subscriber = null

function clone(value) {
  return structuredClone(value)
}

function nextId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`
}

function fail(event, fields, message, code) {
  logger.warn(event, { ...fields, code })
  throw new ApiError(message, code)
}

function requireUser(userId) {
  const access = accessFor(userId)
  if (!access) fail('directory.rejected', { userId: userId || null }, 'This session is no longer valid.', 'SESSION')
  return access
}

function requireAdmin(userId) {
  const access = requireUser(userId)
  if (!access.admin) fail('directory.rejected', { userId, code: 'FORBIDDEN' }, 'This user cannot change the directory.', 'FORBIDDEN')
  return access
}

function requireFlag(key) {
  if (!flags[key]) fail('directory.rejected', { flag: key }, 'This capability is switched off.', 'SWITCHED_OFF')
}

function item(id, label, icon) {
  return { id, label, icon }
}

function navigationFor(access) {
  const map = [item('filters', 'Map filters', 'layers'), item('extent', 'Home extent', 'extent')]
  if (flags.featureTable) map.push(item('features', 'Features', 'table'))
  if (flags.propertiesPanel) map.push(item('properties', 'Properties', 'info'))
  if (flags.drawingTools || flags.measurementTools) map.push(item('draw', 'Draw and measure', 'draw'))
  if (flags.teamMapIcons) map.push(item('teams', 'Teams', 'teams'))
  if (flags.mapSettings) map.push(item('map-settings', 'Map settings', 'settings'))

  const groups = [{ id: 'map', label: 'Map', items: map }]
  if (flags.planningCanvas) groups.push({ id: 'plan', label: 'Plan', items: [item('planning', 'Planning board', 'plan')] })

  const game = [item('resources', 'Resources', 'resources'), item('plans', 'Plans', 'plans')]
  if (access.canControlGame) game.push(item('exercise-control', 'Exercise control', 'control'))
  if (flags.alertsPanel) game.push(item('alerts', 'Alerts', 'alerts'))
  if (flags.sessionReplay) game.push(item('sessions', 'Sessions', 'sessions'))
  if (flags.scenarioPlayback) game.push(item('scenario-play', 'Scenario playback', 'playback'))
  if (access.canControlGame && flags.simulationExtras) game.push(item('simulation', 'Simulation', 'simulation'))
  if (flags.liveStream) game.push(item('stream', 'Live stream', 'stream'))
  groups.push({ id: 'game', label: 'Game', items: game })

  if (access.admin) {
    const admin = []
    if (flags.zonesAdmin) admin.push(item('zones', 'Zones', 'zones'))
    if (flags.routesAdmin) admin.push(item('routes', 'Routes', 'routes'))
    if (flags.adminPanel) admin.push(item('directory', 'Users and teams', 'directory'))
    admin.push(item('flags', 'Features', 'flags'))
    if (admin.length) groups.push({ id: 'admin', label: 'Administration', items: admin })
  }
  return groups
}

function ringContains(ring, lon, lat) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    const crosses = yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi || 1e-9) + xi
    if (crosses) inside = !inside
  }
  return inside
}

function featurePoint(feature) {
  if (feature.geometry?.type !== 'Point') return null
  const [lon, lat] = feature.geometry.coordinates
  return { lon, lat }
}

function computeAlerts() {
  if (!flags.geofenceAlerts) return []
  const zones = features.filter((feature) => feature.featureType === 'zone')
  const alerts = []
  for (const unit of features.filter((feature) => feature.featureType === 'unit')) {
    const point = featurePoint(unit)
    if (!point) continue
    for (const zone of zones) {
      const ring = zone.geometry?.coordinates?.[0]
      if (!ring || !ringContains(ring, point.lon, point.lat)) continue
      const id = `${unit.id}:${zone.id}`
      alerts.push({
        id,
        name: unit.name,
        team: teams.find((team) => team.id === unit.teamId)?.name || 'Unassigned',
        zone: zone.name,
        since: announced.get(id) || Date.now(),
      })
      if (!announced.has(id)) {
        announced.set(id, Date.now())
        logger.info('alert.raised', { unitId: unit.id, zoneId: zone.id })
      }
    }
  }
  for (const key of [...announced.keys()]) {
    if (!alerts.some((alert) => alert.id === key)) announced.delete(key)
  }
  return alerts
}

function interp(track, t) {
  if (!track.length) return { lon: 0, lat: 0 }
  if (t <= track[0].t) return { lon: track[0].lon, lat: track[0].lat }
  for (let index = 0; index < track.length - 1; index += 1) {
    const left = track[index]
    const right = track[index + 1]
    if (t >= left.t && t <= right.t) {
      const ratio = (t - left.t) / (right.t - left.t || 1)
      return { lon: left.lon + (right.lon - left.lon) * ratio, lat: left.lat + (right.lat - left.lat) * ratio }
    }
  }
  const last = track[track.length - 1]
  return { lon: last.lon, lat: last.lat }
}

function positions() {
  return features
    .filter((feature) => feature.featureType === 'unit')
    .map((feature) => {
      const point = featurePoint(feature)
      return { id: feature.id, name: feature.name, teamId: feature.teamId, lon: point?.lon ?? 0, lat: point?.lat ?? 0 }
    })
}

function smooth(coordinates) {
  if (coordinates.length < 3) return coordinates
  const next = [coordinates[0]]
  for (let index = 0; index < coordinates.length - 1; index += 1) {
    const left = coordinates[index]
    const right = coordinates[index + 1]
    next.push([(left[0] * 2 + right[0]) / 3, (left[1] * 2 + right[1]) / 3], [(left[0] + right[0] * 2) / 3, (left[1] + right[1] * 2) / 3])
  }
  next.push(coordinates[coordinates.length - 1])
  return next
}

function remember() {
  past.push(clone(graphics))
  if (past.length > 30) past.shift()
  future = []
}

export function snapshot(userId) {
  const access = accessFor(userId)
  const replayFrame = replay ? recordings.find((item) => item.id === replay.id)?.frames[replay.index] : null
  return {
    navigation: access ? navigationFor(access) : [],
    opacity: { ...opacity },
    features: clone(features),
    teams: teams.map((team) => ({
      id: team.id,
      name: team.name,
      icon: team.icon,
      swatchId: team.swatchId,
      themeId: team.themeId,
      color: swatchById(team.swatchId)?.color || '',
    })),
    swatches: swatches.map((item) => ({
      id: item.id,
      name: item.name,
      color: item.color,
      takenBy: teams.find((team) => team.swatchId === item.id)?.id || null,
    })),
    themeChoices: palettes.map((item) => ({
      id: item.id,
      name: item.name,
      takenBy: teams.find((team) => team.themeId === item.id)?.id || null,
    })),
    marks: { halo: marks.halo, outline: marks.outline, objective: marks.objective, replay: marks.replay },
    roles: clone(roles),
    users: listDirectoryUsers(),
    graphics: clone(graphics),
    planView,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    alerts: computeAlerts(),
    alertMuted,
    alertSound: flags.alertSound,
    recordings: recordings.map(({ id, name, durationSec, frames }) => ({ id, name, durationSec, frameCount: frames.length })),
    draftRecording: draftRecording ? { durationSec: draftRecording.durationSec, frameCount: draftRecording.frames.length } : null,
    capture: Boolean(capture),
    replay: replay
      ? {
          id: replay.id,
          name: replay.name,
          index: replay.index,
          count: replay.count,
          playing: replay.playing,
          positions: replayFrame?.positions || [],
        }
      : null,
    scenario: {
      name: scenario.name,
      description: scenario.description,
      durationSec: scenario.durationSec,
      t: scenario.t,
      playing: scenario.playing,
      markers: scenario.entities.map((entity) => ({ id: entity.id, name: entity.name, color: entity.color, ...interp(entity.track, scenario.t) })),
    },
    simulation: { ...simulation },
    stream: { ...stream },
    flags: { ...flags },
    flagList: FLAG_LIST.map((item) => ({ ...item, enabled: flags[item.key] })),
    settings: clone(settings),
    markers: positions(),
    showTeams: flags.teamMapIcons,
  }
}

export async function loadWorkbench(userId) {
  requireUser(userId)
  logger.info('workbench.loaded', { userId })
  return snapshot(userId)
}

export function subscribeWorkbench(userId, onChange) {
  if (subscriber) clearInterval(subscriber)
  subscriber = setInterval(() => {
    try {
      onChange(advance(userId))
    } catch (error) {
      logger.error('workbench.tick_failed', { message: error?.message || 'tick failed' })
    }
  }, 500)
  return () => {
    if (subscriber) clearInterval(subscriber)
    subscriber = null
  }
}

function advance(userId) {
  tick += 1
  if (stream.status === 'live' && tick % 2 === 0) stepUnits()
  if (scenario.playing) {
    scenario.t = Math.min(scenario.durationSec, Math.round((scenario.t + 0.5) * 10) / 10)
    if (scenario.t >= scenario.durationSec) scenario.playing = false
  }
  if (capture && tick % 2 === 0) {
    capture.frames.push({ t: capture.frames.length, positions: positions() })
    capture.durationSec = capture.frames.length
  }
  if (replay?.playing && tick % 2 === 0) {
    replay.index = Math.min(replay.count - 1, replay.index + 1)
    if (replay.index >= replay.count - 1) replay.playing = false
  }
  return snapshot(userId)
}

function stepUnits() {
  for (const feature of features) {
    if (feature.featureType !== 'unit') continue
    const [lon, lat] = feature.geometry.coordinates
    feature.geometry = { type: 'Point', coordinates: [Math.round((lon + 0.04) * 1000) / 1000, lat] }
  }
}

function requireName(name, event) {
  if (!name || !String(name).trim()) fail(event, {}, 'Enter a name.', 'VALIDATION')
  return String(name).trim()
}

export function setLayerOpacity(userId, layerId, value) {
  requireUser(userId)
  requireFlag('layerOpacity')
  const opacityValue = Number(value)
  if (!layerId || Number.isNaN(opacityValue) || opacityValue < 0 || opacityValue > 1) {
    fail('layer.opacity_rejected', { userId, layerId }, 'Opacity must be between 0 and 1.', 'VALIDATION')
  }
  opacity[layerId] = opacityValue
  return snapshot(userId)
}

export function saveMapView(userId, surface, view) {
  requireUser(userId)
  requireFlag('mapSettings')
  if (surface !== 'picture' && surface !== 'planning') fail('map.view_rejected', { userId, surface }, 'Choose the picture or the planning board.', 'VALIDATION')
  if (!view || Number.isNaN(Number(view.longitude)) || Number.isNaN(Number(view.latitude)) || Number.isNaN(Number(view.zoom))) {
    fail('map.view_rejected', { userId, surface }, 'The map view is incomplete.', 'VALIDATION')
  }
  settings.views[surface] = { longitude: Number(view.longitude), latitude: Number(view.latitude), zoom: Number(view.zoom) }
  return snapshot(userId)
}

export function resetMapViews(userId) {
  requireUser(userId)
  requireFlag('mapSettings')
  settings.views = { picture: null, planning: null }
  settings.homeToken += 1
  logger.info('map.views_reset', { userId })
  return snapshot(userId)
}

export function updateBasemap(userId, patch) {
  requireUser(userId)
  requireFlag('mapSettings')
  const source = patch?.source
  if (source !== 'osm' && source !== 'wms') fail('map.basemap_rejected', { userId }, 'Choose OpenStreetMap or GeoServer.', 'VALIDATION')
  if (source === 'wms' && (!String(patch.geoserverUrl || '').trim() || !String(patch.wmsLayer || '').trim())) {
    fail('map.basemap_rejected', { userId }, 'Enter the GeoServer address and the layer name.', 'VALIDATION')
  }
  const zoom = Number(patch.defaultZoom)
  if (!Number.isFinite(zoom) || zoom < 1 || zoom > 18) {
    fail('map.basemap_rejected', { userId }, 'Default zoom must be between 1 and 18.', 'VALIDATION')
  }
  settings = {
    ...settings,
    source,
    geoserverUrl: String(patch.geoserverUrl || settings.geoserverUrl).trim(),
    wmsLayer: String(patch.wmsLayer || settings.wmsLayer).trim(),
    defaultZoom: zoom,
  }
  logger.info('map.basemap_changed', { userId, source })
  return snapshot(userId)
}

export function createFeature(userId, draft) {
  const access = requireUser(userId)
  requireFlag('drawingTools')
  const name = requireName(draft?.name, 'feature.rejected')
  const featureType = draft?.featureType
  if (!['unit', 'route', 'zone'].includes(featureType)) fail('feature.rejected', { userId }, 'Choose a unit, a route, or a zone.', 'VALIDATION')
  if (!draft?.geometry?.type) fail('feature.rejected', { userId }, 'The drawing is incomplete.', 'VALIDATION')
  if (draft.teamId && !teams.some((team) => team.id === draft.teamId)) fail('feature.rejected', { userId }, 'That team is not in the exercise.', 'NOT_FOUND')
  let geometry = clone(draft.geometry)
  if (featureType === 'route' && draft.curved && geometry.type === 'LineString') geometry = { ...geometry, coordinates: smooth(geometry.coordinates) }
  const feature = {
    id: nextId(featureType),
    name,
    featureType,
    layerId: featureType === 'unit' ? 'units' : `${featureType}s`,
    teamId: draft.teamId || '',
    geometry,
    properties: { curved: Boolean(draft.curved) },
  }
  features = [...features, feature]
  logger.info('feature.created', { userId: access.userId, featureId: feature.id, featureType })
  return snapshot(userId)
}

export function createComponent(userId, draft) {
  const access = requireUser(userId)
  const name = requireName(draft?.name, 'component.rejected')
  const kind = String(draft?.kind || '').trim()
  const service = String(draft?.service || '').trim()
  if (!kind) fail('component.rejected', { userId }, 'Choose a component.', 'VALIDATION')
  if (!['air', 'naval', 'army'].includes(service)) fail('component.rejected', { userId }, 'Choose Air, Naval, or Army.', 'VALIDATION')
  if (draft?.geometry?.type !== 'Point' || !Array.isArray(draft.geometry.coordinates)) {
    fail('component.rejected', { userId }, 'The map position is incomplete.', 'VALIDATION')
  }
  const feature = {
    id: nextId('component'),
    name,
    featureType: 'component',
    layerId: 'components',
    teamId: '',
    geometry: clone(draft.geometry),
    properties: {
      kind,
      service,
      ...(draft.properties && typeof draft.properties === 'object' ? clone(draft.properties) : {}),
    },
  }
  features = [...features, feature]
  logger.info('component.created', { userId: access.userId, featureId: feature.id, kind, service })
  return snapshot(userId)
}

export function updateFeature(userId, featureId, patch) {
  requireUser(userId)
  const feature = features.find((item) => item.id === featureId)
  if (!feature) fail('feature.rejected', { userId, featureId }, 'That feature is no longer on the picture.', 'NOT_FOUND')
  if (patch.geometry) feature.geometry = clone(patch.geometry)
  if (patch.name != null) feature.name = requireName(patch.name, 'feature.rejected')
  if (patch.teamId != null) {
    if (patch.teamId && !teams.some((team) => team.id === patch.teamId)) fail('feature.rejected', { userId }, 'That team is not in the exercise.', 'NOT_FOUND')
    feature.teamId = patch.teamId
  }
  return snapshot(userId)
}

export function extendFeature(userId, featureId, edge) {
  requireUser(userId)
  requireFlag('drawingTools')
  const feature = features.find((item) => item.id === featureId)
  if (!feature || feature.geometry?.type !== 'LineString') fail('feature.rejected', { userId, featureId }, 'Select a route before extending it.', 'VALIDATION')
  if (edge !== 'start' && edge !== 'end') fail('feature.rejected', { userId, featureId }, 'Extend the start or the end of the route.', 'VALIDATION')
  const coordinates = feature.geometry.coordinates.map((pair) => [...pair])
  const index = edge === 'start' ? 0 : coordinates.length - 1
  const [lon, lat] = coordinates[index]
  const point = [Math.round((lon + (edge === 'start' ? -0.05 : 0.05)) * 1000) / 1000, lat]
  if (edge === 'start') coordinates.unshift(point)
  else coordinates.push(point)
  feature.geometry = { type: 'LineString', coordinates }
  logger.info('feature.extended', { userId, featureId, edge })
  return snapshot(userId)
}

export function deleteFeature(userId, featureId) {
  requireUser(userId)
  if (!features.some((item) => item.id === featureId)) fail('feature.rejected', { userId, featureId }, 'That feature is no longer on the picture.', 'NOT_FOUND')
  features = features.filter((item) => item.id !== featureId)
  logger.info('feature.deleted', { userId, featureId })
  return snapshot(userId)
}

export function createGraphic(userId, draft) {
  requireUser(userId)
  requireFlag('planningCanvas')
  const name = requireName(draft?.name, 'planning.rejected')
  const shapeType = draft?.shapeType
  const allowed = ['rectangle', 'circle', 'ellipse', 'polygon', 'line', 'arrow', 'freehand', 'point', 'stamp', 'symbol']
  if (!allowed.includes(shapeType)) fail('planning.rejected', { userId }, 'Choose a planning shape.', 'VALIDATION')
  if (!draft?.geometry?.type) fail('planning.rejected', { userId }, 'The drawing is incomplete.', 'VALIDATION')
  remember()
  graphics = [
    ...graphics,
    {
      id: nextId('graphic'),
      name,
      ownerId: userId,
      shapeType,
      teamId: draft.teamId || '',
      geometry: clone(draft.geometry),
      properties: {
        strokeColor: marks.objective,
        fillColor: marks.objective,
        strokeWidth: 2,
        fillOpacity: 0.25,
        sharedWith: [],
        comments: [],
        stampId: draft.stampId || '',
        symbolId: draft.symbolId || '',
        echelonId: '',
        echelonBearingDeg: 0,
        echelonSizePct: 18,
        shapeRotationDeg: 0,
        layer: '',
        phase: '',
      },
    },
  ]
  logger.info('planning.created', { userId, shapeType })
  return snapshot(userId)
}

export function updateGraphic(userId, graphicId, patch) {
  requireUser(userId)
  const graphic = graphics.find((item) => item.id === graphicId)
  if (!graphic) fail('planning.rejected', { userId, graphicId }, 'That graphic is no longer on the board.', 'NOT_FOUND')
  if (graphic.ownerId !== userId) fail('planning.rejected', { userId, graphicId }, 'A shared graphic is read only.', 'FORBIDDEN')
  remember()
  if (patch.geometry) graphic.geometry = clone(patch.geometry)
  if (patch.name != null) graphic.name = requireName(patch.name, 'planning.rejected')
  if (patch.teamId != null) graphic.teamId = patch.teamId
  if (patch.properties) graphic.properties = { ...graphic.properties, ...patch.properties, comments: graphic.properties.comments, sharedWith: graphic.properties.sharedWith }
  return snapshot(userId)
}

export function deleteGraphic(userId, graphicId) {
  requireUser(userId)
  const graphic = graphics.find((item) => item.id === graphicId)
  if (!graphic) fail('planning.rejected', { userId, graphicId }, 'That graphic is no longer on the board.', 'NOT_FOUND')
  if (graphic.ownerId !== userId) fail('planning.rejected', { userId, graphicId }, 'A shared graphic is read only.', 'FORBIDDEN')
  remember()
  graphics = graphics.filter((item) => item.id !== graphicId)
  logger.info('planning.deleted', { userId, graphicId })
  return snapshot(userId)
}

export function undoPlanning(userId) {
  requireUser(userId)
  if (!past.length) fail('planning.rejected', { userId }, 'Nothing to undo.', 'EMPTY')
  future.push(clone(graphics))
  graphics = past.pop()
  logger.info('planning.undo', { userId })
  return snapshot(userId)
}

export function redoPlanning(userId) {
  requireUser(userId)
  if (!future.length) fail('planning.rejected', { userId }, 'Nothing to redo.', 'EMPTY')
  past.push(clone(graphics))
  graphics = future.pop()
  logger.info('planning.redo', { userId })
  return snapshot(userId)
}

export function exportPlan(userId) {
  requireUser(userId)
  requireFlag('planningExport')
  const mine = graphics.filter((graphic) => graphic.ownerId === userId || graphic.properties.sharedWith?.includes(userId))
  logger.info('planning.exported', { userId, count: mine.length })
  return {
    type: 'FeatureCollection',
    features: mine.map((graphic) => ({
      type: 'Feature',
      id: graphic.id,
      geometry: graphic.geometry,
      properties: { name: graphic.name, shapeType: graphic.shapeType, teamId: graphic.teamId },
    })),
  }
}

export function setPlanView(userId, view) {
  requireUser(userId)
  if (view !== 'mine' && view !== 'shared') fail('planning.rejected', { userId }, 'Choose your plan or a plan shared with you.', 'VALIDATION')
  requireFlag('planningShare')
  planView = view
  return snapshot(userId)
}

export function shareGraphic(userId, graphicId, userIds) {
  requireUser(userId)
  requireFlag('planningShare')
  const graphic = graphics.find((item) => item.id === graphicId)
  if (!graphic) fail('planning.rejected', { userId, graphicId }, 'That graphic is no longer on the board.', 'NOT_FOUND')
  if (graphic.ownerId !== userId) fail('planning.rejected', { userId, graphicId }, 'Only the owner can share this graphic.', 'FORBIDDEN')
  const ids = [...new Set((userIds || []).filter(Boolean))]
  const known = new Set(listDirectoryUsers().map((user) => user.id))
  const unknown = ids.find((id) => !known.has(id) || id === userId)
  if (unknown) fail('planning.rejected', { userId, graphicId }, 'Share with a known user other than yourself.', 'NOT_FOUND')
  remember()
  graphic.properties.sharedWith = ids
  logger.info('planning.shared', { userId, graphicId, count: ids.length })
  return snapshot(userId)
}

export function addComment(userId, graphicId, text) {
  requireUser(userId)
  requireFlag('planningReview')
  const graphic = graphics.find((item) => item.id === graphicId)
  if (!graphic) fail('planning.rejected', { userId, graphicId }, 'That graphic is no longer on the board.', 'NOT_FOUND')
  const body = String(text || '').trim()
  if (!body) fail('planning.rejected', { userId, graphicId }, 'Enter a comment.', 'VALIDATION')
  graphic.properties.comments = [...(graphic.properties.comments || []), { id: nextId('comment'), userId, text: body, at: new Date().toISOString() }]
  logger.info('planning.commented', { userId, graphicId })
  return snapshot(userId)
}

const AREAS = new Set(['polygon', 'rectangle', 'ellipse', 'circle', 'freehand'])

export function promoteGraphic(userId, graphicId) {
  requireUser(userId)
  requireFlag('planningPromote')
  const graphic = graphics.find((item) => item.id === graphicId)
  if (!graphic) fail('planning.rejected', { userId, graphicId }, 'That graphic is no longer on the board.', 'NOT_FOUND')
  if (graphic.ownerId !== userId) fail('planning.rejected', { userId, graphicId }, 'Only the owner can promote this graphic.', 'FORBIDDEN')
  if (!AREAS.has(graphic.shapeType) || graphic.geometry?.type !== 'Polygon') {
    fail('planning.rejected', { userId, graphicId }, 'Only an area can become a zone.', 'VALIDATION')
  }
  features = [
    ...features,
    {
      id: nextId('zone'),
      name: graphic.name,
      featureType: 'zone',
      layerId: 'zones',
      teamId: graphic.teamId,
      geometry: clone(graphic.geometry),
      properties: { promotedFrom: graphic.id },
    },
  ]
  logger.info('planning.promoted', { userId, graphicId })
  return snapshot(userId)
}

export function setAlertMuted(userId, muted) {
  requireUser(userId)
  alertMuted = Boolean(muted)
  return snapshot(userId)
}

export function startRecording(userId) {
  requireUser(userId)
  requireFlag('sessionReplay')
  if (capture) fail('session.rejected', { userId }, 'A recording is already in progress.', 'CONFLICT')
  capture = { started: Date.now(), frames: [{ t: 0, positions: positions() }], durationSec: 0 }
  logger.info('session.recording_started', { userId })
  return snapshot(userId)
}

export function stopRecording(userId) {
  requireUser(userId)
  if (!capture) fail('session.rejected', { userId }, 'There is no recording to stop.', 'EMPTY')
  draftRecording = { durationSec: Math.max(1, capture.frames.length), frames: capture.frames }
  capture = null
  return snapshot(userId)
}

export function saveRecording(userId, name) {
  requireUser(userId)
  if (!draftRecording) fail('session.rejected', { userId }, 'There is no recording to save.', 'EMPTY')
  const title = requireName(name, 'session.rejected')
  recordings = [...recordings, { id: nextId('session'), name: title, durationSec: draftRecording.durationSec, frames: draftRecording.frames }]
  draftRecording = null
  logger.info('session.saved', { userId, name: title })
  return snapshot(userId)
}

export function discardRecording(userId) {
  requireUser(userId)
  draftRecording = null
  return snapshot(userId)
}

export function deleteRecording(userId, recordingId) {
  requireUser(userId)
  if (!recordings.some((item) => item.id === recordingId)) fail('session.rejected', { userId, recordingId }, 'That session is no longer saved.', 'NOT_FOUND')
  recordings = recordings.filter((item) => item.id !== recordingId)
  if (replay?.id === recordingId) replay = null
  logger.info('session.deleted', { userId, recordingId })
  return snapshot(userId)
}

export function loadReplay(userId, recordingId) {
  requireUser(userId)
  requireFlag('sessionReplay')
  const recording = recordings.find((item) => item.id === recordingId)
  if (!recording) fail('session.rejected', { userId, recordingId }, 'That session is no longer saved.', 'NOT_FOUND')
  if (!recording.frames.length) fail('session.rejected', { userId, recordingId }, 'That session has no frames.', 'EMPTY')
  replay = { id: recording.id, name: recording.name, index: 0, count: recording.frames.length, playing: false }
  stream = { ...stream, status: 'replay' }
  return snapshot(userId)
}

export function seekReplay(userId, index) {
  requireUser(userId)
  if (!replay) fail('session.rejected', { userId }, 'Load a session before moving through it.', 'EMPTY')
  const next = Math.max(0, Math.min(replay.count - 1, Number(index) || 0))
  replay = { ...replay, index: next, playing: false }
  return snapshot(userId)
}

export function setReplayPlaying(userId, playing) {
  requireUser(userId)
  if (!replay) fail('session.rejected', { userId }, 'Load a session before playing it.', 'EMPTY')
  replay = { ...replay, playing: Boolean(playing) }
  return snapshot(userId)
}

export function stepReplay(userId, delta) {
  requireUser(userId)
  if (!replay) fail('session.rejected', { userId }, 'Load a session before stepping through it.', 'EMPTY')
  return seekReplay(userId, replay.index + Number(delta || 0))
}

export function closeReplay(userId) {
  requireUser(userId)
  replay = null
  if (stream.status === 'replay') stream = { ...stream, status: stream.enabled ? 'live' : 'offline' }
  return snapshot(userId)
}

export function seekScenario(userId, t) {
  requireUser(userId)
  requireFlag('scenarioPlayback')
  const next = Math.max(0, Math.min(scenario.durationSec, Number(t) || 0))
  scenario.t = next
  if (next >= scenario.durationSec) scenario.playing = false
  return snapshot(userId)
}

export function setScenarioPlaying(userId, playing) {
  requireUser(userId)
  requireFlag('scenarioPlayback')
  if (playing && scenario.t >= scenario.durationSec) scenario.t = 0
  scenario.playing = Boolean(playing)
  return snapshot(userId)
}

export function setSimulation(userId, patch) {
  const access = requireUser(userId)
  requireFlag('simulationExtras')
  if (!access.canControlGame) fail('simulation.rejected', { userId }, 'This user cannot change the simulation.', 'FORBIDDEN')
  const cadence = Number(patch.cadenceMs)
  if (patch.cadenceMs != null && (!Number.isFinite(cadence) || cadence < 100 || cadence > 300000)) {
    fail('simulation.rejected', { userId }, 'Choose a frame duration between 100 ms and 5 min.', 'VALIDATION')
  }
  if (patch.mode != null && patch.mode !== 'TIME' && patch.mode !== 'EVENT') {
    fail('simulation.rejected', { userId }, 'Choose time mode or event mode.', 'VALIDATION')
  }
  const seekSec = patch.seekSec == null ? simulation.seekSec : Math.max(0, Math.min(simulation.durationSec, Number(patch.seekSec) || 0))
  simulation = {
    ...simulation,
    cadenceMs: patch.cadenceMs == null ? simulation.cadenceMs : cadence,
    mode: patch.mode || simulation.mode,
    playback: patch.playback == null ? simulation.playback : Boolean(patch.playback),
    seekSec,
  }
  logger.info('simulation.changed', { userId, mode: simulation.mode, playback: simulation.playback })
  return snapshot(userId)
}

export function connectStream(userId) {
  requireUser(userId)
  requireFlag('liveStream')
  if (!stream.wsUrl.trim() || !stream.topic.trim()) fail('stream.rejected', { userId }, 'The stream address is incomplete.', 'VALIDATION')
  stream = { ...stream, enabled: true, status: 'live' }
  logger.info('stream.connected', { userId })
  return snapshot(userId)
}

export function disconnectStream(userId) {
  requireUser(userId)
  stream = { ...stream, enabled: false, status: replay ? 'replay' : 'offline' }
  logger.info('stream.disconnected', { userId })
  return snapshot(userId)
}

export function updateStream(userId, patch) {
  requireUser(userId)
  requireFlag('liveStream')
  const wsUrl = String(patch.wsUrl || '').trim()
  const topic = String(patch.topic || '').trim()
  if (!wsUrl.startsWith('ws')) fail('stream.rejected', { userId }, 'The stream address must start with ws.', 'VALIDATION')
  if (!topic.startsWith('/')) fail('stream.rejected', { userId }, 'The topic must start with /.', 'VALIDATION')
  stream = { ...stream, wsUrl, topic }
  return snapshot(userId)
}

export function saveZone(userId, draft) {
  requireAdmin(userId)
  requireFlag('zonesAdmin')
  return saveCatalogue(userId, 'zone', draft)
}

export function saveRoute(userId, draft) {
  requireAdmin(userId)
  requireFlag('routesAdmin')
  return saveCatalogue(userId, 'route', draft)
}

function saveCatalogue(userId, featureType, draft) {
  const name = requireName(draft?.name, 'catalogue.rejected')
  if (draft?.teamId && !teams.some((team) => team.id === draft.teamId)) fail('catalogue.rejected', { userId }, 'That team is not in the exercise.', 'NOT_FOUND')
  if (draft?.id) {
    const feature = features.find((item) => item.id === draft.id && item.featureType === featureType)
    if (!feature) fail('catalogue.rejected', { userId, featureId: draft.id }, 'That record is no longer in the catalogue.', 'NOT_FOUND')
    feature.name = name
    feature.teamId = draft.teamId || ''
  } else if (featureType === 'zone') {
    fail('catalogue.rejected', { userId }, 'Draw a zone on the picture before adding it here.', 'VALIDATION')
  } else {
    fail('catalogue.rejected', { userId }, 'Draw a route on the picture before adding it here.', 'VALIDATION')
  }
  logger.info('catalogue.saved', { userId, featureType, id: draft.id })
  return snapshot(userId)
}

export function deleteCatalogue(userId, featureId) {
  requireAdmin(userId)
  return deleteFeature(userId, featureId)
}

function heldBy(field, value, exceptId) {
  return teams.find((team) => team[field] === value && team.id !== exceptId) || null
}

export function saveTeam(userId, draft) {
  requireAdmin(userId)
  requireFlag('adminPanel')
  const name = requireName(draft?.name, 'team.rejected')
  const swatch = swatchById(draft?.swatchId)
  const theme = palettes.find((item) => item.id === draft?.themeId)
  if (!swatch) fail('team.rejected', { userId }, 'Choose a map colour.', 'VALIDATION')
  if (!theme) fail('team.rejected', { userId }, 'Choose a theme.', 'VALIDATION')
  const exceptId = draft.id || null
  const swatchOwner = heldBy('swatchId', swatch.id, exceptId)
  if (swatchOwner) fail('team.rejected', { userId, swatchId: swatch.id }, `${swatch.name} is already used by ${swatchOwner.name}.`, 'CONFLICT')
  const themeOwner = heldBy('themeId', theme.id, exceptId)
  if (themeOwner) fail('team.rejected', { userId, themeId: theme.id }, `${theme.name} is already used by ${themeOwner.name}.`, 'CONFLICT')
  if (draft.id) {
    const team = teams.find((item) => item.id === draft.id)
    if (!team) fail('team.rejected', { userId }, 'That team is no longer in the exercise.', 'NOT_FOUND')
    team.name = name
    team.swatchId = swatch.id
    team.themeId = theme.id
    if (draft.icon) team.icon = draft.icon
  } else {
    const id = String(draft.newId || '').trim().toLowerCase()
    if (!/^[a-z][a-z0-9-]{1,20}$/.test(id)) fail('team.rejected', { userId }, 'Use a short team id, starting with a letter.', 'VALIDATION')
    if (teams.some((item) => item.id === id)) fail('team.rejected', { userId }, 'That team id is already used.', 'CONFLICT')
    teams.push({ id, name, swatchId: swatch.id, themeId: theme.id, icon: draft.icon || 'shield' })
  }
  logger.info('team.saved', { userId, teamId: draft.id || draft.newId, swatchId: swatch.id, themeId: theme.id })
  return snapshot(userId)
}

export function assignUserTeam(userId, targetId, teamId) {
  requireAdmin(userId)
  requireFlag('adminPanel')
  if (targetId === 'apex') fail('user.rejected', { userId, targetId }, 'APEX is not on a team.', 'FORBIDDEN')
  if (!teams.some((item) => item.id === teamId)) fail('user.rejected', { userId, teamId }, 'That team is not in the exercise.', 'NOT_FOUND')
  const result = setAppointmentTeam(targetId, teamId)
  if (result === 'PROTECTED') fail('user.rejected', { userId, targetId }, 'APEX is not on a team.', 'FORBIDDEN')
  if (result === 'MISSING') fail('user.rejected', { userId, targetId }, 'That user is no longer in the directory.', 'NOT_FOUND')
  logger.info('user.team_assigned', { userId, targetId, teamId })
  return snapshot(userId)
}

export function deleteTeam(userId, teamId) {
  requireAdmin(userId)
  if (features.some((feature) => feature.teamId === teamId) || graphics.some((graphic) => graphic.teamId === teamId)) {
    fail('team.rejected', { userId, teamId }, 'Reassign the features that use this team first.', 'CONFLICT')
  }
  const index = teams.findIndex((item) => item.id === teamId)
  if (index < 0) fail('team.rejected', { userId, teamId }, 'That team is no longer in the exercise.', 'NOT_FOUND')
  teams.splice(index, 1)
  logger.info('team.deleted', { userId, teamId })
  return snapshot(userId)
}

export function saveRole(userId, draft) {
  requireAdmin(userId)
  requireFlag('adminPanel')
  const name = requireName(draft?.name, 'role.rejected')
  if (draft.id) {
    const role = roles.find((item) => item.id === draft.id)
    if (!role) fail('role.rejected', { userId }, 'That role is no longer in the directory.', 'NOT_FOUND')
    role.name = name
  } else {
    const id = String(draft.newId || '').trim().toLowerCase()
    if (!/^[a-z][a-z0-9-]{1,20}$/.test(id)) fail('role.rejected', { userId }, 'Use a short role id, starting with a letter.', 'VALIDATION')
    if (roles.some((item) => item.id === id)) fail('role.rejected', { userId }, 'That role id is already used.', 'CONFLICT')
    roles.push({ id, name })
  }
  logger.info('role.saved', { userId })
  return snapshot(userId)
}

export function deleteRole(userId, roleId) {
  requireAdmin(userId)
  const role = roles.find((item) => item.id === roleId)
  if (!role) fail('role.rejected', { userId, roleId }, 'That role is no longer in the directory.', 'NOT_FOUND')
  if (listDirectoryUsers().some((user) => user.role === role.name)) fail('role.rejected', { userId, roleId }, 'A user still holds this role.', 'CONFLICT')
  roles.splice(roles.findIndex((item) => item.id === roleId), 1)
  logger.info('role.deleted', { userId, roleId })
  return snapshot(userId)
}

export function saveUser(userId, draft) {
  requireAdmin(userId)
  requireFlag('adminPanel')
  const title = requireName(draft?.title, 'user.rejected')
  if (!draft?.role || !draft?.service) fail('user.rejected', { userId }, 'Enter the role and the service.', 'VALIDATION')
  if (!draft.id) {
    if (!draft.teamId) fail('user.rejected', { userId }, 'Choose a team.', 'VALIDATION')
    if (!teams.some((item) => item.id === draft.teamId)) fail('user.rejected', { userId, teamId: draft.teamId }, 'That team is not in the exercise.', 'NOT_FOUND')
  }
  if (draft.id) {
    if (!updateDirectoryUser(draft.id, { title, role: draft.role, service: draft.service })) {
      fail('user.rejected', { userId, id: draft.id }, 'That user cannot be changed.', 'FORBIDDEN')
    }
  } else {
    const id = String(draft.newId || '').trim().toLowerCase()
    if (!/^[a-z][a-z0-9-]{1,20}$/.test(id)) fail('user.rejected', { userId }, 'Use a short user id, starting with a letter.', 'VALIDATION')
    if (!addDirectoryUser({ id, title, role: draft.role, service: draft.service, teamId: draft.teamId })) fail('user.rejected', { userId }, 'That user id is already used.', 'CONFLICT')
  }
  logger.info('user.saved', { userId, id: draft.id || draft.newId })
  return snapshot(userId)
}

export function deleteUser(userId, targetId) {
  requireAdmin(userId)
  const result = removeDirectoryUser(targetId)
  if (result === 'PROTECTED') fail('user.rejected', { userId, targetId }, 'APEX cannot be removed.', 'FORBIDDEN')
  if (result === 'MISSING') fail('user.rejected', { userId, targetId }, 'That user is no longer in the directory.', 'NOT_FOUND')
  logger.info('user.deleted', { userId, targetId })
  return snapshot(userId)
}

export function setFlag(userId, key, enabled) {
  requireAdmin(userId)
  if (!FLAG_LIST.some((item) => item.key === key)) fail('flag.rejected', { userId, key }, 'That feature is not in the catalogue.', 'NOT_FOUND')
  flags[key] = Boolean(enabled)
  logger.info('flag.changed', { userId, key, enabled: flags[key] })
  return snapshot(userId)
}

export function updatePassword(userId, currentPassword, nextPassword) {
  requireUser(userId)
  const result = writePassword(userId, currentPassword, nextPassword)
  if (result === 'CURRENT') fail('password.rejected', { userId }, 'The current password is not correct.', 'VALIDATION')
  if (result === 'SHORT') fail('password.rejected', { userId }, 'Use at least 3 characters.', 'VALIDATION')
  if (result === 'SAME') fail('password.rejected', { userId }, 'Choose a different password.', 'VALIDATION')
  logger.info('password.changed', { userId })
  return snapshot(userId)
}
