/** Development-time functionality catalogue. Must match backend FunctionalityCodes.java */
export const FunctionalityCodes = Object.freeze({
  MAP_VIEW: 'MAP_VIEW',
  MANAGE_MAP: 'MANAGE_MAP',
  MANAGE_THEMES: 'MANAGE_THEMES',
  MANAGE_SIDES: 'MANAGE_SIDES',
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

export const ALL_FUNCTIONALITY_CODES = Object.freeze(Object.values(FunctionalityCodes))

export function hasFunctionality(functionalities, code) {
  if (!Array.isArray(functionalities) || !code) return false
  return functionalities.includes(code)
}
