import { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  Button,
  Chip,
  Divider,
  FormControlLabel,
  List,
  ListItemButton,
  ListItemText,
  MenuItem,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material'
import { del, get, post, put } from '../../shared/api/http'
import { EMPTY_LIST } from '../../shared/lib/empty'
import { logger } from '../../shared/lib/logger'
import { ConfirmDialog } from '../../shared/ui/ConfirmDialog'
import { LoadingState } from '../../shared/ui/LoadingState'
import { useToastStore } from '../feedback/useToastStore'
import { useSessionStore } from '../session/useSessionStore'

const EMPTY_SERVER = { code: '', name: '', wmsUrl: '', wfsUrl: '', restUrl: '', workspaceDefault: '', enabled: true, defaultServer: false }
const EMPTY_LAYER = {
  gisServerId: '', code: '', label: '', groupName: '', wmsLayers: '', format: 'image/png', transparent: true, baseLayer: false,
  sortOrder: 0, defaultVisible: false, defaultOpacity: 1, minZoom: '', maxZoom: '', cqlFilter: '', attribution: '', active: true,
}
const EMPTY_VIEW = { basemapSource: 'OSM', osmUrl: '', centerLon: 0, centerLat: 0, zoom: 4, minZoom: 0, maxZoom: 19, defaultGisServerId: '' }

const SERVER_TEXT = [['code', 'Code'], ['name', 'Name'], ['wmsUrl', 'WMS URL'], ['wfsUrl', 'WFS URL'], ['restUrl', 'REST URL'], ['workspaceDefault', 'Default workspace']]
const LAYER_TEXT = [['code', 'Code'], ['label', 'Label'], ['groupName', 'Group'], ['wmsLayers', 'WMS layers'], ['format', 'Format'], ['cqlFilter', 'CQL filter'], ['attribution', 'Attribution']]
const LAYER_NUMBER = [['sortOrder', 'Sort order'], ['defaultOpacity', 'Default opacity (0-1)'], ['minZoom', 'Min zoom'], ['maxZoom', 'Max zoom']]
const LAYER_FLAGS = [['transparent', 'Transparent'], ['baseLayer', 'Base layer'], ['defaultVisible', 'Visible by default'], ['active', 'Active']]
const VIEW_NUMBER = [['centerLon', 'Center longitude'], ['centerLat', 'Center latitude'], ['zoom', 'Zoom'], ['minZoom', 'Min zoom'], ['maxZoom', 'Max zoom']]

const toNumber = (value) => (value === '' || value === null || value === undefined || Number.isNaN(Number(value)) ? null : Number(value))
const orEmpty = (record, fallback) => {
  const next = { ...fallback }
  Object.keys(fallback).forEach((key) => {
    if (record?.[key] !== undefined && record?.[key] !== null) next[key] = record[key]
  })
  return next
}

function Field({ name, label, form, errors, onChange, ...rest }) {
  return (
    <TextField
      size="small"
      fullWidth
      label={label}
      value={form[name] ?? ''}
      onChange={(event) => onChange(name, event.target.value)}
      error={Boolean(errors[name])}
      helperText={errors[name] || undefined}
      {...rest}
    />
  )
}

function Flag({ name, label, form, onChange }) {
  return (
    <FormControlLabel
      label={label}
      control={<Switch size="small" checked={Boolean(form[name])} onChange={(event) => onChange(name, event.target.checked)} />}
    />
  )
}

/** Shared list + form behaviour for a CRUD resource under /map. */
function useResource(path, empty, toBody, label) {
  const push = useToastStore((state) => state.push)
  const refreshSession = useSessionStore((state) => state.refresh)
  const [items, setItems] = useState(null)
  const [selectedId, setSelectedId] = useState('new')
  const [form, setForm] = useState(empty)
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  const fail = useCallback((error, fallback) => {
    const text = error?.message || fallback
    setErrors(error?.fieldErrors || {})
    setMessage(text)
    push(text, 'error')
    logger.warn('map.admin.failed', { path, message: text })
  }, [path, push])

  const load = useCallback(async () => {
    try {
      setItems((await get(path)) || EMPTY_LIST)
    } catch (error) {
      setItems(EMPTY_LIST)
      fail(error, `The ${label}s could not be loaded.`)
    }
  }, [path, label, fail])

  useEffect(() => {
    load()
  }, [load])

  const select = (item) => {
    setSelectedId(item ? item.id : 'new')
    setForm(item ? orEmpty(item, empty) : empty)
    setErrors({})
    setMessage('')
  }
  const change = (name, value) => setForm((current) => ({ ...current, [name]: value }))

  const save = async () => {
    setBusy(true)
    setErrors({})
    setMessage('')
    try {
      const isNew = selectedId === 'new'
      const body = toBody(form)
      const saved = isNew ? await post(path, body) : await put(`${path}/${selectedId}`, body)
      logger.info(isNew ? 'map.admin.created' : 'map.admin.updated', { path, id: saved?.id ?? selectedId })
      push(`${label} saved.`, 'success')
      await load()
      try {
        await refreshSession()
      } catch {
        /* shell catalogue is best-effort */
      }
      if (saved?.id) {
        setSelectedId(saved.id)
        setForm(orEmpty(saved, empty))
      }
    } catch (error) {
      fail(error, `The ${label} could not be saved.`)
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    setBusy(true)
    try {
      await del(`${path}/${selectedId}`)
      logger.info('map.admin.deleted', { path, id: selectedId })
      push(`${label} deleted.`, 'success')
      select(null)
      await load()
      try {
        await refreshSession()
      } catch {
        /* shell catalogue is best-effort */
      }
    } catch (error) {
      fail(error, `The ${label} could not be deleted.`)
    } finally {
      setBusy(false)
    }
  }

  return { items, selectedId, form, errors, message, busy, select, change, save, remove }
}

function ResourceLayout({ resource, title, primary, secondary, children, confirmDelete, setConfirmDelete, name }) {
  const { items, selectedId, message, busy, select, save, remove } = resource
  if (!items) return <LoadingState label={`Loading ${title}`} />
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
      <Stack sx={{ width: { sm: 220, md: 260 }, flexShrink: 0, maxWidth: '100%' }} spacing={1}>
        <Button size="small" variant="outlined" onClick={() => select(null)}>New</Button>
        <List dense disablePadding aria-label={title} sx={{ maxHeight: { xs: 180, sm: 420 }, overflow: 'auto', border: 1, borderColor: 'divider', borderRadius: 1 }}>
          {items.map((item) => (
            <ListItemButton key={item.id} selected={item.id === selectedId} onClick={() => select(item)}>
              <ListItemText primary={primary(item)} secondary={secondary(item)} slotProps={{ primary: { noWrap: true }, secondary: { noWrap: true } }} />
            </ListItemButton>
          ))}
          {!items.length ? <Typography variant="body2" color="text.secondary" sx={{ p: 1.5 }}>Nothing yet.</Typography> : null}
        </List>
      </Stack>
      <Stack spacing={1.5} sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="subtitle2">{selectedId === 'new' ? `New ${name}` : `Edit ${name}`}</Typography>
        {message ? <Alert severity="error">{message}</Alert> : null}
        {children}
        <Stack direction="row" spacing={1}>
          <Button variant="contained" size="small" disabled={busy} onClick={save}>{busy ? 'Saving' : 'Save'}</Button>
          {selectedId !== 'new' ? <Button color="error" size="small" disabled={busy} onClick={() => setConfirmDelete(true)}>Delete</Button> : null}
        </Stack>
      </Stack>
      <ConfirmDialog
        open={confirmDelete}
        title={`Delete ${name}`}
        message={`Delete this ${name}? This cannot be undone.`}
        confirmLabel="Delete"
        busy={busy}
        onClose={() => setConfirmDelete(false)}
        onConfirm={async () => {
          await remove()
          setConfirmDelete(false)
        }}
      />
    </Stack>
  )
}

function ServersTab() {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const resource = useResource(
    '/map/servers',
    EMPTY_SERVER,
    (form) => ({ ...form, code: form.code.trim(), name: form.name.trim(), enabled: Boolean(form.enabled), defaultServer: Boolean(form.defaultServer) }),
    'server',
  )
  const { form, errors, change } = resource
  return (
    <ResourceLayout
      resource={resource}
      title="GIS servers"
      name="server"
      primary={(item) => item.name || item.code}
      secondary={(item) => `${item.code}${item.defaultServer ? ' · default' : ''}${item.enabled === false ? ' · disabled' : ''}`}
      confirmDelete={confirmDelete}
      setConfirmDelete={setConfirmDelete}
    >
      {SERVER_TEXT.map(([name, label]) => (
        <Field key={name} name={name} label={label} form={form} errors={errors} onChange={change} />
      ))}
      <Stack direction="row" spacing={2} useFlexGap sx={{ flexWrap: 'wrap' }}>
        <Flag name="enabled" label="Enabled" form={form} onChange={change} />
        <Flag name="defaultServer" label="Default server" form={form} onChange={change} />
      </Stack>
    </ResourceLayout>
  )
}

function LayersTab({ servers }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const resource = useResource(
    '/map/layers',
    EMPTY_LAYER,
    (form) => ({
      ...form,
      gisServerId: toNumber(form.gisServerId),
      code: form.code.trim(),
      sortOrder: toNumber(form.sortOrder) ?? 0,
      defaultOpacity: toNumber(form.defaultOpacity) ?? 1,
      minZoom: toNumber(form.minZoom),
      maxZoom: toNumber(form.maxZoom),
    }),
    'layer',
  )
  const { form, errors, change } = resource
  return (
    <ResourceLayout
      resource={resource}
      title="Layers"
      name="layer"
      primary={(item) => item.label || item.code}
      secondary={(item) => `${item.code}${item.groupName ? ` · ${item.groupName}` : ''}${item.active === false ? ' · inactive' : ''}`}
      confirmDelete={confirmDelete}
      setConfirmDelete={setConfirmDelete}
    >
      <Field name="gisServerId" label="GIS server" select form={form} errors={errors} onChange={change}>
        {servers.map((server) => (
          <MenuItem key={server.id} value={server.id}>{server.name || server.code}</MenuItem>
        ))}
      </Field>
      {LAYER_TEXT.map(([name, label]) => (
        <Field key={name} name={name} label={label} form={form} errors={errors} onChange={change} />
      ))}
      <Stack direction="row" spacing={1.5} useFlexGap sx={{ flexWrap: 'wrap' }}>
        {LAYER_NUMBER.map(([name, label]) => (
          <Field key={name} name={name} label={label} type="number" form={form} errors={errors} onChange={change} sx={{ width: 170 }} />
        ))}
      </Stack>
      <Stack direction="row" spacing={2} useFlexGap sx={{ flexWrap: 'wrap' }}>
        {LAYER_FLAGS.map(([name, label]) => (
          <Flag key={name} name={name} label={label} form={form} onChange={change} />
        ))}
      </Stack>
    </ResourceLayout>
  )
}

function ViewDefaultsTab({ servers }) {
  const push = useToastStore((state) => state.push)
  const refreshSession = useSessionStore((state) => state.refresh)
  const [form, setForm] = useState(null)
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let live = true
    get('/map/view-defaults')
      .then((value) => live && setForm(orEmpty(value, EMPTY_VIEW)))
      .catch((error) => {
        if (!live) return
        setForm(EMPTY_VIEW)
        setMessage(error?.message || 'The view defaults could not be loaded.')
        push(error?.message || 'The view defaults could not be loaded.', 'error')
      })
    return () => {
      live = false
    }
  }, [push])

  if (!form) return <LoadingState label="Loading view defaults" />
  const change = (name, value) => setForm((current) => ({ ...current, [name]: value }))

  const save = async () => {
    setBusy(true)
    setErrors({})
    setMessage('')
    try {
      const body = { ...form }
      VIEW_NUMBER.forEach(([name]) => { body[name] = toNumber(form[name]) })
      body.defaultGisServerId = toNumber(form.defaultGisServerId)
      const saved = await put('/map/view-defaults', body)
      if (saved) setForm(orEmpty(saved, EMPTY_VIEW))
      logger.info('map.admin.view-defaults.updated')
      push('View defaults saved.', 'success')
      try {
        await refreshSession()
      } catch {
        /* shell catalogue is best-effort */
      }
    } catch (error) {
      const text = error?.message || 'The view defaults could not be saved.'
      setErrors(error?.fieldErrors || {})
      setMessage(text)
      push(text, 'error')
      logger.warn('map.admin.failed', { path: '/map/view-defaults', message: text })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Stack spacing={1.5} sx={{ maxWidth: 520 }}>
      {message ? <Alert severity="error">{message}</Alert> : null}
      <Field name="basemapSource" label="Basemap source" form={form} errors={errors} onChange={change} />
      <Field name="osmUrl" label="OSM tile URL" form={form} errors={errors} onChange={change} />
      <Stack direction="row" spacing={1.5} useFlexGap sx={{ flexWrap: 'wrap' }}>
        {VIEW_NUMBER.map(([name, label]) => (
          <Field key={name} name={name} label={label} type="number" form={form} errors={errors} onChange={change} sx={{ width: 160 }} />
        ))}
      </Stack>
      <Field name="defaultGisServerId" label="Default GIS server" select form={form} errors={errors} onChange={change}>
        <MenuItem value="">None</MenuItem>
        {servers.map((server) => (
          <MenuItem key={server.id} value={server.id}>{server.name || server.code}</MenuItem>
        ))}
      </Field>
      <Stack direction="row"><Button variant="contained" size="small" disabled={busy} onClick={save}>{busy ? 'Saving' : 'Save'}</Button></Stack>
    </Stack>
  )
}

/** Admin panel for GIS servers, layers and the default map view (needs MANAGE_MAP). */
export function MapAdminPanel() {
  const [tab, setTab] = useState('servers')
  const [servers, setServers] = useState(EMPTY_LIST)

  // Server choices for the layer and view-default selects; refreshed when the tab changes.
  useEffect(() => {
    let live = true
    get('/map/servers')
      .then((rows) => live && setServers(rows || EMPTY_LIST))
      .catch(() => {})
    return () => {
      live = false
    }
  }, [tab])

  return (
    <Stack spacing={1.5} sx={{ minWidth: 0 }}>
      <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
        <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
          Configure GeoServer endpoints, WMS layers, and the home view.
        </Typography>
        <Chip size="small" variant="outlined" label={`${servers.length} server${servers.length === 1 ? '' : 's'}`} />
      </Stack>
      <Tabs
        value={tab}
        onChange={(_, value) => setTab(value)}
        variant="scrollable"
        allowScrollButtonsMobile
        sx={{ minHeight: 36, '& .MuiTab-root': { minHeight: 36, textTransform: 'none' } }}
      >
        <Tab value="servers" label="Servers" />
        <Tab value="layers" label="Layers" />
        <Tab value="view" label="View defaults" />
      </Tabs>
      <Divider />
      {tab === 'servers' ? <ServersTab /> : null}
      {tab === 'layers' ? <LayersTab servers={servers} /> : null}
      {tab === 'view' ? <ViewDefaultsTab servers={servers} /> : null}
    </Stack>
  )
}

export default MapAdminPanel
