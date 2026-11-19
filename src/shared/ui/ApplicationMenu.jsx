import { useState } from 'react'
import { Box, Button, IconButton, ListItemButton, ListItemIcon, ListItemText, ListSubheader, Menu, MenuItem, Tooltip, useMediaQuery } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import CloseIcon from '@mui/icons-material/Close'
import MenuIcon from '@mui/icons-material/Menu'
import { useSections } from '../../features/session/useSections'
import { NavIcon } from './navIcons'

function ItemButton({ section, selected, expanded, onSelect, placement }) {
  const button = (
    <ListItemButton
      selected={selected}
      aria-label={section.label}
      aria-pressed={selected}
      onClick={() => onSelect(section.id)}
      sx={{
        minHeight: 40,
        px: expanded ? 1.5 : 0,
        mx: 0.5,
        borderRadius: 1,
        justifyContent: expanded ? 'flex-start' : 'center',
        color: 'text.primary',
        '&.Mui-selected': { bgcolor: 'action.selected', color: 'text.primary' },
      }}
    >
      <ListItemIcon
        sx={{
          minWidth: expanded ? 32 : 0,
          color: selected ? 'primary.main' : 'text.secondary',
          justifyContent: 'center',
        }}
      >
        <NavIcon name={section.icon} />
      </ListItemIcon>
      {expanded ? <ListItemText primary={section.label} slotProps={{ primary: { variant: 'body2', noWrap: true } }} /> : null}
    </ListItemButton>
  )
  if (expanded) return button
  return (
    <Tooltip title={section.label} placement={placement}>
      {button}
    </Tooltip>
  )
}

function groupSections(sections) {
  const entries = []
  let kicker = ''
  sections.forEach((section) => {
    if (section.kicker !== kicker) {
      kicker = section.kicker
      entries.push({ header: kicker })
    }
    entries.push({ section })
  })
  return entries
}

export function ApplicationMenu({ presentation = 'rail', expanded = false, onExpandedChange, onHide, edge = 'start' }) {
  const { sections, sectionId, select } = useSections()
  const theme = useTheme()
  const compact = useMediaQuery(theme.breakpoints.down('sm'))
  const [anchor, setAnchor] = useState(null)

  if (presentation === 'menu') {
    return (
      <>
        {compact ? (
          <Tooltip title="Application">
            <IconButton aria-label="Application" aria-haspopup="menu" aria-expanded={Boolean(anchor)} onClick={(event) => setAnchor(event.currentTarget)}>
              <MenuIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        ) : (
          <Button
            size="small"
            startIcon={<MenuIcon />}
            aria-haspopup="menu"
            aria-expanded={Boolean(anchor)}
            onClick={(event) => setAnchor(event.currentTarget)}
            sx={{ textTransform: 'none', color: 'text.primary', flexShrink: 0 }}
          >
            Application
          </Button>
        )}
        <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
          {sections.length ? groupSections(sections).map((entry) => entry.header ? (
            <ListSubheader key={`group-${entry.header}`} sx={{ lineHeight: '32px' }}>{entry.header}</ListSubheader>
          ) : (
            <MenuItem
              key={entry.section.id}
              selected={entry.section.id === sectionId}
              onClick={() => {
                select(entry.section.id)
                setAnchor(null)
              }}
            >
              <ListItemIcon sx={{ color: entry.section.id === sectionId ? 'primary.main' : 'text.secondary' }}>
                <NavIcon name={entry.section.icon} />
              </ListItemIcon>
              {entry.section.label}
            </MenuItem>
          )) : (
            <MenuItem disabled>No application sections for this role</MenuItem>
          )}
        </Menu>
      </>
    )
  }

  if (presentation === 'bar' || presentation === 'icons') {
    return (
      <Box
        component="nav"
        aria-label="Application"
        sx={{
          minHeight: 40,
          px: 0.5,
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          overflowX: 'auto',
          flexShrink: 0,
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        {sections.map((section) => {
          const selected = section.id === sectionId
          if (presentation === 'icons') {
            return (
              <Tooltip key={section.id} title={section.label}>
                <IconButton aria-label={section.label} aria-pressed={selected} color={selected ? 'primary' : 'default'} onClick={() => select(section.id)}>
                  <NavIcon name={section.icon} />
                </IconButton>
              </Tooltip>
            )
          }
          return (
            <Button
              key={section.id}
              aria-pressed={selected}
              onClick={() => select(section.id)}
              sx={{
                flexShrink: 0,
                borderRadius: 0,
                textTransform: 'none',
                color: selected ? 'text.primary' : 'text.secondary',
                borderBottom: 2,
                borderColor: selected ? 'primary.main' : 'transparent',
              }}
            >
              {section.label}
            </Button>
          )
        })}
        {onHide ? (
          <Tooltip title="Hide application menu">
            <IconButton aria-label="Hide application menu" onClick={onHide} sx={{ ml: 'auto' }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        ) : null}
      </Box>
    )
  }

  const width = expanded ? 248 : 56
  return (
    <Box
      component="nav"
      aria-label="Application"
      sx={{
        width,
        flexShrink: 0,
        minHeight: 0,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper',
        borderColor: 'divider',
        borderRight: edge === 'start' ? 1 : 0,
        borderLeft: edge === 'end' ? 1 : 0,
        overflow: 'hidden',
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: expanded ? 'flex-end' : 'center', flexShrink: 0 }}>
        {onHide ? (
          <Tooltip title="Hide application menu">
            <IconButton aria-label="Hide application menu" onClick={onHide}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        ) : null}
        <Tooltip title={expanded ? 'Collapse application menu' : 'Expand application menu'}>
          <IconButton
            aria-label={expanded ? 'Collapse application menu' : 'Expand application menu'}
            onClick={() => onExpandedChange?.(!expanded)}
          >
            {expanded ? <ChevronLeftIcon sx={{ transform: edge === 'end' ? 'rotate(180deg)' : 'none' }} /> : <MenuIcon />}
          </IconButton>
        </Tooltip>
      </Box>
      <Box sx={{ overflow: 'auto', flex: 1, pb: 1 }}>
        {sections.map((section) => (
          <ItemButton
            key={section.id}
            section={section}
            selected={section.id === sectionId}
            expanded={expanded}
            onSelect={select}
            placement={edge === 'end' ? 'left' : 'right'}
          />
        ))}
      </Box>
    </Box>
  )
}
