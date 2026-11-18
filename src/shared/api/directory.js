import { FunctionalityCodes, hasFunctionality } from '../auth/functionalityCodes'
import { canOpenDirectory, canOpenOrbat, isAdminLike } from '../auth/access'
import { logger } from '../lib/logger'
import { marks } from '../theme/swatches'
import { getIdentity, getRemote, registerSnapshot } from './directoryRemote'
import { ApiError } from './errors'
import { osmService } from './fixtures'

export {
  assignUserSide,
  deleteRole,
  deleteSide,
  deleteUser,
  loadWorkbench,
  saveRole,
  saveSide,
  saveUser,
  updatePassword,
} from './directoryApi'

/** What the signed-in user may do, derived from the backend functionality codes. */
function accessFor(userId) {
  const identity = getIdentity()
  if (!identity || identity.userId !== userId) return null
  const functionalities = identity.functionalities
  return {
    userId,
    functionalities,
    admin: isAdminLike(functionalities),
    canControlGame: hasFunctionality(functionalities, FunctionalityCodes.MANAGE_GAME),
    canSelectScenario: hasFunctionality(functionalities, FunctionalityCodes.MANAGE_SCENARIO),
  }
}

const opacity = {}
const settings = {
  source: 'wms',
  geoserverUrl: '',
  osmUrl: osmService,
  wmsLayer: '',
  defaultZoom: 5,
  homeToken: 0,
  views: { picture: null, planning: null },
}

/** Applies backend map catalog defaults into local map settings (never invents layers here). */
export function applyMapCatalog(mapConfig) {
  if (!mapConfig) return
  if (mapConfig.server?.wmsUrl) {
    settings.geoserverUrl = mapConfig.server.wmsUrl
  }
  if (mapConfig.view) {
    settings.source = mapConfig.view.basemapSource === 'osm' ? 'osm' : 'wms'
    if (mapConfig.view.osmUrl) settings.osmUrl = mapConfig.view.osmUrl
    if (Number.isFinite(mapConfig.view.zoom)) settings.defaultZoom = mapConfig.view.zoom
  }
  const base = (mapConfig.layers || []).find((layer) => layer.baseLayer)
  if (base?.wmsLayers) settings.wmsLayer = base.wmsLayers
  for (const layer of mapConfig.layers || []) {
    if (layer.code && layer.defaultOpacity != null) {
      opacity[layer.code] = Number(layer.defaultOpacity)
    }
  }
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

export function snapshot(userId) {
  requireUser(userId)
  const remote = getRemote() || {
    users: [],
    sides: [],
    roles: [],
    swatches: [],
    themeChoices: [],
    functionalityCatalog: [],
    directoryThemes: [],
    access: [],
    mapConfig: null,
  }
  return {
    navigation: [],
    opacity: { ...opacity },
    features: [],
    sides: remote.sides,
    swatches: remote.swatches,
    themeChoices: remote.themeChoices,
    marks: { halo: marks.halo, outline: marks.outline, objective: marks.objective, replay: marks.replay },
    roles: remote.roles,
    users: remote.users,
    graphics: [],
    planView: 'mine',
    canUndo: false,
    canRedo: false,
    alerts: [],
    alertMuted: true,
    alertSound: false,
    recordings: [],
    draftRecording: null,
    capture: false,
    replay: null,
    scenario: { name: '', description: '', durationSec: 0, t: 0, playing: false, markers: [] },
    simulation: { speed: 1, playing: false },
    stream: { status: 'offline', enabled: false, wsUrl: '', topic: '' },
    flags: {
      layerOpacity: true,
      featureTable: false,
      propertiesPanel: false,
      drawingTools: false,
      measurementTools: false,
      sideMapIcons: false,
      mapSettings: true,
      planningCanvas: false,
      planningExport: false,
      planningShare: false,
      planningReview: false,
      planningPromote: false,
      geofenceAlerts: false,
      alertSound: false,
      alertsPanel: false,
      sessionReplay: false,
      scenarioPlayback: false,
      simulationExtras: false,
      liveStream: false,
      statusBadge: false,
      zonesAdmin: false,
      routesAdmin: false,
      adminPanel: canOpenDirectory(remote.access),
      demoMode: false,
    },
    flagList: [],
    settings: structuredClone(settings),
    markers: [],
    showSides: false,
    functionalityCatalog: remote.functionalityCatalog,
    directoryThemes: remote.directoryThemes,
    grants: remote.access,
    mapConfig: remote.mapConfig,
    canOpenOrbat: canOpenOrbat(remote.access),
  }
}

registerSnapshot(snapshot)

export function subscribeWorkbench(userId, onChange) {
  requireUser(userId)
  onChange(snapshot(userId))
  return () => {}
}

export function setLayerOpacity(userId, layerId, value) {
  requireUser(userId)
  const next = Math.min(1, Math.max(0.15, Number(value) || 1))
  opacity[layerId] = next
  logger.info('map.opacity', { userId, layerId, opacity: next })
  return snapshot(userId)
}

export function saveMapView(userId, surface, view) {
  requireUser(userId)
  settings.views[surface] = view
  return snapshot(userId)
}

export function resetMapViews(userId) {
  requireUser(userId)
  settings.views = { picture: null, planning: null }
  settings.homeToken += 1
  return snapshot(userId)
}

function unavailable(userId, action) {
  fail('directory.unavailable', { userId, action }, 'This capability is not available in the product.', 'UNAVAILABLE')
}

export const updateBasemap = (userId) => unavailable(userId, 'updateBasemap')
export const createFeature = (userId) => unavailable(userId, 'createFeature')
export const updateFeature = (userId) => unavailable(userId, 'updateFeature')
export const extendFeature = (userId) => unavailable(userId, 'extendFeature')
export const deleteFeature = (userId) => unavailable(userId, 'deleteFeature')
export const createGraphic = (userId) => unavailable(userId, 'createGraphic')
export const updateGraphic = (userId) => unavailable(userId, 'updateGraphic')
export const deleteGraphic = (userId) => unavailable(userId, 'deleteGraphic')
export const undoPlanning = (userId) => unavailable(userId, 'undoPlanning')
export const redoPlanning = (userId) => unavailable(userId, 'redoPlanning')
export const exportPlan = (userId) => unavailable(userId, 'exportPlan')
export const setPlanView = (userId) => unavailable(userId, 'setPlanView')
export const shareGraphic = (userId) => unavailable(userId, 'shareGraphic')
export const addComment = (userId) => unavailable(userId, 'addComment')
export const promoteGraphic = (userId) => unavailable(userId, 'promoteGraphic')
export const setAlertMuted = (userId) => unavailable(userId, 'setAlertMuted')
export const startRecording = (userId) => unavailable(userId, 'startRecording')
export const stopRecording = (userId) => unavailable(userId, 'stopRecording')
export const saveRecording = (userId) => unavailable(userId, 'saveRecording')
export const discardRecording = (userId) => unavailable(userId, 'discardRecording')
export const deleteRecording = (userId) => unavailable(userId, 'deleteRecording')
export const loadReplay = (userId) => unavailable(userId, 'loadReplay')
export const seekReplay = (userId) => unavailable(userId, 'seekReplay')
export const setReplayPlaying = (userId) => unavailable(userId, 'setReplayPlaying')
export const stepReplay = (userId) => unavailable(userId, 'stepReplay')
export const closeReplay = (userId) => unavailable(userId, 'closeReplay')
export const seekScenario = (userId) => unavailable(userId, 'seekScenario')
export const setScenarioPlaying = (userId) => unavailable(userId, 'setScenarioPlaying')
export const setSimulation = (userId) => unavailable(userId, 'setSimulation')
export const connectStream = (userId) => unavailable(userId, 'connectStream')
export const disconnectStream = (userId) => unavailable(userId, 'disconnectStream')
export const updateStream = (userId) => unavailable(userId, 'updateStream')
export const saveZone = (userId) => unavailable(userId, 'saveZone')
export const saveRoute = (userId) => unavailable(userId, 'saveRoute')
export const deleteCatalogue = (userId) => unavailable(userId, 'deleteCatalogue')
export const setFlag = (userId) => unavailable(userId, 'setFlag')
