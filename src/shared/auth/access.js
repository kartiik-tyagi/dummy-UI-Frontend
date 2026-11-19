import { FunctionalityCodes, hasFunctionality } from './functionalityCodes'

export function hasAny(functionalities, ...codes) {
  return codes.some((code) => hasFunctionality(functionalities, code))
}

/** Any of the separate administration screens. */
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
  if (canOpenOrbat(functionalities)) sections.push({ id: 'orbat', kicker: 'ORBAT', label: 'ORBAT', icon: 'orbat' })
  if (hasFunctionality(functionalities, FunctionalityCodes.MANAGE_SIDES)) {
    sections.push({ id: 'teams', kicker: 'Standard data', label: 'Teams', icon: 'teams' })
  }
  if (hasFunctionality(functionalities, FunctionalityCodes.MANAGE_NODE_TYPES)) {
    sections.push({ id: 'node-types', kicker: 'Standard data', label: 'Node types', icon: 'table' })
  }
  if (hasFunctionality(functionalities, FunctionalityCodes.MANAGE_THEMES)) {
    sections.push({ id: 'themes', kicker: 'Standard data', label: 'Themes', icon: 'themes' })
  }
  if (hasFunctionality(functionalities, FunctionalityCodes.MANAGE_USERS)) {
    sections.push({ id: 'users', kicker: 'Access', label: 'Users', icon: 'users' })
  }
  if (hasFunctionality(functionalities, FunctionalityCodes.MANAGE_ROLES)) {
    sections.push({ id: 'roles', kicker: 'Access', label: 'Roles', icon: 'roles' })
  }
  if (hasFunctionality(functionalities, FunctionalityCodes.VIEW_AUDIT)) {
    sections.push({ id: 'audit', kicker: 'Records', label: 'Audit', icon: 'sessions' })
  }
  if (hasFunctionality(functionalities, FunctionalityCodes.MANAGE_ICONS)) {
    sections.push({ id: 'icons', kicker: 'Records', label: 'Icons', icon: 'table' })
  }
  return sections
}

/** Full-page routes for application-menu sections (leave the map shell). */
export const SECTION_ROUTE = Object.freeze({
  scenario: '/exercise/scenarios',
  game: '/exercise/games',
  teams: '/standard/teams',
  themes: '/standard/themes',
  'node-types': '/standard/node-types',
})

/** Which tool panel an application-menu section opens (dock panels). */
export const SECTION_PANEL = Object.freeze({
  orbat: 'orbat',
  users: 'users',
  roles: 'roles',
  icons: 'icons',
  audit: 'audit',
})
