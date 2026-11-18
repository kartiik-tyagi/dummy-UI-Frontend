import { FunctionalityCodes, hasFunctionality } from '../auth/functionalityCodes'
import { hasAny } from '../auth/access'
import { logger } from '../lib/logger'
import { swatchById, swatches } from '../theme/swatches'
import { ApiError } from './errors'
import { currentSnapshot, getIdentity, setRemote } from './directoryRemote'
import { del, get, patch, post, put } from './http'
import { applyMapCatalog } from './directory'
import { numericId, roleFromEntity, sideFromEntity, themeFromEntity, userFromEntity } from './mappers'
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

function functionalitiesOf(userId) {
  const identity = getIdentity()
  if (!identity || identity.userId !== userId) {
    throw new ApiError('This session is no longer valid.', 'SESSION')
  }
  return identity.functionalities
}

function requireName(value, message) {
  const text = String(value || '').trim()
  if (!text) throw new ApiError(message, 'VALIDATION')
  return text
}

/** Loads users, sides, roles, functionalities and themes the caller may see, and returns the full workbench snapshot. */
export async function loadWorkbench(userId) {
  const functionalities = functionalitiesOf(userId)
  const canUsers = hasFunctionality(functionalities, FunctionalityCodes.MANAGE_USERS)
  const canRoles = hasAny(functionalities, FunctionalityCodes.MANAGE_ROLES, FunctionalityCodes.MANAGE_USERS, FunctionalityCodes.MARK_AS_USER)
  const canFunctionalities = hasFunctionality(functionalities, FunctionalityCodes.MANAGE_ROLES)

  const [sideRows, themeRows, roleRows, userRows, functionalityRows, mapConfig] = await Promise.all([
    soft(get('/sides'), []),
    soft(get('/themes'), []),
    canRoles ? soft(get('/roles'), []) : Promise.resolve([]),
    canUsers ? soft(get('/users'), []) : Promise.resolve([]),
    canFunctionalities ? soft(get('/functionalities'), []) : Promise.resolve([]),
    soft(get('/map/config'), null),
  ])

  const sides = sideRows.map(sideFromEntity)
  const roles = roleRows.map(roleFromEntity)
  const users = userRows.map((row) =>
    userFromEntity(row, { roles: roleRows, sides: sideRows }),
  ).map((user) => ({ ...user, protected: user.name === 'APEX' }))

  applyMapCatalog(mapConfig)

  setRemote({
    users,
    sides,
    roles,
    directoryThemes: themeRows.map(themeFromEntity),
    themeChoices: themeRows.map((row) => ({ id: String(row.id), name: row.name, takenBy: null })),
    swatches: swatches.map((item) => ({ ...item, takenBy: null })),
    functionalityCatalog: functionalityRows.map((row) => ({ id: row.id, code: row.code, name: row.name, description: row.description || '' })),
    access: [...functionalities],
    mapConfig,
  })
  logger.info('workbench.loaded', { userId, users: users.length, sides: sides.length, roles: roles.length, mapLayers: mapConfig?.layers?.length || 0 })
  return currentSnapshot(userId)
}

async function after(userId, event, fields) {
  logger.info(event, { userId, ...fields })
  return loadWorkbench(userId)
}

function sideBody(draft, current) {
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
  functionalitiesOf(userId)
  return currentSnapshot(userId)[key]?.find((item) => item.id === String(id)) || null
}

export async function saveSide(userId, draft) {
  functionalitiesOf(userId)
  if (draft?.id) {
    const current = findRemote('sides', draft.id, userId)
    await put(`/sides/${numericId(draft.id)}`, sideBody(draft, current))
    return after(userId, 'side.saved', { sideId: draft.id })
  }
  const created = await post('/sides', sideBody(draft, null))
  return after(userId, 'side.saved', { sideId: created?.id })
}

export async function deleteSide(userId, sideId) {
  functionalitiesOf(userId)
  await del(`/sides/${numericId(sideId)}`)
  return after(userId, 'side.deleted', { sideId })
}

export async function saveRole(userId, draft) {
  functionalitiesOf(userId)
  const name = requireName(draft?.name, 'Enter a name.')
  if (draft?.id) {
    const current = findRemote('roles', draft.id, userId)
    await put(`/roles/${numericId(draft.id)}`, {
      code: draft.code || current?.code,
      name,
      description: draft.description ?? current?.description ?? '',
      functionalityIds: draft.functionalityIds ?? current?.functionalityIds ?? [],
    })
    return after(userId, 'role.saved', { roleId: draft.id })
  }
  const code = String(draft?.newId || draft?.code || '').trim()
  if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(code)) {
    throw new ApiError('Use a role code of letters, digits and underscores, starting with a letter.', 'VALIDATION')
  }
  await post('/roles', { code, name, description: draft?.description || '', functionalityIds: draft?.functionalityIds || [] })
  return after(userId, 'role.saved', { code })
}

export async function deleteRole(userId, roleId) {
  functionalitiesOf(userId)
  await del(`/roles/${numericId(roleId)}`)
  return after(userId, 'role.deleted', { roleId })
}

/**
 * Users cannot be created here: the backend creates them from an ORBAT node (Mark as user).
 * Existing users can be renamed, given roles, activated or deactivated, or have their password reset.
 */
export async function saveUser(userId, draft) {
  functionalitiesOf(userId)
  if (!draft?.id) {
    throw new ApiError('Users are created from an ORBAT node. Open ORBAT and choose Mark as user.', 'VALIDATION')
  }
  const body = {}
  const name = draft.name ?? draft.title
  if (name !== undefined) body.name = requireName(name, 'Enter a name.')
  if (draft.password) body.password = draft.password
  if (Array.isArray(draft.roleIds)) body.roleIds = draft.roleIds.map(numericId).filter((id) => id !== null)
  if (typeof draft.active === 'boolean') body.active = draft.active
  if (draft.sideId) body.administeredSideId = numericId(draft.sideId)
  if (!Object.keys(body).length) throw new ApiError('Nothing was changed.', 'VALIDATION')
  await patch(`/users/${numericId(draft.id)}`, body)
  return after(userId, 'user.saved', { id: draft.id })
}

/** The backend has no delete for users; removing one deactivates it (and ends its sessions). */
export async function deleteUser(userId, targetId) {
  functionalitiesOf(userId)
  await patch(`/users/${numericId(targetId)}`, { active: false })
  return after(userId, 'user.deactivated', { targetId })
}

/** Appoints the side a user administers. */
export async function assignUserSide(userId, targetId, sideId) {
  functionalitiesOf(userId)
  const id = numericId(sideId)
  if (id === null) throw new ApiError('Choose a side.', 'VALIDATION')
  await patch(`/users/${numericId(targetId)}`, { administeredSideId: id })
  return after(userId, 'user.side_assigned', { targetId, sideId })
}

/**
 * Changing a password needs MANAGE_USERS on the backend. The current password is verified by signing in
 * with it; the old sessions end with the change, so a fresh sign-in keeps this one alive.
 */
export async function updatePassword(userId, currentPassword, nextPassword) {
  const functionalities = functionalitiesOf(userId)
  if (!nextPassword || nextPassword.length < 3) throw new ApiError('Use at least 3 characters.', 'VALIDATION')
  if (nextPassword === currentPassword) throw new ApiError('Choose a different password.', 'VALIDATION')
  if (!hasFunctionality(functionalities, FunctionalityCodes.MANAGE_USERS)) {
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
