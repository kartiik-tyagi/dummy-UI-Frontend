# Navbar

The bar across the top. This app’s `TopBar` is a `Box component="header"`, not an `AppBar`. Both are valid. `AppBar` brings elevation, colour, and a matching `Toolbar` height. Use it when you want that chrome. Use a `Box` when the bar must be transparent over a map, which is what layout-2 does.

## AppBar

```jsx
import { AppBar, Box, Button, IconButton, Toolbar, Typography } from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'

<AppBar position="static" color="default" elevation={0}>
  <Toolbar variant="dense">
    <IconButton edge="start" color="inherit" aria-label="Open menu" onClick={toggle} sx={{ display: { sm: 'none' } }}>
      <MenuIcon />
    </IconButton>
    <Typography variant="subtitle2" sx={{ letterSpacing: '0.14em', flexGrow: 1 }}>
      GIS WARPLAN
    </Typography>
    <Button color="inherit" onClick={signOut}>Sign out</Button>
  </Toolbar>
</AppBar>
```

| `position` | Behaviour |
| --- | --- |
| `static` | In normal flow. The bar takes a row. This matches the shell. |
| `fixed` | Out of flow, stuck to the viewport. The content needs a spacer the height of the bar, or it slides underneath. |
| `sticky` | Sticks when its parent scrolls. The parent must be the scroll container. |
| `absolute` | Out of flow, against the nearest positioned ancestor. |
| `relative` | In flow, with its own positioning context. |

`color="default"` uses the paper background. `color="primary"` uses primary, and the text should be `primary.contrastText`, which this theme sets. `color="transparent"` and `elevation={0}` sit over a map. `enableColorOnDark` is unnecessary while the theme already has a dark palette.

`Toolbar variant="dense"` is 48px. The default toolbar is taller. `disableGutters` removes the horizontal padding when you are supplying your own `px`.

## What the bar contains

Left: a menu button that only shows on a phone (`display: { sm: 'none' }` on the button, because the sidebar is permanent from `sm` up).

Center or next: the product name, then flexible space (`flexGrow: 1` or an empty `Box` with `flex: 1`).

Right: status, clock, account. Wrap items that must not wrap in `flexShrink: 0`. Give the middle a `minWidth: 0` so a long scenario name ellipsizes.

```jsx
<Box sx={{ flex: 1, minWidth: 0, display: { xs: 'none', lg: 'flex' } }}>
  <ScenarioContext />
</Box>
```

That is the pattern in `src/shared/ui/TopBar.jsx`.

## Links in the bar

```jsx
import { Link as RouterLink } from 'react-router-dom'
import { Button } from '@mui/material'

<Button component={RouterLink} to="/" color="inherit">Picture</Button>
```

`href` on `Button` reloads the page. `component={RouterLink}` stays inside the app.

## A second row

Tabs belong under the toolbar, inside the same header, not in a second `AppBar`.

```jsx
<AppBar position="static" color="default" elevation={0}>
  <Toolbar variant="dense">{/* title */}</Toolbar>
  <Tabs value={tab} onChange={(_, next) => setTab(next)} textColor="inherit" indicatorColor="primary">
    <Tab label="Map" value="map" />
    <Tab label="Plan" value="plan" />
  </Tabs>
</AppBar>
```

See [tabs](16-tabs-and-steps.md).

## Fixed bar and the map

If you change the shell bar to `position="fixed"`, add a `Toolbar` spacer as the first child of the column under it, or give the column `padding-top` equal to the bar. Forgetting the spacer hides the top of the map under the bar. `position="static"` avoids that, and it is what the four layouts use.
