/**
 * Bridge between the real (HTTP) directory data and the in-memory workbench snapshot in directory.js.
 * Kept free of imports from either so there is no module cycle.
 */
let identity = null
let remote = null
let provider = null

/** { userId: string, features: string[] } of the signed-in user. */
export function setIdentity(value) {
  identity = value
  if (!value) remote = null
}

export function getIdentity() {
  return identity
}

/** The slice of the snapshot served by the backend (users, teams, roles, themes, features, swatches...). */
export function setRemote(slice) {
  remote = slice
}

export function getRemote() {
  return remote
}

/** directory.js registers its snapshot builder so the HTTP layer can return a full snapshot. */
export function registerSnapshot(fn) {
  provider = fn
}

export function currentSnapshot(userId) {
  if (!provider) throw new Error('The workbench snapshot is not registered.')
  return provider(userId)
}
