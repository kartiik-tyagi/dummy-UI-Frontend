import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material'
import { useDirectoryStore } from '../../features/directory/useDirectoryStore'

export function EntityDialog() {
  const data = useDirectoryStore((state) => state.data)
  const open = useDirectoryStore((state) => state.entityOpen)
  const selectedId = useDirectoryStore((state) => state.selectedId)
  const close = useDirectoryStore((state) => state.closeEntity)
  const feature = data?.features?.find((item) => item.id === selectedId)
  const graphic = data?.graphics?.find((item) => item.id === selectedId)
  const record = feature || graphic
  return (
    <Dialog open={Boolean(open && record)} onClose={close} fullWidth maxWidth="xs">
      <DialogTitle>{record?.name || 'Details'}</DialogTitle>
      <DialogContent>
        {feature ? (
          <>
            <Typography variant="body2">Type {feature.featureType}</Typography>
            <Typography variant="body2">Layer {feature.layerId}</Typography>
            <Typography variant="body2">Geometry {feature.geometry?.type}</Typography>
            <Typography variant="body2">Side {data.sides.find((side) => side.id === feature.sideId)?.name || 'None'}</Typography>
          </>
        ) : null}
        {graphic ? (
          <>
            <Typography variant="body2">Shape {graphic.shapeType}</Typography>
            <Typography variant="body2">Owner {graphic.ownerId}</Typography>
            <Typography variant="body2">Geometry {graphic.geometry?.type}</Typography>
            {(graphic.properties.comments || []).map((comment) => (
              <Typography key={comment.id} variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                {comment.userId}: {comment.text}
              </Typography>
            ))}
          </>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={close}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}
