import { useMemo, useState } from 'react'
import { Box, Chip, IconButton, Typography } from '@mui/material'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { IconPreview } from '../../shared/ui/IconPicker'
import { canReparent, indexNodes, visibleOrder } from './orbatDoc'

const INDENT = 18

function TreeRow({ node, depth, ctx }) {
  const kids = ctx.children.get(node.id) || []
  const open = ctx.expanded.has(node.id)
  const selected = ctx.selectedId === node.id
  const type = ctx.nodeTypes.get(node.nodeTypeId)
  const user = ctx.userByNode.get(node.id)
  const dropOk = ctx.dragId && canReparent(ctx.nodes, ctx.dragId, node.id)
  const over = ctx.overId === node.id && dropOk

  return (
    <Box role="none">
      <Box
        id={`orbat-node-${node.id}`}
        role="treeitem"
        aria-level={depth + 1}
        aria-selected={selected}
        aria-expanded={kids.length ? open : undefined}
        draggable={ctx.editable && Boolean(node.parentId)}
        onClick={() => ctx.onSelect(node.id)}
        onDoubleClick={() => kids.length && ctx.toggle(node.id)}
        onContextMenu={(event) => {
          event.preventDefault()
          ctx.onSelect(node.id)
          ctx.onContextMenu({ x: event.clientX, y: event.clientY }, node.id)
        }}
        onDragStart={(event) => {
          event.dataTransfer.setData('text/plain', node.id)
          event.dataTransfer.effectAllowed = 'move'
          ctx.setDragId(node.id)
        }}
        onDragEnd={() => {
          ctx.setDragId(null)
          ctx.setOverId(null)
        }}
        onDragOver={(event) => {
          if (!dropOk) return
          event.preventDefault()
          event.dataTransfer.dropEffect = 'move'
          if (ctx.overId !== node.id) ctx.setOverId(node.id)
        }}
        onDragLeave={() => ctx.overId === node.id && ctx.setOverId(null)}
        onDrop={(event) => {
          if (!dropOk) return
          event.preventDefault()
          ctx.onMove(ctx.dragId, node.id)
          ctx.setDragId(null)
          ctx.setOverId(null)
        }}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          minHeight: 34,
          pl: depth * INDENT / 8 + 0.5,
          pr: 0.5,
          cursor: ctx.editable && node.parentId ? 'grab' : 'pointer',
          borderRadius: 1,
          bgcolor: selected ? 'action.selected' : 'transparent',
          outline: over ? '2px dashed' : 'none',
          outlineColor: 'primary.main',
          opacity: ctx.dragId === node.id ? 0.5 : 1,
          '&:hover': { bgcolor: selected ? 'action.selected' : 'action.hover' },
        }}
      >
        <IconButton
          size="small"
          tabIndex={-1}
          aria-label={open ? `Collapse ${node.name}` : `Expand ${node.name}`}
          onClick={(event) => {
            event.stopPropagation()
            ctx.toggle(node.id)
          }}
          sx={{ visibility: kids.length ? 'visible' : 'hidden', p: 0.25 }}
        >
          {open ? <ExpandMoreIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}
        </IconButton>
        {type?.iconPath ? <IconPreview path={type.iconPath} size={20} /> : <Box sx={{ width: 20, flexShrink: 0 }} aria-hidden />}
        <Typography variant="body2" noWrap sx={{ flex: 1, minWidth: 0 }} title={type ? `${node.name} (${type.name})` : node.name}>
          {node.name}
        </Typography>
        {user ? <Chip size="small" label={user} variant="outlined" color="primary" sx={{ height: 20, maxWidth: 110 }} /> : null}
        {kids.length ? <Typography variant="caption" color="text.secondary">{kids.length}</Typography> : null}
      </Box>
      {kids.length && open ? (
        <Box role="group">
          {kids.map((child) => (
            <TreeRow key={child.id} node={child} depth={depth + 1} ctx={ctx} />
          ))}
        </Box>
      ) : null}
    </Box>
  )
}

/**
 * Hierarchical ORBAT tree (no extra dependency): expand/collapse, select, context menu, drag to reparent,
 * keyboard (arrows, Enter/F2 rename, Delete, Insert/+ add child, Shift+F10 menu).
 */
export function OrbatTree({ nodes, nodeTypes, selectedId, onSelect, expanded, setExpanded, editable, onContextMenu, onMove, onAction, userByNode }) {
  const { children, roots, byId } = useMemo(() => indexNodes(nodes), [nodes])
  const [dragId, setDragId] = useState(null)
  const [overId, setOverId] = useState(null)

  const toggle = (id) =>
    setExpanded((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const move = (id, parentId) => {
    onMove(id, parentId)
    setExpanded((current) => new Set(current).add(parentId))
  }

  const onKeyDown = (event) => {
    if (!nodes.length) return
    const order = visibleOrder(nodes, expanded)
    const index = order.findIndex((item) => item.id === selectedId)
    const node = byId.get(selectedId)
    const kids = node ? children.get(node.id) || [] : []
    const go = (target) => {
      if (target) {
        event.preventDefault()
        onSelect(target.id)
        document.getElementById(`orbat-node-${target.id}`)?.scrollIntoView({ block: 'nearest' })
      }
    }
    switch (event.key) {
      case 'ArrowDown':
        go(order[index < 0 ? 0 : Math.min(order.length - 1, index + 1)])
        break
      case 'ArrowUp':
        go(order[Math.max(0, index - 1)])
        break
      case 'Home':
        go(order[0])
        break
      case 'End':
        go(order[order.length - 1])
        break
      case 'ArrowRight':
        if (node && kids.length && !expanded.has(node.id)) {
          event.preventDefault()
          toggle(node.id)
        } else if (node && kids.length) go(kids[0])
        break
      case 'ArrowLeft':
        if (node && kids.length && expanded.has(node.id)) {
          event.preventDefault()
          toggle(node.id)
        } else if (node?.parentId) go(byId.get(node.parentId))
        break
      case 'F2':
        if (node && editable) {
          event.preventDefault()
          onAction('rename', node.id)
        }
        break
      case 'Delete':
        if (node && editable && node.parentId) {
          event.preventDefault()
          onAction('delete', node.id)
        }
        break
      case 'Insert':
      case '+':
        if (node && editable) {
          event.preventDefault()
          onAction('add', node.id)
        }
        break
      case 'ContextMenu':
      case 'F10':
        if (node && (event.key === 'ContextMenu' || event.shiftKey)) {
          event.preventDefault()
          const rect = document.getElementById(`orbat-node-${node.id}`)?.getBoundingClientRect()
          onContextMenu({ x: (rect?.left || 0) + 40, y: (rect?.bottom || 0) }, node.id)
        }
        break
      default:
    }
  }

  const ctx = {
    nodes,
    nodeTypes,
    children,
    expanded,
    selectedId,
    editable,
    dragId,
    overId,
    userByNode,
    setDragId,
    setOverId,
    toggle,
    onSelect,
    onContextMenu,
    onMove: move,
  }

  return (
    <Box
      role="tree"
      aria-label="ORBAT"
      aria-activedescendant={selectedId ? `orbat-node-${selectedId}` : undefined}
      tabIndex={0}
      onKeyDown={onKeyDown}
      sx={{ outline: 'none', '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: -2 }, py: 0.5 }}
    >
      {roots.map((root) => (
        <TreeRow key={root.id} node={root} depth={0} ctx={ctx} />
      ))}
    </Box>
  )
}
