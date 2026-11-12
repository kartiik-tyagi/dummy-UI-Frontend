import { useEffect, useState } from 'react'
import { Box, ListItemIcon, ListItemText, Menu, MenuItem, Typography } from '@mui/material'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import { useDirectoryStore } from '../../features/directory/useDirectoryStore'
import { loadContextMenu } from '../lib/loadContextMenu'

export function MapContextMenu() {
  const contextMenu = useDirectoryStore((state) => state.contextMenu)
  const closeContextMenu = useDirectoryStore((state) => state.closeContextMenu)
  const openComponentDraft = useDirectoryStore((state) => state.openComponentDraft)
  const [menus, setMenus] = useState([])
  const [error, setError] = useState('')
  const [branch, setBranch] = useState(null)
  const [subAnchor, setSubAnchor] = useState(null)

  useEffect(() => {
    let alive = true
    loadContextMenu()
      .then((data) => {
        if (!alive) return
        setMenus(data.menus)
        setError('')
      })
      .catch((failure) => {
        if (!alive) return
        setMenus([])
        setError(failure?.message || 'The context menu could not be loaded.')
      })
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (!contextMenu?.open) {
      setSubAnchor(null)
      setBranch(null)
    }
  }, [contextMenu])

  const close = () => {
    setSubAnchor(null)
    setBranch(null)
    closeContextMenu()
  }

  const choose = (item) => {
    if (!contextMenu) return
    const draft = {
      id: item.id,
      label: item.label,
      kind: item.kind,
      service: item.service,
      fields: item.fields || [],
      longitude: contextMenu.longitude,
      latitude: contextMenu.latitude,
    }
    setSubAnchor(null)
    setBranch(null)
    openComponentDraft(draft)
  }

  const open = Boolean(contextMenu?.open)

  return (
    <>
      <Menu
        open={open}
        onClose={close}
        anchorReference="anchorPosition"
        anchorPosition={open ? { top: contextMenu.y, left: contextMenu.x } : undefined}
        anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{ paper: { sx: { minWidth: 180 } } }}
      >
        {error ? (
          <Box sx={{ px: 2, py: 1, maxWidth: 240 }}>
            <Typography variant="body2" color="error">
              {error}
            </Typography>
          </Box>
        ) : null}
        {menus.map((menu) => (
          <MenuItem
            key={menu.id}
            selected={branch?.id === menu.id}
            onClick={(event) => {
              setBranch(menu)
              setSubAnchor(event.currentTarget)
            }}
          >
            <ListItemText primary={menu.label} />
            <ListItemIcon sx={{ minWidth: 28, display: 'flex', justifyContent: 'flex-end', color: 'text.secondary' }}>
              <ChevronRightIcon fontSize="small" />
            </ListItemIcon>
          </MenuItem>
        ))}
      </Menu>
      <Menu
        open={Boolean(branch && subAnchor)}
        anchorEl={subAnchor}
        onClose={() => {
          setSubAnchor(null)
          setBranch(null)
        }}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{ paper: { sx: { minWidth: 200 } } }}
      >
        {(branch?.items || []).map((item) => (
          <MenuItem key={item.id} onClick={() => choose(item)}>
            {item.label}
          </MenuItem>
        ))}
      </Menu>
    </>
  )
}
