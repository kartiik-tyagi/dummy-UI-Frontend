import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link as RouterLink, useNavigate, useParams, useSearchParams } from 'react-router-dom'
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
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined'
import { del, get, post, put } from '../../shared/api/http'
import { EMPTY_LIST } from '../../shared/lib/empty'
import { logger } from '../../shared/lib/logger'
import { ConfirmDialog } from '../../shared/ui/ConfirmDialog'
import { LoadingState } from '../../shared/ui/LoadingState'
import { RichTextEditor } from '../../shared/ui/richtext/RichTextEditor'
import { richTextPlain } from '../../shared/ui/richtext/RichTextView'
import { useToastStore } from '../feedback/useToastStore'
import { useSessionStore } from '../session/useSessionStore'
import { ExerciseLayout } from './ExerciseLayout'

const EMPTY = {
  name: '',
  dateTime: '',
  sunrise: '',
  sunset: '',
  moonphases: '',
  description: '',
}

function toLocalInput(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 16)
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function fromLocalInput(value) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 19)
}

function toTimeInput(value) {
  if (!value) return ''
  return String(value).slice(0, 5)
}

function fromTimeInput(value) {
  if (!value) return null
  return value.length === 5 ? `${value}:00` : value
}

function GameList() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const push = useToastStore((state) => state.push)
  const changeGame = useSessionStore((state) => state.changeGame)
  const refreshSession = useSessionStore((state) => state.refresh)
  const [scenarios, setScenarios] = useState(null)
  const [games, setGames] = useState(null)
  const [activatingId, setActivatingId] = useState(null)
  const scenarioId = searchParams.get('scenarioId') || ''

  useEffect(() => {
    let live = true
    get('/scenarios')
      .then(async (rows) => {
        if (!live) return
        const list = rows || EMPTY_LIST
        setScenarios(list)
        if (!scenarioId) {
          const preferred = list.find((row) => row.active) || list[0]
          if (preferred) setSearchParams({ scenarioId: String(preferred.id) }, { replace: true })
        }
        try {
          await refreshSession()
        } catch {
          // dropdown sync is best-effort
        }
      })
      .catch((error) => {
        if (!live) return
        setScenarios(EMPTY_LIST)
        push(error?.message || 'Scenarios could not be loaded.', 'error')
      })
    return () => {
      live = false
    }
  }, [push, scenarioId, setSearchParams, refreshSession])

  const loadGames = useCallback(async () => {
    if (!scenarioId) {
      setGames(EMPTY_LIST)
      return
    }
    try {
      setGames((await get(`/scenarios/${scenarioId}/games`)) || EMPTY_LIST)
    } catch (error) {
      setGames(EMPTY_LIST)
      push(error?.message || 'Games could not be loaded.', 'error')
    }
  }, [scenarioId, push])

  useEffect(() => {
    setGames(null)
    loadGames()
  }, [loadGames])

  const activate = async (event, item) => {
    event.preventDefault()
    event.stopPropagation()
    if (item.active || activatingId) return
    setActivatingId(item.id)
    try {
      await changeGame(String(item.id))
      push(`“${item.name}” is now the active game.`, 'success')
      await loadGames()
      await refreshSession()
    } catch (error) {
      push(error?.message || 'The game could not be activated.', 'error')
    } finally {
      setActivatingId(null)
    }
  }

  if (!scenarios) return <LoadingState label="Loading scenarios" />

  return (
    <Stack spacing={2.5}>
      <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 62 * 8 }}>
        One scenario owns many games. Each game carries its own timing and playing force. Activate one game
        here or from the top-bar dropdown to open the exercise.
      </Typography>
      <TextField
        select
        label="Scenario"
        value={scenarioId}
        onChange={(event) => setSearchParams(event.target.value ? { scenarioId: event.target.value } : {})}
        disabled={!scenarios.length}
        helperText={!scenarios.length ? 'Create a scenario first' : undefined}
        sx={{ maxWidth: 420 }}
      >
        {!scenarios.length ? <MenuItem value="">No scenarios</MenuItem> : null}
        {scenarios.map((item) => (
          <MenuItem key={item.id} value={String(item.id)}>
            {item.name}
            {item.active ? ' · active' : ''}
          </MenuItem>
        ))}
      </TextField>

      {!scenarios.length ? (
        <Button variant="outlined" onClick={() => navigate('/exercise/scenarios/new')}>
          Create a scenario
        </Button>
      ) : !games ? (
        <LoadingState label="Loading games" />
      ) : !games.length ? (
        <Box
          sx={{
            py: 7,
            px: 3,
            textAlign: 'center',
            border: 1,
            borderColor: 'divider',
            borderStyle: 'dashed',
            borderRadius: 2,
          }}
        >
          <Typography variant="h6" sx={{ mb: 1 }}>
            No games for this scenario
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate(`/exercise/games/new?scenarioId=${scenarioId}`)}
          >
            New game
          </Button>
        </Box>
      ) : (
        <Stack spacing={1.25}>
          {games.map((item) => (
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
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }} sx={{ mb: 0.5 }}>
                <Box
                  component={RouterLink}
                  to={`/exercise/games/${item.id}`}
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
                to={`/exercise/games/${item.id}`}
                variant="body2"
                color="text.secondary"
                sx={{ textDecoration: 'none', display: 'block' }}
              >
                {item.dateTime
                  ? new Date(item.dateTime).toLocaleString()
                  : richTextPlain(item.description, 120) || 'No schedule yet'}
              </Typography>
            </Box>
          ))}
        </Stack>
      )}
    </Stack>
  )
}

function GameEditor() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const isNew = id === 'new' || !id
  const navigate = useNavigate()
  const push = useToastStore((state) => state.push)
  const refreshSession = useSessionStore((state) => state.refresh)
  const [scenarios, setScenarios] = useState(EMPTY_LIST)
  const [scenarioId, setScenarioId] = useState(searchParams.get('scenarioId') || '')
  const [form, setForm] = useState(EMPTY)
  const [active, setActive] = useState(false)
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [ready, setReady] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    let live = true
    get('/scenarios')
      .then((rows) => {
        if (!live) return
        const list = rows || EMPTY_LIST
        setScenarios(list)
        setScenarioId((current) => current || String((list.find((row) => row.active) || list[0])?.id || ''))
      })
      .catch(() => {
        if (live) setScenarios(EMPTY_LIST)
      })
    return () => {
      live = false
    }
  }, [])

  useEffect(() => {
    if (isNew) {
      setForm(EMPTY)
      setActive(false)
      setReady(true)
      return
    }
    let live = true
    setReady(false)
    get(`/games/${id}`)
      .then((row) => {
        if (!live) return
        setScenarioId(String(row.scenarioId))
        setForm({
          name: row.name || '',
          dateTime: row.dateTime || '',
          sunrise: row.sunrise || '',
          sunset: row.sunset || '',
          moonphases: row.moonphases || '',
          description: row.description || '',
        })
        setActive(Boolean(row.active))
        setReady(true)
      })
      .catch((error) => {
        if (!live) return
        push(error?.message || 'Game not found.', 'error')
        navigate('/exercise/games', { replace: true })
      })
    return () => {
      live = false
    }
  }, [id, isNew, navigate, push])

  const change = (name, value) => setForm((current) => ({ ...current, [name]: value }))

  const body = useMemo(
    () => ({
      name: form.name.trim(),
      dateTime: fromLocalInput(form.dateTime),
      sunrise: fromTimeInput(form.sunrise),
      sunset: fromTimeInput(form.sunset),
      moonphases: form.moonphases || null,
      description: form.description || null,
      metadata: null,
    }),
    [form],
  )

  const save = async () => {
    if (!scenarioId) {
      setMessage('Choose a scenario for this game.')
      return
    }
    setBusy(true)
    setErrors({})
    setMessage('')
    try {
      if (isNew) {
        const created = await post(`/scenarios/${scenarioId}/games`, body)
        logger.info('game.created', { id: created.id, scenarioId })
        await refreshSession()
        push('Game created.', 'success')
        navigate(`/exercise/games/${created.id}`, { replace: true })
      } else {
        await put(`/games/${id}`, body)
        logger.info('game.updated', { id })
        await refreshSession()
        push('Game saved.', 'success')
      }
    } catch (error) {
      setErrors(error?.fieldErrors || {})
      setMessage(error?.message || 'The game could not be saved.')
      push(error?.message || 'The game could not be saved.', 'error')
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    setBusy(true)
    try {
      await del(`/games/${id}`)
      await refreshSession()
      push('Game deleted.', 'success')
      navigate(`/exercise/games?scenarioId=${scenarioId}`)
    } catch (error) {
      push(error?.message || 'The game could not be deleted.', 'error')
    } finally {
      setBusy(false)
      setConfirmDelete(false)
    }
  }

  if (!ready) return <LoadingState label="Opening game" />

  return (
    <Stack spacing={2.5}>
      {message ? <Alert severity="error">{message}</Alert> : null}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <TextField
          select
          label="Scenario"
          value={scenarioId}
          onChange={(event) => setScenarioId(event.target.value)}
          disabled={!isNew || !scenarios.length}
          sx={{ minWidth: { sm: 260 }, flex: 1 }}
        >
          {scenarios.map((item) => (
            <MenuItem key={item.id} value={String(item.id)}>
              {item.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label="Game name"
          value={form.name}
          onChange={(event) => change('name', event.target.value)}
          error={Boolean(errors.name)}
          helperText={errors.name || undefined}
          required
          fullWidth
          sx={{ flex: 1.4 }}
        />
        {active ? <Chip color="success" label="Active" sx={{ alignSelf: { sm: 'center' } }} /> : null}
      </Stack>

      <TextField
        type="datetime-local"
        label="Date and time"
        InputLabelProps={{ shrink: true }}
        value={form.dateTime ? toLocalInput(form.dateTime) : form.dateTime}
        onChange={(event) => change('dateTime', event.target.value)}
        error={Boolean(errors.dateTime)}
        helperText={errors.dateTime || undefined}
        fullWidth
      />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <TextField
          type="time"
          label="Sunrise"
          InputLabelProps={{ shrink: true }}
          value={toTimeInput(form.sunrise)}
          onChange={(event) => change('sunrise', event.target.value)}
          fullWidth
        />
        <TextField
          type="time"
          label="Sunset"
          InputLabelProps={{ shrink: true }}
          value={toTimeInput(form.sunset)}
          onChange={(event) => change('sunset', event.target.value)}
          fullWidth
        />
      </Stack>
      <TextField
        label="Moonphases"
        multiline
        minRows={2}
        value={form.moonphases}
        onChange={(event) => change('moonphases', event.target.value)}
        error={Boolean(errors.moonphases)}
        helperText={errors.moonphases || undefined}
        fullWidth
      />
      <RichTextEditor
        label="Description"
        value={form.description}
        onChange={(html) => change('description', html)}
        placeholder="Situation for this game…"
        error={Boolean(errors.description)}
        helperText={errors.description}
        minHeight={140}
      />

      <Stack direction="row" spacing={1} justifyContent="space-between" flexWrap="wrap" useFlexGap>
        <Box>
          {!isNew ? (
            <Button color="error" startIcon={<DeleteOutlinedIcon />} disabled={busy || active} onClick={() => setConfirmDelete(true)}>
              Delete
            </Button>
          ) : null}
        </Box>
        <Stack direction="row" spacing={1}>
          <Button onClick={() => navigate(scenarioId ? `/exercise/games?scenarioId=${scenarioId}` : '/exercise/games')} disabled={busy}>
            Cancel
          </Button>
          <Button variant="contained" startIcon={<SaveOutlinedIcon />} onClick={save} disabled={busy || !form.name.trim()}>
            {busy ? 'Saving…' : isNew ? 'Create game' : 'Save game'}
          </Button>
        </Stack>
      </Stack>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this game?"
        message="Playing ORBATs and alliances for this game are removed. The active game cannot be deleted."
        confirmLabel="Delete"
        busy={busy}
        onClose={() => setConfirmDelete(false)}
        onConfirm={remove}
      />
    </Stack>
  )
}

export function GameListPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const scenarioId = searchParams.get('scenarioId')
  return (
    <ExerciseLayout
      kicker="Exercise"
      title="Game management"
      actions={
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          disabled={!scenarioId}
          onClick={() => navigate(`/exercise/games/new${scenarioId ? `?scenarioId=${scenarioId}` : ''}`)}
        >
          New game
        </Button>
      }
    >
      <GameList />
    </ExerciseLayout>
  )
}

export function GameEditorPage() {
  const { id } = useParams()
  const isNew = !id || id === 'new'
  return (
    <ExerciseLayout kicker="Exercise" title={isNew ? 'New game' : 'Edit game'}>
      <GameEditor />
    </ExerciseLayout>
  )
}
