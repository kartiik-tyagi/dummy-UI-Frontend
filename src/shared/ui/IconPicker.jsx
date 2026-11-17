import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material'
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined'
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined'
import { useSessionStore } from '../../features/session/useSessionStore'
import { FeatureCodes, hasFeature } from '../auth/featureCodes'
import { get, http, httpBlob } from '../api/http'
import { EMPTY_LIST } from '../lib/empty'

const previews = new Map()

/** Previews need the bearer header, so the bytes are fetched and shown from an object URL. */
export function IconPreview({ path, size = 32, alt = '' }) {
  const [url, setUrl] = useState(() => previews.get(path) || '')
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!path) return undefined
    const cached = previews.get(path)
    if (cached) {
      setUrl(cached)
      return undefined
    }
    let live = true
    setUrl('')
    setFailed(false)
    httpBlob('/icons/content', { query: { path } })
      .then((blob) => {
        const next = URL.createObjectURL(blob)
        previews.set(path, next)
        if (live) {
          setUrl(next)
          setFailed(false)
        }
      })
      .catch(() => {
        if (live) setFailed(true)
      })
    return () => {
      live = false
    }
  }, [path])

  const box = { width: size, height: size, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }
  if (!path || failed || !url) {
    return <Box sx={{ ...box, border: 1, borderColor: 'divider', borderRadius: 0.5, color: 'text.disabled', fontSize: 10 }} aria-hidden>{failed ? '!' : ''}</Box>
  }
  return <Box component="img" src={url} alt={alt} sx={{ ...box, objectFit: 'contain' }} />
}

function directories(node, depth = 0, found = []) {
  if (!node || node.type !== 'directory') return found
  found.push({ path: node.path, name: node.name || 'All icons', depth, children: node.children || EMPTY_LIST })
  ;(node.children || EMPTY_LIST).forEach((child) => directories(child, depth + 1, found))
  return found
}

/**
 * Dialog that lists the icon folders (GET /icons), previews files and returns the chosen relative path.
 * Uploading needs MANAGE_ICONS.
 */
export function IconPicker({ open, value = '', onClose, onSelect }) {
  const canUpload = useSessionStore((state) => hasFeature(state.session?.features, FeatureCodes.MANAGE_ICONS))
  const [tree, setTree] = useState(null)
  const [folder, setFolder] = useState('')
  const [chosen, setChosen] = useState(value)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const input = useRef(null)

  const load = useCallback(async () => {
    setError('')
    try {
      setTree(await get('/icons'))
    } catch (failure) {
      setError(failure?.message || 'The icons could not be listed.')
    }
  }, [])

  useEffect(() => {
    if (!open) return
    setChosen(value)
    load()
  }, [open, value, load])

  const folders = useMemo(() => directories(tree), [tree])
  const files = useMemo(() => {
    const current = folders.find((item) => item.path === folder)
    return (current?.children || EMPTY_LIST).filter((child) => child.type === 'file')
  }, [folders, folder])

  async function upload(file) {
    if (!file) return
    setBusy(true)
    setError('')
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('path', folder)
      const result = await http('/icons', { method: 'POST', formData: form })
      setChosen(result?.path || '')
      await load()
    } catch (failure) {
      setError(failure?.message || 'The icon could not be uploaded.')
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Choose an icon</DialogTitle>
      <DialogContent dividers sx={{ minHeight: 280 }}>
        {error ? <Alert severity="error" sx={{ mb: 1.5 }}>{error}</Alert> : null}
        {!tree && !error ? <Typography variant="body2" color="text.secondary">Loading icons</Typography> : null}
        {tree ? (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '180px 1fr' }, gap: 2 }}>
            <List dense disablePadding aria-label="Icon folders" sx={{ maxHeight: 320, overflow: 'auto', borderRight: { sm: 1 }, borderColor: 'divider' }}>
              {folders.map((item) => (
                <ListItemButton key={item.path || 'root'} selected={item.path === folder} onClick={() => setFolder(item.path)} sx={{ pl: 1 + item.depth * 1.5 }}>
                  <FolderOutlinedIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                  <ListItemText primary={item.name} slotProps={{ primary: { variant: 'body2', noWrap: true } }} />
                </ListItemButton>
              ))}
            </List>
            <Box>
              {files.length ? (
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(88px, 1fr))', gap: 1 }}>
                  {files.map((file) => (
                    <Button
                      key={file.path}
                      variant={chosen === file.path ? 'contained' : 'outlined'}
                      color={chosen === file.path ? 'primary' : 'inherit'}
                      onClick={() => setChosen(file.path)}
                      onDoubleClick={() => onSelect(file.path)}
                      aria-pressed={chosen === file.path}
                      sx={{ flexDirection: 'column', gap: 0.5, minHeight: 80, textTransform: 'none', p: 0.5 }}
                    >
                      <IconPreview path={file.path} size={36} />
                      <Typography variant="caption" noWrap sx={{ maxWidth: '100%' }}>{file.name}</Typography>
                    </Button>
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">No icons in this folder.</Typography>
              )}
            </Box>
          </Box>
        ) : null}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 1.5, justifyContent: 'space-between' }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
          {canUpload ? (
            <>
              <input ref={input} type="file" hidden accept=".svg,.png,.jpg,.jpeg,.gif,.webp" onChange={(event) => upload(event.target.files?.[0])} />
              <Button size="small" startIcon={<UploadFileOutlinedIcon />} disabled={busy || !tree} onClick={() => input.current?.click()}>
                Upload here
              </Button>
            </>
          ) : null}
          <Typography variant="caption" color="text.secondary" noWrap>{chosen || 'Nothing chosen'}</Typography>
        </Stack>
        <Stack direction="row" spacing={1}>
          {value ? <Button onClick={() => onSelect('')}>Clear</Button> : null}
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="contained" disabled={!chosen} onClick={() => onSelect(chosen)}>Use icon</Button>
        </Stack>
      </DialogActions>
    </Dialog>
  )
}

/** A small button that shows the current icon and opens the picker. */
export function IconField({ value, onChange, label = 'Icon' }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button size="small" variant="outlined" onClick={() => setOpen(true)} startIcon={<IconPreview path={value} size={20} />} sx={{ textTransform: 'none', justifyContent: 'flex-start' }}>
        {value ? `${label}: ${value}` : `Choose ${label.toLowerCase()}`}
      </Button>
      <IconPicker
        open={open}
        value={value}
        onClose={() => setOpen(false)}
        onSelect={(path) => {
          onChange(path)
          setOpen(false)
        }}
      />
    </>
  )
}
