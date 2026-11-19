import { create } from 'zustand'
import dayjs from 'dayjs'
import { ApiError, changeGame as requestGameChange, changeScenario as requestScenarioChange, logout, refreshSession, resumeSession, setApexTheme } from '../../shared/api/client'
import { setUnauthorizedHandler } from '../../shared/api/http'
import { getToken, setToken } from '../../shared/api/tokenStore'
import { logger } from '../../shared/lib/logger'
import { clearSessionKey, readSessionKey, writeSessionKey } from '../../shared/lib/sessionKey'
import { useToastStore } from '../feedback/useToastStore'

const FALLBACK = '2026-10-28T06:00:00'

let restoring = null

function signedInState(session) {
  return {
    session,
    ready: true,
    notice: null,
    status: 'ready',
    epochMs: dayjs(session.clockStart || FALLBACK).valueOf(),
    resetToken: 0,
    phaseId: null,
  }
}

export const useSessionStore = create((set, get) => ({
  session: null,
  ready: false,
  notice: null,
  status: 'ready',
  epochMs: dayjs(FALLBACK).valueOf(),
  resetToken: 0,
  phaseId: null,
  restore: () => {
    if (get().ready) return Promise.resolve()
    if (restoring) return restoring
    restoring = (async () => {
      const saved = readSessionKey()
      if (!getToken()) {
        if (saved.userId) clearSessionKey()
        set({
          ready: true,
          session: null,
          notice: saved.invalid ? 'The saved session is not valid.' : null,
        })
        return
      }
      try {
        const session = await resumeSession()
        set(signedInState(session))
        writeSessionKey(session.profile.id)
        logger.info('session.restored', { userId: session.profile.id })
      } catch (error) {
        clearSessionKey()
        setToken(null)
        set({
          ready: true,
          session: null,
          notice: error?.message || 'The session could not be restored.',
        })
      }
    })().finally(() => {
      restoring = null
    })
    return restoring
  },
  signIn: (session) => {
    const persisted = writeSessionKey(session.profile.id)
    const token = getToken()
    if (token) setToken(token)
    set(signedInState(session))
    logger.info('auth.signed_in', { userId: session.profile.id, persisted })
    if (session.me && session.me.canWork === false) {
      useToastStore.getState().push(`Signed in, but work is not available yet (${session.me.workBlockedReason || 'not active'}).`, 'warning')
    }
  },
  signOut: () => {
    const userId = get().session?.profile?.id || null
    clearSessionKey()
    logout()
    logger.info('auth.signed_out', { userId })
    set({
      session: null,
      ready: true,
      notice: null,
      status: 'ready',
      epochMs: dayjs(FALLBACK).valueOf(),
      resetToken: 0,
      phaseId: null,
    })
  },
  clearNotice: () => set({ notice: null }),
  /** Rebuilds session catalogues (scenarios, games, themes, map) after admin changes. */
  refresh: async () => {
    if (!get().session) return null
    const session = await refreshSession()
    set({ ...signedInState(session), status: get().status, phaseId: get().phaseId, resetToken: get().resetToken })
    return session
  },
  changeScenario: async (scenarioId) => {
    const { session, status } = get()
    if (!session) throw new ApiError('Sign in before changing the scenario.', 'SESSION')
    const userId = session.profile.id
    if (!session.canSelectScenario) {
      logger.warn('scenario.change_rejected', { userId, scenarioId: scenarioId || null, code: 'FORBIDDEN' })
      throw new ApiError('This user cannot change the scenario.', 'FORBIDDEN')
    }
    const clearing = !scenarioId
    if (!clearing && !session.scenarios.some((item) => item.id === scenarioId)) {
      logger.warn('scenario.change_rejected', { userId, scenarioId: scenarioId || null, code: 'NOT_FOUND' })
      throw new ApiError('That scenario is not in this exercise.', 'NOT_FOUND')
    }
    if (!clearing && scenarioId === session.activeScenarioId) return
    if (clearing && !session.activeScenarioId) return
    if (status === 'running' || status === 'paused') {
      logger.warn('scenario.change_rejected', { userId, scenarioId: scenarioId || null, code: 'GAME_IN_PROGRESS' })
      throw new ApiError('End the game before changing the scenario.', 'GAME_IN_PROGRESS')
    }
    const result = await requestScenarioChange({ userId, scenarioId: clearing ? '' : scenarioId })
    set((state) => {
      if (!state.session) return state
      return {
        session: {
          ...state.session,
          activeScenarioId: result.activeScenarioId || '',
          selectedScenarioId: result.activeScenarioId || '',
          scenarios:
            result.scenarios ||
            state.session.scenarios.map((item) => ({
              ...item,
              active: Boolean(result.activeScenarioId) && item.id === result.activeScenarioId,
            })),
          games: result.games || state.session.games,
          activeGame: result.activeGame || { id: '', name: '' },
        },
      }
    })
  },
  changeGame: async (gameId) => {
    const { session, status } = get()
    if (!session) throw new ApiError('Sign in before changing the game.', 'SESSION')
    const userId = session.profile.id
    if (!session.canSelectGame) {
      logger.warn('game.change_rejected', { userId, gameId: gameId || null, code: 'FORBIDDEN' })
      throw new ApiError('This user cannot change the game.', 'FORBIDDEN')
    }
    const game = (session.games || []).find((item) => item.id === gameId)
    if (!game) {
      logger.warn('game.change_rejected', { userId, gameId: gameId || null, code: 'NOT_FOUND' })
      throw new ApiError('That game is not in this exercise.', 'NOT_FOUND')
    }
    if (!game.open) {
      logger.warn('game.change_rejected', { userId, gameId, code: 'CLOSED' })
      throw new ApiError('That game is closed.', 'CLOSED')
    }
    if (gameId === session.activeGame.id) return
    if (status === 'running' || status === 'paused') {
      logger.warn('game.change_rejected', { userId, gameId, code: 'GAME_IN_PROGRESS' })
      throw new ApiError('End the game before changing the game.', 'GAME_IN_PROGRESS')
    }
    const result = await requestGameChange({ userId, gameId })
    set((state) => {
      if (!state.session) return state
      return {
        session: {
          ...state.session,
          activeGame: { id: result.activeGameId, name: result.name },
          activeScenarioId: result.activeScenarioId || state.session.activeScenarioId,
          selectedScenarioId: result.activeScenarioId || state.session.selectedScenarioId,
          scenarios: result.scenarios || state.session.scenarios,
          games: result.games || state.session.games,
        },
      }
    })
  },
  chooseTheme: async (themeId) => {
    const userId = get().session?.profile?.id
    const theme = await setApexTheme({ userId, themeId })
    set((state) => (state.session ? { session: { ...state.session, theme } } : state))
  },
  setFilter: (id, visible) =>
    set((state) => {
      if (!state.session?.filters.some((filter) => filter.id === id)) return state
      return {
        phaseId: null,
        session: {
          ...state.session,
          filters: state.session.filters.map((filter) => (filter.id === id ? { ...filter, visible } : filter)),
        },
      }
    }),
  applyPhase: (phaseId) =>
    set((state) => {
      const phase = state.session?.phases.find((item) => item.id === phaseId)
      if (!phase) return state
      const show = new Set(phase.filterIds)
      return {
        phaseId,
        session: {
          ...state.session,
          filters: state.session.filters.map((filter) => ({ ...filter, visible: show.has(filter.id) })),
        },
      }
    }),
  requestExtent: () => set((state) => ({ resetToken: state.resetToken + 1 })),
  seek: (epochMs) => {
    if (!get().session?.canControlGame || !Number.isFinite(epochMs)) return
    set({ epochMs, status: 'paused' })
  },
  start: () => {
    const { status, session } = get()
    if (!session?.canControlGame) return
    if (status === 'running' || status === 'paused') return
    set({ status: 'running' })
  },
  pause: () => {
    const { status, session } = get()
    if (!session?.canControlGame || status !== 'running') return
    set({ status: 'paused' })
  },
  resume: () => {
    const { status, session } = get()
    if (!session?.canControlGame || status !== 'paused') return
    set({ status: 'running' })
  },
  restart: () => {
    if (!get().session?.canControlGame) return
    set({ status: 'ready', epochMs: dayjs(get().session.clockStart || FALLBACK).valueOf() })
  },
  end: () => {
    const { status, session } = get()
    if (!session?.canControlGame) return
    if (status === 'ready' || status === 'ended') return
    set({ status: 'ended' })
  },
  tick: () => {
    const { status, epochMs } = get()
    if (status !== 'running') return
    set({ epochMs: epochMs + 60 * 1000 })
  },
}))

setUnauthorizedHandler(() => {
  const { session } = useSessionStore.getState()
  if (!session) return
  clearSessionKey()
  logout()
  useSessionStore.setState({
    session: null,
    ready: true,
    notice: 'Your session has ended. Sign in again.',
    status: 'ready',
    resetToken: 0,
    phaseId: null,
  })
})
