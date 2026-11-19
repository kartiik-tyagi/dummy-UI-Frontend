import { useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { Box } from '@mui/material'
import { NodeTypeEditorPage, NodeTypesListPage } from '../features/admin/NodeTypePages'
import { TeamEditorPage, TeamsListPage } from '../features/admin/TeamsPages'
import { ThemeEditorPage, ThemesListPage } from '../features/admin/ThemesPages'
import LoginPage from '../features/login/LoginPage'
import { GameEditorPage, GameListPage } from '../features/scenario/GamePages'
import { ScenarioEditorPage, ScenarioListPage, ScenarioPreviewPage } from '../features/scenario/ScenarioPages'
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
  const refresh = useSessionStore((state) => state.refresh)
  const [toolsOpen, setToolsOpen] = useState(true)
  const [readout, setReadout] = useState(null)

  useEffect(() => {
    refresh().catch(() => {})
  }, [refresh])

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

function RequireSession({ children }) {
  const session = useSessionStore((state) => state.session)
  if (!session) return <Navigate to="/login" replace />
  return children
}

export default function Shell() {
  const session = useSessionStore((state) => state.session)
  return (
    <Routes>
      <Route path="/login" element={session ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/" element={session ? <Frame /> : <Navigate to="/login" replace />} />
      <Route
        path="/exercise/scenarios"
        element={
          <RequireSession>
            <ScenarioListPage />
          </RequireSession>
        }
      />
      <Route
        path="/exercise/scenarios/:id/preview"
        element={
          <RequireSession>
            <ScenarioPreviewPage />
          </RequireSession>
        }
      />
      <Route
        path="/exercise/scenarios/:id"
        element={
          <RequireSession>
            <ScenarioEditorPage />
          </RequireSession>
        }
      />
      <Route
        path="/exercise/games"
        element={
          <RequireSession>
            <GameListPage />
          </RequireSession>
        }
      />
      <Route
        path="/exercise/games/:id"
        element={
          <RequireSession>
            <GameEditorPage />
          </RequireSession>
        }
      />
      <Route
        path="/standard/teams"
        element={
          <RequireSession>
            <TeamsListPage />
          </RequireSession>
        }
      />
      <Route
        path="/standard/teams/:id"
        element={
          <RequireSession>
            <TeamEditorPage />
          </RequireSession>
        }
      />
      <Route
        path="/standard/themes"
        element={
          <RequireSession>
            <ThemesListPage />
          </RequireSession>
        }
      />
      <Route
        path="/standard/themes/:id"
        element={
          <RequireSession>
            <ThemeEditorPage />
          </RequireSession>
        }
      />
      <Route
        path="/standard/node-types"
        element={
          <RequireSession>
            <NodeTypesListPage />
          </RequireSession>
        }
      />
      <Route
        path="/standard/node-types/:id"
        element={
          <RequireSession>
            <NodeTypeEditorPage />
          </RequireSession>
        }
      />
      <Route path="*" element={<Navigate to={session ? '/' : '/login'} replace />} />
    </Routes>
  )
}
