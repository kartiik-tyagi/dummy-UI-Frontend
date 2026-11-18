import { loginPalette, paletteById, palettes } from '../theme/palettes'
import { swatches } from '../theme/swatches'

const STRING_KEYS = [
  'primary', 'primaryContrast', 'secondary', 'secondaryContrast', 'backgroundDefault', 'backgroundPaper',
  'textPrimary', 'textSecondary', 'textDisabled', 'divider', 'error', 'errorContrast', 'warning', 'warningContrast',
  'success', 'successContrast', 'info', 'infoContrast', 'fontFamily',
]
const NUMBER_KEYS = ['fontWeightLight', 'fontWeightRegular', 'fontWeightMedium', 'fontWeightBold', 'borderRadius']

function normal(value) {
  return String(value || '').trim().toLowerCase()
}

function baseFor(config, name) {
  const wanted = [config.paletteId, config.id, name].map(normal).filter(Boolean)
  const byName = palettes.find((item) => wanted.includes(normal(item.id)) || wanted.includes(normal(item.name)))
  if (byName) return byName
  const mode = config.mode === 'light' ? 'light' : 'dark'
  return palettes.find((item) => item.mode === mode && item.id === (mode === 'light' ? 'field-day' : 'field-night')) || loginPalette
}

/**
 * Backend Theme entity -> the theme object the app understands. The stored configJson wins field by field;
 * anything missing comes from the closest built-in palette.
 */
export function themeFromEntity(entity) {
  const config = entity?.configJson && typeof entity.configJson === 'object' ? entity.configJson : {}
  const base = baseFor(config, entity?.name)
  const merged = { ...base }
  STRING_KEYS.forEach((key) => {
    if (typeof config[key] === 'string' && config[key]) merged[key] = config[key]
  })
  NUMBER_KEYS.forEach((key) => {
    if (typeof config[key] === 'number' && Number.isFinite(config[key])) merged[key] = config[key]
  })
  const mode = config.mode === 'light' || config.mode === 'dark' ? config.mode : base.mode
  return {
    ...merged,
    mode,
    id: String(entity.id),
    name: entity.name || base.name,
    family: typeof config.family === 'string' && config.family ? config.family : base.family || 'Custom',
    defaultTheme: Boolean(entity.defaultTheme),
  }
}

export function paletteFallback() {
  return { ...paletteById('field-night'), id: 'local-default', name: 'Default', family: 'Pine', defaultTheme: true }
}

export function roleLabel(code) {
  return String(code || '')
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function swatchForColour(colour) {
  const wanted = normal(colour)
  return swatches.find((item) => normal(item.color) === wanted) || null
}

export function sideFromEntity(side) {
  const swatch = swatchForColour(side.colour)
  return {
    id: String(side.id),
    name: side.name,
    kind: side.kind || 'country',
    description: side.description || '',
    icon: side.icon || '',
    colour: side.colour || '',
    color: side.colour || '',
    swatchId: swatch?.id || '',
    themeId: side.themeId == null ? '' : String(side.themeId),
  }
}

export function userFromEntity(user, { roles = [], sides = [] } = {}) {
  const names = (user.roleIds || []).map((id) => roles.find((role) => role.id === id)?.name).filter(Boolean)
  const side = sides.find((item) => item.id === user.administeredSideId)
  return {
    id: String(user.id),
    numericId: user.id,
    name: user.name,
    title: user.name,
    role: names.join(', '),
    roleIds: user.roleIds || [],
    service: side?.name || '',
    avatarUrl: '',
    sideId: user.administeredSideId == null ? null : String(user.administeredSideId),
    active: user.active !== false,
    themeId: user.themeId == null ? '' : String(user.themeId),
    standardOrbatId: user.standardOrbatId ?? null,
    standardNodeId: user.standardNodeId ?? null,
    playingOrbatId: user.playingOrbatId ?? null,
    playingNodeId: user.playingNodeId ?? null,
  }
}

export function roleFromEntity(role) {
  return {
    id: String(role.id),
    numericId: role.id,
    code: role.code,
    name: role.name,
    description: role.description || '',
    functionalityIds: role.functionalityIds || [],
  }
}

export function numericId(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}
