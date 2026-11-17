import { FeatureCodes, hasFeature } from '../auth/featureCodes'
import { navigationForFeatures, sectionsForFeatures } from '../auth/access'
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

export function profileFromMe(me, teams) {
  const team = teams.find((item) => item.id === me.administeredTeamId)
  const admin = (me.roleCodes || []).includes('ADMINISTRATOR')
  const roles = (me.roleCodes || []).map(roleLabel)
  return {
    id: String(me.userId),
    title: me.name,
    role: roles.join(', ') || 'User',
    service: team?.name || (admin ? 'Exercise control' : ''),
    avatarUrl: me.name === 'APEX' ? '/avatars/apex.svg' : '',
  }
}

/** Fetches everything the shell needs besides `me` and shapes it like the session schema. */
export async function buildSession(me) {
  const features = me.featureCodes || []
  const canScenario = hasFeature(features, FeatureCodes.MANAGE_SCENARIO)
  const canGame = hasFeature(features, FeatureCodes.MANAGE_GAME)

  const [themeRows, teams, scenarioRows] = await Promise.all([
    soft(get('/themes'), []),
    soft(get('/teams'), []),
    canScenario || canGame ? soft(get('/scenarios'), []) : Promise.resolve([]),
  ])

  const gameLists = canGame
    ? await Promise.all(scenarioRows.map((row) => soft(get(`/scenarios/${row.id}/games`), [])))
    : []
  const gameRows = gameLists.flat()

  const themes = themeRows.map(themeFromEntity)
  const chosen =
    themes.find((item) => item.id === String(me.themeId)) || themes.find((item) => item.defaultTheme) || themes[0] || paletteFallback()
  const canSelectTheme = hasFeature(features, FeatureCodes.CHOOSE_THEME)

  const scenarios = scenarioRows.map((row) => ({ id: String(row.id), name: row.name, active: Boolean(row.active) }))
  const activeScenario = scenarios.find((item) => item.active)
  const games = gameRows.map((row) => ({
    id: String(row.id),
    name: row.name,
    open: true,
    scenarioId: String(row.scenarioId),
    active: Boolean(row.active),
    status: row.status || '',
  }))
  const activeGame = games.find((item) => item.active)

  return {
    profile: profileFromMe(me, teams),
    theme: chosen,
    themes: canSelectTheme && themes.length ? themes : [chosen],
    canSelectTheme,
    scenarios,
    selectedScenarioId: activeScenario?.id || '',
    activeScenarioId: activeScenario?.id || '',
    activeGame: { id: activeGame?.id || '', name: activeGame?.name || '' },
    games,
    navigation: navigationForFeatures(features),
    sections: sectionsForFeatures(features),
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
    exerciseTitle: 'Exercise Jayant',
    classification: 'EXERCISE',
    demoMode: false,
    features: [...features],
    me: {
      userId: me.userId,
      name: me.name,
      roleCodes: me.roleCodes || [],
      administeredTeamId: me.administeredTeamId ?? null,
      standardOrbatId: me.standardOrbatId ?? null,
      standardNodeId: me.standardNodeId ?? null,
      playingOrbatId: me.playingOrbatId ?? null,
      playingNodeId: me.playingNodeId ?? null,
      canWork: me.canWork !== false,
      workBlockedReason: me.workBlockedReason || '',
    },
  }
}
