import { useEffect, useState } from 'react'
import { Button, Stack, TextField, Typography } from '@mui/material'
import { del, get, post, put } from '../../shared/api/http'
import { logger } from '../../shared/lib/logger'
import { IconField, IconPreview } from '../../shared/ui/IconPicker'
import { useToastStore } from '../feedback/useToastStore'

function Caption({ children }) {
  return (
    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
      {children}
    </Typography>
  )
}

function parentsLabel(type) {
  const parents = type?.properties?.parents
  if (type?.properties?.root) return 'Root'
  if (!Array.isArray(parents) || !parents.length) return 'Any parent'
  return parents.map((code) => code.toLowerCase().replaceAll('_', ' ')).join(', ')
}

/** Catalogue of node types. Icons come from the asset-management folder. Seeded types keep their rules. */
export function NodeTypesPanel() {
  const push = useToastStore((state) => state.push)
  const [rows, setRows] = useState([])
  const [draft, setDraft] = useState({ id: null, code: '', name: '', description: '', iconPath: '' })
  const [busy, setBusy] = useState(false)

  const reload = async () => setRows(await get('/node-types'))

  useEffect(() => {
    reload().catch((error) => push(error.message, 'error'))
  }, [push])

  const editing = rows.find((row) => row.id === draft.id)
  const seeded = Boolean(editing?.properties?.seeded)

  const save = async () => {
    setBusy(true)
    try {
      const body = {
        code: (seeded ? editing.code : draft.code).trim(),
        name: draft.name.trim(),
        description: draft.description || '',
        iconPath: draft.iconPath || null,
        properties: seeded ? editing.properties : { seeded: false },
      }
      if (!body.code || !body.name) throw new Error('Enter a code and a name.')
      if (draft.id) await put(`/node-types/${draft.id}`, body)
      else await post('/node-types', body)
      logger.info('node_type.admin_saved', { nodeTypeId: draft.id || 'new', code: body.code })
      setDraft({ id: null, code: '', name: '', description: '', iconPath: '' })
      await reload()
      push(draft.id ? 'Node type saved.' : 'Node type created.', 'success')
    } catch (error) {
      push(error.message || 'Node type could not be saved.', 'error')
    } finally {
      setBusy(false)
    }
  }

  const remove = async (row) => {
    setBusy(true)
    try {
      await del(`/node-types/${row.id}`)
      await reload()
      push('Node type removed.', 'success')
    } catch (error) {
      push(error.message || 'Node type could not be removed.', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Stack spacing={1.25}>
      <Caption>Seeded types keep their parent rules and attributes. The icon is chosen from the icon folder.</Caption>
      {rows.map((row) => (
        <Stack key={row.id} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          {row.iconPath ? <IconPreview path={row.iconPath} size={20} /> : null}
          <Typography variant="body2" sx={{ flex: 1, minWidth: 0 }} noWrap>{row.name}</Typography>
          <Caption>{parentsLabel(row)}</Caption>
          <Button size="small" onClick={() => setDraft({ id: row.id, code: row.code, name: row.name, description: row.description || '', iconPath: row.iconPath || '' })}>Edit</Button>
          {row.properties?.seeded ? null : <Button size="small" color="error" disabled={busy} onClick={() => remove(row)}>Remove</Button>}
        </Stack>
      ))}
      <TextField size="small" label="Code" value={draft.code} onChange={(event) => setDraft({ ...draft, code: event.target.value })} disabled={seeded || Boolean(draft.id && seeded)} />
      <TextField size="small" label="Name" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
      <TextField size="small" label="Description" value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
      <IconField value={draft.iconPath} onChange={(iconPath) => setDraft({ ...draft, iconPath })} />
      <Button disabled={busy || !draft.name.trim() || (!seeded && !draft.code.trim())} onClick={save}>{draft.id ? 'Save node type' : 'Add node type'}</Button>
    </Stack>
  )
}
