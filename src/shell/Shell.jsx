import { useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { Box } from '@mui/material'
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
  const [toolsOpen, setToolsOpen] = useState(true)
  const [readout, setReadout] = useState(null)

  return (
    <Box sx={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', bgcolor: 'background.default', color: 'text.primary' }}>
      <TopBar
        leading={
          <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
            <ApplicationMenu presentation="menu" />
            <ShowMapTools pressed={toolsOpen} onClick={() => setToolsOpen((open) => !open)} />
          </Box>
        }
      />
      <ContextStrip />
      {toolsOpen ? <MapToolbar activeId={panel} onSelect={select} /> : null}
      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          minHeight: 0,
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          overflow: 'hidden',
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0, minHeight: { xs: panel ? '32vh' : 0, md: 0 }, display: 'flex' }}>
          <MapStage readout="none" onReadout={setReadout} />
        </Box>
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
