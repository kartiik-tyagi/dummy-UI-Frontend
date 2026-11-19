import { del, get, post, put } from './http'

/**
 * The single asset-management row: the base icon folder the picker reads from and the per-icon labels.
 * Reading is open to any signed-in user; changes need MANAGE_ICONS on the backend.
 */

/** { id, path, labels: { [relativeIconPath]: label }, lastUpdated, updatedBy }. */
export const getAssetSettings = () => get('/asset-management')

/** Changes the base icon folder (relative path). */
export const updateAssetPath = (path) => put('/asset-management', { path })

/** Sets one icon's label. The label must not be blank. */
export const setIconLabel = (path, label) => put('/asset-management/labels', { path, label })

/** Clears one icon's label so it falls back to the file name. */
export const resetIconLabel = (path) => del('/asset-management/labels', { query: { path } })

/** Saves a drawing as a new SVG in the icon folder. Name may omit .svg. */
export const drawIcon = ({ name, directory, label, svg }) => post('/icons/draw', { name, directory, label, svg })

/** Replaces the drawing stored at an existing SVG path. The file name does not change. */
export const reviseIcon = ({ path, label, svg }) => put('/icons/draw', { path, label, svg })
