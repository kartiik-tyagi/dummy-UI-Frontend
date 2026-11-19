import { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  Button,
  Chip,
  List,
  ListItemButton,
  ListItemText,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { ApiError } from '../../shared/api/errors'
import { del, get, post, put } from '../../shared/api/http'
import { EMPTY_LIST } from '../../shared/lib/empty'
import { logger } from '../../shared/lib/logger'
import { ConfirmDialog } from '../../shared/ui/ConfirmDialog'
import { LoadingState } from '../../shared/ui/LoadingState'
import { useToastStore } from '../feedback/useToastStore'
import { useSessionStore } from '../session/useSessionStore'

const EMPTY_SCENARIO = {
  name: '',
  generalIdea: '',
  openingNarrative: '',
  specialIdea: '',
}

const EMPTY_GAME = {
  name: '',
  dateTime: '',
  sunrise: '',
  sunset: '',
  moonphases: '',
  description: '',
}

function clip(text, length = 80) {
  if (!text) return ''
  const value = String(text)
  return value.length > length ? `${value.slice(0, length - 1)}…` : value
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

/**
 * List + form + activate/delete shared by scenarios and games.
 * `listPath` is null until a parent (scenario) is chosen; `itemPath(id)` addresses a single record.
 */
function ExerciseCrud({ noun, listPath, itemPath, empty, toBody, primary, secondary, extraFields, details, disabledNote }) {
  const push = useToastStore((state) => state.push)
  const refreshSession = useSessionStore((state) => state.refresh)
  const [items, setItems] = useState(null)
  const [selectedId, setSelectedId] = useState('new')
  const [form, setForm] = useState(empty)
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const fail = useCallback((error, fallback) => {
    const text = error?.message || fallback
    setErrors(error?.fieldErrors || {})
    setMessage(text)
    push(text, 'error')
    logger.warn(`${noun}.admin.failed`, { code: error?.code, message: text })
  }, [noun, push])

  const reset = useCallback((record) => {
    setSelectedId(record ? record.id : 'new')
    setForm(record ? Object.fromEntries(Object.keys(empty).map((key) => [key, record[key] ?? ''])) : empty)
    setErrors({})
    setMessage('')
  }, [empty])

  const load = useCallback(async () => {
    if (!listPath) {
      setItems(EMPTY_LIST)
      return
    }
    try {
      setItems((await get(listPath)) || EMPTY_LIST)
    } catch (error) {
      setItems(EMPTY_LIST)
      fail(error, `The ${noun}s could not be loaded.`)
    }
  }, [listPath, noun, fail])

  useEffect(() => {
    setItems(null)
    reset(null)
    load()
  }, [load, reset])

  const selected = items?.find((item) => item.id === selectedId) || null
  const change = (name, value) => setForm((current) => ({ ...current, [name]: value }))

  const run = async (action, fallback) => {
    setBusy(true)
    setErrors({})
    setMessage('')
    try {
      return await action()
    } catch (error) {
      fail(error, fallback)
      return undefined
    } finally {
      setBusy(false)
    }
  }

  const syncShell = async () => {
    try {
      await refreshSession()
    } catch (error) {
      logger.warn(`${noun}.admin.session_refresh_failed`, { message: error?.message })
    }
  }

  const save = () =>
    run(async () => {
      const isNew = selectedId === 'new'
      const body = toBody(form)
      if (!body.name) {
        throw new ApiError(`Enter a ${noun} name.`, 'VALIDATION', { fieldErrors: { name: 'Required' } })
      }
      const saved = isNew ? await post(listPath, body) : await put(itemPath(selectedId), body)
      logger.info(`${noun}.admin.${isNew ? 'created' : 'updated'}`, { id: saved?.id ?? selectedId })
      push(`${noun[0].toUpperCase()}${noun.slice(1)} saved.`, 'success')
      await load()
      await syncShell()
      if (saved) reset(saved)
    }, `The ${noun} could not be saved.`)

  const activate = () =>
    run(async () => {
      await post(`${itemPath(selectedId)}/activate`)
      logger.info(`${noun}.admin.activated`, { id: selectedId })
      push(`${noun[0].toUpperCase()}${noun.slice(1)} activated.`, 'success')
      await load()
      await syncShell()
    }, `The ${noun} could not be activated.`)

  const remove = () =>
    run(async () => {
      await del(itemPath(selectedId))
      logger.info(`${noun}.admin.deleted`, { id: selectedId })
      push(`${noun[0].toUpperCase()}${noun.slice(1)} deleted.`, 'success')
      setConfirmDelete(false)
      await load()
      await syncShell()
      reset(null)
    }, `The ${noun} could not be deleted.`)

  if (!listPath) {
    return <Alert severity="info">{disabledNote || `Choose a parent to manage ${noun}s.`}</Alert>
  }
  if (!items) return <LoadingState label={`Loading ${noun}s`} />

  return (
    <Stack spacing={1.5} direction={{ xs: 'column', md: 'row' }} useFlexGap sx={{ alignItems: 'stretch' }}>
      <Stack spacing={1} sx={{ width: { md: 280 }, flexShrink: 0 }}>
        <Button size="small" variant={selectedId === 'new' ? 'contained' : 'outlined'} onClick={() => reset(null)} disabled={busy}>
          New {noun}
        </Button>
        <List dense disablePadding sx={{ border: 1, borderColor: 'divider', borderRadius: 1, maxHeight: 360, overflow: 'auto' }}>
          {items.map((item) => (
            <ListItemButton key={item.id} selected={item.id === selectedId} onClick={() => reset(item)} disabled={busy}>
              <ListItemText
                primary={primary(item)}
                secondary={secondary?.(item)}
                primaryTypographyProps={{ noWrap: true }}
                secondaryTypographyProps={{ noWrap: true }}
              />
              {item.active ? <Chip size="small" color="success" label="Active" sx={{ ml: 1 }} /> : null}
            </ListItemButton>
          ))}
          {!items.length ? (
            <ListItemText sx={{ px: 2, py: 1.5 }} secondary={`No ${noun}s yet.`} />
          ) : null}
        </List>
      </Stack>

      <Stack spacing={1.5} sx={{ flex: 1, minWidth: 0 }}>
        {message ? <Alert severity="error">{message}</Alert> : null}
        <TextField
          size="small"
          label="Name"
          required
          value={form.name}
          onChange={(event) => change('name', event.target.value)}
          error={Boolean(errors.name)}
          helperText={errors.name || undefined}
        />
        {extraFields?.({ form, errors, change, selected })}
        {selected && details ? details(selected) : null}
        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
          <Button variant="contained" onClick={save} disabled={busy}>Save</Button>
          {selectedId !== 'new' ? (
            <Button variant="outlined" onClick={activate} disabled={busy || selected?.active}>Activate</Button>
          ) : null}
          {selectedId !== 'new' ? (
            <Button color="error" variant="outlined" onClick={() => setConfirmDelete(true)} disabled={busy || selected?.active}>
              Delete
            </Button>
          ) : null}
        </Stack>
      </Stack>

      <ConfirmDialog
        open={confirmDelete}
        title={`Delete ${noun}?`}
        body={`Delete “${selected?.name || noun}”? This cannot be undone.`}
        confirmLabel="Delete"
        busy={busy}
        onClose={() => setConfirmDelete(false)}
        onConfirm={remove}
      />
    </Stack>
  )
}

/** Scenarios: plot fields + activate (needs MANAGE_SCENARIO). */
export function ScenarioAdminPanel() {
  return (
    <Stack spacing={1.5}>
      <Typography variant="body2" color="text.secondary">
        Create the plot, then activate one scenario for the exercise.
      </Typography>
      <ExerciseCrud
        noun="scenario"
        listPath="/scenarios"
        itemPath={(id) => `/scenarios/${id}`}
        empty={EMPTY_SCENARIO}
        toBody={(form) => ({
          name: form.name.trim(),
          generalIdea: form.generalIdea || null,
          openingNarrative: form.openingNarrative || null,
          specialIdea: form.specialIdea || null,
        })}
        primary={(item) => item.name}
        secondary={(item) => clip(item.generalIdea)}
        extraFields={({ form, errors, change }) => (
          <>
            <TextField
              size="small"
              label="General idea"
              multiline
              minRows={2}
              value={form.generalIdea}
              onChange={(event) => change('generalIdea', event.target.value)}
              error={Boolean(errors.generalIdea)}
              helperText={errors.generalIdea || undefined}
            />
            <TextField
              size="small"
              label="Opening narrative"
              multiline
              minRows={3}
              value={form.openingNarrative}
              onChange={(event) => change('openingNarrative', event.target.value)}
              error={Boolean(errors.openingNarrative)}
              helperText={errors.openingNarrative || undefined}
            />
            <TextField
              size="small"
              label="Special idea"
              multiline
              minRows={2}
              value={form.specialIdea}
              onChange={(event) => change('specialIdea', event.target.value)}
              error={Boolean(errors.specialIdea)}
              helperText={errors.specialIdea || undefined}
            />
            <Typography variant="caption" color="text.secondary">
              Attachments are managed on the full scenario page (txt, doc, pdf, jpg).
            </Typography>
          </>
        )}
      />
    </Stack>
  )
}

/** Games of one scenario: CRUD plus activation (needs MANAGE_GAME). */
export function GameAdminPanel() {
  const push = useToastStore((state) => state.push)
  const [scenarios, setScenarios] = useState(null)
  const [scenarioId, setScenarioId] = useState('')

  useEffect(() => {
    let live = true
    get('/scenarios')
      .then((rows) => {
        if (!live) return
        const list = rows || EMPTY_LIST
        setScenarios(list)
        setScenarioId((current) => current || (list.find((row) => row.active) || list[0])?.id || '')
      })
      .catch((error) => {
        if (!live) return
        setScenarios(EMPTY_LIST)
        push(error?.message || 'The scenarios could not be loaded.', 'error')
        logger.warn('game.admin.scenarios.failed', { message: error?.message })
      })
    return () => {
      live = false
    }
  }, [push])

  if (!scenarios) return <LoadingState label="Loading scenarios" />

  return (
    <Stack spacing={1.5}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} useFlexGap sx={{ alignItems: { sm: 'center' }, flexWrap: 'wrap' }}>
        <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
          Games belong to a scenario. Each game owns its playing force. Activate one game for the exercise.
        </Typography>
        <TextField
          select
          size="small"
          label="Scenario"
          value={scenarioId}
          onChange={(event) => setScenarioId(event.target.value)}
          disabled={!scenarios.length}
          displayEmpty
          helperText={!scenarios.length ? 'Create a scenario first' : undefined}
          sx={{ minWidth: { xs: '100%', sm: 220 } }}
        >
          {!scenarios.length ? <MenuItem value="" disabled>No scenarios</MenuItem> : null}
          {scenarios.map((item) => (
            <MenuItem key={item.id} value={item.id}>{item.name}{item.active ? ' · active' : ''}</MenuItem>
          ))}
        </TextField>
      </Stack>
      <ExerciseCrud
        key={scenarioId}
        noun="game"
        listPath={scenarioId ? `/scenarios/${scenarioId}/games` : null}
        itemPath={(id) => `/games/${id}`}
        empty={EMPTY_GAME}
        toBody={(form) => ({
          name: form.name.trim(),
          dateTime: fromLocalInput(form.dateTime),
          sunrise: fromTimeInput(form.sunrise),
          sunset: fromTimeInput(form.sunset),
          moonphases: form.moonphases || null,
          description: form.description || null,
          metadata: null,
        })}
        primary={(item) => item.name}
        secondary={(item) => item.dateTime ? new Date(item.dateTime).toLocaleString() : clip(item.description)}
        disabledNote="Choose a scenario to manage its games."
        extraFields={({ form, errors, change, selected }) => (
          <>
            <TextField
              size="small"
              type="datetime-local"
              label="Date and time"
              InputLabelProps={{ shrink: true }}
              value={form.dateTime ? toLocalInput(form.dateTime) : form.dateTime}
              onChange={(event) => change('dateTime', event.target.value)}
              error={Boolean(errors.dateTime)}
              helperText={errors.dateTime || undefined}
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <TextField
                size="small"
                type="time"
                label="Sunrise"
                InputLabelProps={{ shrink: true }}
                value={toTimeInput(form.sunrise)}
                onChange={(event) => change('sunrise', event.target.value)}
                error={Boolean(errors.sunrise)}
                helperText={errors.sunrise || undefined}
                fullWidth
              />
              <TextField
                size="small"
                type="time"
                label="Sunset"
                InputLabelProps={{ shrink: true }}
                value={toTimeInput(form.sunset)}
                onChange={(event) => change('sunset', event.target.value)}
                error={Boolean(errors.sunset)}
                helperText={errors.sunset || undefined}
                fullWidth
              />
            </Stack>
            <TextField
              size="small"
              label="Moonphases"
              multiline
              minRows={2}
              value={form.moonphases}
              onChange={(event) => change('moonphases', event.target.value)}
              error={Boolean(errors.moonphases)}
              helperText={errors.moonphases || undefined}
            />
            <TextField
              size="small"
              label="Description"
              multiline
              minRows={2}
              value={form.description}
              onChange={(event) => change('description', event.target.value)}
              error={Boolean(errors.description)}
              helperText={errors.description || undefined}
            />
            {selected ? (
              <Chip size="small" color={selected.active ? 'success' : 'default'} label={selected.active ? 'Active' : 'Inactive'} sx={{ alignSelf: 'flex-start' }} />
            ) : null}
          </>
        )}
      />
    </Stack>
  )
}
