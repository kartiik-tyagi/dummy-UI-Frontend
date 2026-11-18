import { del, get, post, put } from '../../shared/api/http'

export const listSides = () => get('/sides')
export const listNodeTypes = () => get('/node-types')
export const listRoles = () => get('/roles')
export const listUsers = () => get('/users')
export const listScenarios = () => get('/scenarios')
export const listGames = (scenarioId) => get(`/scenarios/${scenarioId}/games`)

/** null when the side has no standard ORBAT yet. */
export async function getStandardOrbat(sideId) {
  try {
    return await get(`/sides/${sideId}/standard-orbat`)
  } catch (error) {
    if (error?.status === 404 || error?.code === 'NOT_FOUND') return null
    throw error
  }
}

export const createStandardOrbat = (sideId) => post(`/sides/${sideId}/standard-orbat`)

export const saveStandardOrbat = (sideId, { orbatJson, metadata, version }) =>
  put(`/sides/${sideId}/standard-orbat`, { orbatJson, metadata, version })

// Playing ORBATs and alliances belong to a game.
export const listPlayingOrbats = (gameId) => get(`/games/${gameId}/playing-orbats`)

export const replicatePlayingOrbat = (gameId, sideId) =>
  post(`/games/${gameId}/playing-orbats/replica`, { sideId })

export const savePlayingOrbat = (gameId, id, { orbatJson, metadata, version }) =>
  put(`/games/${gameId}/playing-orbats/${id}`, { orbatJson, metadata, version })

export const deletePlayingOrbat = (gameId, id) => del(`/games/${gameId}/playing-orbats/${id}`)

export const listAlliances = (gameId) => get(`/games/${gameId}/alliances`)

export const createAlliance = (gameId, body) => post(`/games/${gameId}/alliances`, body)

export const markAsUser = (body) => post('/users/mark-from-node', body)
