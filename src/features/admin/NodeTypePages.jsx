import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Alert,
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

function parentsLabel(type) {
  const parents = type?.properties?.parents
  if (type?.properties?.root) return 'Top of the tree (root)'
  if (!Array.isArray(parents) || !parents.length) return 'Can sit under any parent'
  return `Usually under: ${parents.map((code) => code.toLowerCase().replaceAll('_', ' ')).join(', ')}`
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
    <Stack spacing={3}>
      <PageIntro>
        Node types describe the kinds of units on a force tree — for example Division or Brigade. Choose a clear name
        and an icon so people can recognise them on the map.
      </PageIntro>

      {!rows.length ? (
        <EmptyState
          title="No node types yet"
          body="Add the unit kinds your force trees will use. Built-in (seeded) types keep their special rules."
          actionLabel="Add a node type"
          onAction={() => navigate('/standard/node-types/new')}
        />
      ) : (
        <Stack spacing={2}>
          {rows.map((row) => (
            <ListCard
              key={row.id}
              leading={row.iconPath ? <IconPreview path={row.iconPath} size={36} /> : null}
              title={row.name}
              meta={`${row.description || 'No description yet'} · ${parentsLabel(row)}`}
              badges={
                <>
                  <Chip variant="outlined" label={`Code: ${row.code}`} sx={chipSx} />
                  {row.properties?.seeded ? <Chip color="primary" label="Built-in" sx={chipSx} /> : null}
                </>
              }
              primaryAction={
                <ComfortButton
                  variant="contained"
                  startIcon={<EditOutlinedIcon />}
                  onClick={() => navigate(`/standard/node-types/${row.id}`)}
                >
                  Open / edit
                </ComfortButton>
              }
              secondaryAction={
                !row.properties?.seeded ? (
                  <ComfortButton
                    color="error"
                    variant="outlined"
                    startIcon={<DeleteOutlinedIcon />}
                    disabled={busyDelete}
                    onClick={() => setDeleting(row)}
                  >
                    Remove
                  </ComfortButton>
                ) : (
                  <ComfortButton variant="outlined" disabled>
                    Built-in — cannot remove
                  </ComfortButton>
                )
              }
            />
          ))}
        </Stack>
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Remove this node type?"
        message={
          deleting
            ? `“${deleting.name}” will be permanently removed. Built-in types cannot be removed.`
            : ''
        }
        confirmLabel="Yes, remove"
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
    <FormShell
      actions={
        <>
          <ComfortButton
            variant="outlined"
            onClick={() => navigate('/standard/node-types')}
            disabled={busy || busyDelete}
          >
            Back to node types
          </ComfortButton>
          <ComfortButton
            variant="contained"
            startIcon={<SaveOutlinedIcon />}
            disabled={busy || busyDelete || !name.trim() || (!seeded && !code.trim())}
            onClick={save}
            sx={{ flex: { sm: '1 1 auto' }, maxWidth: { sm: 300 } }}
          >
            {busy ? 'Saving…' : isNew ? 'Create node type' : 'Save changes'}
          </ComfortButton>
          {!isNew && !seeded ? (
            <ComfortButton
              color="error"
              variant="text"
              startIcon={<DeleteOutlinedIcon />}
              disabled={busy || busyDelete}
              onClick={() => setDeleting(true)}
            >
              Remove
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
          <Chip variant="outlined" label={parentsLabel({ properties })} sx={chipSx} />
          {seeded ? <Chip color="primary" label="Built-in" sx={chipSx} /> : null}
        </Stack>
      ) : null}
      <TextField
        label="Short code"
        value={code}
        onChange={(event) => setCode(event.target.value)}
        fullWidth
        required={!seeded}
        disabled={seeded}
        helperText={
          seeded
            ? 'Built-in codes cannot be changed.'
            : 'Letters and numbers only, for example DIVISION or BRIGADE.'
        }
        sx={fieldSx}
      />
      <TextField
        label="Display name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        fullWidth
        required
        helperText="The name people see in lists and on the force tree."
        sx={fieldSx}
      />
      <TextField
        label="Description (optional)"
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        fullWidth
        multiline
        minRows={3}
        helperText="A short note about when to use this type."
        sx={fieldSx}
      />
      <IconField value={iconPath} onChange={setIconPath} />
      {seeded ? (
        <Typography sx={metaSx}>
          This is a built-in type. You can change the name, description, and icon. Parent rules stay fixed.
        </Typography>
      ) : null}
      <ConfirmDialog
        open={deleting}
        title="Remove this node type?"
        message="This cannot be undone. Units already using it may be affected."
        confirmLabel="Yes, remove"
        busy={busyDelete}
        onClose={() => {
          if (!busyDelete) setDeleting(false)
        }}
        onConfirm={confirmDelete}
      />
    </FormShell>
  )
}

export function NodeTypesListPage() {
  const navigate = useNavigate()
  return (
    <ExerciseLayout
      kicker="Standard data"
      title="Node types"
      actions={
        <ComfortButton
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/standard/node-types/new')}
          sx={actionButtonSx}
        >
          Add a node type
        </ComfortButton>
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
    <ExerciseLayout kicker="Standard data" title={isNew ? 'Add a node type' : 'Edit node type'}>
      <NodeTypeEditor />
    </ExerciseLayout>
  )
}
