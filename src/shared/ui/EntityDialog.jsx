import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material'
import { useDirectoryStore } from '../../features/directory/useDirectoryStore'

function Detail({ label, value }) {
  if (value == null || value === '') return null
  return (
    <Typography variant="body2">
      {label} {value}
    </Typography>
  )
}

export function EntityDialog() {
  const data = useDirectoryStore((state) => state.data)
  const open = useDirectoryStore((state) => state.entityOpen)
  const selectedId = useDirectoryStore((state) => state.selectedId)
  const close = useDirectoryStore((state) => state.closeEntity)
  const feature = data?.features?.find((item) => item.id === selectedId)
  const graphic = data?.graphics?.find((item) => item.id === selectedId)
  const record = feature || graphic
  const component = feature?.featureType === 'component'
  const skipped = new Set(['kind', 'service', 'name'])

  return (
    <Dialog open={Boolean(open && record)} onClose={close} fullWidth maxWidth="xs">
      <DialogTitle>{record?.name || 'Details'}</DialogTitle>
      <DialogContent>
        {feature && component ? (
          <>
            <Detail label="Service" value={feature.properties?.service} />
            <Detail label="Kind" value={feature.properties?.kind} />
            <Detail label="Geometry" value={feature.geometry?.type} />
            {Object.entries(feature.properties || {}).map(([key, value]) => {
              if (skipped.has(key)) return null
              return <Detail key={key} label={key} value={value} />
            })}
          </>
        ) : null}
        {feature && !component ? (
          <>
            <Typography variant="body2">Type {feature.featureType}</Typography>
            <Typography variant="body2">Layer {feature.layerId}</Typography>
            <Typography variant="body2">Geometry {feature.geometry?.type}</Typography>
            <Typography variant="body2">Team {data.teams.find((team) => team.id === feature.teamId)?.name || 'None'}</Typography>
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
