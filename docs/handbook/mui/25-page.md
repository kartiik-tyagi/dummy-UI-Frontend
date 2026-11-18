# A whole page

Navbar, sidebar, content, and footer in one column that fills the viewport. This is a general page shape. GIS Warplan’s shells all keep a command bar and a readout footer, and they place the application menu and the map tools differently. Copy a shell only when you mean that frame.

```jsx
import { useState } from 'react'
import {
  Box,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Toolbar,
  Typography,
  useMediaQuery,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import MenuIcon from '@mui/icons-material/Menu'

const DRAWER_WIDTH = 240

export function Frame({ title, items, current, onSelect, children }) {
  const theme = useTheme()
  const phone = useMediaQuery(theme.breakpoints.down('sm'))
  const [mobileOpen, setMobileOpen] = useState(false)

  const nav = (
    <List dense>
      {items.map((item) => (
        <ListItemButton
          key={item.id}
          selected={item.id === current}
          onClick={() => {
            onSelect(item.id)
            setMobileOpen(false)
          }}
        >
          <ListItemText primary={item.label} slotProps={{ primary: { variant: 'body2' } }} />
        </ListItemButton>
      ))}
    </List>
  )

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0, bgcolor: 'background.default', color: 'text.primary' }}>
      <Box
        component="header"
        sx={{
          flexShrink: 0,
          minHeight: 48,
          px: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        {phone ? (
          <IconButton aria-label="Open menu" onClick={() => setMobileOpen(true)}>
            <MenuIcon />
          </IconButton>
        ) : null}
        <Typography variant="subtitle2" sx={{ letterSpacing: '0.14em' }}>{title}</Typography>
      </Box>

      <Box sx={{ flex: 1, minHeight: 0, display: 'flex' }}>
        <Drawer
          variant={phone ? 'temporary' : 'permanent'}
          open={phone ? mobileOpen : true}
          onClose={() => setMobileOpen(false)}
          sx={{
            width: phone ? 0 : DRAWER_WIDTH,
            flexShrink: 0,
            '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box', position: phone ? 'fixed' : 'relative' },
          }}
        >
          {phone ? null : <Toolbar variant="dense" sx={{ minHeight: 0 }} />}
          {nav}
        </Drawer>

        <Box component="main" sx={{ flex: 1, minWidth: 0, overflow: 'auto', p: 2 }}>
          {children}
        </Box>
      </Box>

      <Box
        component="footer"
        sx={{
          flexShrink: 0,
          minHeight: 32,
          px: 1.5,
          display: 'flex',
          alignItems: 'center',
          borderTop: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Typography variant="caption" color="text.secondary">GIS Warplan</Typography>
      </Box>
    </Box>
  )
}
```

## Why each piece is there

| Piece | Reason |
| --- | --- |
| `height: '100%'` | `index.css` gives `#root` a height. The frame fills it. |
| `minHeight: 0` on the middle row | Lets the main area shrink and scroll instead of growing the page. |
| `overflow: 'auto'` on `main` | The page scrolls here. The document does not. |
| Permanent drawer from `sm` up | The sidebar pushes `main`. |
| Temporary drawer on a phone | The sidebar covers `main` and closes when an item is chosen. |
| `flexShrink: 0` on header and footer | They keep their height. |
| `minWidth: 0` on `main` | Long words ellipsis instead of widening the row. |

## The picture is different

`main` around the map uses `overflow: 'hidden'` and no padding. The map is absolutely positioned inside that cell. Padding on the map’s parent insets the picture and is fine only when you mean a margin. A scrolling `main` around the map makes the pointer coordinates disagree with the features.

Do not mount two frames. `Shell.jsx` is the frame for each branch. A new page is a route inside that shell, or a replacement of the tool panel, not a second navbar.

## Checklist before you call the page done

- At 400px width the menu opens, an item closes it, and the content is readable.
- At 1200px the sidebar is visible and the content is beside it, not under it.
- The footer is on screen when the content is short, and the content scrolls when it is long.
- Text uses `text.primary` or `text.secondary`, and a contained button uses the theme primary so sand and night both work.
- Icon-only buttons have `aria-label`.
- A dialog opened from the page traps focus and returns it when it closes. MUI `Dialog` does that if you do not disable it.
