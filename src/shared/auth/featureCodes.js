/** Development-time feature catalogue. Must match backend FeatureCodes.java */
export const FeatureCodes = Object.freeze({
  MAP_VIEW: 'MAP_VIEW',
  MANAGE_THEMES: 'MANAGE_THEMES',
  MANAGE_TEAMS: 'MANAGE_TEAMS',
  MANAGE_NODE_TYPES: 'MANAGE_NODE_TYPES',
  MANAGE_ROLES: 'MANAGE_ROLES',
  MANAGE_USERS: 'MANAGE_USERS',
  MARK_AS_USER: 'MARK_AS_USER',
  MANAGE_STANDARD_ORBAT: 'MANAGE_STANDARD_ORBAT',
  MANAGE_PLAYING_ORBAT: 'MANAGE_PLAYING_ORBAT',
  MANAGE_ALLIANCE: 'MANAGE_ALLIANCE',
  MANAGE_SCENARIO: 'MANAGE_SCENARIO',
  MANAGE_GAME: 'MANAGE_GAME',
  MANAGE_ICONS: 'MANAGE_ICONS',
  VIEW_AUDIT: 'VIEW_AUDIT',
  CHOOSE_THEME: 'CHOOSE_THEME',
})

export const ALL_FEATURE_CODES = Object.freeze(Object.values(FeatureCodes))

export function hasFeature(features, code) {
  if (!Array.isArray(features) || !code) return false
  return features.includes(code)
}
