import { logger } from '../lib/logger'

/** Bearer token: kept in module memory; mirrored to sessionStorage so a reload can resume the session. */
export const TOKEN_KEY = 'jayant.token'

let token = null
let hydrated = false

function readStored() {
  try {
    return sessionStorage.getItem(TOKEN_KEY) || null
  } catch (error) {
    logger.warn('token.storage_unreadable', { message: error?.message || 'storage unavailable' })
    return null
  }
}

export function getToken() {
  if (!hydrated) {
    hydrated = true
    token = readStored()
  }
  return token
}

export function setToken(value) {
  hydrated = true
  token = value || null
  try {
    if (token) sessionStorage.setItem(TOKEN_KEY, token)
    else sessionStorage.removeItem(TOKEN_KEY)
  } catch (error) {
    logger.warn('token.storage_unavailable', { message: error?.message || 'storage unavailable' })
  }
}

export function clearToken() {
  setToken(null)
}
