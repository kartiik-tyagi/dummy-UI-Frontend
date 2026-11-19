import { Box, Checkbox, FormControlLabel, Typography } from '@mui/material'
import { ScenarioContext } from './ScenarioContext'
import { UserMenu } from './UserMenu'

function ViewModes({ mode, onChange }) {
  if (!onChange) return null
  const choice = (id, label) => (
    <FormControlLabel
      control={<Checkbox size="small" checked={mode === id} onChange={() => onChange(id)} />}
      label={label}
      sx={{ mr: 1, '& .MuiFormControlLabel-label': { fontSize: 13 } }}
    />
  )
  return (
    <Box role="group" aria-label="Map view" sx={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
      {choice('default', 'Default')}
      {choice('grid', 'Grid')}
    </Box>
  )
}

export function TopBar({ leading, trailing, menuOpen, onMenuOpenChange, floating = false, viewMode = 'default', onViewMode }) {
  return (
    <Box
      component="header"
      sx={{
        minHeight: 48,
        px: 1,
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        borderBottom: floating ? 0 : 1,
        borderColor: 'divider',
        bgcolor: floating ? 'transparent' : 'background.paper',
        color: 'text.primary',
      }}
    >
      {leading}
      <Typography variant="subtitle2" sx={{ letterSpacing: { xs: '0.08em', sm: '0.14em' }, px: 0.5, flexShrink: 0, fontSize: { xs: '0.75rem', sm: undefined } }}>
        GIS WARPLAN
      </Typography>
      <ViewModes mode={viewMode} onChange={onViewMode} />
      <Box sx={{ flex: 1, minWidth: 0, display: { xs: 'none', lg: 'flex' }, alignItems: 'center', overflow: 'hidden' }}>
        <ScenarioContext />
      </Box>
      <Box sx={{ flex: { xs: 1, lg: 0 } }} />
      {trailing}
      <UserMenu open={menuOpen} onOpenChange={onMenuOpenChange} />
    </Box>
  )
}

export function ContextStrip() {
  return (
    <Box
      sx={{
        display: { xs: 'flex', lg: 'none' },
        alignItems: 'center',
        gap: 2,
        px: 1.5,
        py: 0.75,
        overflowX: 'auto',
        borderBottom: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <ScenarioContext />
    </Box>
  )
}
