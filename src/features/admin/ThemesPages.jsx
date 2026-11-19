import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Alert,
  Checkbox,
  Chip,
  FormControlLabel,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined'
import { del, get, post, put } from '../../shared/api/http'
import { EMPTY_LIST } from '../../shared/lib/empty'
import { logger } from '../../shared/lib/logger'
import { ConfirmDialog } from '../../shared/ui/ConfirmDialog'
import { LoadingState } from '../../shared/ui/LoadingState'
import { ExerciseLayout } from '../scenario/ExerciseLayout'
import { useToastStore } from '../feedback/useToastStore'
import { useSessionStore } from '../session/useSessionStore'
import { asTheme, holderLabel } from './themeChoices'
import {
  ComfortButton,
  EmptyState,
  FormShell,
  ListCard,
  PageIntro,
  actionButtonSx,
  fieldSx,
  metaSx,
} from './standardUi'

const chipSx = { fontSize: '0.95rem', height: 32, fontWeight: 500 }

function statusLabel(theme) {
  if (!theme || theme.holderKind === 'FREE') return 'Available'
  if (theme.loginTheme) return 'Used for login (APEX)'
  if (theme.holderKind === 'SIDE') return `Given to team: ${theme.holderName}`
  if (theme.holderKind === 'USER') return `Given to user: ${theme.holderName}`
  return holderLabel(theme)
}

function ThemesList() {
  const navigate = useNavigate()
  const push = useToastStore((state) => state.push)
  const [rows, setRows] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [busyDelete, setBusyDelete] = useState(false)

  const load = useCallback(async () => {
    try {
      setRows(((await get('/themes')) || EMPTY_LIST).map(asTheme))
    } catch (error) {
      setRows(EMPTY_LIST)
      push(error?.message || 'Themes could not be loaded.', 'error')
    }
  }, [push])

  useEffect(() => {
    load()
  }, [load])

  const confirmDelete = async () => {
    if (!deleting) return
    setBusyDelete(true)
    try {
      await del(`/themes/${deleting.id}`)
      push('Theme removed.', 'success')
      setDeleting(null)
      await load()
    } catch (error) {
      push(error?.message || 'The theme could not be removed.', 'error')
    } finally {
      setBusyDelete(false)
    }
  }

  if (!rows) return <LoadingState label="Loading themes" />

  return (
    <Stack spacing={3}>
      <PageIntro>
        Themes control the colours people see on screen. Create a theme here, then give it to a team or a person from
        Teams or Users. The APEX theme is what appears on the login screen.
      </PageIntro>

      {!rows.length ? (
        <EmptyState
          title="No themes yet"
          body="Add a theme first, then assign it when you edit a team or a user."
          actionLabel="Add a theme"
          onAction={() => navigate('/standard/themes/new')}
        />
      ) : (
        <Stack spacing={2}>
          {rows.map((row) => {
            const available = row.holderKind === 'FREE'
            return (
              <ListCard
                key={row.id}
                title={row.name}
                meta={row.description || 'No description yet'}
                badges={
                  <>
                    {row.defaultTheme ? <Chip color="primary" label="Default" sx={chipSx} /> : null}
                    <Chip
                      variant="outlined"
                      color={available ? 'success' : 'default'}
                      label={statusLabel(row)}
                      sx={chipSx}
                    />
                  </>
                }
                primaryAction={
                  <ComfortButton
                    variant="contained"
                    startIcon={<EditOutlinedIcon />}
                    onClick={() => navigate(`/standard/themes/${row.id}`)}
                  >
                    Open / edit
                  </ComfortButton>
                }
                secondaryAction={
                  <ComfortButton
                    color="error"
                    variant="outlined"
                    startIcon={<DeleteOutlinedIcon />}
                    disabled={busyDelete || !available}
                    onClick={() => setDeleting(row)}
                    title={!available ? 'Only available themes can be removed' : undefined}
                  >
                    {available ? 'Remove theme' : 'In use — cannot remove'}
                  </ComfortButton>
                }
              />
            )
          })}
        </Stack>
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Remove this theme?"
        message={
          deleting
            ? `“${deleting.name}” will be permanently removed. Only themes that are not given to anyone can be removed.`
            : ''
        }
        confirmLabel="Yes, remove theme"
        busy={busyDelete}
        onClose={() => {
          if (!busyDelete) setDeleting(null)
        }}
        onConfirm={confirmDelete}
      />
    </Stack>
  )
}

function ThemeEditor() {
  const { id } = useParams()
  const isNew = !id || id === 'new'
  const navigate = useNavigate()
  const push = useToastStore((state) => state.push)
  const refreshSession = useSessionStore((state) => state.refresh)
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [busyDelete, setBusyDelete] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [defaultTheme, setDefaultTheme] = useState(false)
  const [configJson, setConfigJson] = useState(null)
  const [holderKind, setHolderKind] = useState('FREE')
  const [statusText, setStatusText] = useState('Available')

  useEffect(() => {
    let live = true
    ;(async () => {
      try {
        if (isNew) {
          setReady(true)
          return
        }
        const row = asTheme(await get(`/themes/${id}`))
        if (!live) return
        setName(row.name || '')
        setDescription(row.description || '')
        setDefaultTheme(Boolean(row.defaultTheme))
        setConfigJson(row.configJson)
        setHolderKind(row.holderKind || 'FREE')
        setStatusText(statusLabel(row))
        setReady(true)
      } catch (error) {
        if (!live) return
        push(error?.message || 'The theme could not be opened.', 'error')
        navigate('/standard/themes', { replace: true })
      }
    })()
    return () => {
      live = false
    }
  }, [id, isNew, navigate, push])

  const save = async () => {
    if (!name.trim()) return
    setBusy(true)
    setMessage('')
    try {
      const body = {
        name: name.trim(),
        description: description || '',
        defaultTheme: Boolean(defaultTheme),
        configJson,
      }
      if (isNew) {
        const created = await post('/themes', body)
        logger.info('theme.created', { id: created.id, name: body.name })
        push('Theme created. Assign it from Teams or Users.', 'success')
        await refreshSession().catch(() => {})
        navigate(`/standard/themes/${created.id}`, { replace: true })
      } else {
        await put(`/themes/${id}`, body)
        logger.info('theme.updated', { id })
        push('Theme saved.', 'success')
        await refreshSession().catch(() => {})
      }
    } catch (error) {
      setMessage(error?.message || 'The theme could not be saved.')
      push(error?.message || 'The theme could not be saved.', 'error')
    } finally {
      setBusy(false)
    }
  }

  const confirmDelete = async () => {
    setBusyDelete(true)
    try {
      await del(`/themes/${id}`)
      push('Theme removed.', 'success')
      await refreshSession().catch(() => {})
      navigate('/standard/themes')
    } catch (error) {
      push(error?.message || 'The theme could not be removed.', 'error')
      setDeleting(false)
    } finally {
      setBusyDelete(false)
    }
  }

  if (!ready) return <LoadingState label="Opening theme" />

  const available = holderKind === 'FREE'

  return (
    <FormShell
      actions={
        <>
          <ComfortButton variant="outlined" onClick={() => navigate('/standard/themes')} disabled={busy || busyDelete}>
            Back to themes
          </ComfortButton>
          <ComfortButton
            variant="contained"
            startIcon={<SaveOutlinedIcon />}
            disabled={busy || busyDelete || !name.trim()}
            onClick={save}
            sx={{ flex: { sm: '1 1 auto' }, maxWidth: { sm: 280 } }}
          >
            {busy ? 'Saving…' : isNew ? 'Create theme' : 'Save changes'}
          </ComfortButton>
          {!isNew ? (
            <ComfortButton
              color="error"
              variant="text"
              startIcon={<DeleteOutlinedIcon />}
              disabled={busy || busyDelete || !available}
              onClick={() => setDeleting(true)}
            >
              {available ? 'Remove theme' : 'In use — cannot remove'}
            </ComfortButton>
          ) : null}
        </>
      }
    >
      {message ? (
        <Alert severity="error" sx={{ fontSize: '1.05rem' }}>
          {message}
        </Alert>
      ) : null}
      {!isNew ? (
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          <Chip
            variant="outlined"
            color={available ? 'success' : 'default'}
            label={statusText}
            sx={chipSx}
          />
          {defaultTheme ? <Chip color="primary" label="Default" sx={chipSx} /> : null}
        </Stack>
      ) : null}
      <TextField
        label="Theme name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        fullWidth
        required
        helperText="A short name people will recognise in lists."
        sx={fieldSx}
      />
      <TextField
        label="Description (optional)"
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        fullWidth
        multiline
        minRows={3}
        helperText="A few words about when this theme should be used."
        sx={fieldSx}
      />
      <FormControlLabel
        control={
          <Checkbox
            checked={defaultTheme}
            onChange={(event) => setDefaultTheme(event.target.checked)}
            sx={{ '& .MuiSvgIcon-root': { fontSize: 28 } }}
          />
        }
        label={<Typography sx={{ fontSize: '1.05rem' }}>Mark as the default theme</Typography>}
      />
      <Typography sx={metaSx}>
        To give this theme to a team or a person, open Teams or Users and choose it there. Themes that are already given
        out cannot be removed until they are freed.
      </Typography>
      <ConfirmDialog
        open={deleting}
        title="Remove this theme?"
        message="Only themes that are not given to anyone can be removed. This cannot be undone."
        confirmLabel="Yes, remove theme"
        busy={busyDelete}
        onClose={() => {
          if (!busyDelete) setDeleting(false)
        }}
        onConfirm={confirmDelete}
      />
    </FormShell>
  )
}

export function ThemesListPage() {
  const navigate = useNavigate()
  return (
    <ExerciseLayout
      kicker="Standard data"
      title="Themes"
      actions={
        <ComfortButton variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/standard/themes/new')} sx={actionButtonSx}>
          Add a theme
        </ComfortButton>
      }
    >
      <ThemesList />
    </ExerciseLayout>
  )
}

export function ThemeEditorPage() {
  const { id } = useParams()
  const isNew = !id || id === 'new'
  return (
    <ExerciseLayout kicker="Standard data" title={isNew ? 'Add a theme' : 'Edit theme'}>
      <ThemeEditor />
    </ExerciseLayout>
  )
}
