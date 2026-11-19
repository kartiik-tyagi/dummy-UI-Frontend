import { useEffect, useState } from 'react'
import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { del, get, patch, post, put } from '../../shared/api/http'
import { logger } from '../../shared/lib/logger'
import { swatchForColour } from '../../shared/api/mappers'
import { swatches } from '../../shared/theme/swatches'
import { IconField } from '../../shared/ui/IconPicker'
import { LoadingState } from '../../shared/ui/LoadingState'
import { useToastStore } from '../feedback/useToastStore'
import { asTheme, holderLabel, selectableThemes } from './themeChoices'

function Caption({ children }) {
  return (
    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
      {children}
    </Typography>
  )
}

function ThemeField({ themes, value, onChange, holderKind, holderId, label = 'Theme', allowEmpty = false, emptyLabel = 'Inherit the team theme' }) {
  const options = selectableThemes(themes, holderKind, holderId)
  return (
    <TextField select size="small" required={!allowEmpty} label={label} value={value} onChange={onChange}>
      {allowEmpty ? <MenuItem value="">{emptyLabel}</MenuItem> : <MenuItem value="" disabled>Choose</MenuItem>}
      {options.map((theme) => (
        <MenuItem key={theme.id} value={String(theme.id)}>{theme.name}</MenuItem>
      ))}
    </TextField>
  )
}

function ColourField({ value, onChange }) {
  return (
    <TextField select size="small" label="Map colour" value={value} onChange={onChange}>
      {swatches.map((swatch) => (
        <MenuItem key={swatch.id} value={swatch.id}>{swatch.name}</MenuItem>
      ))}
    </TextField>
  )
}

function useLoader(load, label) {
  const push = useToastStore((state) => state.push)
  const [ready, setReady] = useState(false)
  const [tick, setTick] = useState(0)
  useEffect(() => {
    let live = true
    setReady(false)
    load()
      .then(() => live && setReady(true))
      .catch((error) => live && push(error?.message || `${label} could not be loaded.`, 'error'))
    return () => {
      live = false
    }
  }, [tick]) // eslint-disable-line react-hooks/exhaustive-deps
  return { ready, reload: () => setTick((value) => value + 1) }
}

export function TeamsPanel() {
  const push = useToastStore((state) => state.push)
  const [sides, setSides] = useState([])
  const [themes, setThemes] = useState([])
  const [draft, setDraft] = useState({ name: '', swatchId: 'blue', icon: '', themeId: '' })
  const [busy, setBusy] = useState(false)
  const { ready, reload } = useLoader(async () => {
    const [sideRows, themeRows] = await Promise.all([get('/sides'), get('/themes')])
    setSides(sideRows)
    setThemes(themeRows.map(asTheme))
  }, 'Teams')

  const countries = sides.filter((side) => side.kind !== 'alliance')
  const alliances = sides.filter((side) => side.kind === 'alliance')

  const create = async () => {
    if (!draft.name.trim() || !draft.themeId) return
    setBusy(true)
    try {
      const colour = swatches.find((item) => item.id === draft.swatchId)?.color || '#2f6fed'
      await post('/sides', {
        name: draft.name.trim(),
        description: '',
        colour,
        icon: draft.icon || null,
        themeId: Number(draft.themeId),
      })
      logger.info('team.created', { name: draft.name.trim() })
      setDraft({ name: '', swatchId: 'blue', icon: '', themeId: '' })
      push('Team created. Its standard ORBAT root is ready.', 'success')
      reload()
    } catch (error) {
      push(error?.message || 'The team could not be created.', 'error')
    } finally {
      setBusy(false)
    }
  }

  if (!ready && !sides.length) return <LoadingState label="Opening teams" />

  return (
    <Stack spacing={2}>
      <Caption>A team is a country side. Creating one also creates the standard ORBAT whose root is this side. The same action is available from ORBAT.</Caption>
      <Typography variant="subtitle2">New team</Typography>
      <TextField size="small" label="Name" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
      <ColourField value={draft.swatchId} onChange={(event) => setDraft({ ...draft, swatchId: event.target.value })} />
      <IconField value={draft.icon} onChange={(icon) => setDraft({ ...draft, icon })} />
      <ThemeField themes={themes} value={draft.themeId} onChange={(event) => setDraft({ ...draft, themeId: event.target.value })} holderKind="SIDE" />
      <Button variant="contained" disabled={busy || !draft.name.trim() || !draft.themeId} onClick={create}>Create team</Button>
      <Divider />
      {countries.map((side) => (
        <TeamEditor key={side.id} side={side} themes={themes} onChanged={reload} />
      ))}
      {alliances.length ? (
        <>
          <Divider />
          <Typography variant="subtitle2">Alliances</Typography>
          <Caption>An alliance is created inside a game, from the playing ORBAT.</Caption>
          {alliances.map((side) => (
            <Typography key={side.id} variant="body2">{side.name}</Typography>
          ))}
        </>
      ) : null}
    </Stack>
  )
}

function TeamEditor({ side, themes, onChanged }) {
  const push = useToastStore((state) => state.push)
  const [name, setName] = useState(side.name)
  const [swatchId, setSwatchId] = useState(swatchForColour(side.colour)?.id || 'custom')
  const [icon, setIcon] = useState(side.icon || '')
  const [themeId, setThemeId] = useState(side.themeId == null ? '' : String(side.themeId))
  const [busy, setBusy] = useState(false)
  const [confirming, setConfirming] = useState(false)
  useEffect(() => {
    setName(side.name)
    setSwatchId(swatchForColour(side.colour)?.id || 'custom')
    setIcon(side.icon || '')
    setThemeId(side.themeId == null ? '' : String(side.themeId))
  }, [side.id, side.name, side.colour, side.icon, side.themeId])

  const save = async () => {
    setBusy(true)
    try {
      const colour = swatchId === 'custom' ? side.colour : (swatches.find((item) => item.id === swatchId)?.color || side.colour)
      await put(`/sides/${side.id}`, {
        name: name.trim(),
        description: side.description || '',
        colour,
        icon: icon || null,
        themeId: Number(themeId),
      })
      push('Team saved.', 'success')
      onChanged()
    } catch (error) {
      push(error?.message || 'The team could not be saved.', 'error')
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    setBusy(true)
    try {
      await del(`/sides/${side.id}`)
      setConfirming(false)
      push('Team removed.', 'success')
      onChanged()
    } catch (error) {
      push(error?.message || 'The team could not be removed.', 'error')
      setConfirming(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Stack spacing={1}>
      <Typography variant="subtitle2">{side.name}</Typography>
      <TextField size="small" label="Name" value={name} onChange={(event) => setName(event.target.value)} />
      <TextField select size="small" label="Map colour" value={swatchId} onChange={(event) => setSwatchId(event.target.value)}>
        {swatchId === 'custom' ? <MenuItem value="custom">{side.colour || 'Current colour'}</MenuItem> : null}
        {swatches.map((swatch) => (
          <MenuItem key={swatch.id} value={swatch.id}>{swatch.name}</MenuItem>
        ))}
      </TextField>
      <IconField value={icon} onChange={setIcon} />
      <ThemeField themes={themes} value={themeId} onChange={(event) => setThemeId(event.target.value)} holderKind="SIDE" holderId={side.id} />
      <Stack direction="row" spacing={1}>
        <Button size="small" variant="contained" disabled={busy || !name.trim() || !themeId} onClick={save}>Save</Button>
        <Button size="small" color="error" disabled={busy} onClick={() => setConfirming(true)}>Remove</Button>
      </Stack>
      <Dialog open={confirming} onClose={() => setConfirming(false)}>
        <DialogTitle>Remove team</DialogTitle>
        <DialogContent>
          <Typography variant="body2">Remove {side.name}? This also removes its standard ORBAT when nobody is marked on it.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirming(false)}>Cancel</Button>
          <Button color="error" onClick={remove}>Remove</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}

export function UsersPanel() {
  const push = useToastStore((state) => state.push)
  const [users, setUsers] = useState([])
  const [roles, setRoles] = useState([])
  const [sides, setSides] = useState([])
  const [themes, setThemes] = useState([])
  const [draft, setDraft] = useState({ name: '', password: '', roleIds: [], sideId: '', themeId: '' })
  const [busy, setBusy] = useState(false)
  const { ready, reload } = useLoader(async () => {
    const [userRows, roleRows, sideRows, themeRows] = await Promise.all([get('/users'), get('/roles'), get('/sides'), get('/themes')])
    setUsers(userRows)
    setRoles(roleRows)
    setSides(sideRows.filter((side) => side.kind !== 'alliance'))
    setThemes(themeRows.map(asTheme))
  }, 'Users')

  const create = async () => {
    if (!draft.name.trim() || draft.password.length < 3 || !draft.roleIds.length) return
    if (!draft.sideId && !draft.themeId) {
      push('Choose a team, or allot a theme when the user has no team.', 'warning')
      return
    }
    setBusy(true)
    try {
      await post('/users', {
        name: draft.name.trim(),
        password: draft.password,
        roleIds: draft.roleIds,
        administeredSideId: draft.sideId ? Number(draft.sideId) : null,
        themeId: draft.themeId ? Number(draft.themeId) : null,
      })
      logger.info('user.created', { name: draft.name.trim() })
      setDraft({ name: '', password: '', roleIds: [], sideId: '', themeId: '' })
      push('User created.', 'success')
      reload()
    } catch (error) {
      push(error?.message || 'The user could not be created.', 'error')
    } finally {
      setBusy(false)
    }
  }

  if (!ready && !users.length) return <LoadingState label="Opening users" />
  const themeName = (id) => themes.find((theme) => String(theme.id) === String(id))?.name

  return (
    <Stack spacing={2}>
      <Caption>Accounts can be created here, or from an ORBAT node with Mark as user. A user on a team inherits that team&apos;s theme until an override is allotted.</Caption>
      <Typography variant="subtitle2">New user</Typography>
      <TextField size="small" label="Name" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
      <TextField size="small" type="password" label="Password" value={draft.password} onChange={(event) => setDraft({ ...draft, password: event.target.value })} helperText="At least 3 characters" />
      <TextField select size="small" label="Roles" value={draft.roleIds} onChange={(event) => setDraft({ ...draft, roleIds: event.target.value })} slotProps={{ select: { multiple: true } }}>
        {roles.map((role) => (
          <MenuItem key={role.id} value={role.id}>{role.name}</MenuItem>
        ))}
      </TextField>
      <TextField select size="small" label="Team" value={draft.sideId} onChange={(event) => setDraft({ ...draft, sideId: event.target.value })}>
        <MenuItem value="">No team</MenuItem>
        {sides.map((side) => (
          <MenuItem key={side.id} value={String(side.id)}>{side.name}</MenuItem>
        ))}
      </TextField>
      <ThemeField themes={themes} value={draft.themeId} onChange={(event) => setDraft({ ...draft, themeId: event.target.value })} holderKind="USER" allowEmpty={Boolean(draft.sideId)} />
      <Button variant="contained" disabled={busy || !draft.name.trim() || draft.password.length < 3 || !draft.roleIds.length} onClick={create}>Create user</Button>
      <Divider />
      {users.map((user) => (
        <UserEditor key={user.id} user={user} roles={roles} sides={sides} themes={themes} themeName={themeName} onChanged={reload} />
      ))}
    </Stack>
  )
}

function UserEditor({ user, roles, sides, themes, themeName, onChanged }) {
  const push = useToastStore((state) => state.push)
  const [password, setPassword] = useState('')
  const [themeId, setThemeId] = useState(user.themeId == null ? '' : String(user.themeId))
  const [busy, setBusy] = useState(false)
  const apex = user.name === 'APEX'
  const home = sides.find((side) => String(side.id) === String(user.homeSideId))
  useEffect(() => {
    setThemeId(user.themeId == null ? '' : String(user.themeId))
  }, [user.id, user.themeId])

  const patchUser = async (body, message) => {
    setBusy(true)
    try {
      await patch(`/users/${user.id}`, body)
      push(message, 'success')
      onChanged()
    } catch (error) {
      push(error?.message || 'The user could not be updated.', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Stack spacing={1}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <Typography variant="body2" sx={{ flex: 1, opacity: user.active ? 1 : 0.55 }}>{user.name}</Typography>
        <Caption>{user.active ? 'Active' : 'Inactive'}</Caption>
      </Stack>
      <Caption>
        {home ? `Team ${home.name}. ` : 'No team. '}
        Sees {themeName(user.displayThemeId) || 'no theme'}.
        {user.standardNodeId ? ' Created from an ORBAT node.' : ''}
        {user.themeId ? ' Override allotted.' : home ? ' Inherits the team theme.' : ''}
      </Caption>
      {apex ? <Caption>APEX keeps the login theme and changes it from the user menu.</Caption> : null}
      {!apex ? (
        <>
          <TextField
            select
            size="small"
            label="Roles"
            value={user.roleIds || []}
            onChange={(event) => patchUser({ roleIds: event.target.value }, 'Roles saved.')}
            slotProps={{ select: { multiple: true } }}
          >
            {roles.map((role) => (
              <MenuItem key={role.id} value={role.id}>{role.name}</MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Administers team"
            value={user.administeredSideId == null ? '' : String(user.administeredSideId)}
            onChange={(event) => event.target.value && patchUser({ administeredSideId: Number(event.target.value) }, 'Team assignment saved.')}
          >
            <MenuItem value="" disabled>Not set</MenuItem>
            {sides.map((side) => (
              <MenuItem key={side.id} value={String(side.id)}>{side.name}</MenuItem>
            ))}
          </TextField>
          <ThemeField themes={themes} value={themeId} onChange={(event) => setThemeId(event.target.value)} holderKind="USER" holderId={user.id} allowEmpty={false} label="Override theme" />
          <Stack direction="row" spacing={1}>
            <Button size="small" disabled={busy || !themeId} onClick={() => patchUser({ themeId: Number(themeId) }, 'Theme allotted.')}>Allot theme</Button>
            {user.themeId ? <Button size="small" disabled={busy || !home} onClick={() => patchUser({ clearTheme: true }, 'Override cleared.')}>Inherit team theme</Button> : null}
          </Stack>
          <Stack direction="row" spacing={1}>
            <TextField size="small" type="password" label="New password" value={password} onChange={(event) => setPassword(event.target.value)} sx={{ flex: 1 }} />
            <Button size="small" disabled={busy || password.length < 3} onClick={() => patchUser({ password }, 'Password set.').then(() => setPassword(''))}>Set</Button>
          </Stack>
          <Button size="small" color={user.active ? 'error' : 'primary'} disabled={busy} onClick={() => patchUser({ active: !user.active }, user.active ? 'User deactivated.' : 'User activated.')}>
            {user.active ? 'Deactivate' : 'Activate'}
          </Button>
        </>
      ) : null}
    </Stack>
  )
}

export function RolesPanel() {
  const push = useToastStore((state) => state.push)
  const [roles, setRoles] = useState([])
  const [catalog, setCatalog] = useState([])
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const { ready, reload } = useLoader(async () => {
    const [roleRows, functionalityRows] = await Promise.all([get('/roles'), get('/functionalities')])
    setRoles(roleRows)
    setCatalog(functionalityRows)
  }, 'Roles')

  const create = async () => {
    if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(code.trim()) || !name.trim()) {
      push('Use a role code of letters, digits and underscores, starting with a letter.', 'warning')
      return
    }
    setBusy(true)
    try {
      await post('/roles', { code: code.trim(), name: name.trim(), description: '', functionalityIds: [] })
      setCode('')
      setName('')
      push('Role created.', 'success')
      reload()
    } catch (error) {
      push(error?.message || 'The role could not be created.', 'error')
    } finally {
      setBusy(false)
    }
  }

  if (!ready && !roles.length) return <LoadingState label="Opening roles" />

  return (
    <Stack spacing={2}>
      <Caption>Roles are defined here. ORBAT and user management only assign them.</Caption>
      <TextField size="small" label="Role code" value={code} onChange={(event) => setCode(event.target.value)} />
      <TextField size="small" label="Role name" value={name} onChange={(event) => setName(event.target.value)} />
      <Button variant="contained" disabled={busy || !code.trim() || !name.trim()} onClick={create}>Add role</Button>
      <Divider />
      {roles.map((role) => (
        <RoleEditor key={role.id} role={role} catalog={catalog} onChanged={reload} />
      ))}
    </Stack>
  )
}

function RoleEditor({ role, catalog, onChanged }) {
  const push = useToastStore((state) => state.push)
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(role.name)
  const [functionalityIds, setFunctionalityIds] = useState(role.functionalityIds || [])
  useEffect(() => {
    setName(role.name)
    setFunctionalityIds(role.functionalityIds || [])
  }, [role.id, role.name, role.functionalityIds])
  const toggle = (id) => setFunctionalityIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))
  const save = async () => {
    try {
      await put(`/roles/${role.id}`, { code: role.code, name: name.trim(), description: role.description || '', functionalityIds })
      push('Role saved.', 'success')
      setOpen(false)
      onChanged()
    } catch (error) {
      push(error?.message || 'The role could not be saved.', 'error')
    }
  }
  const remove = async () => {
    try {
      await del(`/roles/${role.id}`)
      push('Role removed.', 'success')
      onChanged()
    } catch (error) {
      push(error?.message || 'The role could not be removed.', 'error')
    }
  }
  return (
    <Stack spacing={0.5}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <Typography variant="body2" sx={{ flex: 1 }}>{role.name}</Typography>
        <Caption>{role.code}</Caption>
        <Button size="small" onClick={() => setOpen(!open)}>{open ? 'Close' : 'Edit'}</Button>
      </Stack>
      {open ? (
        <Stack spacing={0.5}>
          <TextField size="small" label="Name" value={name} onChange={(event) => setName(event.target.value)} />
          {catalog.map((functionality) => (
            <FormControlLabel
              key={functionality.id}
              label={functionality.name}
              control={<Checkbox size="small" checked={functionalityIds.includes(functionality.id)} onChange={() => toggle(functionality.id)} />}
              sx={{ m: 0, '& .MuiFormControlLabel-label': { fontSize: 13 } }}
            />
          ))}
          <Stack direction="row" spacing={1}>
            <Button size="small" onClick={save}>Save</Button>
            {role.standard ? null : <Button size="small" color="error" onClick={remove}>Remove</Button>}
          </Stack>
        </Stack>
      ) : null}
    </Stack>
  )
}

export function ThemesPanel() {
  const push = useToastStore((state) => state.push)
  const [rows, setRows] = useState([])
  const [draft, setDraft] = useState({ id: null, name: '', description: '', defaultTheme: false, configJson: null })
  const [busy, setBusy] = useState(false)
  const reload = async () => setRows((await get('/themes')).map(asTheme))
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
        configJson: draft.configJson,
      }
      if (!body.name) throw new Error('Enter a theme name.')
      if (draft.id) await put(`/themes/${draft.id}`, body)
      else await post('/themes', body)
      setDraft({ id: null, name: '', description: '', defaultTheme: false, configJson: null })
      await reload()
      push(draft.id ? 'Theme saved.' : 'Theme created. Allot it from Teams or Users.', 'success')
    } catch (error) {
      push(error?.message || 'The theme could not be saved.', 'error')
    } finally {
      setBusy(false)
    }
  }

  const remove = async (id) => {
    setBusy(true)
    try {
      await del(`/themes/${id}`)
      await reload()
      push('Theme removed.', 'success')
    } catch (error) {
      push(error?.message || 'The theme could not be removed.', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Stack spacing={1.5}>
      <Caption>A theme is allotted to one team or one user. Members of a team display the team theme until a user override is allotted. APEX&apos;s theme is the login theme.</Caption>
      {rows.map((row) => (
        <Stack key={row.id} direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <Typography variant="body2" sx={{ flex: 1, minWidth: 120 }}>{row.name}</Typography>
          <Caption>{holderLabel(row)}</Caption>
          <Button size="small" onClick={() => setDraft({ id: row.id, name: row.name, description: row.description, defaultTheme: row.defaultTheme, configJson: row.configJson })}>Edit</Button>
          <Button size="small" color="error" disabled={busy || row.holderKind !== 'FREE'} onClick={() => remove(row.id)}>Remove</Button>
        </Stack>
      ))}
      <TextField size="small" label="Theme name" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
      <TextField size="small" label="Description" value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
      <Button disabled={busy || !draft.name.trim()} onClick={save}>{draft.id ? 'Save theme' : 'Add theme'}</Button>
    </Stack>
  )
}
