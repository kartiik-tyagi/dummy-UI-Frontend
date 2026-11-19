import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material'

export function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', busy = false, error = '', onClose, onConfirm }) {
  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontSize: '1.35rem', fontWeight: 600, pt: 2.5, px: 3 }}>{title}</DialogTitle>
      <DialogContent sx={{ px: 3 }}>
        <Typography sx={{ fontSize: '1.1rem', lineHeight: 1.55 }}>{message}</Typography>
        {error ? (
          <Typography color="error" sx={{ mt: 1.5, fontSize: '1.05rem' }}>
            {error}
          </Typography>
        ) : null}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, pt: 1, gap: 1, flexWrap: 'wrap' }}>
        <Button
          onClick={onClose}
          disabled={busy}
          size="large"
          sx={{ textTransform: 'none', fontSize: '1.05rem', minHeight: 44, px: 2 }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={onConfirm}
          disabled={busy}
          size="large"
          sx={{ textTransform: 'none', fontSize: '1.05rem', fontWeight: 600, minHeight: 44, px: 2.25 }}
        >
          {busy ? 'Working…' : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
