import { useEffect, useRef, useState } from 'react'
import { Avatar, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Divider, IconButton, Menu, MenuItem, TextField, Typography } from '@mui/material'
import { useCommit } from '../../features/directory/useDirectoryStore'
import { useToastStore } from '../../features/feedback/useToastStore'
import { useSessionStore } from '../../features/session/useSessionStore'
import * as api from '../../shared/api/client'
import { get } from '../api/http'
import { themeFromEntity } from '../api/mappers'
import { EMPTY_LIST } from '../lib/empty'

export function UserMenu({ open = false, onOpenChange, buttonRef }) {
  const profile = useSessionStore((state) => state.session?.profile)
  const theme = useSessionStore((state) => state.session?.theme)
  const canSelectTheme = useSessionStore((state) => state.session?.canSelectTheme)
  const chooseTheme = useSessionStore((state) => state.chooseTheme)
  const signOut = useSessionStore((state) => state.signOut)
  const commit = useCommit()
  const push = useToastStore((state) => state.push)
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [themeOpen, setThemeOpen] = useState(false)
  const [themeChoices, setThemeChoices] = useState(EMPTY_LIST)
  const [themeId, setThemeId] = useState('')
  const [themeBusy, setThemeBusy] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [nextPassword, setNextPassword] = useState('')
  const localRef = useRef(null)
  const ref = buttonRef || localRef
  const [anchor, setAnchor] = useState(null)

  useEffect(() => {
    if (open) setAnchor(ref.current)
  }, [open, ref])

  const close = () => {
    setAnchor(null)
    onOpenChange?.(false)
  }

  const openTheme = () => {
    close()
    setThemeId(theme?.id || '')
    setThemeOpen(true)
    get('/themes')
      .then((rows) => {
        const available = rows.map(themeFromEntity).filter((item) => item.holderKind === 'FREE' || item.loginTheme || item.id === String(theme?.id))
        setThemeChoices(available)
        setThemeId((current) => current || available[0]?.id || '')
      })
      .catch((error) => push(error?.message || 'The themes could not be loaded.', 'error'))
  }

  const applyTheme = () => {
    if (!themeId || themeId === theme?.id) {
      setThemeOpen(false)
      return
    }
    setThemeBusy(true)
    chooseTheme(themeId)
      .then(() => setThemeOpen(false))
      .catch((error) => push(error?.message || 'The theme could not be changed.', 'error'))
      .finally(() => setThemeBusy(false))
  }

  if (!profile) return null

  return (
    <>
      <IconButton ref={ref} aria-label={`${profile.title} profile`} onClick={(event) => setAnchor(event.currentTarget)}>
        <Avatar src={profile.avatarUrl} alt="" variant="rounded" sx={{ width: 36, height: 36 }} />
      </IconButton>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={close} slotProps={{ paper: { sx: { maxHeight: 480 } } }}>
        <Box sx={{ px: 2, py: 1, width: 280 }}>
          <Typography variant="subtitle1">{profile.title}</Typography>
          <Typography variant="body2" color="text.secondary">
            {profile.role}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {profile.service}
          </Typography>
        </Box>
        <Divider />
        {canSelectTheme ? (
          <MenuItem onClick={openTheme} sx={{ minHeight: 44 }}>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2">Theme</Typography>
              <Typography variant="caption" color="text.secondary">{theme?.name || 'Choose'}</Typography>
            </Box>
          </MenuItem>
        ) : (
          <Box sx={{ px: 2, py: 1 }}>
            <Typography variant="body2">Theme</Typography>
            <Typography variant="caption" color="text.secondary">{theme?.name}</Typography>
          </Box>
        )}
        <Divider />
        <MenuItem
          onClick={() => {
            close()
            setPasswordOpen(true)
          }}
          sx={{ minHeight: 44 }}
        >
          Change password
        </MenuItem>
        <MenuItem
          onClick={() => {
            close()
            signOut()
          }}
          sx={{ minHeight: 44 }}
        >
          Sign out
        </MenuItem>
      </Menu>
      <Dialog open={themeOpen} onClose={themeBusy ? undefined : () => setThemeOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Theme</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            This becomes the login theme. A theme already allotted to a team or to another user is not listed.
          </Typography>
          <TextField
            select
            fullWidth
            label="Theme"
            value={themeChoices.some((item) => item.id === themeId) ? themeId : ''}
            onChange={(event) => setThemeId(event.target.value)}
          >
            {themeChoices.map((item) => (
              <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setThemeOpen(false)} disabled={themeBusy}>Cancel</Button>
          <Button variant="contained" onClick={applyTheme} disabled={themeBusy || !themeId}>{themeBusy ? 'Saving' : 'Use this theme'}</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={passwordOpen} onClose={() => setPasswordOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Change password</DialogTitle>
        <DialogContent>
          <TextField fullWidth margin="dense" type="password" label="Current password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
          <TextField fullWidth margin="dense" type="password" label="New password" value={nextPassword} onChange={(event) => setNextPassword(event.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPasswordOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() =>
              commit((userId) => api.updatePassword(userId, currentPassword, nextPassword))
                .then(() => {
                  setPasswordOpen(false)
                  setCurrentPassword('')
                  setNextPassword('')
                })
                .catch(() => {})
            }
          >
            Change
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
