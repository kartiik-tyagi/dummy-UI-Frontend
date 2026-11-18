import { useState } from 'react'
import { Box, Button, Divider, IconButton, Tooltip, useMediaQuery } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import CloseIcon from '@mui/icons-material/Close'
import LayersOutlinedIcon from '@mui/icons-material/LayersOutlined'
import { useNavigation } from '../../features/directory/useNavigation'
import { NavIcon } from './navIcons'

const GROUP_ICON = {
  map: 'layers',
  plan: 'plan',
  game: 'control',
  admin: 'settings',
}

export function ShowMapTools({ onClick, pressed = false }) {
  return (
    <Tooltip title={pressed ? 'Hide map tools' : 'Show map tools'}>
      <IconButton aria-label={pressed ? 'Hide map tools' : 'Show map tools'} aria-pressed={pressed} color={pressed ? 'primary' : 'default'} onClick={onClick}>
        <LayersOutlinedIcon fontSize="small" />
      </IconButton>
    </Tooltip>
  )
}

function ToolButton({ item, selected, onSelect, placement }) {
  return (
    <Tooltip title={item.label} placement={placement}>
      <IconButton
        size="small"
        aria-label={item.label}
        aria-pressed={selected}
        color={selected ? 'primary' : 'default'}
        onClick={() => onSelect(item.id)}
      >
        <NavIcon name={item.icon} />
      </IconButton>
    </Tooltip>
  )
}

export function MapToolbar({ orientation = 'horizontal', activeId, onSelect, onHide }) {
  const groups = useNavigation()
  const theme = useTheme()
  const compact = useMediaQuery(theme.breakpoints.down('md'))
  const vertical = orientation === 'vertical'
  const [openGroups, setOpenGroups] = useState(['map', 'admin'])
  const placement = vertical ? 'right' : 'bottom'

  const toggle = (id) => {
    setOpenGroups((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))
  }

  return (
    <Box
      role="toolbar"
      aria-label="Map tools"
      aria-orientation={orientation}
      sx={{
        display: 'flex',
        flexDirection: vertical ? 'column' : 'row',
        alignItems: vertical ? 'stretch' : 'center',
        flexShrink: 0,
        width: vertical ? 48 : '100%',
        height: vertical ? '100%' : 'auto',
        minHeight: vertical ? 0 : 40,
        overflowX: vertical ? 'hidden' : 'auto',
        overflowY: vertical ? 'auto' : 'hidden',
        gap: 0.25,
        px: 0.5,
        py: 0.25,
        bgcolor: 'background.paper',
        borderColor: 'divider',
        borderRight: vertical ? 1 : 0,
        borderBottom: vertical ? 0 : 1,
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {onHide ? (
        <Tooltip title="Hide map tools">
          <IconButton aria-label="Hide map tools" size="small" onClick={onHide}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ) : null}
      {groups.map((group, index) => {
        const open = openGroups.includes(group.id)
        return (
          <Box
            key={group.id}
            sx={{
              display: 'flex',
              flexDirection: vertical ? 'column' : 'row',
              alignItems: vertical ? 'stretch' : 'center',
              flexShrink: 0,
              minWidth: 0,
            }}
          >
            {index > 0 ? <Divider orientation={vertical ? 'horizontal' : 'vertical'} flexItem sx={{ mx: vertical ? 0.5 : 0.25, my: vertical ? 0.25 : 0.75 }} /> : null}
            {vertical || compact ? (
              <Tooltip title={group.label} placement={placement}>
                <IconButton size="small" aria-label={group.label} aria-expanded={open} color={open ? 'primary' : 'default'} onClick={() => toggle(group.id)}>
                  <NavIcon name={GROUP_ICON[group.id] || group.items[0]?.icon || 'layers'} />
                </IconButton>
              </Tooltip>
            ) : (
              <Button
                size="small"
                aria-expanded={open}
                onClick={() => toggle(group.id)}
                sx={{
                  flexShrink: 0,
                  textTransform: 'none',
                  minWidth: 0,
                  px: 0.75,
                  color: open ? 'text.primary' : 'text.secondary',
                  justifyContent: 'flex-start',
                  lineHeight: 1.2,
                }}
              >
                {group.label}
              </Button>
            )}
            {open
              ? group.items.map((item) => (
                  <ToolButton key={item.id} item={item} selected={activeId === item.id} onSelect={onSelect} placement={placement} />
                ))
              : null}
          </Box>
        )
      })}
    </Box>
  )
}
