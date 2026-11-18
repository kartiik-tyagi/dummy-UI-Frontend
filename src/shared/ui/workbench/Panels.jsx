import { useEffect, useState } from 'react'
import {
  Box,
  Button,
  Checkbox,
  Divider,
  FormControlLabel,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import * as api from '../../../shared/api/client'
import { del, get, post, put } from '../../../shared/api/http'
import { useCommit, useDirectoryStore } from '../../../features/directory/useDirectoryStore'
import { useSessionStore } from '../../../features/session/useSessionStore'
import { useToastStore } from '../../../features/feedback/useToastStore'
import { ConfirmDialog } from '../ConfirmDialog'
import { FilterList } from '../FilterList'
import { LoadingState } from '../LoadingState'
import { EMPTY_LIST } from '../../lib/empty'
import { FunctionalityCodes, hasFunctionality } from '../../auth/functionalityCodes'
import { canOpenOrbat } from '../../auth/access'
import OrbatPanel from '../../../features/orbat/OrbatPanel'
import { IconField } from '../IconPicker'
import { MapAdminPanel } from '../../../features/map/MapAdminPanel'
import { ScenarioAdminPanel, GameAdminPanel } from '../../../features/scenario/ExerciseAdminPanels'
import { AuditPanel } from '../../../features/audit/AuditPanel'
import { IconsAdminPanel } from '../../../features/icons/IconsAdminPanel'
import { logger } from '../../lib/logger'

function Caption({ children }) {
  return (
    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
      {children}
    </Typography>
  )
}

export function PanelBody({ panel }) {
  const data = useDirectoryStore((state) => state.data)
  if (panel === 'filters') return <FilterList />
  if (panel === 'directory') {
    if (!data) return <LoadingState label="Opening administration" />
    return <DirectoryPanel />
  }
  if (panel === 'orbat') return <OrbatGate />
  if (panel === 'map-admin') return <MapAdminPanel />
  if (panel === 'scenario-admin') return <ScenarioAdminPanel />
  if (panel === 'game-admin') return <GameAdminPanel />
  if (panel === 'audit') return <AuditPanel />
  if (panel === 'icons') return <IconsAdminPanel />
  return <Caption>This panel is not available.</Caption>
}

function choiceLabel(item, sides, selfId) {
  if (!item.takenBy || item.takenBy === selfId) return item.name
  const holder = sides.find((side) => side.id === item.takenBy)
  return `${item.name} · ${holder?.name || 'in use'}`
}

function ChoiceField({ label, value, onChange, options, selfId, sides }) {
  return (
    <TextField select size="small" label={label} value={value} onChange={onChange}>
      <MenuItem value="">Choose</MenuItem>
      {options.map((item) => (
        <MenuItem key={item.id} value={item.id} disabled={Boolean(item.takenBy) && item.takenBy !== selfId}>
          {choiceLabel(item, sides, selfId)}
        </MenuItem>
      ))}
    </TextField>
  )
}

function SideEditor({ side, swatches, themes, sides, canEdit }) {
  const commit = useCommit()
  const [draft, setDraft] = useState({ name: side.name, swatchId: side.swatchId, themeId: side.themeId, icon: side.icon })
  const [confirming, setConfirming] = useState(false)
  useEffect(() => {
    setDraft({ name: side.name, swatchId: side.swatchId, themeId: side.themeId, icon: side.icon })
  }, [side.name, side.swatchId, side.themeId, side.icon])
  const kind = side.kind === 'alliance' ? 'alliance' : 'country'
  if (!canEdit) {
    return (
      <Typography variant="body2">
        {side.name} <Caption>{kind}</Caption>
      </Typography>
    )
  }
  return (
    <Stack spacing={1}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: side.colour || 'action.disabledBackground', flexShrink: 0 }} aria-hidden />
        <Typography variant="body2" sx={{ flex: 1 }}>{side.name}</Typography>
        <Caption>{kind}</Caption>
      </Stack>
      <TextField size="small" label="Name" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
      <ChoiceField label="Map colour" value={draft.swatchId} options={swatches} selfId={side.id} sides={sides} onChange={(event) => setDraft({ ...draft, swatchId: event.target.value })} />
      <ChoiceField label="Theme" value={draft.themeId} options={themes} selfId={side.id} sides={sides} onChange={(event) => setDraft({ ...draft, themeId: event.target.value })} />
      <IconField value={draft.icon} onChange={(icon) => setDraft({ ...draft, icon })} />
      <Stack direction="row" spacing={1}>
        <Button size="small" onClick={() => commit((userId) => api.saveSide(userId, { id: side.id, ...draft }))}>Save</Button>
        <Button size="small" color="error" onClick={() => setConfirming(true)}>Remove</Button>
      </Stack>
      <ConfirmDialog
        open={confirming}
        title="Remove side"
        message={`Remove ${side.name}? Its ORBATs and members are affected.`}
        confirmLabel="Remove"
        onClose={() => setConfirming(false)}
        onConfirm={() => commit((userId) => api.deleteSide(userId, side.id)).then(() => setConfirming(false)).catch(() => setConfirming(false))}
      />
    </Stack>
  )
}

function UserRow({ item, roles, sides, canEdit }) {
  const commit = useCommit()
  const [password, setPassword] = useState('')
  return (
    <Stack spacing={1}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <Typography variant="body2" sx={{ flex: 1, opacity: item.active ? 1 : 0.55 }}>{item.title}</Typography>
        <Caption>{item.active ? item.role || 'No role' : 'Inactive'}</Caption>
      </Stack>
      {canEdit && !item.protected ? (
        <>
          <TextField
            select
            size="small"
            label="Roles"
            value={item.roleIds}
            onChange={(event) => commit((userId) => api.saveUser(userId, { id: item.id, roleIds: event.target.value }))}
            slotProps={{ select: { multiple: true } }}
          >
            {roles.map((role) => (
              <MenuItem key={role.id} value={role.numericId}>{role.name}</MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Administers side"
            value={item.sideId || ''}
            onChange={(event) => commit((userId) => api.assignUserSide(userId, item.id, event.target.value))}
          >
            {sides.map((entry) => (
              <MenuItem key={entry.id} value={entry.id}>{entry.name}</MenuItem>
            ))}
          </TextField>
          <Stack direction="row" spacing={1}>
            <TextField size="small" type="password" label="New password" value={password} onChange={(event) => setPassword(event.target.value)} sx={{ flex: 1 }} />
            <Button size="small" disabled={password.length < 3} onClick={() => commit((userId) => api.saveUser(userId, { id: item.id, password })).then(() => setPassword(''))}>
              Set
            </Button>
          </Stack>
          <Button size="small" color={item.active ? 'error' : 'primary'} onClick={() => commit((userId) => api.saveUser(userId, { id: item.id, active: !item.active }))}>
            {item.active ? 'Deactivate' : 'Activate'}
          </Button>
        </>
      ) : null}
      {item.protected ? <Caption>APEX is the protected administrator.</Caption> : null}
    </Stack>
  )
}

function RoleEditor({ role, catalog, canEdit }) {
  const commit = useCommit()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState({ name: role.name, functionalityIds: role.functionalityIds })
  useEffect(() => {
    setDraft({ name: role.name, functionalityIds: role.functionalityIds })
  }, [role.name, role.functionalityIds])
  const toggle = (id) =>
    setDraft((current) => ({
      ...current,
      functionalityIds: current.functionalityIds.includes(id)
        ? current.functionalityIds.filter((item) => item !== id)
        : [...current.functionalityIds, id],
    }))
  return (
    <Stack spacing={0.5}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <Typography variant="body2" sx={{ flex: 1 }}>{role.name}</Typography>
        <Caption>{role.code}</Caption>
        {canEdit ? <Button size="small" onClick={() => setOpen(!open)}>{open ? 'Close' : 'Edit'}</Button> : null}
      </Stack>
      {canEdit && open ? (
        <Stack spacing={0.5}>
          <TextField size="small" label="Name" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
          {catalog.map((functionality) => (
            <FormControlLabel
              key={functionality.id}
              label={functionality.name}
              control={<Checkbox size="small" checked={draft.functionalityIds.includes(functionality.id)} onChange={() => toggle(functionality.id)} />}
              sx={{ m: 0, '& .MuiFormControlLabel-label': { fontSize: 13 } }}
            />
          ))}
          <Stack direction="row" spacing={1}>
            <Button size="small" onClick={() => commit((userId) => api.saveRole(userId, { id: role.id, ...draft })).then(() => setOpen(false))}>Save</Button>
            <Button size="small" color="error" onClick={() => commit((userId) => api.deleteRole(userId, role.id))}>Remove</Button>
          </Stack>
        </Stack>
      ) : null}
    </Stack>
  )
}

function ThemesAdmin() {
  const push = useToastStore((state) => state.push)
  const commit = useCommit()
  const [rows, setRows] = useState([])
  const [draft, setDraft] = useState({ id: null, name: '', description: '', defaultTheme: false })
  const [busy, setBusy] = useState(false)

  const reload = async () => {
    setRows(await get('/themes'))
  }

  useEffect(() => {
    reload().catch((error) => push(error.message, 'error'))
  }, [push])

  const save = async () => {
    setBusy(true)
    try {
      const body = {
        name: draft.name.trim(),
        description: draft.description || '',
        defaultTheme: Boolean(draft.defaultTheme),
        configJson: draft.id ? rows.find((row) => row.id === draft.id)?.configJson || null : null,
      }
      if (!body.name) throw new Error('Enter a theme name.')
      if (draft.id) await put(`/themes/${draft.id}`, body)
      else await post('/themes', body)
      logger.info('theme.admin_saved', { themeId: draft.id || 'new' })
      setDraft({ id: null, name: '', description: '', defaultTheme: false })
      await reload()
      await commit((userId) => api.loadWorkbench(userId))
      push(draft.id ? 'Theme saved.' : 'Theme created.', 'success')
    } catch (error) {
      push(error.message || 'Theme could not be saved.', 'error')
    } finally {
      setBusy(false)
    }
  }

  const remove = async (id) => {
    setBusy(true)
    try {
      await del(`/themes/${id}`)
      logger.info('theme.admin_deleted', { themeId: id })
      await reload()
      await commit((userId) => api.loadWorkbench(userId))
      push('Theme removed.', 'success')
    } catch (error) {
      push(error.message || 'Theme could not be removed.', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Stack spacing={1}>
      <Typography variant="subtitle2">Themes</Typography>
      {!rows.length ? <Caption>No themes in the catalogue yet.</Caption> : null}
      {rows.map((row) => (
        <Stack key={row.id} direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <Typography variant="body2" sx={{ flex: 1, minWidth: 120 }}>{row.name}</Typography>
          {row.defaultTheme ? <Caption>Default</Caption> : null}
          <Button size="small" onClick={() => setDraft({ id: row.id, name: row.name, description: row.description || '', defaultTheme: row.defaultTheme })}>Edit</Button>
          <Button size="small" color="error" disabled={busy} onClick={() => remove(row.id)}>Remove</Button>
        </Stack>
      ))}
      <TextField size="small" label="Theme name" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
      <TextField size="small" label="Description" value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
      <FormControlLabel
        control={<Checkbox size="small" checked={draft.defaultTheme} onChange={(event) => setDraft({ ...draft, defaultTheme: event.target.checked })} />}
        label="Default login theme"
      />
      <Button disabled={busy || !draft.name.trim()} onClick={save}>{draft.id ? 'Save theme' : 'Add theme'}</Button>
    </Stack>
  )
}

function NodeTypesAdmin() {
  const push = useToastStore((state) => state.push)
  const [rows, setRows] = useState([])
  const [draft, setDraft] = useState({ id: null, code: '', name: '', iconPath: '' })
  const [busy, setBusy] = useState(false)

  const reload = async () => setRows(await get('/node-types'))

  useEffect(() => {
    reload().catch((error) => push(error.message, 'error'))
  }, [push])

  const save = async () => {
    setBusy(true)
    try {
      const body = { code: draft.code.trim(), name: draft.name.trim(), iconPath: draft.iconPath || null, properties: {} }
      if (!body.code || !body.name) throw new Error('Enter a code and name.')
      if (draft.id) await put(`/node-types/${draft.id}`, body)
      else await post('/node-types', body)
      logger.info('node_type.admin_saved', { nodeTypeId: draft.id || 'new', code: body.code })
      setDraft({ id: null, code: '', name: '', iconPath: '' })
      await reload()
      push(draft.id ? 'Node type saved.' : 'Node type created.', 'success')
    } catch (error) {
      push(error.message || 'Node type could not be saved.', 'error')
    } finally {
      setBusy(false)
    }
  }

  const remove = async (id) => {
    setBusy(true)
    try {
      await del(`/node-types/${id}`)
      logger.info('node_type.admin_deleted', { nodeTypeId: id })
      await reload()
      push('Node type removed.', 'success')
    } catch (error) {
      push(error.message || 'Node type could not be removed.', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Stack spacing={1}>
      <Typography variant="subtitle2">Node types</Typography>
      {rows.map((row) => (
        <Stack key={row.id} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Typography variant="body2" sx={{ flex: 1 }}>{row.name}</Typography>
          <Caption>{row.code}</Caption>
          <Button size="small" onClick={() => setDraft({ id: row.id, code: row.code, name: row.name, iconPath: row.iconPath || '' })}>Edit</Button>
          <Button size="small" color="error" disabled={busy} onClick={() => remove(row.id)}>Remove</Button>
        </Stack>
      ))}
      <TextField size="small" label="Code" value={draft.code} onChange={(event) => setDraft({ ...draft, code: event.target.value })} disabled={Boolean(draft.id)} />
      <TextField size="small" label="Name" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
      <IconField value={draft.iconPath} onChange={(iconPath) => setDraft({ ...draft, iconPath })} />
      <Button disabled={busy || !draft.code.trim() || !draft.name.trim()} onClick={save}>{draft.id ? 'Save node type' : 'Add node type'}</Button>
    </Stack>
  )
}

function DirectoryPanel() {
  const data = useDirectoryStore((state) => state.data)
  const functionalities = useSessionStore((state) => state.session?.functionalities)
  const commit = useCommit()
  const [side, setSide] = useState({ name: '', swatchId: '', themeId: '', icon: '' })
  const [role, setRole] = useState({ newId: '', name: '' })
  if (!data) return null
  const canUsers = hasFunctionality(functionalities, FunctionalityCodes.MANAGE_USERS)
  const canSides = hasFunctionality(functionalities, FunctionalityCodes.MANAGE_SIDES)
  const canRoles = hasFunctionality(functionalities, FunctionalityCodes.MANAGE_ROLES)
  const canThemes = hasFunctionality(functionalities, FunctionalityCodes.MANAGE_THEMES)
  const canNodeTypes = hasFunctionality(functionalities, FunctionalityCodes.MANAGE_NODE_TYPES)
  const swatches = data.swatches ?? EMPTY_LIST
  const themes = data.themeChoices ?? EMPTY_LIST
  const catalog = data.functionalityCatalog ?? EMPTY_LIST
  if (!canUsers && !canSides && !canRoles && !canThemes && !canNodeTypes) {
    return <Caption>Your role does not include administration.</Caption>
  }
  return (
    <Stack spacing={2} sx={{ minWidth: 0 }}>
      {canUsers ? (
        <>
          <Typography variant="subtitle2">Users</Typography>
          <Caption>
            New users are created from an ORBAT node{hasFunctionality(functionalities, FunctionalityCodes.MARK_AS_USER) ? ' (ORBAT, then Mark as user)' : ''}.
          </Caption>
          {data.users.map((item) => (
            <UserRow key={item.id} item={item} roles={data.roles} sides={data.sides} canEdit={canUsers} />
          ))}
        </>
      ) : null}
      {canSides || data.sides?.length ? (
        <>
          <Divider />
          <Typography variant="subtitle2">Sides</Typography>
          {data.sides.map((item) => (
            <SideEditor key={item.id} side={item} swatches={swatches} themes={themes} sides={data.sides} canEdit={canSides} />
          ))}
        </>
      ) : null}
      {canSides ? (
        <>
          <Typography variant="caption" color="text.secondary">Add a side</Typography>
          <TextField size="small" label="Side name" value={side.name} onChange={(event) => setSide({ ...side, name: event.target.value })} />
          <ChoiceField label="Map colour" value={side.swatchId} options={swatches} selfId="" sides={data.sides} onChange={(event) => setSide({ ...side, swatchId: event.target.value })} />
          <ChoiceField label="Theme" value={side.themeId} options={themes} selfId="" sides={data.sides} onChange={(event) => setSide({ ...side, themeId: event.target.value })} />
          <IconField value={side.icon} onChange={(icon) => setSide({ ...side, icon })} />
          <Button disabled={!side.name.trim()} onClick={() => commit((userId) => api.saveSide(userId, side)).then(() => setSide({ name: '', swatchId: '', themeId: '', icon: '' }))}>
            Add side
          </Button>
        </>
      ) : null}
      {canRoles || canUsers ? (
        <>
          <Divider />
          <Typography variant="subtitle2">Roles</Typography>
          {data.roles.map((item) => (
            <RoleEditor key={item.id} role={item} catalog={catalog} canEdit={canRoles} />
          ))}
        </>
      ) : null}
      {canRoles ? (
        <>
          <TextField size="small" label="Role code" value={role.newId} onChange={(event) => setRole({ ...role, newId: event.target.value })} />
          <TextField size="small" label="Role name" value={role.name} onChange={(event) => setRole({ ...role, name: event.target.value })} />
          <Button disabled={!role.newId.trim() || !role.name.trim()} onClick={() => commit((userId) => api.saveRole(userId, role)).then(() => setRole({ newId: '', name: '' }))}>Add role</Button>
        </>
      ) : null}
      {canThemes ? (
        <>
          <Divider />
          <ThemesAdmin />
        </>
      ) : null}
      {canNodeTypes ? (
        <>
          <Divider />
          <NodeTypesAdmin />
        </>
      ) : null}
    </Stack>
  )
}

function OrbatGate() {
  const functionalities = useSessionStore((state) => state.session?.functionalities)
  if (!canOpenOrbat(functionalities)) return <Caption>Your role does not include ORBAT.</Caption>
  return <OrbatPanel />
}
