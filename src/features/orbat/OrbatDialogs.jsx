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

/** Creates a user bound to a saved standard ORBAT node. */
export function MarkAsUserDialog({ open, node, roles = EMPTY_LIST, onClose, onSubmit }) {
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [roleIds, setRoleIds] = useState([])
  const { busy, error, setError, run } = useSubmit(onSubmit)
  useEffect(() => {
    if (open) {
      setName(node?.name || '')
      setPassword('')
      setRoleIds([])
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
      onSubmit={() => run({ name: name.trim(), password, roleIds })}
    >
      <Typography variant="body2" color="text.secondary">Creates a sign-in for the node {node?.name}.</Typography>
      <TextField autoFocus required label="User name" value={name} onChange={(event) => setName(event.target.value)} autoComplete="off" />
      <TextField required type="password" label="Password" value={password} onChange={(event) => setPassword(event.target.value)} helperText="At least 3 characters" autoComplete="new-password" />
      <FormGroup>
        <FormLabel component="legend" sx={{ fontSize: 13 }}>Roles</FormLabel>
        {roles.length ? roles.map((role) => (
          <FormControlLabel key={role.id} label={role.name} control={<Checkbox size="small" checked={roleIds.includes(role.id)} onChange={() => toggle(role.id)} />} />
        )) : <Typography variant="caption" color="text.secondary">No roles are available to you.</Typography>}
      </FormGroup>
    </Shell>
  )
}

/** Picks the country team whose standard ORBAT is replicated into the scenario. */
export function ReplicaDialog({ open, teams = EMPTY_LIST, onClose, onSubmit }) {
  const [teamId, setTeamId] = useState('')
  const { busy, error, setError, run } = useSubmit(onSubmit)
  useEffect(() => {
    if (open) {
      setTeamId(teams[0]?.id ?? '')
      setError('')
    }
  }, [open, teams, setError])
  return (
    <Shell open={open} title="Replicate a standard ORBAT" submitLabel="Replicate" onClose={onClose} busy={busy} error={error} submitDisabled={teamId === ''} onSubmit={() => run(teamId)}>
      {teams.length ? (
        <TextField select required label="Team" value={teamId} onChange={(event) => setTeamId(event.target.value)}>
          {teams.map((team) => (
            <MenuItem key={team.id} value={team.id}>{team.name}</MenuItem>
          ))}
        </TextField>
      ) : (
        <Typography variant="body2" color="text.secondary">Every country team already has a playing ORBAT in this scenario.</Typography>
      )}
    </Shell>
  )
}

/** Creates an alliance (a team of kind alliance) with its merged playing ORBAT. */
export function AllianceDialog({ open, teams = EMPTY_LIST, themes = EMPTY_LIST, onClose, onSubmit }) {
  const [name, setName] = useState('')
  const [colour, setColour] = useState('#2f6fed')
  const [icon, setIcon] = useState('')
  const [themeId, setThemeId] = useState('')
  const [members, setMembers] = useState([])
  const { busy, error, setError, run } = useSubmit(onSubmit)
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
      submitDisabled={!name.trim() || members.length < 1}
      onSubmit={() => run({ name: name.trim(), colour, icon: icon || null, themeId: themeId === '' ? null : themeId, memberTeamIds: members })}
    >
      <TextField autoFocus required label="Alliance name" value={name} onChange={(event) => setName(event.target.value)} />
      <TextField label="Map colour" type="color" value={colour} onChange={(event) => setColour(event.target.value)} />
      <IconField value={icon} onChange={setIcon} />
      {themes.length ? (
        <TextField select label="Theme" value={themeId} onChange={(event) => setThemeId(event.target.value)}>
          <MenuItem value="">None</MenuItem>
          {themes.map((theme) => (
            <MenuItem key={theme.id} value={theme.id}>{theme.name}</MenuItem>
          ))}
        </TextField>
      ) : null}
      <FormGroup>
        <FormLabel component="legend" sx={{ fontSize: 13 }}>Member teams (each needs a standard ORBAT)</FormLabel>
        {teams.map((team) => (
          <FormControlLabel key={team.id} label={team.name} control={<Checkbox size="small" checked={members.includes(team.id)} onChange={() => toggle(team.id)} />} />
        ))}
      </FormGroup>
    </Shell>
  )
}
