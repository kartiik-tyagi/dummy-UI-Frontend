import { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  Box,
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
  TextField,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import LayersOutlinedIcon from '@mui/icons-material/LayersOutlined'
import MapOutlinedIcon from '@mui/icons-material/MapOutlined'
import MyLocationOutlinedIcon from '@mui/icons-material/MyLocationOutlined'
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined'
import StorageOutlinedIcon from '@mui/icons-material/StorageOutlined'
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
const EMPTY_VIEW = { centerLon: 0, centerLat: 0, zoom: 4, minZoom: 0, maxZoom: 19, defaultGisServerId: '' }

const SERVER_TEXT = [['code', 'Code'], ['name', 'Name'], ['wmsUrl', 'WMS URL'], ['wfsUrl', 'WFS URL'], ['restUrl', 'REST URL'], ['workspaceDefault', 'Default workspace']]
const LAYER_TEXT = [['code', 'Code'], ['label', 'Label'], ['groupName', 'Group'], ['wmsLayers', 'WMS layers'], ['format', 'Format'], ['cqlFilter', 'CQL filter'], ['attribution', 'Attribution']]
const LAYER_NUMBER = [['sortOrder', 'Sort order'], ['defaultOpacity', 'Default opacity (0-1)'], ['minZoom', 'Min zoom'], ['maxZoom', 'Max zoom']]
const LAYER_FLAGS = [['transparent', 'Transparent'], ['baseLayer', 'Base layer'], ['defaultVisible', 'Visible by default'], ['active', 'Active']]
const VIEW_NUMBER = [['centerLon', 'Center longitude'], ['centerLat', 'Center latitude'], ['zoom', 'Zoom'], ['minZoom', 'Min zoom'], ['maxZoom', 'Max zoom']]

const TABS = [
  { id: 'servers', label: 'Servers', icon: StorageOutlinedIcon },
  { id: 'layers', label: 'Layers', icon: LayersOutlinedIcon },
  { id: 'view', label: 'Home view', icon: MyLocationOutlinedIcon },
]

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
      label={<Typography variant="body2">{label}</Typography>}
      control={<Switch size="small" checked={Boolean(form[name])} onChange={(event) => onChange(name, event.target.checked)} />}
      sx={{ mr: 2, ml: 0 }}
    />
  )
}

function SectionLabel({ children }) {
  return (
    <Typography
      variant="overline"
      color="text.secondary"
      sx={{ letterSpacing: '0.1em', display: 'block', mb: 1, mt: 0.5 }}
    >
      {children}
    </Typography>
  )
}

function StatusDot({ ok }) {
  return (
    <Box
      component="span"
      sx={{
        width: 8,
        height: 8,
        borderRadius: '50%',
        bgcolor: ok ? 'success.main' : 'text.disabled',
        display: 'inline-block',
        flexShrink: 0,
      }}
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

function ResourceLayout({ resource, title, primary, secondary, status, children, confirmDelete, setConfirmDelete, name }) {
  const { items, selectedId, message, busy, select, save, remove } = resource
  if (!items) return <LoadingState label={`Loading ${title}`} />

  return (
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ alignItems: 'stretch' }}>
      <Box
        sx={{
          width: { md: 240 },
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 1.25,
          minWidth: 0,
        }}
      >
        <Button
          size="small"
          variant={selectedId === 'new' ? 'contained' : 'outlined'}
          startIcon={<AddIcon />}
          onClick={() => select(null)}
          sx={{ textTransform: 'none', justifyContent: 'flex-start', fontWeight: 600 }}
        >
          New {name}
        </Button>
        <List
          dense
          disablePadding
          aria-label={title}
          sx={{
            flex: 1,
            maxHeight: { xs: 200, md: 440 },
            overflow: 'auto',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            '&::-webkit-scrollbar': { display: 'none', width: 0, height: 0 },
            borderRadius: 2,
            border: 1,
            borderColor: 'divider',
            bgcolor: 'background.default',
            p: 0.75,
          }}
        >
          {items.map((item) => {
            const selected = item.id === selectedId
            return (
              <ListItemButton
                key={item.id}
                selected={selected}
                onClick={() => select(item)}
                sx={{
                  borderRadius: 1.5,
                  mb: 0.5,
                  px: 1.25,
                  py: 1,
                  alignItems: 'flex-start',
                  border: 1,
                  borderColor: selected ? 'primary.main' : 'transparent',
                  bgcolor: selected ? 'action.selected' : 'background.paper',
                  '&.Mui-selected': { bgcolor: 'action.selected' },
                  '&.Mui-selected:hover': { bgcolor: 'action.selected' },
                }}
              >
                <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ width: '100%', minWidth: 0 }}>
                  {status ? <Box sx={{ mt: 0.7 }}>{status(item)}</Box> : null}
                  <ListItemText
                    primary={primary(item)}
                    secondary={secondary(item)}
                    slotProps={{
                      primary: { noWrap: true, fontWeight: selected ? 600 : 500, fontSize: '0.9rem' },
                      secondary: { noWrap: true, fontSize: '0.75rem' },
                    }}
                    sx={{ my: 0, minWidth: 0 }}
                  />
                </Stack>
              </ListItemButton>
            )
          })}
          {!items.length ? (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Nothing here yet. Create the first {name}.
              </Typography>
            </Box>
          ) : null}
        </List>
      </Box>

      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          borderRadius: 2,
          border: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
          p: { xs: 1.75, sm: 2.25 },
        }}
      >
        <Stack spacing={1.75}>
          <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
            <Typography variant="subtitle1" sx={{ fontWeight: 650, flex: 1, minWidth: 0 }}>
              {selectedId === 'new' ? `New ${name}` : `Edit ${name}`}
            </Typography>
            {selectedId !== 'new' ? <Chip size="small" variant="outlined" label={`ID ${selectedId}`} /> : null}
          </Stack>
          <Divider />
          {message ? <Alert severity="error">{message}</Alert> : null}
          {children}
          <Divider />
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            <Button
              variant="contained"
              size="small"
              disabled={busy}
              startIcon={<SaveOutlinedIcon />}
              onClick={save}
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              {busy ? 'Saving…' : 'Save'}
            </Button>
            {selectedId !== 'new' ? (
              <Button
                color="error"
                size="small"
                variant="outlined"
                disabled={busy}
                startIcon={<DeleteOutlinedIcon />}
                onClick={() => setConfirmDelete(true)}
                sx={{ textTransform: 'none' }}
              >
                Delete
              </Button>
            ) : null}
          </Stack>
        </Stack>
      </Box>

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
      secondary={(item) => item.code}
      status={(item) => <StatusDot ok={item.enabled !== false} />}
      confirmDelete={confirmDelete}
      setConfirmDelete={setConfirmDelete}
    >
      <SectionLabel>Identity</SectionLabel>
      <Stack spacing={1.5}>
        {SERVER_TEXT.slice(0, 2).map(([name, label]) => (
          <Field key={name} name={name} label={label} form={form} errors={errors} onChange={change} />
        ))}
      </Stack>
      <SectionLabel>Endpoints</SectionLabel>
      <Stack spacing={1.5}>
        {SERVER_TEXT.slice(2).map(([name, label]) => (
          <Field key={name} name={name} label={label} form={form} errors={errors} onChange={change} />
        ))}
      </Stack>
      <SectionLabel>Options</SectionLabel>
      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
        <Flag name="enabled" label="Enabled" form={form} onChange={change} />
        <Flag name="defaultServer" label="Default server" form={form} onChange={change} />
      </Stack>
      {form.defaultServer ? (
        <Chip size="small" color="primary" variant="outlined" label="This is the default GIS server" sx={{ alignSelf: 'flex-start' }} />
      ) : null}
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
      secondary={(item) => `${item.code}${item.groupName ? ` · ${item.groupName}` : ''}`}
      status={(item) => <StatusDot ok={item.active !== false} />}
      confirmDelete={confirmDelete}
      setConfirmDelete={setConfirmDelete}
    >
      <SectionLabel>Layer</SectionLabel>
      <Stack spacing={1.5}>
        <Field name="gisServerId" label="GIS server" select form={form} errors={errors} onChange={change}>
          {servers.map((server) => (
            <MenuItem key={server.id} value={server.id}>{server.name || server.code}</MenuItem>
          ))}
        </Field>
        {LAYER_TEXT.map(([name, label]) => (
          <Field key={name} name={name} label={label} form={form} errors={errors} onChange={change} />
        ))}
      </Stack>
      <SectionLabel>Display</SectionLabel>
      <Stack direction="row" spacing={1.5} useFlexGap sx={{ flexWrap: 'wrap' }}>
        {LAYER_NUMBER.map(([name, label]) => (
          <Field key={name} name={name} label={label} type="number" form={form} errors={errors} onChange={change} sx={{ width: 160 }} />
        ))}
      </Stack>
      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
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
    <Box
      sx={{
        borderRadius: 2,
        border: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        p: { xs: 1.75, sm: 2.25 },
        maxWidth: 560,
      }}
    >
      <Stack spacing={1.75}>
        <Typography variant="subtitle1" sx={{ fontWeight: 650 }}>
          Home view
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Centre, zoom, and default server used when the map opens or when Home extent is pressed.
        </Typography>
        <Divider />
        {message ? <Alert severity="error">{message}</Alert> : null}
        <SectionLabel>Centre and zoom</SectionLabel>
        <Stack direction="row" spacing={1.5} useFlexGap sx={{ flexWrap: 'wrap' }}>
          {VIEW_NUMBER.map(([name, label]) => (
            <Field key={name} name={name} label={label} type="number" form={form} errors={errors} onChange={change} sx={{ width: 150 }} />
          ))}
        </Stack>
        <SectionLabel>Default server</SectionLabel>
        <Field name="defaultGisServerId" label="Default GIS server" select form={form} errors={errors} onChange={change}>
          <MenuItem value="">None</MenuItem>
          {servers.map((server) => (
            <MenuItem key={server.id} value={server.id}>{server.name || server.code}</MenuItem>
          ))}
        </Field>
        <Divider />
        <Button
          variant="contained"
          size="small"
          disabled={busy}
          startIcon={<SaveOutlinedIcon />}
          onClick={save}
          sx={{ textTransform: 'none', fontWeight: 600, alignSelf: 'flex-start' }}
        >
          {busy ? 'Saving…' : 'Save home view'}
        </Button>
      </Stack>
    </Box>
  )
}

/** Admin panel for GIS servers, layers and the default map view (needs MANAGE_MAP). */
export function MapAdminPanel() {
  const [tab, setTab] = useState('servers')
  const [servers, setServers] = useState(EMPTY_LIST)

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
    <Stack spacing={2} sx={{ minWidth: 0 }}>
      <Stack direction="row" spacing={1.5} alignItems="flex-start">
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 2,
            display: 'grid',
            placeItems: 'center',
            bgcolor: 'action.hover',
            color: 'primary.main',
            flexShrink: 0,
          }}
        >
          <MapOutlinedIcon fontSize="small" />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 650, lineHeight: 1.3 }}>
            Map catalog
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.35 }}>
            GeoServer endpoints, WMS layers, and the map home view.
          </Typography>
        </Box>
        <Chip
          size="small"
          variant="outlined"
          label={`${servers.length} server${servers.length === 1 ? '' : 's'}`}
          sx={{ flexShrink: 0 }}
        />
      </Stack>

      <Stack
        direction="row"
        spacing={0.75}
        useFlexGap
        sx={{
          p: 0.5,
          borderRadius: 2,
          bgcolor: 'action.hover',
          flexWrap: 'wrap',
        }}
      >
        {TABS.map((entry) => {
          const Icon = entry.icon
          const selected = tab === entry.id
          return (
            <Button
              key={entry.id}
              size="small"
              onClick={() => setTab(entry.id)}
              startIcon={<Icon fontSize="small" />}
              sx={{
                textTransform: 'none',
                fontWeight: selected ? 650 : 500,
                px: 1.5,
                py: 0.75,
                borderRadius: 1.5,
                color: selected ? 'primary.contrastText' : 'text.primary',
                bgcolor: selected ? 'primary.main' : 'transparent',
                '&:hover': {
                  bgcolor: selected ? 'primary.dark' : 'action.selected',
                },
              }}
            >
              {entry.label}
            </Button>
          )
        })}
      </Stack>

      {tab === 'servers' ? <ServersTab /> : null}
      {tab === 'layers' ? <LayersTab servers={servers} /> : null}
      {tab === 'view' ? <ViewDefaultsTab servers={servers} /> : null}
    </Stack>
  )
}

export default MapAdminPanel
