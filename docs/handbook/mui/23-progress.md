# Progress, Skeleton, Backdrop

## Circular progress

A spinner. `LoadingState` in `src/shared/ui/LoadingState.jsx` is the full-panel form. Use it for “Opening GIS Warplan” and “Restoring the session”.

```jsx
import { CircularProgress } from '@mui/material'

<CircularProgress size={28} />
<CircularProgress size={18} color="inherit" />
```

`color="inherit"` inside a `Button` so the spinner matches the button text. A button that is saving:

```jsx
<Button variant="contained" disabled={saving} onClick={save}>
  {saving ? <CircularProgress size={18} color="inherit" /> : 'Save'}
</Button>
```

There is no `LoadingButton` in this install.

## Linear progress

A bar across the top of a panel or a grid.

```jsx
import { LinearProgress } from '@mui/material'

<LinearProgress />
<LinearProgress variant="determinate" value={40} />
```

The default is indeterminate: it animates forever. `determinate` needs `value` from 0 to 100. Use determinate for a replay scrub only if the slider is the wrong control. A known position is a `Slider`. An unknown wait is the indeterminate bar.

`SessionGate` blocks the shell with a loading state until `ready`. A linear bar plus a half-rendered shell flashes the empty menu. Block the shell.

## Skeleton

A placeholder the shape of the content that is about to appear.

```jsx
import { Skeleton } from '@mui/material'

<Skeleton variant="text" width="60%" />
<Skeleton variant="rectangular" height={120} />
<Skeleton variant="circular" width={32} height={32} />
```

Use it when the layout is known and the data is late: a list of three text skeletons. Do not use it for the map. An empty map frame with the real loading sentence is clearer than a grey rectangle that looks like a broken tile.

`animation="wave"` or `"pulse"` (default). `animation={false}` when motion is a problem.

## Backdrop

Covers the parent, or the screen, while a modal task runs.

```jsx
import { Backdrop, CircularProgress } from '@mui/material'

<Backdrop open={saving} sx={{ position: 'absolute', color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}>
  <CircularProgress color="inherit" />
</Backdrop>
```

`position: 'absolute'` covers the nearest positioned parent. The default backdrop is `position: fixed` over the viewport. An absolute backdrop is the one you want inside a panel. The parent needs `position: 'relative'`.

Prefer a disabled button and a toast over a backdrop that blocks the whole picture for a single save. A backdrop is for a step that must finish before any other click is safe.

`zIndex` values in the theme: mobile stepper 1000, fab 1050, app bar 1100, drawer 1200, modal 1300, snackbar 1400, tooltip 1500. A backdrop over a drawer and under a modal is `theme.zIndex.drawer + 1`. A backdrop over the whole app can use `theme.zIndex.modal`.

## What “loading” already means here

| Moment | UI |
| --- | --- |
| Login context request | `LoadingState` “Opening GIS Warplan” |
| Session restore | `LoadingState` “Restoring the session” |
| Workbench request | The shell can show, the panels wait on `ready` |
| A mutation | The button disables, the toast reports failure |

Do not add a fourth spinner for the same wait.
