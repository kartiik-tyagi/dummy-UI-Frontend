import { FeatureCodes, hasFeature } from './featureCodes'

export function hasAny(features, ...codes) {
  return codes.some((code) => hasFeature(features, code))
}

/** Users, teams, roles or themes can be administered. */
export function canOpenDirectory(features) {
  return hasAny(
    features,
    FeatureCodes.MANAGE_USERS,
    FeatureCodes.MANAGE_TEAMS,
    FeatureCodes.MANAGE_ROLES,
    FeatureCodes.MANAGE_THEMES,
  )
}

/** Any ORBAT capability opens the ORBAT panel. */
export function canOpenOrbat(features) {
  return hasAny(
    features,
    FeatureCodes.MANAGE_STANDARD_ORBAT,
    FeatureCodes.MANAGE_PLAYING_ORBAT,
    FeatureCodes.MANAGE_ALLIANCE,
    FeatureCodes.MARK_AS_USER,
  )
}

export function isAdminLike(features) {
  return canOpenDirectory(features) || canOpenOrbat(features)
}

function item(id, label, icon) {
  return { id, label, icon }
}

/** Session-level navigation (the workbench snapshot may refine it). */
export function navigationForFeatures(features) {
  const groups = [
    { id: 'map', label: 'Map', items: [item('filters', 'Map filters', 'layers'), item('extent', 'Home extent', 'extent')] },
  ]
  const game = [item('resources', 'Resources', 'resources'), item('plans', 'Plans', 'plans')]
  if (hasFeature(features, FeatureCodes.MANAGE_GAME)) game.push(item('exercise-control', 'Exercise control', 'control'))
  groups.push({ id: 'game', label: 'Game', items: game })
  const admin = []
  if (canOpenDirectory(features)) admin.push(item('directory', 'Users and teams', 'directory'))
  if (canOpenOrbat(features)) admin.push(item('orbat', 'ORBAT', 'orbat'))
  if (admin.length) groups.push({ id: 'admin', label: 'Administration', items: admin })
  return groups
}

/** Application-menu sections, gated by feature. */
export function sectionsForFeatures(features) {
  const sections = []
  if (hasFeature(features, FeatureCodes.MANAGE_SCENARIO)) {
    sections.push({ id: 'scenario', kicker: 'Exercise', label: 'Scenario management', icon: 'flag' })
  }
  if (hasFeature(features, FeatureCodes.MANAGE_GAME)) {
    sections.push({ id: 'game', kicker: 'Exercise', label: 'Game', icon: 'control' })
  }
  if (canOpenOrbat(features)) sections.push({ id: 'orbat', kicker: 'Records', label: 'ORBAT', icon: 'orbat' })
  if (canOpenDirectory(features)) sections.push({ id: 'users', kicker: 'Access', label: 'User management', icon: 'directory' })
  return sections
}

/** Which tool panel an application-menu section opens. */
export const SECTION_PANEL = Object.freeze({
  game: 'exercise-control',
  orbat: 'orbat',
  users: 'directory',
})
