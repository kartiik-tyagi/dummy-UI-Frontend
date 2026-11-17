import { Box } from '@mui/material'
import { ToolPanel } from './ToolPanel'

export function ToolDock({ panel, onClose, edge = 'end' }) {
  if (!panel) return null
  return (
    <Box
      sx={{
        width: { xs: '100%', md: panel === 'orbat' ? 'min(760px, 60vw)' : 300 },
        height: { xs: panel === 'orbat' ? 420 : 240, md: '100%' },
        flexShrink: 0,
        minHeight: 0,
        display: 'flex',
        overflow: 'hidden',
        bgcolor: 'background.paper',
        borderColor: 'divider',
        borderTop: { xs: 1, md: 0 },
        borderLeft: edge === 'end' ? { xs: 0, md: 1 } : 0,
        borderRight: edge === 'start' ? { xs: 0, md: 1 } : 0,
      }}
    >
      <ToolPanel panel={panel} onClose={onClose} />
    </Box>
  )
}
