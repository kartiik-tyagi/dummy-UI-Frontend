import { Typography } from '@mui/material'
import { useSessionStore } from '../../../features/session/useSessionStore'
import { canOpenOrbat } from '../../auth/access'
import { RolesPanel, TeamsPanel, ThemesPanel, UsersPanel } from '../../../features/admin/AdminPanels'
import OrbatPanel from '../../../features/orbat/OrbatPanel'
import { NodeTypesPanel } from '../../../features/orbat/NodeTypesPanel'
import { MapAdminPanel } from '../../../features/map/MapAdminPanel'
import { ScenarioAdminPanel, GameAdminPanel } from '../../../features/scenario/ExerciseAdminPanels'
import { AuditPanel } from '../../../features/audit/AuditPanel'
import { IconsAdminPanel } from '../../../features/icons/IconsAdminPanel'
import { FilterList } from '../FilterList'

function Caption({ children }) {
  return (
    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
      {children}
    </Typography>
  )
}

export function PanelBody({ panel }) {
  if (panel === 'filters') return <FilterList />
  if (panel === 'teams') return <TeamsPanel />
  if (panel === 'users') return <UsersPanel />
  if (panel === 'roles') return <RolesPanel />
  if (panel === 'themes') return <ThemesPanel />
  if (panel === 'node-types') return <NodeTypesPanel />
  if (panel === 'orbat') return <OrbatGate />
  if (panel === 'map-admin') return <MapAdminPanel />
  if (panel === 'scenario-admin') return <ScenarioAdminPanel />
  if (panel === 'game-admin') return <GameAdminPanel />
  if (panel === 'audit') return <AuditPanel />
  if (panel === 'icons') return <IconsAdminPanel />
  return <Caption>This panel is not available.</Caption>
}

function OrbatGate() {
  const functionalities = useSessionStore((state) => state.session?.functionalities)
  if (!canOpenOrbat(functionalities)) return <Caption>Your role does not include ORBAT.</Caption>
  return <OrbatPanel />
}
