/** Theme colours an icon is allowed to reference. The same names are enforced when a drawing is saved. */

export const ICON_TOKENS = [
  { id: 'primary', label: 'Primary' },
  { id: 'primaryContrast', label: 'On primary' },
  { id: 'secondary', label: 'Secondary' },
  { id: 'secondaryContrast', label: 'On secondary' },
  { id: 'error', label: 'Error' },
  { id: 'errorContrast', label: 'On error' },
  { id: 'warning', label: 'Warning' },
  { id: 'warningContrast', label: 'On warning' },
  { id: 'success', label: 'Success' },
  { id: 'successContrast', label: 'On success' },
  { id: 'info', label: 'Info' },
  { id: 'infoContrast', label: 'On info' },
  { id: 'textPrimary', label: 'Text' },
  { id: 'textSecondary', label: 'Secondary text' },
  { id: 'textDisabled', label: 'Disabled text' },
  { id: 'backgroundPaper', label: 'Paper' },
  { id: 'backgroundDefault', label: 'Background' },
  { id: 'divider', label: 'Divider' },
]

export const ICON_TOKEN_IDS = new Set(ICON_TOKENS.map((token) => token.id))

function pick(value, fallback) {
  return value == null || value === '' ? fallback : value
}

/** CSS variables for one MUI theme. Inline SVG paints with var(--wp-*) follow whoever is looking. */
export function iconCssVars(theme) {
  const palette = theme?.palette || {}
  return {
    '--wp-primary': pick(palette.primary?.main, '#3ddea0'),
    '--wp-primaryContrast': pick(palette.primary?.contrastText, '#05281c'),
    '--wp-secondary': pick(palette.secondary?.main, '#3ddea0'),
    '--wp-secondaryContrast': pick(palette.secondary?.contrastText, '#05281c'),
    '--wp-error': pick(palette.error?.main, '#e3c4bf'),
    '--wp-errorContrast': pick(palette.error?.contrastText, '#4a2b26'),
    '--wp-warning': pick(palette.warning?.main, '#ddc7a7'),
    '--wp-warningContrast': pick(palette.warning?.contrastText, '#433623'),
    '--wp-success': pick(palette.success?.main, '#caecd3'),
    '--wp-successContrast': pick(palette.success?.contrastText, '#264a30'),
    '--wp-info': pick(palette.info?.main, '#b8c9e0'),
    '--wp-infoContrast': pick(palette.info?.contrastText, '#26364a'),
    '--wp-textPrimary': pick(palette.text?.primary, '#e7fff4'),
    '--wp-textSecondary': pick(palette.text?.secondary, '#b7e6d0'),
    '--wp-textDisabled': pick(palette.text?.disabled, '#89bda5'),
    '--wp-backgroundPaper': pick(palette.background?.paper, '#145c45'),
    '--wp-backgroundDefault': pick(palette.background?.default, '#0c3d2e'),
    '--wp-divider': pick(palette.divider, 'rgba(231, 255, 244, 0.28)'),
  }
}

export function tokenColor(theme, id) {
  return iconCssVars(theme)[`--wp-${id}`]
}
