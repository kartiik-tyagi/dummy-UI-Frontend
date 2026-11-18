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
import { del, get, post, put } from '../../shared/api/http'
import { EMPTY_LIST } from '../../shared/lib/empty'
import { logger } from '../../shared/lib/logger'
import { ConfirmDialog } from '../../shared/ui/ConfirmDialog'
import { LoadingState } from '../../shared/ui/LoadingState'
import { useToastStore } from '../feedback/useToastStore'

const EMPTY_SCENARIO = { name: '', description: '', themeId: '' }
const EMPTY_GAME = { name: '', moonphases: '' }

/**
 * List + form + activate/delete shared by scenarios and games.
 * `listPath` is null until a parent (scenario) is chosen; `itemPath(id)` addresses a single record.
 */
function ExerciseCrud({ noun, listPath, itemPath, empty, toBody, primary, secondary, extraFields, details, disabledNote }) {
  const push = useToastStore((state) => state.push)
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

  const save = () =>
    run(async () => {
      const isNew = selectedId === 'new'
      const body = toBody(form)
      const saved = isNew ? await post(listPath, body) : await put(itemPath(selectedId), body)
      logger.info(`${noun}.admin.${isNew ? 'created' : 'updated'}`, { id: saved?.id ?? selectedId })
      push(`${noun[0].toUpperCase()}${noun.slice(1)} saved.`, 'success')
      await load()
      if (saved) reset(saved)
    }, `The ${noun} could not be saved.`)

  const activate = () =>
    run(async () => {
      await post(`${itemPath(selectedId)}/activate`)
      logger.info(`${noun}.admin.activated`, { id: selectedId })
      push(`${noun[0].toUpperCase()}${noun.slice(1)} activated.`, 'success')
      await load()
    }, `The ${noun} could not be activated.`)

  const remove = async () => {
    await run(async () => {
      await del(itemPath(selectedId))
      logger.info(`${noun}.admin.deleted`, { id: selectedId })
      push(`${noun[0].toUpperCase()}${noun.slice(1)} deleted.`, 'success')
      reset(null)
      await load()
    }, `The ${noun} could not be deleted.`)
    setConfirmDelete(false)
  }

  if (!listPath) return <Typography variant="body2" color="text.secondary">{disabledNote}</Typography>
  if (!items) return <LoadingState label={`Loading ${noun}s`} />

  return (
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
      <Stack sx={{ width: { md: 260 }, flexShrink: 0 }} spacing={1}>
        <Button size="small" variant="outlined" onClick={() => reset(null)}>New {noun}</Button>
        <List dense disablePadding aria-label={`${noun}s`} sx={{ maxHeight: 420, overflow: 'auto', border: 1, borderColor: 'divider', borderRadius: 1 }}>
          {items.map((item) => (
            <ListItemButton key={item.id} selected={item.id === selectedId} onClick={() => reset(item)}>
              <ListItemText primary={primary(item)} secondary={secondary?.(item)} slotProps={{ primary: { noWrap: true }, secondary: { noWrap: true } }} />
              {item.active ? <Chip size="small" color="success" label="Active" sx={{ ml: 1 }} /> : null}
            </ListItemButton>
          ))}
          {!items.length ? <Typography variant="body2" color="text.secondary" sx={{ p: 1.5 }}>No {noun}s yet.</Typography> : null}
        </List>
      </Stack>
      <Stack spacing={1.5} sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="subtitle2">{selectedId === 'new' ? `New ${noun}` : `Edit ${noun}`}</Typography>
        {message ? <Alert severity="error">{message}</Alert> : null}
        <TextField
          size="small"
          label="Name"
          value={form.name}
          onChange={(event) => change('name', event.target.value)}
          error={Boolean(errors.name)}
          helperText={errors.name || undefined}
        />
        {extraFields({ form, errors, change })}
        {selected && details ? details(selected) : null}
        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
          <Button variant="contained" size="small" disabled={busy} onClick={save}>{busy ? 'Working' : 'Save'}</Button>
          {selected && !selected.active ? <Button size="small" variant="outlined" color="success" disabled={busy} onClick={activate}>Activate</Button> : null}
          {selected ? <Button size="small" color="error" disabled={busy} onClick={() => setConfirmDelete(true)}>Delete</Button> : null}
        </Stack>
      </Stack>
      <ConfirmDialog
        open={confirmDelete}
        title={`Delete ${noun}`}
        message={`Delete ${selected?.name || `this ${noun}`}? This cannot be undone.`}
        confirmLabel="Delete"
        busy={busy}
        error={message}
        onClose={() => setConfirmDelete(false)}
        onConfirm={remove}
      />
    </Stack>
  )
}

/** Scenarios: CRUD plus activation (needs MANAGE_SCENARIO). */
export function ScenarioAdminPanel() {
  const [themes, setThemes] = useState(EMPTY_LIST)

  useEffect(() => {
    let live = true
    get('/themes')
      .then((rows) => live && setThemes(rows || EMPTY_LIST))
      .catch(() => {})
    return () => {
      live = false
    }
  }, [])

  return (
    <Stack spacing={1.5}>
      <Typography variant="subtitle1">Scenarios</Typography>
      <ExerciseCrud
        noun="scenario"
        listPath="/scenarios"
        itemPath={(id) => `/scenarios/${id}`}
        empty={EMPTY_SCENARIO}
        toBody={(form) => ({ name: form.name.trim(), description: form.description || null, themeId: form.themeId === '' ? null : Number(form.themeId) })}
        primary={(item) => item.name}
        secondary={(item) => item.description}
        extraFields={({ form, errors, change }) => (
          <>
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
            <TextField
              select
              size="small"
              label="Theme (optional)"
              value={form.themeId}
              onChange={(event) => change('themeId', event.target.value)}
              error={Boolean(errors.themeId)}
              helperText={errors.themeId || undefined}
            >
              <MenuItem value="">None</MenuItem>
              {themes.map((theme) => (
                <MenuItem key={theme.id} value={theme.id}>{theme.name}</MenuItem>
              ))}
            </TextField>
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
      <Stack direction="row" spacing={1.5} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
        <Typography variant="subtitle1">Games</Typography>
        <TextField
          select
          size="small"
          label="Scenario"
          value={scenarioId}
          onChange={(event) => setScenarioId(event.target.value)}
          disabled={!scenarios.length}
          helperText={!scenarios.length ? 'Create a scenario first' : undefined}
          sx={{ minWidth: 220 }}
        >
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
        toBody={(form) => ({ name: form.name.trim(), moonphases: form.moonphases || null })}
        primary={(item) => item.name}
        secondary={(item) => item.status}
        disabledNote="Choose a scenario to manage its games."
        extraFields={({ form, errors, change }) => (
          <TextField
            size="small"
            label="Moonphases"
            multiline
            minRows={3}
            value={form.moonphases}
            onChange={(event) => change('moonphases', event.target.value)}
            error={Boolean(errors.moonphases)}
            helperText={errors.moonphases || undefined}
          />
        )}
        details={(game) => (
          <Stack direction="row" spacing={1}>
            <Chip size="small" variant="outlined" label={`Status: ${game.status || 'unknown'}`} />
            <Chip size="small" color={game.active ? 'success' : 'default'} label={game.active ? 'Active' : 'Inactive'} />
          </Stack>
        )}
      />
    </Stack>
  )
}
