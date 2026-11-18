# 5. Data, Zustand, TanStack Query, and MUI

Three ways state lives in this app:

| Store | Holds | Survives refresh? |
| --- | --- | --- |
| `useState` in a component | One dialog, one field | No |
| Zustand `useSessionStore` | Who is signed in, clock, phase | The user id only, via `sessionStorage` |
| Zustand `useDirectoryStore` | Workbench snapshot, draw tool, open dialogs | No. Reloaded from the API client after sign-in |
| TanStack Query | Login context, and the login mutation | No. `gcTime` is 5 minutes in memory |

Do not add `persist` from Zustand. Exercise data must not be copied into `localStorage`. The two `sessionStorage` keys are written by `sessionKey.js` and nowhere else.

## Zustand

The store is created once, at module scope.

```js
import { create } from 'zustand'

export const useSessionStore = create((set, get) => ({
  session: null,
  ready: false,
  signIn: (session) => set({ session, ready: true }),
  signOut: () => set({ session: null }),
  toggle: () => set({ ready: !get().ready }),
}))
```

`set` merges the object into the state. `set({ session })` does not wipe `ready` unless you pass `ready`. `get()` is the current state inside an action. Do not call a hook inside `create`.

Read the smallest piece you can:

```jsx
const signIn = useSessionStore((state) => state.signIn)
const userId = useSessionStore((state) => state.session?.profile?.id)
```

Each selector runs on every store update. The component re-renders only when the selected value fails `Object.is` against the previous one.

This re-renders forever when `data` is null, because `|| []` allocates a new array every read:

```jsx
useDirectoryStore((state) => state.data?.alerts || [])
```

Write:

```jsx
import { EMPTY_LIST, EMPTY_OBJECT } from '../../shared/lib/empty'

useDirectoryStore((state) => state.data?.alerts ?? EMPTY_LIST)
useDirectoryStore((state) => state.data?.opacity ?? EMPTY_OBJECT)
```

`EMPTY_LIST` is one module-level array. Do not mutate it. Do not `.push` onto it. If you need a derived array, select the raw list and filter it while rendering, or select with `useShallow` only when you truly return a new object and understand the comparison.

Returning an object from a selector (`state => ({ a: state.a, b: state.b })`) is a new object every time, so the component re-renders every time. Select twice, or one stable field.

Actions can be `async`. `load` and `run` are. They `await` the API, then `set`. Components do not `try/catch` around `load` unless they need to. `DirectoryGate` does, because a failed load should not be silent beyond the toast.

`useDirectoryStore.getState()` reads outside React. `run` uses that to reach the toast store. Do not call `getState` during render as a substitute for a selector. It will not subscribe.

`useCommit` is the only way a panel should change directory data:

```jsx
const commit = useCommit()
commit((userId) => api.setFlag(userId, 'featureTable', false))
  .then(() => setOpen(false))
  .catch(() => {})
```

`work` receives the signed-in id. `run` applies the returned snapshot, toasts `error.message`, and rethrows. The empty `.catch` marks the rejection as handled so the console does not also report an unhandled promise. The toast is the message.

If your function returns nothing, `apply` will set `data` to `undefined`. Every directory function that changes data returns the full snapshot.

## TanStack Query 5

The client is `src/app/queryClient.js`.

```js
new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      gcTime: 5 * 60 * 1000,
    },
  },
})
```

`QueryClientProvider` is in `App.jsx`. A `useQuery` outside that provider throws.

Login is the pattern:

```jsx
const context = useQuery({
  queryKey: ['login-context'],
  queryFn: getLoginContext,
})

if (context.isPending) return <LoadingState label="Opening GIS Warplan" />
if (context.isError) return <ErrorState message={context.error.message} onRetry={() => context.refetch()} />
const data = context.data
```

| Field | Meaning in v5 |
| --- | --- |
| `isPending` | No data yet |
| `isError` | The function threw |
| `isSuccess` | `data` is set |
| `error` | The thrown value |
| `refetch` | Run it again |
| `data` | The resolved value |

`queryKey` identifies the cache. `['login-context']` and `['login-context', userId]` are different entries. Put every variable the function closes over into the key.

`queryFn` receives `{ queryKey, signal }`. Pass `signal` to `fetch` if you add HTTP later, so a cancelled query aborts. The API functions ignore it.

```jsx
const attempt = useMutation({
  mutationFn: login,
  onSuccess: (session) => {
    signIn(session)
    navigate('/')
  },
})

attempt.mutate({ userId, password })
```

`mutationFn` gets the value you passed to `mutate`. `isPending` is true while it runs. `onError` is optional. Login renders `attempt.error` in the form instead.

Do not put the workbench in React Query and also in Zustand. One cache. The workbench is Zustand because OpenLayers and many panels read it imperatively and on a timer. A query that refetches on an interval would fight the drawing tools the same way an unconditional `revision` bump does.

`queryClient.invalidateQueries({ queryKey: ['login-context'] })` marks a query stale and refetches if something is mounted. You do not need it for the directory store.

## Zod, at the boundary

`client.js` parses login context and the session with Zod before the UI sees them. A bad shape becomes `directory.unreadable` and an `ApiError`. Screens trust the parsed object.

```js
const sessionSchema = z.object({
  profile: z.object({ id: z.string() }),
})

sessionSchema.parse(value)        // returns the value, or throws
sessionSchema.safeParse(value)    // { success: true, data } or { success: false, error }
```

`.min(1)` on an array rejects `[]`. A field not listed in `z.object` is stripped on parse, in the default Zod object behaviour. Do not expect an extra property to survive `parse`.

Keep schemas next to the function that fetches. Do not import Zod from a panel.

## MUI 9

`ThemeBridge` builds a theme with `createAppTheme` and wraps the tree in `ThemeProvider` and `CssBaseline`. Components read colours from the theme. Do not hard-code `#fff` on text if the theme can be light or dark.

```jsx
<Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, gap: 1, p: 2 }}>
  <Typography variant="body2" color="text.secondary" sx={{ display: 'block' }}>
    Scenario
  </Typography>
  <Button variant="contained" onClick={save}>Save</Button>
</Box>
```

`sx` is a superset of CSS. Spacing numbers are multiples of the theme spacing (8px by default): `p: 2` is 16px. `gap: 1` is 8px. `color: 'text.secondary'` and `bgcolor: 'background.paper'` refer to the palette.

| Prop | Meaning |
| --- | --- |
| `flex: 1` | Grow into leftover space |
| `minHeight: 0` | Allow a flex child to shrink so the map can have a height |
| `minWidth: 0` | Allow text to ellipsis instead of blowing out the row |
| `display: 'flex'` | Flex formatting context |

Breakpoints inside `sx`:

```jsx
sx={{ width: { xs: '100%', sm: 300 } }}
```

`useMediaQuery(theme.breakpoints.down('sm'))` is how the shells switch to the phone column. `sm` is 600px in the default theme.

### Components you will reuse

| Component | Use |
| --- | --- |
| `Box` | Layout. Prefer this to a `div` so `sx` works. |
| `Stack` | Column or row with `spacing`. `direction="row"`. |
| `Typography` | Text. `variant` is `body2`, `caption`, `h6`, not a custom size, unless you pass `sx`. |
| `Button` | Actions. `variant="contained"` or `"text"`. |
| `IconButton` | Icon with `aria-label`. |
| `TextField` | Label, input, helper text. |
| `Dialog` and its title, content, actions | A modal form. |
| `Menu` / `MenuItem` | A menu anchored to an element. |
| `List` / `ListItemButton` / `ListItemText` | The rails and the feature rows. |
| `Slider` | Opacity and scrub. Commit on `onChangeCommitted`. |
| `Alert` | A sentence about a failure. |
| `Tooltip` | Extra words on an icon. |

`ListItemText` in MUI 9 takes typography options on `slotProps`, not `primaryTypographyProps`:

```jsx
<ListItemText
  primary={filter.label}
  slotProps={{ primary: { variant: 'body2', color: 'text.primary' } }}
/>
```

### Theme rules learned in this project

- Do not set `color` inside a typography variant in `createTheme`. It fights the palette and has produced unreadable text. Set colour on the palette and on the component.
- `MuiIconButton` style overrides must not force `color`. A forced colour hides the theme contrast.
- This version of `Typography` has no `display` prop. A block line is `sx={{ display: 'block' }}`, or `component="div"`.
- Action text must stay readable on the action colour. The catalog is Pine, Cobalt, Amber, Graphite, Lagoon, Iris, Copper, Moss, Crimson, and High contrast. Each day and each night is its own file under `src/shared/theme/palette/`. `src/shared/theme/palettes.js` only gathers them. Each row carries its own type, text, and status colours. The module throws if body, caption, action, or status text falls below 4.5 to 1.
- Change a colour in that catalog, not in a screen and not in `fixtures.js`.

### Icons

```jsx
import LayersOutlinedIcon from '@mui/icons-material/LayersOutlined'

<LayersOutlinedIcon fontSize="small" />
```

The name in the import path must exist. `PlayCircleOutline` does not. `PlayCircleOutlined` does. The build fails on a bad name. Add the component to `src/shared/ui/navIcons.jsx` if a menu item needs a new `icon` string.

## OpenLayers from React

OpenLayers is not a set of React components here. `leaflet` and `react-leaflet` are installed and unused. Do not start a second map with them.

The pattern in `SituationMap` and `MapWorkbench`:

1. Render a `Box` with `ref={targetRef}` and a real height (`position: 'absolute'`, `inset: 0` inside a parent that has height).
2. In `useEffect`, construct `new Map({ target: targetRef.current, ... })`.
3. Return a cleanup that removes the map (`map.setTarget(null)` and drop listeners).
4. Keep the map instance in a ref, not in `useState`. Putting it in state re-renders the tree for every map mutation and recreates interactions.
5. Other effects depend on a small key (layer ids, opacity, `revision`) and call `map.getLayers()` or `layer.setOpacity`.
6. Drawing uses `Draw`, `Modify`, and `Select` from `ol/interaction`. Listen with `modify.on('modifyend', ...)`, not `map.on('modifyend')`.
7. Store geometries as GeoJSON in EPSG:4326. The view is EPSG:3857. Convert at the boundary.

Do not set `crossOrigin: 'anonymous'` on the WMS source. This GeoServer does not send the header that request requires, and the tiles then fail.

A parent with no height makes the map a blank strip. The chain from `Shell` to `MapStage` is `height: '100%'` and `flex: 1` with `minHeight: 0`. `PictureWorkspace` stays `position: 'relative'` in normal flow for every variant, including overlay.

## Day.js

```js
import dayjs from 'dayjs'
dayjs(session.clockStart).valueOf()   // epoch milliseconds
dayjs(epochMs).format('HH:mm:ss')
```

The exercise clock is a number (`epochMs`) in the session store. Format it at the edge. Do not store a Day.js object in Zustand. It is mutable and it does not compare cleanly.

## What does not belong in a component

- A copy of the fixture users.
- `fetch('http://127.0.0.1:8080/...')` for features. Tiles are the map’s job. Features come from `client.js`.
- A new `create()` store for one boolean the parent could hold. A store is for state that many distant components share, or that must be read outside render.
