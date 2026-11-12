import { useEffect, useState } from 'react'
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField } from '@mui/material'
import * as api from '../../shared/api/client'
import { useCommit, useDirectoryStore } from '../../features/directory/useDirectoryStore'

function emptyValues(fields) {
  const values = {}
  for (const field of fields || []) {
    values[field.id] = field.type === 'number' ? '' : field.type === 'select' ? field.options?.[0] || '' : ''
  }
  return values
}

function formatCoordinate(value) {
  if (value == null || value === '') return ''
  const number = Number(value)
  return Number.isFinite(number) ? number.toFixed(5) : String(value)
}

export function ComponentDialog() {
  const draft = useDirectoryStore((state) => state.componentDraft)
  const closeComponentDraft = useDirectoryStore((state) => state.closeComponentDraft)
  const commit = useCommit()
  const [values, setValues] = useState({})
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!draft) return
    setValues(emptyValues(draft.fields))
    setLatitude(formatCoordinate(draft.latitude))
    setLongitude(formatCoordinate(draft.longitude))
    setError('')
    setBusy(false)
  }, [draft])

  const setField = (id, value) => {
    setValues((current) => ({ ...current, [id]: value }))
  }

  const save = async () => {
    if (!draft || busy) return
    const lat = Number(latitude)
    const lon = Number(longitude)
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      setError('Enter a latitude between -90 and 90.')
      return
    }
    if (!Number.isFinite(lon) || lon < -180 || lon > 180) {
      setError('Enter a longitude between -180 and 180.')
      return
    }

    for (const field of draft.fields || []) {
      const value = values[field.id]
      if (field.required && (value == null || String(value).trim() === '')) {
        setError(`Enter ${field.label.toLowerCase()}.`)
        return
      }
      if (field.type === 'number' && String(value).trim() !== '') {
        const number = Number(value)
        if (!Number.isFinite(number)) {
          setError(`${field.label} must be a number.`)
          return
        }
        if (field.min != null && number < field.min) {
          setError(`${field.label} must be at least ${field.min}.`)
          return
        }
      }
    }

    const properties = {}
    let name = draft.label
    for (const field of draft.fields || []) {
      let value = values[field.id]
      if (field.type === 'number' && String(value).trim() !== '') value = Number(value)
      else value = String(value ?? '').trim()
      properties[field.id] = value
      if (field.id === 'name' && value) name = String(value)
    }

    setBusy(true)
    setError('')
    try {
      await commit((userId) =>
        api.createComponent(userId, {
          kind: draft.kind,
          service: draft.service,
          name,
          geometry: {
            type: 'Point',
            coordinates: [lon, lat],
          },
          properties,
        }),
      )
      closeComponentDraft()
    } catch (failure) {
      setError(failure?.message || 'The component could not be kept.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={Boolean(draft)} onClose={() => (!busy ? closeComponentDraft() : null)} fullWidth maxWidth="xs">
      <DialogTitle>{draft ? `Add ${draft.label}` : 'Add component'}</DialogTitle>
      <DialogContent>
        <Stack direction="row" spacing={1} sx={{ mt: 0.5, mb: 0.5 }}>
          <TextField
            fullWidth
            margin="dense"
            label="Latitude"
            required
            type="number"
            inputProps={{ step: 'any', min: -90, max: 90 }}
            value={latitude}
            onChange={(event) => setLatitude(event.target.value)}
          />
          <TextField
            fullWidth
            margin="dense"
            label="Longitude"
            required
            type="number"
            inputProps={{ step: 'any', min: -180, max: 180 }}
            value={longitude}
            onChange={(event) => setLongitude(event.target.value)}
          />
        </Stack>
        {(draft?.fields || []).map((field) => {
          if (field.type === 'select') {
            return (
              <TextField
                key={field.id}
                select
                fullWidth
                margin="dense"
                label={field.label}
                required={Boolean(field.required)}
                value={values[field.id] ?? ''}
                onChange={(event) => setField(field.id, event.target.value)}
              >
                {(field.options || []).map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </TextField>
            )
          }
          return (
            <TextField
              key={field.id}
              fullWidth
              margin="dense"
              label={field.label}
              required={Boolean(field.required)}
              type={field.type === 'number' ? 'number' : 'text'}
              inputProps={field.type === 'number' && field.min != null ? { min: field.min } : undefined}
              value={values[field.id] ?? ''}
              onChange={(event) => setField(field.id, event.target.value)}
            />
          )
        })}
        {error ? (
          <Alert severity="error" sx={{ mt: 1.5 }}>
            {error}
          </Alert>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={closeComponentDraft} disabled={busy}>
          Cancel
        </Button>
        <Button variant="contained" onClick={save} disabled={busy || !draft}>
          {busy ? 'Keeping' : 'Keep'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
