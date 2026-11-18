import { z } from 'zod'
import { logger } from '../lib/logger'
import { ApiError } from './errors'
import { get, patch, post } from './http'
import { setIdentity, setRemote } from './directoryRemote'
import { themeFromEntity } from './mappers'
import { buildSession } from './session'
import { clearToken, getToken, setToken } from './tokenStore'
export { ApiError } from './errors'

const themeSchema = z.object({
  mode: z.enum(['dark', 'light']),
  primary: z.string(),
  primaryContrast: z.string(),
  secondary: z.string(),
  secondaryContrast: z.string(),
  backgroundDefault: z.string(),
  backgroundPaper: z.string(),
  textPrimary: z.string(),
  textSecondary: z.string(),
  textDisabled: z.string(),
  divider: z.string(),
  error: z.string(),
  errorContrast: z.string(),
  warning: z.string(),
  warningContrast: z.string(),
  success: z.string(),
  successContrast: z.string(),
  info: z.string(),
  infoContrast: z.string(),
  fontFamily: z.string(),
  fontWeightLight: z.number(),
  fontWeightRegular: z.number(),
  fontWeightMedium: z.number(),
  fontWeightBold: z.number(),
  borderRadius: z.number(),
})

const namedThemeSchema = themeSchema.extend({
  id: z.string(),
  name: z.string(),
  family: z.string(),
})

const userSchema = z.object({
  id: z.string(),
  title: z.string(),
  role: z.string(),
  service: z.string(),
  avatarUrl: z.string(),
})

const filterSchema = z.object({
  id: z.string(),
  label: z.string(),
  group: z.string(),
  layers: z.string(),
  base: z.boolean(),
  transparent: z.boolean(),
  visible: z.boolean(),
})

const loginContextSchema = z.object({
  applicationName: z.string(),
  exerciseTitle: z.string(),
  activeUsers: z.array(z.object({ id: z.union([z.number(), z.string()]), name: z.string() })).min(1),
  loginTheme: z.object({
    id: z.union([z.number(), z.string()]),
    name: z.string(),
    description: z.string().nullable().optional(),
    defaultTheme: z.boolean(),
    configJson: z.record(z.any()).nullable().optional(),
  }),
})

const meSchema = z.object({
  userId: z.number(),
  name: z.string(),
  roleCodes: z.array(z.string()),
  administeredSideId: z.number().nullable(),
  standardOrbatId: z.number().nullable(),
  standardNodeId: z.string().nullable(),
  playingOrbatId: z.number().nullable(),
  playingNodeId: z.string().nullable(),
  canWork: z.boolean(),
  workBlockedReason: z.string(),
})

const sessionSchema = z.object({
  profile: userSchema,
  theme: namedThemeSchema,
  themes: z.array(namedThemeSchema).min(1),
  canSelectTheme: z.boolean(),
  // Scenarios and games are only readable with MANAGE_SCENARIO / MANAGE_GAME, so they may be empty.
  scenarios: z.array(z.object({ id: z.string(), name: z.string(), active: z.boolean() })),
  selectedScenarioId: z.string(),
  activeScenarioId: z.string(),
  activeGame: z.object({ id: z.string(), name: z.string() }),
  games: z.array(z.object({ id: z.string(), name: z.string(), open: z.boolean(), scenarioId: z.string().optional(), active: z.boolean().optional(), status: z.string().optional(), moonphases: z.string().optional() })),
  navigation: z
    .array(
      z.object({
        id: z.string(),
        label: z.string(),
        items: z.array(z.object({ id: z.string(), label: z.string(), icon: z.string() })).min(1),
      }),
    )
    .min(1),
  sections: z.array(z.object({ id: z.string(), kicker: z.string(), label: z.string(), icon: z.string() })),
  resources: z.array(z.object({ id: z.string(), name: z.string(), detail: z.string(), status: z.string() })),
  plans: z.array(z.object({ id: z.string(), name: z.string(), detail: z.string(), status: z.string() })),
  filters: z.array(filterSchema).min(1),
  phases: z.array(z.object({ id: z.string(), label: z.string(), filterIds: z.array(z.string()) })).default([]),
  canSelectScenario: z.boolean(),
  canSelectGame: z.boolean(),
  canControlGame: z.boolean(),
  mapView: z.object({
    latitude: z.number(),
    longitude: z.number(),
    zoom: z.number(),
    minZoom: z.number(),
    maxZoom: z.number(),
  }),
  plannedCenters: z.array(z.object({
    id: z.string(),
    name: z.string(),
    latitude: z.number(),
    longitude: z.number(),
  })).min(1),
  mapService: z.string(),
  clockStart: z.string(),
  exerciseTitle: z.string(),
  classification: z.string(),
  demoMode: z.boolean(),
  functionalities: z.array(z.string()),
  me: meSchema,
})

/**
 * Public bootstrap for the login screen. No fixture fallback — backend must answer.
 */
export async function getLoginContext() {
  const remote = await get('/auth/login-context', undefined, { auth: false })
  const parsed = loginContextSchema.safeParse(remote)
  if (!parsed.success) {
    logger.error('login_context.invalid', {
      issues: parsed.error.issues.slice(0, 3).map((issue) => `${issue.path.join('.')}: ${issue.message}`),
    })
    throw new ApiError('The login context from the server is not valid.', 'UNAVAILABLE')
  }
  const theme = themeFromEntity(parsed.data.loginTheme)
  return {
    applicationName: parsed.data.applicationName,
    exerciseTitle: parsed.data.exerciseTitle,
    systemName: String(parsed.data.applicationName || 'GIS Warplan').toUpperCase(),
    classification: 'EXERCISE',
    purpose: 'Authorised users only',
    accessNotice: 'Select your account to sign in',
    backgroundImage: '/login-background.png',
    theme,
    users: parsed.data.activeUsers.map((user) => ({
      id: String(user.name),
      numericId: user.id,
      title: user.name,
      name: user.name,
      role: '',
      service: '',
      avatarUrl: user.name === 'APEX' ? '/avatars/apex.svg' : '',
    })),
  }
}

function validate(session) {
  const parsed = sessionSchema.safeParse(session)
  if (!parsed.success) {
    logger.error('session.invalid', { issues: parsed.error.issues.slice(0, 3).map((issue) => `${issue.path.join('.')}: ${issue.message}`) })
    throw new ApiError('The user profile could not be read.', 'VALIDATION')
  }
  setIdentity({ userId: parsed.data.profile.id, functionalities: parsed.data.functionalities })
  return parsed.data
}

async function sessionFromMe(me) {
  if (!me || typeof me !== 'object') throw new ApiError('The user profile could not be read.', 'VALIDATION')
  return validate(await buildSession(me))
}

export async function login({ userId, password }) {
  try {
    const name = String(userId || '').trim()
    if (!name) throw new ApiError('Enter the user name.', 'VALIDATION')
    if (!password) throw new ApiError('Enter the access password.', 'VALIDATION')
    const result = await post('/auth/login', { name, password }, { auth: false })
    if (!result?.token) throw new ApiError('The service did not return a session.', 'BAD_RESPONSE')
    setToken(result.token)
    try {
      return await sessionFromMe(result.me)
    } catch (error) {
      clearToken()
      setIdentity(null)
      throw error
    }
  } catch (error) {
    logger.warn('auth.rejected', { userId: userId || null, code: error?.code || 'UNKNOWN' })
    throw error
  }
}

/** Rebuilds the session from the stored token. The argument is kept for compatibility and ignored. */
export async function resumeSession() {
  try {
    if (!getToken()) throw new ApiError('The saved session is not valid.', 'SESSION')
    const me = await get('/auth/me')
    return await sessionFromMe(me)
  } catch (error) {
    if (error?.code === 'UNAUTHORIZED') clearToken()
    setIdentity(null)
    logger.warn('session.restore_rejected', { code: error?.code || 'UNKNOWN' })
    throw error
  }
}

export async function logout() {
  const token = getToken()
  clearToken()
  setIdentity(null)
  setRemote(null)
  if (!token) return
  try {
    await post('/auth/logout', undefined, { token })
  } catch (error) {
    logger.info('auth.logout_unconfirmed', { code: error?.code || 'UNKNOWN' })
  }
}

export async function refreshSession() {
  const me = await get('/auth/me')
  return sessionFromMe(me)
}

export async function setApexTheme({ themeId }) {
  try {
    const id = Number(themeId)
    if (!Number.isFinite(id)) throw new ApiError('That theme is not in the catalog.', 'NOT_FOUND')
    await patch('/users/me/theme', { themeId: id })
    const entity = await get(`/themes/${id}`)
    logger.info('theme.changed', { themeId })
    return themeFromEntity(entity)
  } catch (error) {
    logger.warn('theme.rejected', { themeId: themeId || null, code: error?.code || 'UNKNOWN' })
    throw error
  }
}

function exerciseDelta(session) {
  return {
    scenarios: session.scenarios,
    games: session.games,
    activeGame: session.activeGame,
  }
}

export async function changeScenario({ scenarioId }) {
  try {
    if (!scenarioId) throw new ApiError('Select a scenario.', 'VALIDATION')
    const scenario = await post(`/scenarios/${scenarioId}/activate`)
    const session = await refreshSession()
    return { activeScenarioId: String(scenario.id), name: scenario.name, ...exerciseDelta(session) }
  } catch (error) {
    logger.warn('scenario.change_rejected', { scenarioId: scenarioId || null, code: error?.code || 'UNKNOWN' })
    throw error
  }
}

export async function changeGame({ gameId }) {
  try {
    if (!gameId) throw new ApiError('Select a game.', 'VALIDATION')
    const game = await post(`/games/${gameId}/activate`)
    const session = await refreshSession()
    return {
      activeGameId: String(game.id),
      name: game.name,
      activeScenarioId: session.activeScenarioId,
      ...exerciseDelta(session),
    }
  } catch (error) {
    logger.warn('game.change_rejected', { gameId: gameId || null, code: error?.code || 'UNKNOWN' })
    throw error
  }
}

export {
  addComment,
  closeReplay,
  connectStream,
  createFeature,
  createGraphic,
  deleteCatalogue,
  deleteFeature,
  deleteGraphic,
  deleteRecording,
  deleteRole,
  deleteSide,
  deleteUser,
  discardRecording,
  disconnectStream,
  exportPlan,
  extendFeature,
  loadReplay,
  loadWorkbench,
  promoteGraphic,
  redoPlanning,
  resetMapViews,
  saveMapView,
  saveRecording,
  saveRole,
  saveRoute,
  assignUserSide,
  saveSide,
  saveUser,
  saveZone,
  seekReplay,
  seekScenario,
  setAlertMuted,
  setFlag,
  setLayerOpacity,
  setPlanView,
  setReplayPlaying,
  setScenarioPlaying,
  setSimulation,
  shareGraphic,
  startRecording,
  stepReplay,
  stopRecording,
  subscribeWorkbench,
  undoPlanning,
  updateBasemap,
  updateFeature,
  updateGraphic,
  updatePassword,
  updateStream,
} from './directory'
