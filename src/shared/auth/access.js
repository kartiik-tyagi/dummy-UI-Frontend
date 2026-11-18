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

/** Session-level navigation (the workbench snapshot may refine it). */
export function navigationForFunctionalities(functionalities) {
  const groups = [
    { id: 'map', label: 'Map', items: [item('filters', 'Map filters', 'layers'), item('extent', 'Home extent', 'extent')] },
  ]
  const game = [item('resources', 'Resources', 'resources'), item('plans', 'Plans', 'plans')]
  if (hasFunctionality(functionalities, FunctionalityCodes.MANAGE_GAME)) game.push(item('exercise-control', 'Exercise control', 'control'))
  groups.push({ id: 'game', label: 'Game', items: game })
  const admin = []
  if (canOpenDirectory(functionalities)) admin.push(item('directory', 'Users and sides', 'directory'))
  if (canOpenOrbat(functionalities)) admin.push(item('orbat', 'ORBAT', 'orbat'))
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
  return sections
}

/** Which tool panel an application-menu section opens. */
export const SECTION_PANEL = Object.freeze({
  game: 'exercise-control',
  orbat: 'orbat',
  users: 'directory',
})
