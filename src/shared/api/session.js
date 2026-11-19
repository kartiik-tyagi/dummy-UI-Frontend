import { FunctionalityCodes, hasFunctionality } from '../auth/functionalityCodes'
import { navigationForFunctionalities, sectionsForFunctionalities } from '../auth/access'
import { logger } from '../lib/logger'
import { clockStart, plannedCenters } from './fixtures'
import { ApiError } from './errors'
import { get } from './http'
import { paletteFallback, roleLabel, themeFromEntity } from './mappers'

function filtersFromMapConfig(mapConfig) {
  const layers = Array.isArray(mapConfig?.layers) ? mapConfig.layers : []
  if (!layers.length) {
    throw new ApiError('The map catalog has no layers. Ask an administrator to configure map layers.', 'UNAVAILABLE')
  }
  return layers.map((layer) => ({
    id: layer.code,
    label: layer.label,
    group: layer.groupName || '',
    layers: layer.wmsLayers,
    base: Boolean(layer.baseLayer),
    transparent: Boolean(layer.transparent),
    visible: layer.defaultVisible !== false,
    opacity: Number(layer.defaultOpacity ?? 1),
  }))
}

function mapViewFromConfig(mapConfig) {
  const view = mapConfig?.view
  if (!view) {
    throw new ApiError('The map catalog has no view defaults.', 'UNAVAILABLE')
  }
  return {
    latitude: view.centerLat,
    longitude: view.centerLon,
    zoom: view.zoom,
    minZoom: view.minZoom,
    maxZoom: view.maxZoom,
  }
}

/** A call the signed-in user may not be allowed to make; the session still has to build. */
async function soft(promise, fallback) {
  try {
    const value = await promise
    return value ?? fallback
  } catch (error) {
    if (error?.code === 'UNAUTHORIZED') throw error
    logger.info('session.optional_unavailable', { code: error?.code || 'UNKNOWN', message: error?.message })
    return fallback
  }
}

export function profileFromMe(me, sides) {
  const side = sides.find((item) => item.id === me.administeredSideId)
  const admin = (me.roleCodes || []).includes('ADMINISTRATOR')
  const roles = (me.roleCodes || []).map(roleLabel)
  return {
    id: String(me.userId),
    title: me.name,
    role: roles.join(', ') || 'User',
    service: side?.name || (admin ? 'Exercise control' : ''),
    avatarUrl: me.name === 'APEX' ? '/avatars/apex.svg' : '',
  }
}

/** Fetches everything the shell needs besides `me` and shapes it like the session schema. */
export async function buildSession(me) {
  const functionalities = me.functionalityCodes || []
  const canScenario = hasFunctionality(functionalities, FunctionalityCodes.MANAGE_SCENARIO)
  const canGame = hasFunctionality(functionalities, FunctionalityCodes.MANAGE_GAME)

  const [themeRows, sides, scenarioRows, mapConfig] = await Promise.all([
    soft(get('/themes'), []),
    soft(get('/sides'), []),
    canScenario || canGame ? soft(get('/scenarios'), []) : Promise.resolve([]),
    get('/map/config'),
  ])

  if (!mapConfig?.layers?.length || !mapConfig?.view) {
    logger.error('session.map_config_missing', { hasConfig: Boolean(mapConfig), layers: mapConfig?.layers?.length || 0 })
    throw new ApiError('The map catalog is not available. Sign-in cannot continue until it is configured.', 'UNAVAILABLE')
  }

  const gameLists = canGame
    ? await Promise.all(scenarioRows.map((row) => soft(get(`/scenarios/${row.id}/games`), [])))
    : []
  const gameRows = gameLists.flat()

  const themes = themeRows.map(themeFromEntity)
  const isApex = me.name === 'APEX'
  const chosen = themes.find((item) => item.id === String(me.themeId)) || paletteFallback()
  const selectable = themes.filter((item) => item.holderKind === 'FREE' || item.loginTheme || item.id === String(me.themeId))
  const canSelectTheme = isApex && hasFunctionality(functionalities, FunctionalityCodes.CHOOSE_THEME)

  const scenarios = scenarioRows.map((row) => ({ id: String(row.id), name: row.name, active: Boolean(row.active) }))
  const activeScenario = scenarios.find((item) => item.active)
  const games = gameRows.map((row) => ({
    id: String(row.id),
    name: row.name,
    open: true,
    scenarioId: String(row.scenarioId),
    active: Boolean(row.active),
    dateTime: row.dateTime || '',
    sunrise: row.sunrise || '',
    sunset: row.sunset || '',
    moonphases: row.moonphases || '',
    description: row.description || '',
  }))
  const activeGame = games.find((item) => item.active)
  const navigation = navigationForFunctionalities(functionalities)
  const sections = sectionsForFunctionalities(functionalities)
  if (!navigation.length && !sections.length) {
    throw new ApiError('This account has no map or administration access.', 'FORBIDDEN')
  }

  return {
    profile: profileFromMe(me, sides),
    theme: chosen,
    themes: canSelectTheme && selectable.length ? selectable : [chosen],
    canSelectTheme,
    scenarios,
    selectedScenarioId: activeScenario?.id || '',
    activeScenarioId: activeScenario?.id || '',
    activeGame: { id: activeGame?.id || '', name: activeGame?.name || '' },
    games,
    navigation,
    sections,
    resources: [],
    plans: [],
    filters: filtersFromMapConfig(mapConfig),
    phases: [],
    canSelectScenario: canScenario,
    canSelectGame: canGame,
    canControlGame: canGame,
    mapView: mapViewFromConfig(mapConfig),
    plannedCenters,
    mapService: mapConfig.server?.wmsUrl || '',
    mapConfig,
    clockStart,
    exerciseTitle: 'Exercise GIS Warplan',
    classification: 'EXERCISE',
    demoMode: false,
    functionalities: [...functionalities],
    me: {
      userId: me.userId,
      name: me.name,
      roleCodes: me.roleCodes || [],
      administeredSideId: me.administeredSideId ?? null,
      standardOrbatId: me.standardOrbatId ?? null,
      standardNodeId: me.standardNodeId ?? null,
      playingOrbatId: me.playingOrbatId ?? null,
      playingNodeId: me.playingNodeId ?? null,
      canWork: me.canWork !== false,
      workBlockedReason: me.workBlockedReason || '',
    },
  }
}
