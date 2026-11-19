import { useCallback, useEffect, useState } from 'react'
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined'
import SportsEsportsOutlinedIcon from '@mui/icons-material/SportsEsportsOutlined'
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
import { ScenarioAttachment } from './ScenarioAttachment'

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

  const activate = async (event, item) => {
    event.preventDefault()
    event.stopPropagation()
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

  if (!items) return <LoadingState label="Loading scenarios" />

  return (
    <Stack spacing={2}>
      <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 62 * 8 }}>
        Define the plot for the exercise. Narratives are rich text — bold, lists, and emphasis are stored
        and shown the same way everywhere in the product. Activate one scenario for the open exercise.
      </Typography>
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
          <Typography variant="h6" sx={{ mb: 1 }}>
            No scenarios yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
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
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }} sx={{ mb: 0.75 }}>
                <Box
                  component={RouterLink}
                  to={`/exercise/scenarios/${item.id}`}
                  sx={{ flex: 1, minWidth: 0, textDecoration: 'none', color: 'inherit' }}
                >
                  <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.05rem' }}>
                    {item.name}
                  </Typography>
                </Box>
                {item.active ? <Chip size="small" color="success" label="Active" /> : null}
                <Button
                  size="small"
                  variant={item.active ? 'outlined' : 'contained'}
                  startIcon={<CheckCircleOutlinedIcon />}
                  disabled={Boolean(item.active) || activatingId != null}
                  onClick={(event) => activate(event, item)}
                >
                  {item.active ? 'Active' : activatingId === item.id ? 'Activating…' : 'Activate'}
                </Button>
              </Stack>
              <Typography
                component={RouterLink}
                to={`/exercise/scenarios/${item.id}`}
                variant="body2"
                color="text.secondary"
                sx={{ textDecoration: 'none', display: 'block' }}
              >
                {richTextPlain(item.generalIdea, 140) || 'No general idea yet'}
              </Typography>
            </Box>
          ))}
        </Stack>
      )}
    </Stack>
  )
}

function ScenarioEditor() {
  const { id } = useParams()
  const isNew = id === 'new' || !id
  const navigate = useNavigate()
  const push = useToastStore((state) => state.push)
  const refreshSession = useSessionStore((state) => state.refresh)
  const changeScenario = useSessionStore((state) => state.changeScenario)
  const [form, setForm] = useState(EMPTY)
  const [attachedFile, setAttachedFile] = useState('')
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
        await refreshSession()
        push('Scenario created.', 'success')
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
        disabled={busy}
        onChanged={(name) => setAttachedFile(name || '')}
      />

      {!isNew ? (
        <>
          <Divider />
          <Box>
            <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.12em' }}>
              Preview
            </Typography>
            <Box sx={{ mt: 1, p: 2, borderRadius: 2, border: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
              <Typography variant="subtitle2" sx={{ mb: 0.75 }}>
                General idea
              </Typography>
              <RichTextView html={form.generalIdea} />
            </Box>
          </Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <Button
              variant={active ? 'outlined' : 'contained'}
              startIcon={<CheckCircleOutlinedIcon />}
              disabled={busy || active}
              onClick={async () => {
                setBusy(true)
                try {
                  await changeScenario(String(id))
                  setActive(true)
                  push('Scenario activated.', 'success')
                  await refreshSession()
                } catch (error) {
                  push(error?.message || 'The scenario could not be activated.', 'error')
                } finally {
                  setBusy(false)
                }
              }}
            >
              {active ? 'Active' : 'Activate'}
            </Button>
            <Button
              variant="outlined"
              startIcon={<SportsEsportsOutlinedIcon />}
              onClick={() => navigate(`/exercise/games?scenarioId=${id}`)}
            >
              Manage games
            </Button>
            <Button
              color="error"
              startIcon={<DeleteOutlinedIcon />}
              disabled={busy || active}
              onClick={() => setConfirmDelete(true)}
            >
              Delete
            </Button>
          </Stack>
        </>
      ) : null}

      <Stack direction="row" spacing={1} justifyContent="flex-end">
        <Button onClick={() => navigate('/exercise/scenarios')} disabled={busy}>
          Cancel
        </Button>
        <Button variant="contained" startIcon={<SaveOutlinedIcon />} onClick={save} disabled={busy || !form.name.trim()}>
          {busy ? 'Saving…' : isNew ? 'Create scenario' : 'Save scenario'}
        </Button>
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

export function ScenarioEditorPage() {
  const { id } = useParams()
  const isNew = !id || id === 'new'
  return (
    <ExerciseLayout kicker="Exercise" title={isNew ? 'New scenario' : 'Edit scenario'}>
      <ScenarioEditor />
    </ExerciseLayout>
  )
}
