import { useRef, useState } from 'react'
import { Box, useMediaQuery } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { ToolPanel } from './ToolPanel'

const SPAN_KEY = 'gis-warplan.dock-span'
const WIDE = new Set(['orbat', 'map-admin', 'scenario-admin', 'game-admin', 'audit', 'users', 'roles', 'icons', 'filters'])

function dockWidth(panel) {
  if (panel === 'orbat') return 'min(820px, 62vw)'
  if (panel === 'filters') return 'min(420px, 42vw)'
  if (WIDE.has(panel)) return 'min(720px, 58vw)'
  return 340
}

function dockHeight(panel) {
  if (panel === 'orbat') return 'min(58vh, 520px)'
  if (panel === 'filters') return 'min(62vh, 560px)'
  if (WIDE.has(panel)) return 'min(55vh, 480px)'
  return 'min(42vh, 300px)'
}

function readSpan() {
  const value = Number(sessionStorage.getItem(SPAN_KEY))
  return Number.isFinite(value) && value >= 180 ? value : null
}

/** Every dock in this layout can be dragged wider or taller. The size is kept for the session. */
export function ToolDock({ panel, onClose, edge = 'end' }) {
  const theme = useTheme()
  const phone = useMediaQuery(theme.breakpoints.down('md'))
  const box = useRef(null)
  const [span, setSpan] = useState(readSpan)

  if (!panel) return null

  const drag = (event) => {
    event.preventDefault()
    const handle = event.currentTarget
    handle.setPointerCapture(event.pointerId)
    const start = phone ? event.clientY : event.clientX
    const startSize = phone ? box.current.offsetHeight : box.current.offsetWidth
    const move = (nextEvent) => {
      const delta = phone || edge === 'end' ? start - (phone ? nextEvent.clientY : nextEvent.clientX) : (nextEvent.clientX - start)
      const limit = phone ? window.innerHeight * 0.8 : window.innerWidth * 0.75
      const next = Math.round(Math.min(Math.max(startSize + delta, phone ? 180 : 300), limit))
      setSpan(next)
      sessionStorage.setItem(SPAN_KEY, String(next))
    }
    const up = () => {
      handle.removeEventListener('pointermove', move)
      handle.removeEventListener('pointerup', up)
    }
    handle.addEventListener('pointermove', move)
    handle.addEventListener('pointerup', up)
  }

  return (
    <Box
      ref={box}
      sx={{
        width: phone ? '100%' : (span ?? dockWidth(panel)),
        height: phone ? (span ?? dockHeight(panel)) : '100%',
        maxHeight: phone ? '80vh' : 'none',
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
        position: 'relative',
        zIndex: phone ? 3 : 1,
      }}
    >
      <Box
        role="separator"
        aria-orientation={phone ? 'horizontal' : 'vertical'}
        aria-label="Resize panel"
        onPointerDown={drag}
        sx={{
          position: 'absolute',
          zIndex: 2,
          touchAction: 'none',
          ...(phone
            ? { top: 0, left: 0, right: 0, height: 8, cursor: 'ns-resize' }
            : edge === 'end'
              ? { top: 0, bottom: 0, left: 0, width: 8, cursor: 'ew-resize' }
              : { top: 0, bottom: 0, right: 0, width: 8, cursor: 'ew-resize' }),
          '&:hover, &:active': { bgcolor: 'primary.main', opacity: 0.35 },
        }}
      />
      <ToolPanel panel={panel} onClose={onClose} />
    </Box>
  )
}
