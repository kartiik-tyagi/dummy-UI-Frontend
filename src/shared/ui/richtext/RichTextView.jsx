import { Box } from '@mui/material'

/** Renders stored scenario/game HTML exactly (bold stays bold). */
export function RichTextView({ html, sx, empty = '—' }) {
  const value = typeof html === 'string' ? html.trim() : ''
  if (!value) {
    return (
      <Box component="span" sx={{ color: 'text.secondary', ...sx }}>
        {empty}
      </Box>
    )
  }
  return (
    <Box
      className="rich-text-view"
      sx={{
        color: 'text.primary',
        fontSize: '0.95rem',
        lineHeight: 1.65,
        '& p': { m: 0, mb: 1 },
        '& p:last-child': { mb: 0 },
        '& h2, & h3': { m: 0, mb: 1, fontWeight: 600 },
        '& h2': { fontSize: '1.15rem' },
        '& h3': { fontSize: '1.05rem' },
        '& ul, & ol': { m: 0, mb: 1, pl: 2.5 },
        '& strong': { fontWeight: 700 },
        '& em': { fontStyle: 'italic' },
        '& u': { textDecoration: 'underline' },
        ...sx,
      }}
      dangerouslySetInnerHTML={{ __html: value }}
    />
  )
}

/** Plain-text preview for lists (strips tags). */
export function richTextPlain(html, max = 100) {
  if (!html) return ''
  const text = String(html)
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/p>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
  if (text.length <= max) return text
  return `${text.slice(0, max - 1)}…`
}
