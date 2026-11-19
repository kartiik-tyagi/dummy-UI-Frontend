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
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined'
import { del, get, post, put } from '../../shared/api/http'
import { EMPTY_LIST } from '../../shared/lib/empty'
import { logger } from '../../shared/lib/logger'
import { ConfirmDialog } from '../../shared/ui/ConfirmDialog'
import { IconField, IconPreview } from '../../shared/ui/IconPicker'
import { LoadingState } from '../../shared/ui/LoadingState'
import { ExerciseLayout } from '../scenario/ExerciseLayout'
import { useToastStore } from '../feedback/useToastStore'

function parentsLabel(type) {
  const parents = type?.properties?.parents
  if (type?.properties?.root) return 'Root'
  if (!Array.isArray(parents) || !parents.length) return 'Any parent'
  return parents.map((code) => code.toLowerCase().replaceAll('_', ' ')).join(', ')
}

function NodeTypesList() {
  const navigate = useNavigate()
  const push = useToastStore((state) => state.push)
  const [rows, setRows] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [busyDelete, setBusyDelete] = useState(false)

  const load = useCallback(async () => {
    try {
      setRows((await get('/node-types')) || EMPTY_LIST)
    } catch (error) {
      setRows(EMPTY_LIST)
      push(error?.message || 'Node types could not be loaded.', 'error')
    }
  }, [push])

  useEffect(() => {
    load()
  }, [load])

  const confirmDelete = async () => {
    if (!deleting) return
    setBusyDelete(true)
    try {
      await del(`/node-types/${deleting.id}`)
      push('Node type removed.', 'success')
      setDeleting(null)
      await load()
    } catch (error) {
      push(error?.message || 'The node type could not be removed.', 'error')
    } finally {
      setBusyDelete(false)
    }
  }

  if (!rows) return <LoadingState label="Loading node types" />

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        Seeded types keep their parent rules and attributes. The icon is chosen from the icon folder.
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
            No node types yet
          </Typography>
          <Typography variant="body2" sx={{ mb: 2.5, color: 'text.secondary' }}>
            Create a node type for ORBAT nodes to use.
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/standard/node-types/new')}>
            New node type
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
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 0.75 }} flexWrap="wrap" useFlexGap>
                {row.iconPath ? <IconPreview path={row.iconPath} size={24} /> : null}
                <Typography variant="h6" sx={{ flex: 1, minWidth: 0, fontWeight: 600, fontSize: '1.05rem' }}>
                  {row.name}
                </Typography>
                <Chip size="small" variant="outlined" label={row.code} />
                {row.properties?.seeded ? <Chip size="small" color="primary" label="Seeded" /> : null}
                <Chip size="small" variant="outlined" label={parentsLabel(row)} />
              </Stack>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5 }}>
                {row.description || 'No description'}
              </Typography>
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<EditOutlinedIcon />}
                  onClick={() => navigate(`/standard/node-types/${row.id}`)}
                >
                  Edit
                </Button>
                {!row.properties?.seeded ? (
                  <Button
                    size="small"
                    color="error"
                    variant="outlined"
                    startIcon={<DeleteOutlinedIcon />}
                    disabled={busyDelete}
                    onClick={() => setDeleting(row)}
                  >
                    Remove
                  </Button>
                ) : null}
              </Stack>
            </Box>
          ))}
        </Stack>
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Remove node type"
        message={deleting ? `Remove “${deleting.name}”? Seeded types cannot be removed.` : ''}
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

function NodeTypeEditor() {
  const { id } = useParams()
  const isNew = !id || id === 'new'
  const navigate = useNavigate()
  const push = useToastStore((state) => state.push)
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [busyDelete, setBusyDelete] = useState(false)
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [iconPath, setIconPath] = useState('')
  const [properties, setProperties] = useState({ seeded: false })
  const seeded = Boolean(properties?.seeded)

  useEffect(() => {
    let live = true
    ;(async () => {
      try {
        if (isNew) {
          setReady(true)
          return
        }
        const row = await get(`/node-types/${id}`)
        if (!live) return
        setCode(row.code || '')
        setName(row.name || '')
        setDescription(row.description || '')
        setIconPath(row.iconPath || '')
        setProperties(row.properties || { seeded: false })
        setReady(true)
      } catch (error) {
        if (!live) return
        push(error?.message || 'The node type could not be opened.', 'error')
        navigate('/standard/node-types', { replace: true })
      }
    })()
    return () => {
      live = false
    }
  }, [id, isNew, navigate, push])

  const save = async () => {
    if (!name.trim() || (!seeded && !code.trim())) return
    setBusy(true)
    setMessage('')
    try {
      const body = {
        code: code.trim(),
        name: name.trim(),
        description: description || '',
        iconPath: iconPath || null,
        properties: seeded ? properties : { seeded: false },
      }
      if (isNew) {
        const created = await post('/node-types', body)
        logger.info('node_type.admin_saved', { nodeTypeId: created.id, code: body.code })
        push('Node type created.', 'success')
        navigate(`/standard/node-types/${created.id}`, { replace: true })
      } else {
        await put(`/node-types/${id}`, body)
        logger.info('node_type.admin_saved', { nodeTypeId: id, code: body.code })
        push('Node type saved.', 'success')
      }
    } catch (error) {
      setMessage(error?.message || 'The node type could not be saved.')
      push(error?.message || 'The node type could not be saved.', 'error')
    } finally {
      setBusy(false)
    }
  }

  const confirmDelete = async () => {
    setBusyDelete(true)
    try {
      await del(`/node-types/${id}`)
      push('Node type removed.', 'success')
      navigate('/standard/node-types')
    } catch (error) {
      push(error?.message || 'The node type could not be removed.', 'error')
      setDeleting(false)
    } finally {
      setBusyDelete(false)
    }
  }

  if (!ready) return <LoadingState label="Opening node type" />

  return (
    <Stack spacing={2.5} sx={{ maxWidth: 560 }}>
      {message ? <Alert severity="error">{message}</Alert> : null}
      {!isNew ? (
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          <Chip size="small" variant="outlined" label={parentsLabel({ properties })} />
          {seeded ? <Chip size="small" color="primary" label="Seeded" /> : null}
        </Stack>
      ) : null}
      <TextField
        label="Code"
        value={code}
        onChange={(event) => setCode(event.target.value)}
        fullWidth
        required={!seeded}
        disabled={seeded}
        helperText={seeded ? 'Seeded codes cannot be changed.' : undefined}
      />
      <TextField label="Name" value={name} onChange={(event) => setName(event.target.value)} fullWidth required />
      <TextField
        label="Description"
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        fullWidth
        multiline
        minRows={2}
      />
      <IconField value={iconPath} onChange={setIconPath} />
      {seeded ? (
        <Typography variant="body2" color="text.secondary">
          Parent rules and attributes stay with the seeded catalogue entry.
        </Typography>
      ) : null}
      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
        <Button onClick={() => navigate('/standard/node-types')} disabled={busy || busyDelete}>
          Back to list
        </Button>
        <Button
          variant="contained"
          startIcon={<SaveOutlinedIcon />}
          disabled={busy || busyDelete || !name.trim() || (!seeded && !code.trim())}
          onClick={save}
        >
          {busy ? 'Saving…' : isNew ? 'Create node type' : 'Save node type'}
        </Button>
        {!isNew && !seeded ? (
          <Button color="error" startIcon={<DeleteOutlinedIcon />} disabled={busy || busyDelete} onClick={() => setDeleting(true)}>
            Remove
          </Button>
        ) : null}
      </Stack>
      <ConfirmDialog
        open={deleting}
        title="Remove node type"
        message="Remove this node type?"
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

export function NodeTypesListPage() {
  const navigate = useNavigate()
  return (
    <ExerciseLayout
      kicker="Standard data"
      title="Node types"
      actions={
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/standard/node-types/new')}>
          New node type
        </Button>
      }
    >
      <NodeTypesList />
    </ExerciseLayout>
  )
}

export function NodeTypeEditorPage() {
  const { id } = useParams()
  const isNew = !id || id === 'new'
  return (
    <ExerciseLayout kicker="Standard data" title={isNew ? 'New node type' : 'Edit node type'}>
      <NodeTypeEditor />
    </ExerciseLayout>
  )
}
