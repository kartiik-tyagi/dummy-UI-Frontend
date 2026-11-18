import { logger } from './logger'

const KEY = 'gis-warplan.session'
const EXERCISE_KEY = 'gis-warplan.exercise'

export function readSessionKey() {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return { userId: null }
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed.userId !== 'string' || !parsed.userId) {
      sessionStorage.removeItem(KEY)
      logger.warn('session.storage_invalid')
      return { userId: null, invalid: true }
    }
    return { userId: parsed.userId }
  } catch (error) {
    logger.warn('session.storage_unreadable', { message: error?.message || 'storage unavailable' })
    try {
      sessionStorage.removeItem(KEY)
    } catch {
      /* storage can be blocked */
    }
    return { userId: null, invalid: true }
  }
}

export function writeSessionKey(userId) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ userId }))
    return true
  } catch (error) {
    logger.warn('session.storage_unavailable', { message: error?.message || 'storage unavailable' })
    return false
  }
}

export function readExerciseChoice() {
  try {
    const raw = sessionStorage.getItem(EXERCISE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    const scenarioId = typeof parsed?.scenarioId === 'string' ? parsed.scenarioId : null
    const gameId = typeof parsed?.gameId === 'string' ? parsed.gameId : null
    if (!scenarioId && !gameId) {
      sessionStorage.removeItem(EXERCISE_KEY)
      logger.warn('exercise.storage_invalid')
      return null
    }
    return { scenarioId, gameId }
  } catch (error) {
    logger.warn('exercise.storage_unreadable', { message: error?.message || 'storage unavailable' })
    try {
      sessionStorage.removeItem(EXERCISE_KEY)
    } catch {
      /* storage can be blocked */
    }
    return null
  }
}

export function writeExerciseChoice(choice) {
  try {
    sessionStorage.setItem(EXERCISE_KEY, JSON.stringify({ scenarioId: choice.scenarioId, gameId: choice.gameId }))
    return true
  } catch (error) {
    logger.warn('exercise.storage_unavailable', { message: error?.message || 'storage unavailable' })
    return false
  }
}

export function clearSessionKey() {
  try {
    sessionStorage.removeItem(KEY)
  } catch (error) {
    logger.warn('session.storage_unavailable', { message: error?.message || 'storage unavailable' })
  }
}
