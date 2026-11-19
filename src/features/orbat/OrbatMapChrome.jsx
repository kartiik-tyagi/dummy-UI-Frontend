import { useEffect, useState } from 'react'
import { Box, Divider, ListSubheader, Menu, MenuItem, Paper, Typography } from '@mui/material'
import { allowedChildren } from './nodeRules'
import { useOrbatPicture } from './useOrbatPicture'

function typeOf(types, node) {
  return types.find((type) => String(type.id) === String(node?.nodeTypeId)) || null
}

function samePlace(nodes) {
  if (nodes.length < 2) return false
  const firstLat = Number(nodes[0].latitude).toFixed(4)
  const firstLon = Number(nodes[0].longitude).toFixed(4)
  return nodes.every((node) => Number(node.latitude).toFixed(4) === firstLat && Number(node.longitude).toFixed(4) === firstLon)
}

function HoverCard({ hover, nodes, types }) {
  if (!hover?.nodeIds?.length) return null
  const shown = hover.nodeIds.map((id) => nodes.find((node) => node.id === id)).filter(Boolean)
  if (!shown.length) return null
  const single = shown.length === 1 ? shown[0] : null
  const parent = single ? nodes.find((node) => node.id === single.parentId) : null
  return (
    <Paper
      elevation={6}
      sx={{
        position: 'fixed',
        left: hover.x + 14,
        top: hover.y + 14,
        zIndex: 1400,
        px: 1.25,
        py: 0.75,
        maxWidth: 260,
        pointerEvents: 'none',
        bgcolor: 'background.paper',
        color: 'text.primary',
      }}
    >
      {single ? (
        <Box>
          <Typography variant="body2">{single.name}</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{typeOf(types, single)?.name || 'Node'}</Typography>
          {single.code ? <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{single.code}</Typography> : null}
          {single.location_name ? <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{single.location_name}</Typography> : null}
          {parent ? <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Under {parent.name}</Typography> : null}
        </Box>
      ) : (
        <Box>
          <Typography variant="body2">{shown.length} at this place</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
            {samePlace(shown) ? 'They share one position.' : 'Zoom in to separate them.'}
          </Typography>
          {shown.slice(0, 6).map((node) => (
            <Typography key={node.id} variant="caption" sx={{ display: 'block' }}>{node.name} · {typeOf(types, node)?.name || 'Node'}</Typography>
          ))}
          {shown.length > 6 ? <Typography variant="caption" color="text.secondary">and {shown.length - 6} more</Typography> : null}
        </Box>
      )}
    </Paper>
  )
}

/** Hover details and the map right-click menu. A cluster asks which resource you mean before any action. */
export function OrbatMapChrome({ nodes, types, editable, canMark, marked, onAdd, onEdit, onDelete, onMark }) {
  const hover = useOrbatPicture((state) => state.hover)
  const menu = useOrbatPicture((state) => state.menu)
  const closeMenu = useOrbatPicture((state) => state.closeMenu)
  const [parentId, setParentId] = useState(null)
  const [resourceId, setResourceId] = useState(null)
  useEffect(() => {
    if (!menu) {
      setParentId(null)
      setResourceId(null)
      return
    }
    if (menu.nodeIds?.length === 1) {
      setResourceId(menu.nodeIds[0])
      return
    }
    if (!menu.nodeIds?.length) {
      setResourceId(null)
      setParentId(useMapParent(nodes, types, useOrbatPicture.getState().parentId))
    }
  }, [menu, nodes, types])
  const byId = new Map(nodes.map((node) => [node.id, node]))
  const typeName = (node) => typeOf(types, node)?.name || 'Node'
  const chosenParent = byId.get(parentId) || null
  const resource = byId.get(resourceId) || null
  const candidates = nodes.filter((node) => allowedChildren(types, typeOf(types, node)).length)
  const childTypes = chosenParent ? allowedChildren(types, typeOf(types, chosenParent)) : []
  const clustered = (menu?.nodeIds?.length || 0) > 1

  const beginAdd = (id, typeId) => {
    onAdd(id, typeId, menu.longitude, menu.latitude)
    closeMenu()
    setParentId(null)
    setResourceId(null)
  }

  return (
    <>
      <HoverCard hover={menu ? null : hover} nodes={nodes} types={types} />
      <Menu
        open={Boolean(menu) && !resourceId}
        onClose={() => { closeMenu(); setParentId(null) }}
        anchorReference="anchorPosition"
        anchorPosition={menu ? { top: menu.y, left: menu.x } : undefined}
      >
        {clustered ? <ListSubheader>{menu.nodeIds.length} at this place</ListSubheader> : null}
        {clustered ? menu.nodeIds.map((id) => {
          const node = byId.get(id)
          if (!node) return null
          return <MenuItem key={id} onClick={() => setResourceId(id)}>{node.name} · {typeName(node)}</MenuItem>
        }) : null}
        {!clustered && menu?.nodeIds?.length === 1 ? (
          <MenuItem onClick={() => setResourceId(menu.nodeIds[0])}>{byId.get(menu.nodeIds[0])?.name || 'This node'}</MenuItem>
        ) : null}
        {!menu?.nodeIds?.length && chosenParent ? <ListSubheader>Add under {chosenParent.name} · {typeName(chosenParent)}</ListSubheader> : null}
        {!menu?.nodeIds?.length && childTypes.map((type) => (
          <MenuItem key={type.id} onClick={() => beginAdd(chosenParent.id, type.id)}>{type.name}</MenuItem>
        ))}
        {!menu?.nodeIds?.length ? <Divider /> : null}
        {!menu?.nodeIds?.length ? <ListSubheader>Belongs to</ListSubheader> : null}
        {!menu?.nodeIds?.length && candidates.map((node) => (
          <MenuItem key={node.id} selected={node.id === parentId} onClick={() => setParentId(node.id)}>{node.name} · {typeName(node)}</MenuItem>
        ))}
      </Menu>
      <Menu
        open={Boolean(resource)}
        onClose={() => { setResourceId(null); closeMenu() }}
        anchorReference="anchorPosition"
        anchorPosition={menu ? { top: menu.y, left: menu.x } : undefined}
      >
        <ListSubheader>{resource ? `${resource.name} · ${typeName(resource)}` : ''}</ListSubheader>
        {clustered ? <MenuItem onClick={() => setResourceId(null)}>All at this place</MenuItem> : null}
        {editable && resource?.parentId ? <MenuItem onClick={() => { onEdit(resource.id); setResourceId(null); closeMenu() }}>Edit</MenuItem> : null}
        {editable && chosenParentFor(resource, types) ? <ListSubheader>Add under this</ListSubheader> : null}
        {editable && resource && allowedChildren(types, typeOf(types, resource)).map((type) => (
          <MenuItem key={type.id} onClick={() => beginAdd(resource.id, type.id)}>{type.name}</MenuItem>
        ))}
        {canMark && resource && !marked.has(resource.id) ? <MenuItem onClick={() => { onMark(resource.id); setResourceId(null); closeMenu() }}>Mark as user</MenuItem> : null}
        {editable && resource?.parentId ? <MenuItem onClick={() => { onDelete(resource.id); setResourceId(null); closeMenu() }}>Delete</MenuItem> : null}
      </Menu>
    </>
  )
}

function chosenParentFor(node, types) {
  return node && allowedChildren(types, typeOf(types, node)).length
}

export function useMapParent(nodes, types, selectedId) {
  const selected = nodes.find((node) => node.id === selectedId)
  if (selected && allowedChildren(types, typeOf(types, selected)).length) return selected.id
  return nodes.find((node) => !node.parentId)?.id || null
}
