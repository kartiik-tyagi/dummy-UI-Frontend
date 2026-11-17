import { Box, Divider, IconButton, Typography } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import { PanelBody } from './workbench/Panels'

const TITLES = {
  filters: 'Map filters',
  resources: 'Resources',
  plans: 'Plans',
  'exercise-control': 'Exercise control',
  features: 'Features',
  properties: 'Properties',
  draw: 'Draw and measure',
  teams: 'Teams',
  'map-settings': 'Map settings',
  planning: 'Planning board',
  alerts: 'Alerts',
  sessions: 'Sessions',
  'scenario-play': 'Scenario playback',
  simulation: 'Simulation',
  stream: 'Live stream',
  zones: 'Zones',
  routes: 'Routes',
  directory: 'Users and teams',
  orbat: 'ORBAT',
  flags: 'Features',
}

export function ToolPanel({ panel, onClose }) {
  if (!panel) return null

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper',
        color: 'text.primary',
      }}
    >
      <Box sx={{ minHeight: 48, px: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="subtitle2" sx={{ flex: 1 }}>
          {TITLES[panel] || 'Panel'}
        </Typography>
        <IconButton aria-label="Close panel" onClick={onClose} size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>
      <Divider />
      <Box sx={{ overflow: 'auto', px: 1.5, py: 1.25, flex: 1 }}>
        <PanelBody panel={panel} />
      </Box>
    </Box>
  )
}
