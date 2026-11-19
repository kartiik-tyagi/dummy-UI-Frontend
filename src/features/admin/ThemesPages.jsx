import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
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
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        A theme is allotted to one team or one user. Members of a team display the team theme until a user override is
        allotted. APEX&apos;s theme is the login theme.
      </Typography>

      {!rows.length ? (
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
            No themes yet
          </Typography>
          <Typography variant="body2" sx={{ mb: 2.5, color: 'text.secondary' }}>
            Create a theme, then allot it from Teams or Users.
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/standard/themes/new')}>
            New theme
          </Button>
        </Box>
      ) : (
        <Stack spacing={1.25}>
          {rows.map((row) => (
            <Box
              key={row.id}
              sx={{
                p: 2,
                borderRadius: 2,
                border: 1,
                borderColor: 'divider',
                bgcolor: 'background.paper',
              }}
            >
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.75 }} flexWrap="wrap" useFlexGap>
                <Typography variant="h6" sx={{ flex: 1, minWidth: 0, fontWeight: 600, fontSize: '1.05rem' }}>
                  {row.name}
                </Typography>
                {row.defaultTheme ? <Chip size="small" color="primary" label="Default" /> : null}
                <Chip size="small" variant="outlined" label={holderLabel(row)} />
              </Stack>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5 }}>
                {row.description || 'No description'}
              </Typography>
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<EditOutlinedIcon />}
                  onClick={() => navigate(`/standard/themes/${row.id}`)}
                >
                  Edit
                </Button>
                <Button
                  size="small"
                  color="error"
                  variant="outlined"
                  startIcon={<DeleteOutlinedIcon />}
                  disabled={busyDelete || row.holderKind !== 'FREE'}
                  onClick={() => setDeleting(row)}
                >
                  Remove
                </Button>
              </Stack>
            </Box>
          ))}
        </Stack>
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Remove theme"
        message={deleting ? `Remove “${deleting.name}”? Only free themes can be removed.` : ''}
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
  const [holderChip, setHolderChip] = useState('Free')

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
        setHolderChip(holderLabel(row))
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
        push('Theme created. Allot it from Teams or Users.', 'success')
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

  return (
    <Stack spacing={2.5} sx={{ maxWidth: 560 }}>
      {message ? <Alert severity="error">{message}</Alert> : null}
      {!isNew ? (
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          <Chip size="small" variant="outlined" label={holderChip} />
          {defaultTheme ? <Chip size="small" color="primary" label="Default" /> : null}
        </Stack>
      ) : null}
      <TextField label="Theme name" value={name} onChange={(event) => setName(event.target.value)} fullWidth required />
      <TextField
        label="Description"
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        fullWidth
        multiline
        minRows={2}
      />
      <FormControlLabel
        control={<Checkbox checked={defaultTheme} onChange={(event) => setDefaultTheme(event.target.checked)} />}
        label="Default theme"
      />
      <Typography variant="body2" color="text.secondary">
        Allotment is managed from Teams and Users. Free themes can be removed; allotted themes cannot.
      </Typography>
      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
        <Button onClick={() => navigate('/standard/themes')} disabled={busy || busyDelete}>
          Back to list
        </Button>
        <Button
          variant="contained"
          startIcon={<SaveOutlinedIcon />}
          disabled={busy || busyDelete || !name.trim()}
          onClick={save}
        >
          {busy ? 'Saving…' : isNew ? 'Create theme' : 'Save theme'}
        </Button>
        {!isNew ? (
          <Button
            color="error"
            startIcon={<DeleteOutlinedIcon />}
            disabled={busy || busyDelete || holderKind !== 'FREE'}
            onClick={() => setDeleting(true)}
          >
            Remove
          </Button>
        ) : null}
      </Stack>
      <ConfirmDialog
        open={deleting}
        title="Remove theme"
        message="Remove this theme? Only free themes can be removed."
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

export function ThemesListPage() {
  const navigate = useNavigate()
  return (
    <ExerciseLayout
      kicker="Standard data"
      title="Themes"
      actions={
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/standard/themes/new')}>
          New theme
        </Button>
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
    <ExerciseLayout kicker="Standard data" title={isNew ? 'New theme' : 'Edit theme'}>
      <ThemeEditor />
    </ExerciseLayout>
  )
}
