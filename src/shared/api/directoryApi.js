import { FeatureCodes, hasFeature } from '../auth/featureCodes'
import { hasAny } from '../auth/access'
import { logger } from '../lib/logger'
import { swatchById, swatches } from '../theme/swatches'
import { ApiError } from './errors'
import { currentSnapshot, getIdentity, setRemote } from './directoryRemote'
import { del, get, patch, post, put } from './http'
import { numericId, roleFromEntity, teamFromEntity, themeFromEntity, userFromEntity } from './mappers'
import { setToken } from './tokenStore'

/** A read the signed-in user may not be allowed; the workbench still opens without it. */
async function soft(promise, fallback) {
  try {
    return (await promise) ?? fallback
  } catch (error) {
    if (error?.code === 'UNAUTHORIZED') throw error
    logger.info('directory.optional_unavailable', { code: error?.code || 'UNKNOWN', message: error?.message })
    return fallback
  }
}

function featuresOf(userId) {
  const identity = getIdentity()
  if (!identity || identity.userId !== userId) {
    throw new ApiError('This session is no longer valid.', 'SESSION')
  }
  return identity.features
}

function requireName(value, message) {
  const text = String(value || '').trim()
  if (!text) throw new ApiError(message, 'VALIDATION')
  return text
}

/** Loads users, teams, roles, features and themes the caller may see, and returns the full workbench snapshot. */
export async function loadWorkbench(userId) {
  const features = featuresOf(userId)
  const canUsers = hasFeature(features, FeatureCodes.MANAGE_USERS)
  const canRoles = hasAny(features, FeatureCodes.MANAGE_ROLES, FeatureCodes.MANAGE_USERS, FeatureCodes.MARK_AS_USER)
  const canFeatures = hasFeature(features, FeatureCodes.MANAGE_ROLES)

  const [teamRows, themeRows, roleRows, userRows, featureRows] = await Promise.all([
    soft(get('/teams'), []),
    soft(get('/themes'), []),
    canRoles ? soft(get('/roles'), []) : Promise.resolve([]),
    canUsers ? soft(get('/users'), []) : Promise.resolve([]),
    canFeatures ? soft(get('/features'), []) : Promise.resolve([]),
  ])

  const teams = teamRows.map(teamFromEntity)
  const roles = roleRows.map(roleFromEntity)
  const users = userRows.map((row) =>
    userFromEntity(row, { roles: roleRows, teams: teamRows }),
  ).map((user) => ({ ...user, protected: user.name === 'APEX' }))

  setRemote({
    users,
    teams,
    roles,
    directoryThemes: themeRows.map(themeFromEntity),
    themeChoices: themeRows.map((row) => ({ id: String(row.id), name: row.name, takenBy: null })),
    swatches: swatches.map((item) => ({ ...item, takenBy: null })),
    featureCatalog: featureRows.map((row) => ({ id: row.id, code: row.code, name: row.name, description: row.description || '' })),
    access: [...features],
  })
  logger.info('workbench.loaded', { userId, users: users.length, teams: teams.length, roles: roles.length })
  return currentSnapshot(userId)
}

async function after(userId, event, fields) {
  logger.info(event, { userId, ...fields })
  return loadWorkbench(userId)
}

function teamBody(draft, current) {
  const name = requireName(draft?.name ?? current?.name, 'Enter a name.')
  const swatch = swatchById(draft?.swatchId)
  const colour = swatch?.color || draft?.colour || current?.colour || null
  const icon = draft?.icon !== undefined ? draft.icon : current?.icon || null
  const themeId = draft?.themeId === '' || draft?.themeId == null ? numericId(current?.themeId) : numericId(draft.themeId)
  return {
    name,
    description: draft?.description ?? current?.description ?? '',
    colour: colour || null,
    icon: icon || null,
    themeId: themeId ?? null,
  }
}

function findRemote(key, id, userId) {
  featuresOf(userId)
  return currentSnapshot(userId)[key]?.find((item) => item.id === String(id)) || null
}

export async function saveTeam(userId, draft) {
  featuresOf(userId)
  if (draft?.id) {
    const current = findRemote('teams', draft.id, userId)
    await put(`/teams/${numericId(draft.id)}`, teamBody(draft, current))
    return after(userId, 'team.saved', { teamId: draft.id })
  }
  const created = await post('/teams', teamBody(draft, null))
  return after(userId, 'team.saved', { teamId: created?.id })
}

export async function deleteTeam(userId, teamId) {
  featuresOf(userId)
  await del(`/teams/${numericId(teamId)}`)
  return after(userId, 'team.deleted', { teamId })
}

export async function saveRole(userId, draft) {
  featuresOf(userId)
  const name = requireName(draft?.name, 'Enter a name.')
  if (draft?.id) {
    const current = findRemote('roles', draft.id, userId)
    await put(`/roles/${numericId(draft.id)}`, {
      code: draft.code || current?.code,
      name,
      description: draft.description ?? current?.description ?? '',
      featureIds: draft.featureIds ?? current?.featureIds ?? [],
    })
    return after(userId, 'role.saved', { roleId: draft.id })
  }
  const code = String(draft?.newId || draft?.code || '').trim()
  if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(code)) {
    throw new ApiError('Use a role code of letters, digits and underscores, starting with a letter.', 'VALIDATION')
  }
  await post('/roles', { code, name, description: draft?.description || '', featureIds: draft?.featureIds || [] })
  return after(userId, 'role.saved', { code })
}

export async function deleteRole(userId, roleId) {
  featuresOf(userId)
  await del(`/roles/${numericId(roleId)}`)
  return after(userId, 'role.deleted', { roleId })
}

/**
 * Users cannot be created here: the backend creates them from an ORBAT node (Mark as user).
 * Existing users can be renamed, given roles, activated or deactivated, or have their password reset.
 */
export async function saveUser(userId, draft) {
  featuresOf(userId)
  if (!draft?.id) {
    throw new ApiError('Users are created from an ORBAT node. Open ORBAT and choose Mark as user.', 'VALIDATION')
  }
  const body = {}
  const name = draft.name ?? draft.title
  if (name !== undefined) body.name = requireName(name, 'Enter a name.')
  if (draft.password) body.password = draft.password
  if (Array.isArray(draft.roleIds)) body.roleIds = draft.roleIds.map(numericId).filter((id) => id !== null)
  if (typeof draft.active === 'boolean') body.active = draft.active
  if (draft.teamId) body.administeredTeamId = numericId(draft.teamId)
  if (!Object.keys(body).length) throw new ApiError('Nothing was changed.', 'VALIDATION')
  await patch(`/users/${numericId(draft.id)}`, body)
  return after(userId, 'user.saved', { id: draft.id })
}

/** The backend has no delete for users; removing one deactivates it (and ends its sessions). */
export async function deleteUser(userId, targetId) {
  featuresOf(userId)
  await patch(`/users/${numericId(targetId)}`, { active: false })
  return after(userId, 'user.deactivated', { targetId })
}

/** Appoints the team a user administers. */
export async function assignUserTeam(userId, targetId, teamId) {
  featuresOf(userId)
  const id = numericId(teamId)
  if (id === null) throw new ApiError('Choose a team.', 'VALIDATION')
  await patch(`/users/${numericId(targetId)}`, { administeredTeamId: id })
  return after(userId, 'user.team_assigned', { targetId, teamId })
}

/**
 * Changing a password needs MANAGE_USERS on the backend. The current password is verified by signing in
 * with it; the old sessions end with the change, so a fresh sign-in keeps this one alive.
 */
export async function updatePassword(userId, currentPassword, nextPassword) {
  const features = featuresOf(userId)
  if (!nextPassword || nextPassword.length < 3) throw new ApiError('Use at least 3 characters.', 'VALIDATION')
  if (nextPassword === currentPassword) throw new ApiError('Choose a different password.', 'VALIDATION')
  if (!hasFeature(features, FeatureCodes.MANAGE_USERS)) {
    throw new ApiError('Ask an administrator to change your password.', 'FORBIDDEN')
  }
  const name = (await get('/auth/me')).name
  const verified = await post('/auth/login', { name, password: currentPassword }, { auth: false })
  setToken(verified.token)
  await patch(`/users/${numericId(userId)}`, { password: nextPassword })
  const renewed = await post('/auth/login', { name, password: nextPassword }, { auth: false })
  setToken(renewed.token)
  return loadWorkbench(userId)
}
