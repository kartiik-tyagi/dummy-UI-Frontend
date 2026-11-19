import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Chip,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined'
import SportsEsportsOutlinedIcon from '@mui/icons-material/SportsEsportsOutlined'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import { del, get, post, put } from '../../shared/api/http'
import { EMPTY_LIST } from '../../shared/lib/empty'
import { logger } from '../../shared/lib/logger'
import { ConfirmDialog } from '../../shared/ui/ConfirmDialog'
import { LoadingState } from '../../shared/ui/LoadingState'
import { RichTextEditor } from '../../shared/ui/richtext/RichTextEditor'
import { RichTextView, richTextPlain } from '../../shared/ui/richtext/RichTextView'
import { useToastStore } from '../feedback/useToastStore'
import { useSessionStore } from '../session/useSessionStore'
import { ExerciseLayout } from './ExerciseLayout'
import { ScenarioAttachment, uploadAttachment } from './ScenarioAttachment'

const EMPTY = {
  name: '',
  generalIdea: '',
  openingNarrative: '',
  specialIdea: '',
}

function ScenarioList() {
  const navigate = useNavigate()
  const push = useToastStore((state) => state.push)
  const changeScenario = useSessionStore((state) => state.changeScenario)
  const refreshSession = useSessionStore((state) => state.refresh)
  const [items, setItems] = useState(null)
  const [activatingId, setActivatingId] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [busyDelete, setBusyDelete] = useState(false)

  const load = useCallback(async () => {
    try {
      const rows = (await get('/scenarios')) || EMPTY_LIST
      setItems(rows)
      await refreshSession()
    } catch (error) {
      setItems(EMPTY_LIST)
      push(error?.message || 'Scenarios could not be loaded.', 'error')
    }
  }, [push, refreshSession])

  useEffect(() => {
    load()
  }, [load])

  const activate = async (item) => {
    if (item.active || activatingId) return
    setActivatingId(item.id)
    try {
      await changeScenario(String(item.id))
      push(`“${item.name}” is now the active scenario.`, 'success')
      await load()
    } catch (error) {
      push(error?.message || 'The scenario could not be activated.', 'error')
    } finally {
      setActivatingId(null)
    }
  }

  const confirmDelete = async () => {
    if (!deleting) return
    setBusyDelete(true)
    try {
      await del(`/scenarios/${deleting.id}`)
      await refreshSession()
      push('Scenario deleted.', 'success')
      setDeleting(null)
      await load()
    } catch (error) {
      push(error?.message || 'The scenario could not be deleted.', 'error')
    } finally {
      setBusyDelete(false)
    }
  }

  if (!items) return <LoadingState label="Loading scenarios" />

  return (
    <Stack spacing={2}>
      {!items.length ? (
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
          <Typography variant="h6" sx={{ mb: 1, color: 'text.primary' }}>
            No scenarios yet
          </Typography>
          <Typography variant="body2" sx={{ mb: 2.5, color: 'text.secondary' }}>
            Create the first scenario to open games against it.
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/exercise/scenarios/new')}>
            New scenario
          </Button>
        </Box>
      ) : (
        <Stack spacing={1.25}>
          {items.map((item) => (
            <Box
              key={item.id}
              sx={{
                p: 2,
                borderRadius: 2,
                border: 1,
                borderColor: item.active ? 'primary.main' : 'divider',
                bgcolor: 'background.paper',
              }}
            >
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.75 }} flexWrap="wrap" useFlexGap>
                <Typography variant="h6" sx={{ flex: 1, minWidth: 0, fontWeight: 600, fontSize: '1.05rem', color: 'text.primary' }}>
                  {item.name}
                </Typography>
                {item.active ? <Chip size="small" color="success" label="Active" /> : null}
              </Stack>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5 }}>
                {richTextPlain(item.generalIdea, 140) || 'No general idea yet'}
              </Typography>
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<VisibilityOutlinedIcon />}
                  onClick={() => navigate(`/exercise/scenarios/${item.id}/preview`)}
                >
                  Preview
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<EditOutlinedIcon />}
                  onClick={() => navigate(`/exercise/scenarios/${item.id}`)}
                >
                  Edit
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<SportsEsportsOutlinedIcon />}
                  onClick={() => navigate(`/exercise/games?scenarioId=${item.id}`)}
                >
                  Manage games
                </Button>
                <Button
                  size="small"
                  variant={item.active ? 'outlined' : 'contained'}
                  startIcon={<CheckCircleOutlinedIcon />}
                  disabled={Boolean(item.active) || activatingId != null}
                  onClick={() => activate(item)}
                >
                  {item.active ? 'Active' : activatingId === item.id ? 'Activating…' : 'Activate'}
                </Button>
                <Button
                  size="small"
                  color="error"
                  variant="outlined"
                  startIcon={<DeleteOutlinedIcon />}
                  disabled={Boolean(item.active) || busyDelete}
                  onClick={() => setDeleting(item)}
                >
                  Delete
                </Button>
              </Stack>
            </Box>
          ))}
        </Stack>
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete this scenario?"
        message={
          deleting
            ? `“${deleting.name}” and its games will be removed. The active scenario cannot be deleted.`
            : ''
        }
        confirmLabel="Delete"
        busy={busyDelete}
        onClose={() => {
          if (!busyDelete) setDeleting(null)
        }}
        onConfirm={confirmDelete}
      />
    </Stack>
  )
}

function ScenarioPreview() {
  const { id } = useParams()
  const navigate = useNavigate()
  const push = useToastStore((state) => state.push)
  const [row, setRow] = useState(null)

  useEffect(() => {
    let live = true
    get(`/scenarios/${id}`)
      .then((data) => {
        if (live) setRow(data)
      })
      .catch((error) => {
        if (!live) return
        push(error?.message || 'Scenario not found.', 'error')
        navigate('/exercise/scenarios', { replace: true })
      })
    return () => {
      live = false
    }
  }, [id, navigate, push])

  if (!row) return <LoadingState label="Opening scenario" />

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
        <Typography variant="h5" sx={{ flex: 1, fontWeight: 600, color: 'text.primary' }}>
          {row.name}
        </Typography>
        {row.active ? <Chip color="success" label="Active exercise" /> : null}
      </Stack>

      {[
        ['General idea', row.generalIdea],
        ['Opening narrative', row.openingNarrative],
        ['Special idea', row.specialIdea],
      ].map(([label, html]) => (
        <Box
          key={label}
          sx={{
            p: 2,
            borderRadius: 2,
            border: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
        >
          <Typography variant="overline" sx={{ letterSpacing: '0.12em', color: 'text.secondary' }}>
            {label}
          </Typography>
          <Box sx={{ mt: 1 }}>
            <RichTextView html={html} />
          </Box>
        </Box>
      ))}

      <ScenarioAttachment scenarioId={id} fileName={row.attachedFile || ''} disabled />

      <Stack direction="row" spacing={1} justifyContent="flex-end" useFlexGap flexWrap="wrap">
        <Button onClick={() => navigate('/exercise/scenarios')}>Back to list</Button>
        <Button
          variant="outlined"
          startIcon={<SportsEsportsOutlinedIcon />}
          onClick={() => navigate(`/exercise/games?scenarioId=${id}`)}
        >
          Manage games
        </Button>
        <Button variant="contained" startIcon={<EditOutlinedIcon />} onClick={() => navigate(`/exercise/scenarios/${id}`)}>
          Edit
        </Button>
      </Stack>
    </Stack>
  )
}

function ScenarioEditor() {
  const { id } = useParams()
  const isNew = id === 'new' || !id
  const navigate = useNavigate()
  const push = useToastStore((state) => state.push)
  const refreshSession = useSessionStore((state) => state.refresh)
  const [form, setForm] = useState(EMPTY)
  const [attachedFile, setAttachedFile] = useState('')
  const [pendingFile, setPendingFile] = useState(null)
  const [active, setActive] = useState(false)
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [ready, setReady] = useState(isNew)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (isNew) {
      setForm(EMPTY)
      setAttachedFile('')
      setPendingFile(null)
      setActive(false)
      setReady(true)
      return
    }
    let live = true
    setReady(false)
    get(`/scenarios/${id}`)
      .then((row) => {
        if (!live) return
        setForm({
          name: row.name || '',
          generalIdea: row.generalIdea || '',
          openingNarrative: row.openingNarrative || '',
          specialIdea: row.specialIdea || '',
        })
        setAttachedFile(row.attachedFile || '')
        setActive(Boolean(row.active))
        setReady(true)
      })
      .catch((error) => {
        if (!live) return
        push(error?.message || 'Scenario not found.', 'error')
        navigate('/exercise/scenarios', { replace: true })
      })
    return () => {
      live = false
    }
  }, [id, isNew, navigate, push])

  const change = (name, value) => setForm((current) => ({ ...current, [name]: value }))

  const save = async () => {
    setBusy(true)
    setErrors({})
    setMessage('')
    const body = {
      name: form.name.trim(),
      generalIdea: form.generalIdea || null,
      openingNarrative: form.openingNarrative || null,
      specialIdea: form.specialIdea || null,
    }
    try {
      if (isNew) {
        const created = await post('/scenarios', body)
        logger.info('scenario.created', { id: created.id })
        if (pendingFile) {
          try {
            await uploadAttachment(created.id, pendingFile)
            logger.info('scenario.attachment.uploaded', { id: created.id, file: pendingFile.name })
          } catch (uploadError) {
            await refreshSession()
            push('Scenario created, but the attachment could not be uploaded.', 'warning')
            push(uploadError?.message || 'Attachment upload failed.', 'error')
            navigate(`/exercise/scenarios/${created.id}`, { replace: true })
            return
          }
        }
        await refreshSession()
        push(pendingFile ? 'Scenario created with attachment.' : 'Scenario created.', 'success')
        navigate(`/exercise/scenarios/${created.id}`, { replace: true })
      } else {
        await put(`/scenarios/${id}`, body)
        logger.info('scenario.updated', { id })
        await refreshSession()
        push('Scenario saved.', 'success')
      }
    } catch (error) {
      setErrors(error?.fieldErrors || {})
      setMessage(error?.message || 'The scenario could not be saved.')
      push(error?.message || 'The scenario could not be saved.', 'error')
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    setBusy(true)
    try {
      await del(`/scenarios/${id}`)
      await refreshSession()
      push('Scenario deleted.', 'success')
      navigate('/exercise/scenarios')
    } catch (error) {
      push(error?.message || 'The scenario could not be deleted.', 'error')
    } finally {
      setBusy(false)
      setConfirmDelete(false)
    }
  }

  if (!ready) return <LoadingState label="Opening scenario" />

  return (
    <Stack spacing={2.5}>
      {message ? <Alert severity="error">{message}</Alert> : null}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
        <TextField
          label="Scenario name"
          value={form.name}
          onChange={(event) => change('name', event.target.value)}
          error={Boolean(errors.name)}
          helperText={errors.name || undefined}
          fullWidth
          required
          sx={{ flex: 1 }}
        />
        {active ? <Chip color="success" label="Active exercise" /> : null}
      </Stack>

      <RichTextEditor
        label="General idea"
        value={form.generalIdea}
        onChange={(html) => change('generalIdea', html)}
        placeholder="Strategic intent for this scenario…"
        error={Boolean(errors.generalIdea)}
        helperText={errors.generalIdea}
        minHeight={120}
      />
      <RichTextEditor
        label="Opening narrative"
        value={form.openingNarrative}
        onChange={(html) => change('openingNarrative', html)}
        placeholder="How the exercise begins…"
        error={Boolean(errors.openingNarrative)}
        helperText={errors.openingNarrative}
        minHeight={180}
      />
      <RichTextEditor
        label="Special idea"
        value={form.specialIdea}
        onChange={(html) => change('specialIdea', html)}
        placeholder="Constraints, surprises, and special instructions…"
        error={Boolean(errors.specialIdea)}
        helperText={errors.specialIdea}
        minHeight={120}
      />
      <ScenarioAttachment
        scenarioId={isNew ? null : id}
        fileName={attachedFile}
        pendingFile={isNew ? pendingFile : null}
        onPendingChange={isNew ? setPendingFile : undefined}
        disabled={busy}
        onChanged={(name) => setAttachedFile(name || '')}
      />

      <Stack direction="row" spacing={1} justifyContent="space-between" useFlexGap flexWrap="wrap">
        <Box>
          {!isNew ? (
            <Button color="error" startIcon={<DeleteOutlinedIcon />} disabled={busy || active} onClick={() => setConfirmDelete(true)}>
              Delete
            </Button>
          ) : null}
        </Box>
        <Stack direction="row" spacing={1}>
          <Button onClick={() => navigate('/exercise/scenarios')} disabled={busy}>
            Cancel
          </Button>
          <Button variant="contained" startIcon={<SaveOutlinedIcon />} onClick={save} disabled={busy || !form.name.trim()}>
            {busy ? 'Saving…' : isNew ? 'Create scenario' : 'Save scenario'}
          </Button>
        </Stack>
      </Stack>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this scenario?"
        message="Games and playing forces under it are removed. The active scenario cannot be deleted."
        confirmLabel="Delete"
        busy={busy}
        onClose={() => setConfirmDelete(false)}
        onConfirm={remove}
      />
    </Stack>
  )
}

export function ScenarioListPage() {
  const navigate = useNavigate()
  return (
    <ExerciseLayout
      kicker="Exercise"
      title="Scenario management"
      actions={
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/exercise/scenarios/new')}>
          New scenario
        </Button>
      }
    >
      <ScenarioList />
    </ExerciseLayout>
  )
}

export function ScenarioPreviewPage() {
  return (
    <ExerciseLayout kicker="Exercise" title="Scenario preview">
      <ScenarioPreview />
    </ExerciseLayout>
  )
}

export function ScenarioEditorPage() {
  const { id } = useParams()
  const isNew = !id || id === 'new'
  return (
    <ExerciseLayout kicker="Exercise" title={isNew ? 'New scenario' : 'Edit scenario'}>
      <ScenarioEditor />
    </ExerciseLayout>
  )
}
