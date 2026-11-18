import { useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { Box, Button } from '@mui/material'
import LoginPage from '../features/login/LoginPage'
import { useChrome } from '../features/session/useChrome'
import { useSessionStore } from '../features/session/useSessionStore'
import { ApplicationMenu } from '../shared/ui/ApplicationMenu'
import { MapToolbar, ShowMapTools } from '../shared/ui/MapToolbar'
import { MapStage } from '../shared/ui/MapStage'
import { StatusFooter } from '../shared/ui/StatusFooter'
import { ToolDock } from '../shared/ui/ToolDock'
import { ContextStrip, TopBar } from '../shared/ui/TopBar'

function Frame() {
  const { panel, closePanel, select } = useChrome()
  const [bandOpen, setBandOpen] = useState(true)
  const [toolsOpen, setToolsOpen] = useState(false)
  const [readout, setReadout] = useState(null)

  return (
    <Box sx={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', bgcolor: 'background.default', color: 'text.primary' }}>
      <TopBar
        leading={
          <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
            <Button
              size="small"
              aria-pressed={bandOpen}
              onClick={() => setBandOpen((open) => !open)}
              sx={{ textTransform: 'none', color: bandOpen ? 'primary.main' : 'text.primary', flexShrink: 0 }}
            >
              Application
            </Button>
            <ShowMapTools pressed={toolsOpen} onClick={() => setToolsOpen((open) => !open)} />
          </Box>
        }
      />
      <ContextStrip />
      {bandOpen ? <ApplicationMenu presentation="bar" onHide={() => setBandOpen(false)} /> : null}
      {toolsOpen ? <MapToolbar activeId={panel} onSelect={select} /> : null}
      <Box sx={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: { xs: 'column', md: 'row' } }}>
        <MapStage readout="none" onReadout={setReadout} />
        <ToolDock panel={panel} onClose={closePanel} edge="end" />
      </Box>
      <StatusFooter readout={readout} />
    </Box>
  )
}

export default function Shell() {
  const session = useSessionStore((state) => state.session)
  return (
    <Routes>
      <Route path="/login" element={session ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/" element={session ? <Frame /> : <Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to={session ? '/' : '/login'} replace />} />
    </Routes>
  )
}
