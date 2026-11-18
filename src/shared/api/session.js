import { FunctionalityCodes, hasFunctionality } from '../auth/functionalityCodes'
import { navigationForFunctionalities, sectionsForFunctionalities } from '../auth/access'
import { logger } from '../lib/logger'
import { clockStart, mapFilters, mapService, mapView, phases, plannedCenters } from './fixtures'
import { get } from './http'
import { paletteFallback, roleLabel, themeFromEntity } from './mappers'

const DEFAULT_VISIBLE = { countries: true, places: true }

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

  const [themeRows, sides, scenarioRows] = await Promise.all([
    soft(get('/themes'), []),
    soft(get('/sides'), []),
    canScenario || canGame ? soft(get('/scenarios'), []) : Promise.resolve([]),
  ])

  const gameLists = canGame
    ? await Promise.all(scenarioRows.map((row) => soft(get(`/scenarios/${row.id}/games`), [])))
    : []
  const gameRows = gameLists.flat()

  const themes = themeRows.map(themeFromEntity)
  const chosen =
    themes.find((item) => item.id === String(me.themeId)) || themes.find((item) => item.defaultTheme) || themes[0] || paletteFallback()
  const canSelectTheme = hasFunctionality(functionalities, FunctionalityCodes.CHOOSE_THEME)

  const scenarios = scenarioRows.map((row) => ({ id: String(row.id), name: row.name, active: Boolean(row.active) }))
  const activeScenario = scenarios.find((item) => item.active)
  const games = gameRows.map((row) => ({
    id: String(row.id),
    name: row.name,
    open: true,
    scenarioId: String(row.scenarioId),
    active: Boolean(row.active),
    status: row.status || '',
    moonphases: row.moonphases || '',
  }))
  const activeGame = games.find((item) => item.active)

  return {
    profile: profileFromMe(me, sides),
    theme: chosen,
    themes: canSelectTheme && themes.length ? themes : [chosen],
    canSelectTheme,
    scenarios,
    selectedScenarioId: activeScenario?.id || '',
    activeScenarioId: activeScenario?.id || '',
    activeGame: { id: activeGame?.id || '', name: activeGame?.name || '' },
    games,
    navigation: navigationForFunctionalities(functionalities),
    sections: sectionsForFunctionalities(functionalities),
    resources: [],
    plans: [],
    // Map chrome placeholders only: the map service is not part of this API yet.
    filters: mapFilters.map(({ id, label, group, layers, base, transparent }) => ({
      id,
      label,
      group,
      layers,
      base,
      transparent,
      visible: Boolean(DEFAULT_VISIBLE[id]),
    })),
    phases,
    canSelectScenario: canScenario,
    canSelectGame: canGame,
    canControlGame: canGame,
    mapView,
    plannedCenters,
    mapService,
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
