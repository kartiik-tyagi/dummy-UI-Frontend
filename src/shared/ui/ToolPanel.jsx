import { Box, Divider, IconButton, Typography } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import { PanelBody } from './workbench/Panels'

const TITLES = {
  filters: 'Map filters',
  users: 'Users',
  roles: 'Roles',
  icons: 'Icons',
  orbat: 'ORBAT',
  'map-admin': 'Map catalog',
  'scenario-admin': 'Scenario management',
  'game-admin': 'Game',
  audit: 'Audit',
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
      <Box sx={{ overflow: 'auto', px: { xs: 1.25, sm: 1.75 }, py: 1.5, flex: 1, minHeight: 0 }}>
        <PanelBody panel={panel} />
      </Box>
    </Box>
  )
}
