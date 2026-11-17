import { logger } from '../lib/logger'
import { ApiError } from './errors'
import { clearToken, getToken } from './tokenStore'

export const API_BASE = '/api/v1'

let unauthorizedHandler = null

/** The session store registers here so a 401 signs the user out. */
export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler
}

function urlFor(path, query) {
  const url = path.startsWith('/api/') ? path : `${API_BASE}${path.startsWith('/') ? '' : '/'}${path}`
  if (!query) return url
  const params = new URLSearchParams()
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') params.append(key, String(value))
  })
  const text = params.toString()
  return text ? `${url}?${text}` : url
}

async function toError(response) {
  let payload = null
  try {
    payload = await response.json()
  } catch {
    payload = null
  }
  const code = payload?.code || (response.status === 401 ? 'UNAUTHORIZED' : response.status === 403 ? 'FORBIDDEN' : 'HTTP_' + response.status)
  const message = payload?.message || `The request failed (${response.status}).`
  return new ApiError(message, code, {
    status: response.status,
    fieldErrors: payload?.fieldErrors,
    requestId: payload?.requestId,
  })
}

async function send(path, { method = 'GET', body, query, auth = true, token, formData, signal } = {}) {
  const headers = { Accept: 'application/json' }
  const bearer = token || (auth ? getToken() : null)
  if (bearer) headers.Authorization = `Bearer ${bearer}`
  const init = { method, headers, signal }
  if (formData) {
    init.body = formData
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    init.body = JSON.stringify(body)
  }
  let response
  try {
    response = await fetch(urlFor(path, query), init)
  } catch (error) {
    if (error?.name === 'AbortError') throw error
    logger.warn('http.unreachable', { path, message: error?.message || 'network error' })
    throw new ApiError('The Jayant service is not reachable.', 'UNAVAILABLE')
  }
  if (!response.ok) {
    const failure = await toError(response)
    if (response.status === 401 && auth && bearer) {
      clearToken()
      unauthorizedHandler?.(failure)
    }
    throw failure
  }
  return response
}

/** JSON request. Resolves null for 204 / empty bodies. */
export async function http(path, options) {
  const response = await send(path, options)
  if (response.status === 204) return null
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    throw new ApiError('The service returned an unreadable answer.', 'BAD_RESPONSE', { status: response.status })
  }
}

/** Binary request (icon previews need the bearer header, so they cannot be plain <img src>). */
export async function httpBlob(path, options) {
  const response = await send(path, options)
  return response.blob()
}

export const get = (path, query, options) => http(path, { ...options, method: 'GET', query })
export const post = (path, body, options) => http(path, { ...options, method: 'POST', body })
export const put = (path, body, options) => http(path, { ...options, method: 'PUT', body })
export const patch = (path, body, options) => http(path, { ...options, method: 'PATCH', body })
export const del = (path, options) => http(path, { ...options, method: 'DELETE' })
