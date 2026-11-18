import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined'
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined'
import { get, http } from '../../shared/api/http'
import { FunctionalityCodes, hasFunctionality } from '../../shared/auth/functionalityCodes'
import { EMPTY_LIST } from '../../shared/lib/empty'
import { logger } from '../../shared/lib/logger'
import { LoadingState } from '../../shared/ui/LoadingState'
import { IconPreview } from '../../shared/ui/IconPicker'
import { useToastStore } from '../feedback/useToastStore'
import { useSessionStore } from '../session/useSessionStore'

const ACCEPT = '.svg,.png,.jpg,.jpeg,.gif,.webp'

function directories(node, depth = 0, found = []) {
  if (!node || node.type !== 'directory') return found
  found.push({ path: node.path || '', name: node.name || 'All icons', depth, children: node.children || EMPTY_LIST })
  ;(node.children || EMPTY_LIST).forEach((child) => directories(child, depth + 1, found))
  return found
}

/** Browse the icon folders and upload new icons (upload needs MANAGE_ICONS). */
export function IconsAdminPanel() {
  const push = useToastStore((state) => state.push)
  const canManage = useSessionStore((state) => hasFunctionality(state.session?.functionalities, FunctionalityCodes.MANAGE_ICONS))
  const [tree, setTree] = useState(null)
  const [folder, setFolder] = useState('')
  const [target, setTarget] = useState('')
  const [chosen, setChosen] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const input = useRef(null)

  const load = useCallback(async () => {
    setError('')
    try {
      setTree(await get('/icons'))
    } catch (failure) {
      const text = failure?.message || 'The icons could not be listed.'
      setError(text)
      push(text, 'error')
      logger.warn('icons.admin.list.failed', { message: text })
    }
  }, [push])

  useEffect(() => {
    load()
  }, [load])

  const folders = useMemo(() => directories(tree), [tree])
  const files = useMemo(() => {
    const current = folders.find((item) => item.path === folder)
    return (current?.children || EMPTY_LIST).filter((child) => child.type === 'file')
  }, [folders, folder])

  const openFolder = (path) => {
    setFolder(path)
    setTarget(path)
    setChosen('')
  }

  async function upload(file) {
    if (!file) return
    setBusy(true)
    setError('')
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('path', target.trim().replace(/^\/+|\/+$/g, ''))
      const result = await http('/icons', { method: 'POST', formData: form })
      logger.info('icons.admin.uploaded', { path: result?.path })
      push(`Uploaded ${result?.path || file.name}.`, 'success')
      await load()
      if (result?.path) {
        const parent = result.path.includes('/') ? result.path.slice(0, result.path.lastIndexOf('/')) : ''
        setFolder(parent)
        setChosen(result.path)
      }
    } catch (failure) {
      const text = failure?.message || 'The icon could not be uploaded.'
      setError(text)
      push(text, 'error')
      logger.warn('icons.admin.upload.failed', { message: text })
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }

  if (!tree && !error) return <LoadingState label="Loading icons" />

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <Typography variant="subtitle1">Icons</Typography>
        <Chip size="small" variant="outlined" label={canManage ? 'Can upload' : 'Read only'} />
        <Box sx={{ flex: 1 }} />
        <Button size="small" onClick={load}>Refresh</Button>
      </Stack>

      {error ? <Alert severity="error">{error}</Alert> : null}

      {tree ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '220px 1fr' }, gap: 2 }}>
          <List dense disablePadding aria-label="Icon folders" sx={{ maxHeight: 420, overflow: 'auto', border: 1, borderColor: 'divider', borderRadius: 1 }}>
            {folders.map((item) => (
              <ListItemButton key={item.path || 'root'} selected={item.path === folder} onClick={() => openFolder(item.path)} sx={{ pl: 1 + item.depth * 1.5 }}>
                <FolderOutlinedIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                <ListItemText primary={item.name} slotProps={{ primary: { variant: 'body2', noWrap: true } }} />
              </ListItemButton>
            ))}
          </List>

          <Stack spacing={1.5} sx={{ minWidth: 0 }}>
            {files.length ? (
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', gap: 1 }}>
                {files.map((file) => (
                  <Button
                    key={file.path}
                    variant={chosen === file.path ? 'contained' : 'outlined'}
                    color={chosen === file.path ? 'primary' : 'inherit'}
                    onClick={() => setChosen(file.path)}
                    aria-pressed={chosen === file.path}
                    sx={{ flexDirection: 'column', gap: 0.5, minHeight: 88, textTransform: 'none', p: 0.5 }}
                  >
                    <IconPreview path={file.path} size={40} alt={file.name} />
                    <Typography variant="caption" noWrap sx={{ maxWidth: '100%' }}>{file.name}</Typography>
                  </Button>
                ))}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">No icons in {folder || 'the root folder'}.</Typography>
            )}

            {chosen ? (
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', p: 1, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                <IconPreview path={chosen} size={64} alt={chosen} />
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="caption" color="text.secondary">Relative path</Typography>
                  <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>{chosen}</Typography>
                </Box>
              </Stack>
            ) : null}

            {canManage ? (
              <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                <input ref={input} type="file" hidden accept={ACCEPT} onChange={(event) => upload(event.target.files?.[0])} />
                <TextField
                  size="small"
                  label="Upload to folder"
                  value={target}
                  onChange={(event) => setTarget(event.target.value)}
                  helperText="Leave empty for the root; use a/b for subfolders."
                  sx={{ minWidth: 240 }}
                />
                <Button size="small" variant="contained" startIcon={<UploadFileOutlinedIcon />} disabled={busy} onClick={() => input.current?.click()}>
                  {busy ? 'Uploading' : 'Choose file'}
                </Button>
              </Stack>
            ) : (
              <Typography variant="caption" color="text.secondary">Uploading icons needs the Manage icons permission.</Typography>
            )}
          </Stack>
        </Box>
      ) : null}
    </Stack>
  )
}

export default IconsAdminPanel
