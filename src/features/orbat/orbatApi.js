import { del, get, post, put } from '../../shared/api/http'

export const listTeams = () => get('/teams')
export const listNodeTypes = () => get('/node-types')
export const listRoles = () => get('/roles')
export const listUsers = () => get('/users')
export const listScenarios = () => get('/scenarios')

/** null when the team has no standard ORBAT yet. */
export async function getStandardOrbat(teamId) {
  try {
    return await get(`/teams/${teamId}/standard-orbat`)
  } catch (error) {
    if (error?.status === 404 || error?.code === 'NOT_FOUND') return null
    throw error
  }
}

export const createStandardOrbat = (teamId) => post(`/teams/${teamId}/standard-orbat`)

export const saveStandardOrbat = (teamId, { orbatJson, metadata, version }) =>
  put(`/teams/${teamId}/standard-orbat`, { orbatJson, metadata, version })

export const listPlayingOrbats = (scenarioId) => get(`/scenarios/${scenarioId}/playing-orbats`)

export const replicatePlayingOrbat = (scenarioId, teamId) =>
  post(`/scenarios/${scenarioId}/playing-orbats/replica`, { teamId })

export const savePlayingOrbat = (id, { orbatJson, metadata, version }) =>
  put(`/playing-orbats/${id}`, { orbatJson, metadata, version })

export const deletePlayingOrbat = (id) => del(`/playing-orbats/${id}`)

export const listAlliances = (scenarioId) => get(`/scenarios/${scenarioId}/alliances`)

export const createAlliance = (scenarioId, body) => post(`/scenarios/${scenarioId}/alliances`, body)

export const markAsUser = (body) => post('/users/mark-from-node', body)
