import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined'
import FolderOpenOutlinedIcon from '@mui/icons-material/FolderOpenOutlined'
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined'
import { useSessionStore } from '../../features/session/useSessionStore'
import { FunctionalityCodes, hasFunctionality } from '../auth/functionalityCodes'
import { getAssetSettings, setIconLabel } from '../api/assets'
import { get, httpBlob } from '../api/http'
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

/** Every file node in the tree, so the chosen icon's label can be read wherever it lives. */
function collectFiles(node, found = []) {
  if (!node) return found
  if (node.type === 'file') found.push(node)
  ;(node.children || EMPTY_LIST).forEach((child) => collectFiles(child, found))
  return found
}

/** The file name at the end of an icon path, used as the default label when none is set. */
function fileNameOf(path) {
  const text = String(path || '')
  const slash = text.lastIndexOf('/')
  return slash >= 0 ? text.slice(slash + 1) : text
}

/**
 * Dialog that lists the icon folders (GET /icons), previews files and returns the chosen relative path.
 * Uploading needs MANAGE_ICONS.
 */
export function IconPicker({ open, value = '', onClose, onSelect }) {
  const canUpload = useSessionStore((state) => hasFunctionality(state.session?.functionalities, FunctionalityCodes.MANAGE_ICONS))
  const [tree, setTree] = useState(null)
  const [folder, setFolder] = useState('')
  const [chosen, setChosen] = useState(value)
  const [query, setQuery] = useState('')
  const [labelDraft, setLabelDraft] = useState('')
  const [savingLabel, setSavingLabel] = useState(false)
  const [error, setError] = useState('')

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
  const visibleFiles = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return files
    return files.filter((file) => `${file.label || ''} ${file.name || ''}`.toLowerCase().includes(q))
  }, [files, query])
  const chosenFile = useMemo(() => collectFiles(tree).find((file) => file.path === chosen) || null, [tree, chosen])

  const selectFolder = (path) => {
    setFolder(path)
    setQuery('')
  }

  useEffect(() => {
    setLabelDraft(chosenFile?.label || '')
  }, [chosenFile])

  async function saveLabel() {
    const next = labelDraft.trim()
    if (!chosen || !next) {
      setError('A label is required.')
      return
    }
    setSavingLabel(true)
    setError('')
    try {
      await setIconLabel(chosen, next)
      await load()
    } catch (failure) {
      setError(failure?.message || 'The label could not be saved.')
    } finally {
      setSavingLabel(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" slotProps={{ paper: { sx: { borderRadius: 3, overflow: 'hidden' } } }}>
      <DialogTitle sx={{ pb: 0.5 }}>
        Choose an icon
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
          Browse folders and pick an icon. The label you set shows only to you.
        </Typography>
      </DialogTitle>
      <DialogContent dividers sx={{ p: 0 }}>
        {error ? <Alert severity="error" sx={{ m: 2, mb: 0, borderRadius: 2 }}>{error}</Alert> : null}
        {!tree && !error ? (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5, minHeight: 320, color: 'text.secondary' }}>
            <CircularProgress size={20} />
            <Typography variant="body2">Loading icons…</Typography>
          </Box>
        ) : null}
        {tree ? (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '212px 1fr' } }}>
            <Box sx={{ borderRight: { sm: 1 }, borderBottom: { xs: 1, sm: 0 }, borderColor: 'divider', bgcolor: 'background.default', p: 1.25, maxHeight: { sm: 440 }, overflow: 'auto' }}>
              <Typography variant="overline" color="text.secondary" sx={{ px: 0.5, lineHeight: 2 }}>Folders</Typography>
              <List dense disablePadding aria-label="Icon folders">
                {folders.map((item) => {
                  const active = item.path === folder
                  const count = (item.children || EMPTY_LIST).filter((child) => child.type === 'file').length
                  return (
                    <ListItemButton
                      key={item.path || 'root'}
                      selected={active}
                      onClick={() => selectFolder(item.path)}
                      sx={{ borderRadius: 1.5, mb: 0.25, pl: 1 + item.depth * 1.25, '&.Mui-selected, &.Mui-selected:hover': { bgcolor: 'action.selected' } }}
                    >
                      {active
                        ? <FolderOpenOutlinedIcon fontSize="small" sx={{ mr: 1, color: 'primary.main' }} />
                        : <FolderOutlinedIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />}
                      <ListItemText primary={item.name} slotProps={{ primary: { variant: 'body2', noWrap: true, fontWeight: active ? 600 : 400 } }} />
                      {count ? <Chip label={count} size="small" variant="outlined" sx={{ height: 20, '& .MuiChip-label': { px: 0.75, fontSize: 11 } }} /> : null}
                    </ListItemButton>
                  )
                })}
              </List>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <Box sx={{ p: 1.5, pb: 1 }}>
                <TextField
                  size="small"
                  fullWidth
                  placeholder="Search icons"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  slotProps={{ input: { startAdornment: (<InputAdornment position="start"><SearchOutlinedIcon fontSize="small" color="disabled" /></InputAdornment>) } }}
                />
              </Box>
              <Box sx={{ px: 1.5, pb: 1.5, overflow: 'auto', maxHeight: { sm: 320 }, minHeight: 184 }}>
                {visibleFiles.length ? (
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(94px, 1fr))', gap: 1.25 }}>
                    {visibleFiles.map((file) => {
                      const selected = chosen === file.path
                      return (
                        <Button
                          key={file.path}
                          disableRipple
                          onClick={() => setChosen(file.path)}
                          onDoubleClick={() => onSelect(file.path)}
                          aria-pressed={selected}
                          title={file.label || file.name}
                          sx={{
                            position: 'relative',
                            flexDirection: 'column',
                            gap: 0.75,
                            p: 1,
                            minHeight: 100,
                            textTransform: 'none',
                            borderRadius: 2,
                            border: 2,
                            borderColor: selected ? 'primary.main' : 'divider',
                            bgcolor: selected ? 'action.selected' : 'background.paper',
                            color: 'text.primary',
                            transition: 'border-color .15s, background-color .15s, transform .15s',
                            '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover', transform: 'translateY(-1px)' },
                          }}
                        >
                          {selected ? <CheckCircleRoundedIcon sx={{ position: 'absolute', top: 4, right: 4, fontSize: 18, color: 'primary.main' }} /> : null}
                          <Box sx={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <IconPreview path={file.path} size={40} alt={file.label || file.name} />
                          </Box>
                          <Typography variant="caption" noWrap sx={{ maxWidth: '100%', fontWeight: selected ? 600 : 400 }}>{file.label || file.name}</Typography>
                        </Button>
                      )
                    })}
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1, minHeight: 184, color: 'text.secondary', textAlign: 'center' }}>
                    <ImageOutlinedIcon sx={{ fontSize: 36, opacity: 0.5 }} />
                    <Typography variant="body2">{query ? 'No icons match your search.' : 'No icons in this folder.'}</Typography>
                  </Box>
                )}
              </Box>

              {chosenFile && canUpload ? (
                <Paper variant="outlined" sx={{ m: 1.5, mt: 0, p: 1.25, borderRadius: 2, bgcolor: 'background.default' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>Rename this icon's label (only you see it)</Typography>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
                    <TextField
                      size="small"
                      value={labelDraft}
                      onChange={(event) => setLabelDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault()
                          saveLabel()
                        }
                      }}
                      error={!labelDraft.trim()}
                      helperText={!labelDraft.trim() ? 'A label is required.' : ' '}
                      fullWidth
                    />
                    <Button
                      variant="contained"
                      disableElevation
                      disabled={savingLabel || !labelDraft.trim() || labelDraft.trim() === (chosenFile.label || '')}
                      onClick={saveLabel}
                      sx={{ mt: 0.25, flexShrink: 0 }}
                    >
                      {savingLabel ? 'Saving' : 'Save'}
                    </Button>
                  </Stack>
                </Paper>
              ) : null}
            </Box>
          </Box>
        ) : null}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 1.5, justifyContent: 'space-between' }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
          {chosen ? (
            <>
              <Box sx={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <IconPreview path={chosen} size={22} alt="" />
              </Box>
              <Typography variant="body2" color="text.primary" noWrap sx={{ minWidth: 0 }}>{chosenFile?.label || fileNameOf(chosen)}</Typography>
            </>
          ) : (
            <Typography variant="body2" color="text.secondary">Nothing chosen</Typography>
          )}
        </Stack>
        <Stack direction="row" spacing={1}>
          {value ? <Button color="inherit" onClick={() => onSelect('')}>Clear</Button> : null}
          <Button color="inherit" onClick={onClose}>Cancel</Button>
          <Button variant="contained" disableElevation disabled={!chosen} onClick={() => onSelect(chosen)}>Use icon</Button>
        </Stack>
      </DialogActions>
    </Dialog>
  )
}

// Shared, cached icon labels (the signed-in user's own) so the field shows the label instantly and never
// re-fetches on each render. The cache's owner (iconLabelCacheUser) is stamped ONLY when the data arrives,
// so a fetch in flight for a new user never makes the still-stale previous data look fresh — which is what
// left the old user's labels on screen after logout/login until a hard refresh.
let iconLabelCache = null
let iconLabelCacheUser = null
let iconLabelPromise = null
let iconLabelPromiseUser = null

function cacheFresh(userId) {
  return iconLabelCache != null && iconLabelCacheUser === userId
}

function loadIconLabels(userId, force = false) {
  if (cacheFresh(userId) && !force) return Promise.resolve(iconLabelCache)
  if (iconLabelPromise && iconLabelPromiseUser === userId && !force) return iconLabelPromise
  iconLabelPromiseUser = userId
  iconLabelPromise = getAssetSettings()
    .then((settings) => {
      iconLabelCache = settings?.labels || {}
      iconLabelCacheUser = userId
      return iconLabelCache
    })
    .catch(() => {
      iconLabelCache = {}
      iconLabelCacheUser = userId
      return iconLabelCache
    })
    .finally(() => {
      iconLabelPromise = null
      iconLabelPromiseUser = null
    })
  return iconLabelPromise
}

/** A small button that shows the chosen icon and the signed-in user's label (never the file path). */
export function IconField({ value, onChange, label = 'Icon' }) {
  const [open, setOpen] = useState(false)
  const userId = useSessionStore((state) => state.session?.me?.userId ?? null)
  const [labels, setLabels] = useState(cacheFresh(userId) ? iconLabelCache : null)

  useEffect(() => {
    let live = true
    if (cacheFresh(userId)) {
      setLabels(iconLabelCache)
    } else {
      loadIconLabels(userId).then((map) => {
        if (live) setLabels(map)
      })
    }
    return () => {
      live = false
    }
  }, [userId])

  const display = value ? (labels && labels[value]) || fileNameOf(value) : ''
  return (
    <>
      <Button size="small" variant="outlined" onClick={() => setOpen(true)} startIcon={<IconPreview path={value} size={20} />} sx={{ textTransform: 'none', justifyContent: 'flex-start' }}>
        {value ? display : `Choose ${label.toLowerCase()}`}
      </Button>
      <IconPicker
        open={open}
        value={value}
        onClose={() => setOpen(false)}
        onSelect={(path) => {
          onChange(path)
          setOpen(false)
          loadIconLabels(userId, true).then((map) => setLabels({ ...map }))
        }}
      />
    </>
  )
}
