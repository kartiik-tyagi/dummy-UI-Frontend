import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Alert,
  Box,
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
import {
  ComfortButton,
  EmptyState,
  FormShell,
  ListCard,
  PageIntro,
  actionButtonSx,
  fieldSx,
  menuItemSx,
  metaSx,
} from './standardUi'

function ThemeField({ themes, value, onChange, holderKind, holderId }) {
  const options = selectableThemes(themes, holderKind, holderId)
  return (
    <TextField
      select
      label="Theme (screen colours)"
      value={value}
      onChange={onChange}
      required
      fullWidth
      helperText="Pick a free theme, or keep the one already given to this team."
      sx={fieldSx}
    >
      <MenuItem value="" disabled sx={menuItemSx}>
        Choose a theme
      </MenuItem>
      {options.map((theme) => (
        <MenuItem key={theme.id} value={String(theme.id)} sx={menuItemSx}>
          {theme.name}
        </MenuItem>
      ))}
    </TextField>
  )
}

function ColourField({ value, onChange, allowCustom, customLabel }) {
  return (
    <TextField
      select
      label="Colour on the map"
      value={value}
      onChange={onChange}
      fullWidth
      helperText="This colour marks the team on the map."
      sx={fieldSx}
    >
      {allowCustom && value === 'custom' ? (
        <MenuItem value="custom" sx={menuItemSx}>
          {customLabel}
        </MenuItem>
      ) : null}
      {swatches.map((swatch) => (
        <MenuItem key={swatch.id} value={swatch.id} sx={menuItemSx}>
          {swatch.name}
        </MenuItem>
      ))}
    </TextField>
  )
}

function themeName(themes, themeId) {
  const found = themes.find((theme) => String(theme.id) === String(themeId))
  return found?.name || 'No theme'
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
    <Stack spacing={3}>
      <PageIntro>
        Teams are the countries in an exercise. When you create a team, the system also prepares its force tree
        (ORBAT) so you can fill units later.
      </PageIntro>

      {!countries.length ? (
        <EmptyState
          title="No teams yet"
          body="Start by adding the first country team. You can change its name, colour, and theme at any time."
          actionLabel="Add a team"
          onAction={() => navigate('/standard/teams/new')}
        />
      ) : (
        <Stack spacing={2}>
          {countries.map((side) => (
            <ListCard
              key={side.id}
              leading={
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Box
                    sx={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      bgcolor: side.colour || 'text.disabled',
                      border: 2,
                      borderColor: 'divider',
                      flexShrink: 0,
                    }}
                    title="Map colour"
                  />
                  {side.icon ? <IconPreview path={side.icon} size={32} /> : null}
                </Stack>
              }
              title={side.name}
              meta={`Theme: ${themeName(themes, side.themeId)}`}
              primaryAction={
                <ComfortButton
                  variant="contained"
                  startIcon={<EditOutlinedIcon />}
                  onClick={() => navigate(`/standard/teams/${side.id}`)}
                >
                  Open / edit
                </ComfortButton>
              }
              secondaryAction={
                <ComfortButton
                  color="error"
                  variant="outlined"
                  startIcon={<DeleteOutlinedIcon />}
                  disabled={busyDelete}
                  onClick={() => setDeleting(side)}
                >
                  Remove team
                </ComfortButton>
              }
            />
          ))}
        </Stack>
      )}

      {alliances.length ? (
        <Box
          sx={{
            pt: 1,
            px: 2.5,
            py: 2.5,
            borderRadius: 2,
            border: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
        >
          <Typography sx={{ ...metaSx, fontWeight: 600, color: 'text.primary', mb: 1, fontSize: '1.15rem' }}>
            Alliances (read only here)
          </Typography>
          <Typography sx={{ ...metaSx, mb: 1.5 }}>
            Alliances are created during a game from the playing ORBAT. They appear below for reference.
          </Typography>
          <Stack spacing={1}>
            {alliances.map((side) => (
              <Typography key={side.id} sx={{ fontSize: '1.05rem' }}>
                {side.name}
              </Typography>
            ))}
          </Stack>
        </Box>
      ) : null}

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Remove this team?"
        message={
          deleting
            ? `“${deleting.name}” will be removed. Its force tree is also removed if nobody is marked on it. This cannot be undone.`
            : ''
        }
        confirmLabel="Yes, remove team"
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
        push('Team created. Its force tree is ready.', 'success')
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
    <FormShell
      actions={
        <>
          <ComfortButton variant="outlined" onClick={() => navigate('/standard/teams')} disabled={busy || busyDelete}>
            Back to teams
          </ComfortButton>
          <ComfortButton
            variant="contained"
            startIcon={<SaveOutlinedIcon />}
            disabled={busy || busyDelete || !name.trim() || !themeId}
            onClick={save}
            sx={{ flex: { sm: '1 1 auto' }, maxWidth: { sm: 280 } }}
          >
            {busy ? 'Saving…' : isNew ? 'Create team' : 'Save changes'}
          </ComfortButton>
          {!isNew ? (
            <ComfortButton
              color="error"
              variant="text"
              startIcon={<DeleteOutlinedIcon />}
              disabled={busy || busyDelete}
              onClick={() => setDeleting(true)}
            >
              Remove team
            </ComfortButton>
          ) : null}
        </>
      }
    >
      {message ? (
        <Alert severity="error" sx={{ fontSize: '1.05rem', alignItems: 'center' }}>
          {message}
        </Alert>
      ) : null}
      <TextField
        label="Team name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        fullWidth
        required
        helperText="Use the country or force name people will recognise."
        sx={fieldSx}
      />
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
      <ConfirmDialog
        open={deleting}
        title="Remove this team?"
        message="The team and its force tree will be removed if nobody is marked on it. This cannot be undone."
        confirmLabel="Yes, remove team"
        busy={busyDelete}
        onClose={() => {
          if (!busyDelete) setDeleting(false)
        }}
        onConfirm={confirmDelete}
      />
    </FormShell>
  )
}

export function TeamsListPage() {
  const navigate = useNavigate()
  return (
    <ExerciseLayout
      kicker="Standard data"
      title="Teams"
      actions={
        <ComfortButton
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/standard/teams/new')}
          sx={actionButtonSx}
        >
          Add a team
        </ComfortButton>
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
    <ExerciseLayout kicker="Standard data" title={isNew ? 'Add a team' : 'Edit team'}>
      <TeamEditor />
    </ExerciseLayout>
  )
}
