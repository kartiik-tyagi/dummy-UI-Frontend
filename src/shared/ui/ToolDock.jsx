import { Box, useMediaQuery } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { ToolPanel } from './ToolPanel'

const WIDE = new Set(['orbat', 'map-admin', 'scenario-admin', 'game-admin', 'audit', 'teams', 'users', 'roles', 'themes', 'node-types', 'icons'])

function dockWidth(panel) {
  if (panel === 'orbat') return { xs: '100%', md: 'min(820px, 62vw)' }
  if (WIDE.has(panel)) return { xs: '100%', md: 'min(720px, 58vw)' }
  return { xs: '100%', md: 340 }
}

function dockHeight(panel) {
  if (panel === 'orbat') return { xs: 'min(58vh, 520px)', md: '100%' }
  if (WIDE.has(panel)) return { xs: 'min(55vh, 480px)', md: '100%' }
  return { xs: 'min(42vh, 300px)', md: '100%' }
}

export function ToolDock({ panel, onClose, edge = 'end' }) {
  const theme = useTheme()
  const phone = useMediaQuery(theme.breakpoints.down('md'))
  if (!panel) return null

  return (
    <Box
      sx={{
        width: dockWidth(panel),
        height: dockHeight(panel),
        maxHeight: phone ? '70vh' : 'none',
        flexShrink: 0,
        minHeight: 0,
        display: 'flex',
        overflow: 'hidden',
        bgcolor: 'background.paper',
        borderColor: 'divider',
        borderTop: { xs: 1, md: 0 },
        borderLeft: edge === 'end' ? { xs: 0, md: 1 } : 0,
        borderRight: edge === 'start' ? { xs: 0, md: 1 } : 0,
        boxShadow: phone ? 8 : 0,
        position: phone ? 'relative' : 'relative',
        zIndex: phone ? 3 : 1,
      }}
    >
      <ToolPanel panel={panel} onClose={onClose} />
    </Box>
  )
}
