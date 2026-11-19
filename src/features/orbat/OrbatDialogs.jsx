import { useEffect, useState } from 'react'
import {
  Alert,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  FormGroup,
  FormLabel,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { IconField } from '../../shared/ui/IconPicker'
import { EMPTY_LIST } from '../../shared/lib/empty'
import { swatches } from '../../shared/theme/swatches'
import { asTheme, selectableThemes } from '../admin/themeChoices'

/** Runs an async submit, keeps the dialog open and shows the message when it fails. */
function useSubmit(onSubmit) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const run = async (...args) => {
    setBusy(true)
    setError('')
    try {
      await onSubmit(...args)
    } catch (failure) {
      setError(failure?.message || 'The change could not be made.')
    } finally {
      setBusy(false)
    }
  }
  return { busy, error, setError, run }
}

function Shell({ open, title, onClose, busy, error, submitLabel, submitDisabled, onSubmit, children, maxWidth = 'xs' }) {
  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth={maxWidth} component="form" onSubmit={(event) => { event.preventDefault(); if (!submitDisabled) onSubmit() }}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {children}
          {error ? <Alert severity="error">{error}</Alert> : null}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={busy}>Cancel</Button>
        <Button type="submit" variant="contained" disabled={busy || submitDisabled}>{busy ? 'Working' : submitLabel}</Button>
      </DialogActions>
    </Dialog>
  )
}

/** Add a child (name + type) or rename (name only). */
export function NodeNameDialog({ open, title, submitLabel = 'Save', initialName = '', initialTypeId = '', nodeTypes = EMPTY_LIST, withType = false, onClose, onSubmit }) {
  const [name, setName] = useState(initialName)
  const [typeId, setTypeId] = useState(initialTypeId)
  const { busy, error, setError, run } = useSubmit(onSubmit)
  useEffect(() => {
    if (open) {
      setName(initialName)
      setTypeId(initialTypeId)
      setError('')
    }
  }, [open, initialName, initialTypeId, setError])
  return (
    <Shell open={open} title={title} onClose={onClose} busy={busy} error={error} submitLabel={submitLabel} submitDisabled={!name.trim()} onSubmit={() => run({ name: name.trim(), nodeTypeId: typeId === '' ? null : typeId })}>
      <TextField autoFocus required label="Name" value={name} onChange={(event) => setName(event.target.value)} slotProps={{ htmlInput: { maxLength: 200 } }} />
      {withType ? (
        <TextField select label="Node type" value={typeId} onChange={(event) => setTypeId(event.target.value)}>
          <MenuItem value="">None</MenuItem>
          {nodeTypes.map((type) => (
            <MenuItem key={type.id} value={type.id}>{type.name}</MenuItem>
          ))}
        </TextField>
      ) : null}
    </Shell>
  )
}

/** Creates a user bound to a saved standard ORBAT node. An empty theme inherits the side theme. */
export function MarkAsUserDialog({ open, node, roles = EMPTY_LIST, themes = EMPTY_LIST, onClose, onSubmit }) {
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [roleIds, setRoleIds] = useState([])
  const [themeId, setThemeId] = useState('')
  const { busy, error, setError, run } = useSubmit(onSubmit)
  const free = selectableThemes(themes, 'USER', null)
  useEffect(() => {
    if (open) {
      setName(node?.name || '')
      setPassword('')
      setRoleIds([])
      setThemeId('')
      setError('')
    }
  }, [open, node, setError])
  const toggle = (id) => setRoleIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))
  return (
    <Shell
      open={open}
      title="Mark as user"
      submitLabel="Create user"
      onClose={onClose}
      busy={busy}
      error={error}
      submitDisabled={!name.trim() || password.length < 3 || !roleIds.length}
      onSubmit={() => run({ name: name.trim(), password, roleIds, themeId: themeId === '' ? null : Number(themeId) })}
    >
      <Typography variant="body2" color="text.secondary">Creates a sign-in for the node {node?.name}. Leave the theme empty to inherit this side.</Typography>
      <TextField autoFocus required label="User name" value={name} onChange={(event) => setName(event.target.value)} autoComplete="off" />
      <TextField required type="password" label="Password" value={password} onChange={(event) => setPassword(event.target.value)} helperText="At least 3 characters" autoComplete="new-password" />
      <TextField select label="Override theme" value={themeId} onChange={(event) => setThemeId(event.target.value)}>
        <MenuItem value="">Inherit the team theme</MenuItem>
        {free.map((theme) => (
          <MenuItem key={theme.id} value={String(theme.id)}>{theme.name}</MenuItem>
        ))}
      </TextField>
      <FormGroup>
        <FormLabel component="legend" sx={{ fontSize: 13 }}>Roles</FormLabel>
        {roles.length ? roles.map((role) => (
          <FormControlLabel key={role.id} label={role.name} control={<Checkbox size="small" checked={roleIds.includes(role.id)} onChange={() => toggle(role.id)} />} />
        )) : <Typography variant="caption" color="text.secondary">No roles are available to you.</Typography>}
      </FormGroup>
    </Shell>
  )
}

/** Creates a country side and the standard ORBAT root in one step. */
export function ForceDialog({ open, themes = EMPTY_LIST, onClose, onSubmit }) {
  const [name, setName] = useState('')
  const [swatchId, setSwatchId] = useState('blue')
  const [icon, setIcon] = useState('')
  const [themeId, setThemeId] = useState('')
  const { busy, error, setError, run } = useSubmit(onSubmit)
  const free = selectableThemes(themes, 'SIDE', null)
  useEffect(() => {
    if (open) {
      setName('')
      setSwatchId('blue')
      setIcon('')
      setThemeId('')
      setError('')
    }
  }, [open, setError])
  const colour = swatches.find((item) => item.id === swatchId)?.color || '#2f6fed'
  return (
    <Shell
      open={open}
      title="New side"
      submitLabel="Create side"
      onClose={onClose}
      busy={busy}
      error={error}
      submitDisabled={!name.trim() || !themeId}
      onSubmit={() => run({ name: name.trim(), colour, icon: icon || null, themeId: Number(themeId), description: '' })}
    >
      <Typography variant="body2" color="text.secondary">The root of the standard ORBAT is this side. The theme cannot be shared with another side or user.</Typography>
      <TextField autoFocus required label="Side name" value={name} onChange={(event) => setName(event.target.value)} />
      <TextField select label="Map colour" value={swatchId} onChange={(event) => setSwatchId(event.target.value)}>
        {swatches.map((swatch) => (
          <MenuItem key={swatch.id} value={swatch.id}>{swatch.name}</MenuItem>
        ))}
      </TextField>
      <IconField value={icon} onChange={setIcon} />
      <TextField select required label="Theme" value={themeId} onChange={(event) => setThemeId(event.target.value)}>
        <MenuItem value="">Choose</MenuItem>
        {free.map((theme) => (
          <MenuItem key={theme.id} value={String(theme.id)}>{theme.name}</MenuItem>
        ))}
      </TextField>
      {free.length ? null : <Typography variant="caption" color="text.secondary">No free theme is left. Create one in Themes first.</Typography>}
    </Shell>
  )
}

/** Picks the country side whose standard ORBAT is replicated into the game. */
export function ReplicaDialog({ open, sides = EMPTY_LIST, onClose, onSubmit }) {
  const [sideId, setSideId] = useState('')
  const { busy, error, setError, run } = useSubmit(onSubmit)
  useEffect(() => {
    if (open) {
      setSideId(sides[0]?.id ?? '')
      setError('')
    }
  }, [open, sides, setError])
  return (
    <Shell open={open} title="Replicate a standard ORBAT" submitLabel="Replicate" onClose={onClose} busy={busy} error={error} submitDisabled={sideId === ''} onSubmit={() => run(sideId)}>
      {sides.length ? (
        <TextField select required label="Side" value={sideId} onChange={(event) => setSideId(event.target.value)}>
          {sides.map((side) => (
            <MenuItem key={side.id} value={side.id}>{side.name}</MenuItem>
          ))}
        </TextField>
      ) : (
        <Typography variant="body2" color="text.secondary">Every country side is already playing in this game, on its own or in an alliance.</Typography>
      )}
    </Shell>
  )
}

/** Creates an alliance (a side of kind alliance) with its merged playing ORBAT. */
export function AllianceDialog({ open, sides = EMPTY_LIST, themes = EMPTY_LIST, onClose, onSubmit }) {
  const [name, setName] = useState('')
  const [colour, setColour] = useState('#2f6fed')
  const [icon, setIcon] = useState('')
  const [themeId, setThemeId] = useState('')
  const [members, setMembers] = useState([])
  const { busy, error, setError, run } = useSubmit(onSubmit)
  const free = selectableThemes(themes.map(asTheme), 'SIDE', null)
  useEffect(() => {
    if (open) {
      setName('')
      setColour('#2f6fed')
      setIcon('')
      setThemeId('')
      setMembers([])
      setError('')
    }
  }, [open, setError])
  const toggle = (id) => setMembers((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))
  return (
    <Shell
      open={open}
      title="Create an alliance"
      submitLabel="Create alliance"
      onClose={onClose}
      busy={busy}
      error={error}
      submitDisabled={!name.trim() || members.length < 1 || themeId === ''}
      onSubmit={() => run({ name: name.trim(), colour, icon: icon || null, themeId: themeId === '' ? null : Number(themeId), memberSideIds: members })}
    >
      <TextField autoFocus required label="Alliance name" value={name} onChange={(event) => setName(event.target.value)} />
      <TextField label="Map colour" type="color" value={colour} onChange={(event) => setColour(event.target.value)} />
      <IconField value={icon} onChange={setIcon} />
      <TextField select required label="Theme" value={themeId} onChange={(event) => setThemeId(event.target.value)}>
        <MenuItem value="">Choose</MenuItem>
        {free.map((theme) => (
          <MenuItem key={theme.id} value={theme.id}>{theme.name}</MenuItem>
        ))}
      </TextField>
      <FormGroup>
        <FormLabel component="legend" sx={{ fontSize: 13 }}>Member sides still free in this game</FormLabel>
        {sides.length ? sides.map((side) => (
          <FormControlLabel key={side.id} label={side.name} control={<Checkbox size="small" checked={members.includes(side.id)} onChange={() => toggle(side.id)} />} />
        )) : (
          <Typography variant="body2" color="text.secondary">Every country side is already playing in this game, on its own or in an alliance.</Typography>
        )}
      </FormGroup>
    </Shell>
  )
}
