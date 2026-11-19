/** A theme row from GET /themes, with its single holder. */
export function asTheme(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    defaultTheme: Boolean(row.defaultTheme),
    configJson: row.configJson || null,
    holderKind: row.holderKind || 'FREE',
    holderId: row.holderId ?? null,
    holderName: row.holderName || '',
    loginTheme: Boolean(row.loginTheme),
  }
}

/** Free themes, plus the theme this side or user already holds. */
export function selectableThemes(themes, holderKind, holderId) {
  return themes.filter((theme) => {
    if (!theme.holderKind || theme.holderKind === 'FREE') return true
    if (holderId == null || holderId === '') return false
    return theme.holderKind === holderKind && String(theme.holderId) === String(holderId)
  })
}

export function holderLabel(theme) {
  if (!theme || theme.holderKind === 'FREE') return 'Free'
  if (theme.loginTheme) return 'APEX · login'
  if (theme.holderKind === 'SIDE') return `Team ${theme.holderName}`
  if (theme.holderKind === 'USER') return theme.holderName
  return 'In use'
}
