import { Box, Button, Stack, Typography } from '@mui/material'

/** Shared comfort styles for standard-data pages (readable for mid-life operators). */

export const fieldSx = {
  '& .MuiInputBase-input': { fontSize: '1.05rem', py: 1.35 },
  '& .MuiInputLabel-root': { fontSize: '1.05rem' },
  '& .MuiFormHelperText-root': { fontSize: '0.95rem', mt: 0.75, lineHeight: 1.45 },
  '& .MuiSelect-select': { fontSize: '1.05rem' },
}

export const menuItemSx = { fontSize: '1.05rem', py: 1.25 }

export const introSx = {
  fontSize: '1.1rem',
  lineHeight: 1.55,
  color: 'text.primary',
  maxWidth: 720,
}

export const cardSx = {
  p: { xs: 2.5, sm: 3 },
  borderRadius: 2,
  border: 1,
  borderColor: 'divider',
  bgcolor: 'background.paper',
}

export const titleSx = {
  fontWeight: 600,
  fontSize: { xs: '1.25rem', sm: '1.35rem' },
  lineHeight: 1.3,
  color: 'text.primary',
}

export const metaSx = {
  fontSize: '1rem',
  lineHeight: 1.5,
  color: 'text.secondary',
}

export const actionButtonSx = {
  textTransform: 'none',
  fontSize: '1.05rem',
  fontWeight: 600,
  px: 2.25,
  py: 1.1,
  minHeight: 48,
}

export function PageIntro({ children }) {
  return (
    <Typography component="p" sx={{ ...introSx, mb: 0.5 }}>
      {children}
    </Typography>
  )
}

export function EmptyState({ title, body, actionLabel, onAction }) {
  return (
    <Box
      sx={{
        py: { xs: 6, sm: 8 },
        px: 3,
        textAlign: 'center',
        border: 1,
        borderColor: 'divider',
        borderStyle: 'dashed',
        borderRadius: 2,
      }}
    >
      <Typography variant="h5" sx={{ mb: 1.25, fontWeight: 600, fontSize: '1.35rem' }}>
        {title}
      </Typography>
      <Typography sx={{ mb: 3, ...metaSx, maxWidth: 420, mx: 'auto' }}>{body}</Typography>
      {actionLabel && onAction ? (
        <Button variant="contained" size="large" onClick={onAction} sx={actionButtonSx}>
          {actionLabel}
        </Button>
      ) : null}
    </Box>
  )
}

export function ListCard({ title, meta, leading, badges, primaryAction, secondaryAction }) {
  return (
    <Box sx={cardSx}>
      <Stack direction="row" spacing={2} alignItems="flex-start" sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
        {leading}
        <Box sx={{ flex: 1, minWidth: 180 }}>
          <Typography component="h2" sx={titleSx}>
            {title}
          </Typography>
          {meta ? (
            <Typography sx={{ ...metaSx, mt: 0.75 }}>{meta}</Typography>
          ) : null}
        </Box>
        {badges ? (
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ alignItems: 'center' }}>
            {badges}
          </Stack>
        ) : null}
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} useFlexGap>
        {primaryAction}
        {secondaryAction}
      </Stack>
    </Box>
  )
}

export function FormShell({ children, actions, maxWidth = 640 }) {
  return (
    <Stack spacing={3} sx={{ maxWidth }}>
      {children}
      <Stack
        direction={{ xs: 'column-reverse', sm: 'row' }}
        spacing={1.5}
        useFlexGap
        sx={{
          pt: 1,
          mt: 1,
          borderTop: 1,
          borderColor: 'divider',
          alignItems: { xs: 'stretch', sm: 'center' },
        }}
      >
        {actions}
      </Stack>
    </Stack>
  )
}

export function ComfortButton(props) {
  const { sx, size = 'large', ...rest } = props
  return <Button size={size} sx={{ ...actionButtonSx, ...sx }} {...rest} />
}
