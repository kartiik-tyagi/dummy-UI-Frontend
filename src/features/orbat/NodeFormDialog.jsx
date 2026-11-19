import { useEffect, useMemo, useState } from 'react'
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField } from '@mui/material'
import { IconField } from '../../shared/ui/IconPicker'
import { allowedChildren, fieldsOf, typeCode } from './nodeRules'

function emptyValues(type, preset) {
  const values = { name: preset?.name || '', nodeTypeId: type?.id ?? preset?.nodeTypeId ?? '' }
  fieldsOf(type).forEach((field) => {
    values[field.key] = preset?.[field.key] ?? ''
  })
  return values
}

/** One form for adding or editing a node. Fields come from the node type catalogue. */
export function NodeFormDialog({ open, title, types = [], parent, initial, preset, presetTypeId, iconTheme, onClose, onSubmit }) {
  const parentType = types.find((type) => String(type.id) === String(parent?.nodeTypeId)) || null
  const choices = useMemo(() => (initial ? types.filter((type) => String(type.id) === String(initial.nodeTypeId)) : allowedChildren(types, parentType)), [types, parentType, initial])
  const [typeId, setTypeId] = useState('')
  const [iconPath, setIconPath] = useState('')
  const [values, setValues] = useState({ name: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const type = types.find((item) => String(item.id) === String(typeId)) || null

  useEffect(() => {
    if (!open) return
    const startId = initial?.nodeTypeId || presetTypeId || choices[0]?.id || ''
    const start = types.find((item) => String(item.id) === String(startId))
    setTypeId(startId === '' ? '' : String(startId))
    setIconPath(initial?.iconPath || start?.iconPath || '')
    const next = emptyValues(start, initial || preset)
    if (!initial && parent && start?.code === 'GOC') {
      next.formation_type = typeCode(parent).toLowerCase()
      next.formation_id = parent.id
    }
    setValues(next)
    setError('')
  }, [open, initial, presetTypeId, parent, choices, types])

  const setField = (key, value) => setValues((current) => ({ ...current, [key]: value }))

  const submit = async () => {
    if (!type) {
      setError('Choose a node type.')
      return
    }
    if (!String(values.name || '').trim()) {
      setError('Enter a name.')
      return
    }
    const node = { ...values, name: String(values.name).trim(), nodeTypeId: type.id, iconPath: iconPath || null }
    fieldsOf(type).forEach((field) => {
      const raw = node[field.key]
      if (field.type === 'number') node[field.key] = raw === '' || raw == null ? null : Number(raw)
      else if (raw === '') node[field.key] = null
    })
    setBusy(true)
    setError('')
    try {
      await onSubmit(node)
    } catch (failure) {
      setError(failure?.message || 'The node could not be saved.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="xs" component="form" onSubmit={(event) => { event.preventDefault(); submit() }}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Stack spacing={1.25} sx={{ pt: 1 }}>
          {choices.length ? null : <TextField error size="small" value="This node has no type yet, so nothing can be added under it. Edit it and choose a type first." slotProps={{ input: { readOnly: true } }} />}
          <TextField select required size="small" label="Node type" value={choices.some((item) => String(item.id) === String(typeId)) ? typeId : ''} disabled={Boolean(initial?.nodeTypeId) || !choices.length} onChange={(event) => {
            const next = types.find((item) => String(item.id) === event.target.value)
            setTypeId(event.target.value)
            setIconPath(next?.iconPath || '')
            setValues(emptyValues(next, { ...values, nodeTypeId: next?.id }))
          }}>
            {choices.map((item) => (
              <MenuItem key={item.id} value={String(item.id)}>{item.name}</MenuItem>
            ))}
          </TextField>
          <IconField label="Icon" value={iconPath} onChange={setIconPath} theme={iconTheme} />
          <TextField required size="small" label="Name" value={values.name || ''} onChange={(event) => setField('name', event.target.value)} />
          {fieldsOf(type).map((field) => field.type === 'choice' ? (
            <TextField key={field.key} select required={field.required} size="small" label={field.label} value={values[field.key] ?? ''} onChange={(event) => setField(field.key, event.target.value)}>
              {field.required ? null : <MenuItem value="">None</MenuItem>}
              {(field.options || []).map((option) => (
                <MenuItem key={option} value={option}>{option.replaceAll('_', ' ')}</MenuItem>
              ))}
            </TextField>
          ) : (
            <TextField
              key={field.key}
              required={field.required}
              size="small"
              type={field.type === 'number' ? 'number' : 'text'}
              label={field.label}
              value={values[field.key] ?? ''}
              helperText={field.key === 'potential' && !field.required ? 'Leave empty to sum the children' : undefined}
              onChange={(event) => setField(field.key, event.target.value)}
            />
          ))}
          {error ? <TextField error value={error} size="small" slotProps={{ input: { readOnly: true } }} /> : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>Cancel</Button>
        <Button type="submit" variant="contained" disabled={busy || !typeId}>{busy ? 'Saving' : 'Done'}</Button>
      </DialogActions>
    </Dialog>
  )
}
