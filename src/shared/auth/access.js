import { FunctionalityCodes, hasFunctionality } from './functionalityCodes'

export function hasAny(functionalities, ...codes) {
  return codes.some((code) => hasFunctionality(functionalities, code))
}

/** Users, sides, roles or themes can be administered. */
export function canOpenDirectory(functionalities) {
  return hasAny(
    functionalities,
    FunctionalityCodes.MANAGE_USERS,
    FunctionalityCodes.MANAGE_SIDES,
    FunctionalityCodes.MANAGE_ROLES,
    FunctionalityCodes.MANAGE_THEMES,
    FunctionalityCodes.MANAGE_NODE_TYPES,
  )
}

/** Any ORBAT capability opens the ORBAT panel. */
export function canOpenOrbat(functionalities) {
  return hasAny(
    functionalities,
    FunctionalityCodes.MANAGE_STANDARD_ORBAT,
    FunctionalityCodes.MANAGE_PLAYING_ORBAT,
    FunctionalityCodes.MANAGE_ALLIANCE,
    FunctionalityCodes.MARK_AS_USER,
  )
}

export function isAdminLike(functionalities) {
  return canOpenDirectory(functionalities) || canOpenOrbat(functionalities)
}

function item(id, label, icon) {
  return { id, label, icon }
}

/** Session-level navigation: only backend-supported tools. */
export function navigationForFunctionalities(functionalities) {
  const groups = []
  if (hasFunctionality(functionalities, FunctionalityCodes.MAP_VIEW)) {
    const mapItems = [item('filters', 'Map filters', 'layers'), item('extent', 'Home extent', 'extent')]
    if (hasFunctionality(functionalities, FunctionalityCodes.MANAGE_MAP)) {
      mapItems.push(item('map-admin', 'Map catalog', 'settings'))
    }
    groups.push({ id: 'map', label: 'Map', items: mapItems })
  }

  const admin = []
  if (canOpenDirectory(functionalities)) admin.push(item('directory', 'Users and sides', 'directory'))
  if (canOpenOrbat(functionalities)) admin.push(item('orbat', 'ORBAT', 'orbat'))
  if (hasFunctionality(functionalities, FunctionalityCodes.VIEW_AUDIT)) admin.push(item('audit', 'Audit', 'sessions'))
  if (hasFunctionality(functionalities, FunctionalityCodes.MANAGE_ICONS)) admin.push(item('icons', 'Icons', 'table'))
  if (admin.length) groups.push({ id: 'admin', label: 'Administration', items: admin })
  return groups
}

/** Application-menu sections, gated by functionality. */
export function sectionsForFunctionalities(functionalities) {
  const sections = []
  if (hasFunctionality(functionalities, FunctionalityCodes.MANAGE_SCENARIO)) {
    sections.push({ id: 'scenario', kicker: 'Exercise', label: 'Scenario management', icon: 'flag' })
  }
  if (hasFunctionality(functionalities, FunctionalityCodes.MANAGE_GAME)) {
    sections.push({ id: 'game', kicker: 'Exercise', label: 'Game', icon: 'control' })
  }
  if (canOpenOrbat(functionalities)) sections.push({ id: 'orbat', kicker: 'Records', label: 'ORBAT', icon: 'orbat' })
  if (canOpenDirectory(functionalities)) sections.push({ id: 'users', kicker: 'Access', label: 'User management', icon: 'directory' })
  if (hasFunctionality(functionalities, FunctionalityCodes.MANAGE_MAP)) {
    sections.push({ id: 'map', kicker: 'GIS', label: 'Map catalog', icon: 'settings' })
  }
  if (hasFunctionality(functionalities, FunctionalityCodes.VIEW_AUDIT)) {
    sections.push({ id: 'audit', kicker: 'Records', label: 'Audit', icon: 'sessions' })
  }
  return sections
}

/** Full-page routes for application-menu sections (leave the map shell). */
export const SECTION_ROUTE = Object.freeze({
  scenario: '/exercise/scenarios',
  game: '/exercise/games',
})

/** Which tool panel an application-menu section opens (dock panels). */
export const SECTION_PANEL = Object.freeze({
  orbat: 'orbat',
  users: 'directory',
  map: 'map-admin',
  audit: 'audit',
})
