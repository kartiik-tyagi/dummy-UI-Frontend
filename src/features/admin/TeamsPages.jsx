import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Chip,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined'
import { del, get, post, put } from '../../shared/api/http'
import { swatchForColour } from '../../shared/api/mappers'
import { EMPTY_LIST } from '../../shared/lib/empty'
import { logger } from '../../shared/lib/logger'
import { swatches } from '../../shared/theme/swatches'
import { ConfirmDialog } from '../../shared/ui/ConfirmDialog'
import { IconField, IconPreview } from '../../shared/ui/IconPicker'
import { LoadingState } from '../../shared/ui/LoadingState'
import { ExerciseLayout } from '../scenario/ExerciseLayout'
import { useToastStore } from '../feedback/useToastStore'
import { useSessionStore } from '../session/useSessionStore'
import { asTheme, selectableThemes } from './themeChoices'

function ThemeField({ themes, value, onChange, holderKind, holderId }) {
  const options = selectableThemes(themes, holderKind, holderId)
  return (
    <TextField select label="Theme" value={value} onChange={onChange} required fullWidth>
      <MenuItem value="" disabled>
        Choose
      </MenuItem>
      {options.map((theme) => (
        <MenuItem key={theme.id} value={String(theme.id)}>
          {theme.name}
        </MenuItem>
      ))}
    </TextField>
  )
}

function ColourField({ value, onChange, allowCustom, customLabel }) {
  return (
    <TextField select label="Map colour" value={value} onChange={onChange} fullWidth>
      {allowCustom && value === 'custom' ? <MenuItem value="custom">{customLabel}</MenuItem> : null}
      {swatches.map((swatch) => (
        <MenuItem key={swatch.id} value={swatch.id}>
          {swatch.name}
        </MenuItem>
      ))}
    </TextField>
  )
}

function themeName(themes, themeId) {
  const found = themes.find((theme) => String(theme.id) === String(themeId))
  return found?.name || '—'
}

function TeamsList() {
  const navigate = useNavigate()
  const push = useToastStore((state) => state.push)
  const [sides, setSides] = useState(null)
  const [themes, setThemes] = useState(EMPTY_LIST)
  const [deleting, setDeleting] = useState(null)
  const [busyDelete, setBusyDelete] = useState(false)

  const load = useCallback(async () => {
    try {
      const [sideRows, themeRows] = await Promise.all([get('/sides'), get('/themes')])
      setSides(sideRows || EMPTY_LIST)
      setThemes((themeRows || EMPTY_LIST).map(asTheme))
    } catch (error) {
      setSides(EMPTY_LIST)
      push(error?.message || 'Teams could not be loaded.', 'error')
    }
  }, [push])

  useEffect(() => {
    load()
  }, [load])

  const confirmDelete = async () => {
    if (!deleting) return
    setBusyDelete(true)
    try {
      await del(`/sides/${deleting.id}`)
      push('Team removed.', 'success')
      setDeleting(null)
      await load()
    } catch (error) {
      push(error?.message || 'The team could not be removed.', 'error')
    } finally {
      setBusyDelete(false)
    }
  }

  if (!sides) return <LoadingState label="Loading teams" />

  const countries = sides.filter((side) => side.kind !== 'alliance')
  const alliances = sides.filter((side) => side.kind === 'alliance')

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        A team is a country side. Creating one also creates the standard ORBAT whose root is this side.
      </Typography>

      {!countries.length ? (
        <Box
          sx={{
            py: 8,
            px: 3,
            textAlign: 'center',
            border: 1,
            borderColor: 'divider',
            borderStyle: 'dashed',
            borderRadius: 2,
          }}
        >
          <Typography variant="h6" sx={{ mb: 1 }}>
            No teams yet
          </Typography>
          <Typography variant="body2" sx={{ mb: 2.5, color: 'text.secondary' }}>
            Create the first team to start a standard ORBAT.
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/standard/teams/new')}>
            New team
          </Button>
        </Box>
      ) : (
        <Stack spacing={1.25}>
          {countries.map((side) => (
            <Box
              key={side.id}
              sx={{
                p: 2,
                borderRadius: 2,
                border: 1,
                borderColor: 'divider',
                bgcolor: 'background.paper',
              }}
            >
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }} flexWrap="wrap" useFlexGap>
                <Box
                  sx={{
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    bgcolor: side.colour || 'text.disabled',
                    border: 1,
                    borderColor: 'divider',
                    flexShrink: 0,
                  }}
                />
                {side.icon ? <IconPreview path={side.icon} size={22} /> : null}
                <Typography variant="h6" sx={{ flex: 1, minWidth: 0, fontWeight: 600, fontSize: '1.05rem' }}>
                  {side.name}
                </Typography>
                <Chip size="small" label={themeName(themes, side.themeId)} variant="outlined" />
              </Stack>
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<EditOutlinedIcon />}
                  onClick={() => navigate(`/standard/teams/${side.id}`)}
                >
                  Edit
                </Button>
                <Button
                  size="small"
                  color="error"
                  variant="outlined"
                  startIcon={<DeleteOutlinedIcon />}
                  disabled={busyDelete}
                  onClick={() => setDeleting(side)}
                >
                  Remove
                </Button>
              </Stack>
            </Box>
          ))}
        </Stack>
      )}

      {alliances.length ? (
        <Box sx={{ pt: 1 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Alliances
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            An alliance is created inside a game, from the playing ORBAT.
          </Typography>
          <Stack spacing={0.75}>
            {alliances.map((side) => (
              <Typography key={side.id} variant="body2">
                {side.name}
              </Typography>
            ))}
          </Stack>
        </Box>
      ) : null}

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Remove team"
        message={
          deleting
            ? `Remove “${deleting.name}”? This also removes its standard ORBAT when nobody is marked on it.`
            : ''
        }
        confirmLabel="Remove"
        busy={busyDelete}
        onClose={() => {
          if (!busyDelete) setDeleting(null)
        }}
        onConfirm={confirmDelete}
      />
    </Stack>
  )
}

function TeamEditor() {
  const { id } = useParams()
  const isNew = !id || id === 'new'
  const navigate = useNavigate()
  const push = useToastStore((state) => state.push)
  const refreshSession = useSessionStore((state) => state.refresh)
  const [themes, setThemes] = useState(EMPTY_LIST)
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [busyDelete, setBusyDelete] = useState(false)
  const [name, setName] = useState('')
  const [swatchId, setSwatchId] = useState('blue')
  const [customColour, setCustomColour] = useState('')
  const [icon, setIcon] = useState('')
  const [themeId, setThemeId] = useState('')

  useEffect(() => {
    let live = true
    ;(async () => {
      try {
        const themeRows = ((await get('/themes')) || EMPTY_LIST).map(asTheme)
        if (!live) return
        setThemes(themeRows)
        if (isNew) {
          setReady(true)
          return
        }
        const side = await get(`/sides/${id}`)
        if (!live) return
        if (!side || side.kind === 'alliance') {
          push('That team was not found.', 'error')
          navigate('/standard/teams', { replace: true })
          return
        }
        setName(side.name || '')
        const match = swatchForColour(side.colour)
        setSwatchId(match?.id || 'custom')
        setCustomColour(side.colour || '')
        setIcon(side.icon || '')
        setThemeId(side.themeId == null ? '' : String(side.themeId))
        setReady(true)
      } catch (error) {
        if (!live) return
        push(error?.message || 'The team could not be opened.', 'error')
        navigate('/standard/teams', { replace: true })
      }
    })()
    return () => {
      live = false
    }
  }, [id, isNew, navigate, push])

  const save = async () => {
    if (!name.trim() || !themeId) return
    setBusy(true)
    setMessage('')
    try {
      const colour =
        swatchId === 'custom' ? customColour || '#2f6fed' : swatches.find((item) => item.id === swatchId)?.color || '#2f6fed'
      const body = {
        name: name.trim(),
        description: '',
        colour,
        icon: icon || null,
        themeId: Number(themeId),
      }
      if (isNew) {
        const created = await post('/sides', body)
        logger.info('team.created', { id: created.id, name: body.name })
        push('Team created. Its standard ORBAT root is ready.', 'success')
        await refreshSession().catch(() => {})
        navigate(`/standard/teams/${created.id}`, { replace: true })
      } else {
        await put(`/sides/${id}`, body)
        logger.info('team.updated', { id })
        push('Team saved.', 'success')
        await refreshSession().catch(() => {})
      }
    } catch (error) {
      setMessage(error?.message || 'The team could not be saved.')
      push(error?.message || 'The team could not be saved.', 'error')
    } finally {
      setBusy(false)
    }
  }

  const confirmDelete = async () => {
    setBusyDelete(true)
    try {
      await del(`/sides/${id}`)
      push('Team removed.', 'success')
      await refreshSession().catch(() => {})
      navigate('/standard/teams')
    } catch (error) {
      push(error?.message || 'The team could not be removed.', 'error')
      setDeleting(false)
    } finally {
      setBusyDelete(false)
    }
  }

  if (!ready) return <LoadingState label="Opening team" />

  return (
    <Stack spacing={2.5} sx={{ maxWidth: 560 }}>
      {message ? <Alert severity="error">{message}</Alert> : null}
      <TextField label="Name" value={name} onChange={(event) => setName(event.target.value)} fullWidth required />
      <ColourField
        value={swatchId}
        onChange={(event) => setSwatchId(event.target.value)}
        allowCustom={!isNew}
        customLabel={customColour || 'Current colour'}
      />
      <IconField value={icon} onChange={setIcon} />
      <ThemeField
        themes={themes}
        value={themeId}
        onChange={(event) => setThemeId(event.target.value)}
        holderKind="SIDE"
        holderId={isNew ? undefined : id}
      />
      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
        <Button onClick={() => navigate('/standard/teams')} disabled={busy || busyDelete}>
          Back to list
        </Button>
        <Button
          variant="contained"
          startIcon={<SaveOutlinedIcon />}
          disabled={busy || busyDelete || !name.trim() || !themeId}
          onClick={save}
        >
          {busy ? 'Saving…' : isNew ? 'Create team' : 'Save team'}
        </Button>
        {!isNew ? (
          <Button color="error" startIcon={<DeleteOutlinedIcon />} disabled={busy || busyDelete} onClick={() => setDeleting(true)}>
            Remove
          </Button>
        ) : null}
      </Stack>
      <ConfirmDialog
        open={deleting}
        title="Remove team"
        message="Remove this team? This also removes its standard ORBAT when nobody is marked on it."
        confirmLabel="Remove"
        busy={busyDelete}
        onClose={() => {
          if (!busyDelete) setDeleting(false)
        }}
        onConfirm={confirmDelete}
      />
    </Stack>
  )
}

export function TeamsListPage() {
  const navigate = useNavigate()
  return (
    <ExerciseLayout
      kicker="Standard data"
      title="Teams"
      actions={
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/standard/teams/new')}>
          New team
        </Button>
      }
    >
      <TeamsList />
    </ExerciseLayout>
  )
}

export function TeamEditorPage() {
  const { id } = useParams()
  const isNew = !id || id === 'new'
  return (
    <ExerciseLayout kicker="Standard data" title={isNew ? 'New team' : 'Edit team'}>
      <TeamEditor />
    </ExerciseLayout>
  )
}
