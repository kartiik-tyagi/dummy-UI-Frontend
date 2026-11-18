# 6. Vite, debugging, and recipes

## What Vite does

`index.html` loads `/src/main.jsx` as a module. Vite serves the source as native ES modules and transforms JSX. There is no separate webpack step in development.

```text
npm run dev       http://127.0.0.1:5173   strict port
npm run build     writes dist/
npm run preview   http://127.0.0.1:4173   serves dist/
```

`host` is `127.0.0.1`, so another machine on the network cannot open it. That is intentional.

Save a file and the browser updates. If the Vite log says `optimized dependencies changed. reloading`, the tab does a full reload. That happens the first time a new package import appears.

`strictPort: true` means a busy port is a failure, not a silent jump to 5174. Free the port or stop the other `npm run dev`.

The React plugin is `@vitejs/plugin-react`. You do not configure JSX yourself. A file that contains JSX must be `.jsx`. A `.js` file with JSX fails the transform.

## Imports Vite will not invent

`import x from './Missing.jsx'` fails in the terminal and as a red overlay. Relative paths are from the file. `Panels.jsx` lives in `src/shared/ui/workbench/`, one folder deeper than the other UI files. From that file the API client is `../../../shared/api/client`, a sibling dialog is `../ConfirmDialog`, and the empty lists are `../../lib/empty`. One `../` too few looks inside `ui/` and fails.

A package name (`react`, `ol/Map`, `@mui/material`) must exist in `node_modules`. `package.json` does not list `ol`, `zod`, or `@tanstack/react-query` even though `src/` imports them. They are already in this folder’s `node_modules`. Copy `node_modules` with the project when you work offline. The install line, if you have a registry, is in [run and branches](../01-run-and-branches.md).

## The blank page

`main.jsx` mounts into `#root` with `createRoot`. There is no error boundary. A throw during render replaces the page with white. The message is in the console.

| Console text | Cause | Fix |
| --- | --- | --- |
| Maximum update depth exceeded | `setState` during render, or a Zustand selector that returns a new array or object every time | Select `?? EMPTY_LIST`. Move the set into an event or an effect. |
| Cannot read properties of null (reading `features`) | Render assumed `data` was loaded | Check `ready` and render `LoadingState` until the snapshot exists. |
| Invalid hook call | A hook under an `if`, or two copies of React | Hooks at the top. One `react` in `node_modules`. |
| Could not resolve | Path or package or icon name | Fix the import. `PlayCircleOutlined`, not `PlayCircleOutline`. |
| Target container is not a DOM element | `getElementById('root')` returned null | `index.html` must contain `<div id="root"></div>` before the script. |
| You are calling React from a second copy | Module duplicated | Do not `import()` the store from the browser console. It is a different instance. |

`StrictMode` runs effects twice in development: setup, cleanup, setup. A subscription that is not cancelled in the cleanup stacks. Production does not double-invoke. If a bug only exists in `npm run dev`, look at the cleanup before you look at the server.

## Reading a component that “does nothing”

1. Is the component mounted? A route that redirected, or a panel id that is not the open one, does not run the click handler.
2. Is the button’s `onClick` a function? `onClick={save()}` runs during render.
3. Did the handler return early? `if (!userId) return`.
4. Did the API throw? The toast is the message. The console has `[gis-warplan]` and the level `warn` or `error`.
5. Did `apply` ignore the snapshot because `JSON.stringify` matched the previous one? The UI will not re-render. That is correct when nothing changed. It is a bug if your function mutated an object inside the old snapshot and returned the same tree.

Log with the project logger, not a permanent `console.log`:

```js
import { logger } from '../shared/lib/logger'
logger.info('notes.saved', { userId })
logger.warn('notes.rejected', { code: 'VALIDATION' })
```

Never put a password or a token in the fields.

## React APIs this app does not use

You can use them in new code. The versions match React 19. None of these are required to extend GIS Warplan.

### `useReducer`

For a handful of fields that change together, when `useState` gets noisy.

```jsx
function reducer(state, action) {
  if (action.type === 'rename') return { ...state, name: action.name }
  return state
}
const [state, dispatch] = useReducer(reducer, { name: '' })
dispatch({ type: 'rename', name: 'Holding area' })
```

### `useMemo` and `useCallback`

```jsx
const visible = useMemo(() => features.filter((feature) => feature.teamId === teamId), [features, teamId])
const onClose = useCallback(() => setOpen(false), [])
```

Use them when a child is wrapped in `memo` and would otherwise re-render on a new function, or when the calculation is expensive enough to measure. Filtering a few dozen features during render is fine without `useMemo`. A new function in an effect dependency is the case that matters: either wrap it, or do not list it and read it from a ref.

### `useId`

```jsx
const id = useId()
<label htmlFor={id}>Name</label>
<input id={id} />
```

Stable across the double render in `StrictMode`. Do not use it as a list key. It is not stable across the server and client, and this app has no server render.

### `useLayoutEffect`

Same shape as `useEffect`, but it runs after DOM updates and before the browser paints. Use it to measure an element you are about to position. Drawing the map does not need it. Prefer `useEffect` unless you can see a flicker.

### `useTransition` and `useDeferredValue`

```jsx
const [isPending, startTransition] = useTransition()
startTransition(() => setQuery(value))

const deferred = useDeferredValue(query)
```

Marks an update as non-urgent so typing stays responsive. The feature table is small. You do not need this until a list is large enough to notice.

### `memo`

```jsx
const Row = memo(function Row({ feature, onSelect }) {
  return <ListItemButton onClick={() => onSelect(feature.id)}>{feature.name}</ListItemButton>
})
```

`memo` skips render when props are shallow-equal. It does nothing if the parent passes `onSelect={() => ...}`, because that function is new every time.

### `lazy` and `Suspense`

```jsx
const NotesPage = lazy(() => import('./NotesPage'))

<Suspense fallback={<LoadingState label="Opening notes" />}>
  <NotesPage />
</Suspense>
```

The import must be a real `import()`. `Suspense` shows `fallback` until the module loads. A throw that is not a promise is not caught by `Suspense`. It still blanks the page without an error boundary.

### `use` (React 19)

`use(SomeContext)` reads context and may sit inside an `if`. `use(promise)` suspends, the way `Suspense` expects. This tree does not suspend on data. Do not wrap the directory load in `use` unless you also add a boundary and a fallback. `DirectoryGate` already has a loading state.

### Form actions (React 19)

```jsx
function saveAction(previous, formData) {
  const name = String(formData.get('name') || '')
  if (!name.trim()) return { error: 'Enter a name.' }
  return { error: '' }
}

const [state, formAction, isPending] = useActionState(saveAction, { error: '' })

<form action={formAction}>
  <input name="name" />
  <button disabled={isPending}>Save</button>
  {state.error ? <p>{state.error}</p> : null}
</form>
```

`useFormStatus()` reads `{ pending }` and must be called in a child of the `<form>`, not in the same component that renders the form.

This app posts through `useCommit` and `useMutation`, not form actions. Stay with those for directory writes so the toast and the snapshot stay on one path.

### `useOptimistic`

```jsx
const [optimistic, addOptimistic] = useOptimistic(features, (current, next) => [...current, next])
```

Shows a row before the request finishes, then reconciles. Easy to get wrong with the directory snapshot, which replaces the whole list on the next tick. Do not optimistic-update the map features.

### Portals

```jsx
import { createPortal } from 'react-dom'
createPortal(<div>Above the map</div>, document.body)
```

MUI `Dialog`, `Menu`, and `Popover` already portal to the document body. A menu that is clipped is usually `overflow: hidden` on a parent, and the fix is to let MUI portal it, which it does by default.

### Error boundaries

Still a class. Function components cannot catch a child’s render throw.

```jsx
import { Component } from 'react'

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error(error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return <p>{this.state.error.message}</p>
    }
    return this.props.children
  }
}
```

Put it inside `App`, around `Shell`, if you add one. It will not catch errors in event handlers, in `setTimeout`, or in async code. Those still need `try/catch` or `.catch`.

### `useSyncExternalStore`

Zustand is implemented on this. You do not call it yourself unless you are wrapping a browser API:

```jsx
function subscribe(onChange) {
  window.addEventListener('online', onChange)
  return () => window.removeEventListener('online', onChange)
}
const online = useSyncExternalStore(subscribe, () => navigator.onLine, () => true)
```

The third function is the server snapshot. This app is client-only. Returning a constant there is enough.

## Recipes

### A presentational component

1. Add `src/shared/ui/Hint.jsx`.
2. Export a function that takes props and returns MUI.
3. Import it from the panel that needs it.

```jsx
export function Hint({ children }) {
  return (
    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
      {children}
    </Typography>
  )
}
```

No store, no effect.

### Local UI state

```jsx
const [open, setOpen] = useState(false)
<Button onClick={() => setOpen(true)}>Details</Button>
<Collapse in={open}>...</Collapse>
```

If a sibling that is not a child must see `open`, move the state to the parent or to the directory store. Do not duplicate it.

### A click that changes server data

```jsx
const commit = useCommit()
<Button onClick={() => commit((userId) => api.deleteFeature(userId, id)).catch(() => {})}>
  Delete
</Button>
```

The function you pass to `api` must already exist on `client.js` and must return a snapshot. Adding the function is [recipe 3 in the project recipes](../07-recipes.md).

### Load something when an id changes

```jsx
useEffect(() => {
  let cancelled = false
  api.loadWorkbench(userId).then((data) => {
    if (!cancelled) setData(data)
  })
  return () => { cancelled = true }
}, [userId])
```

Prefer the existing directory `load` for the workbench. Use this shape for a new request. The `cancelled` flag ignores a response that belongs to the previous id. `StrictMode` will call the cleanup, which is what you want.

### A list with a selection

```jsx
const [selectedId, setSelectedId] = useState(null)
{rows.map((row) => (
  <ListItemButton key={row.id} selected={row.id === selectedId} onClick={() => setSelectedId(row.id)}>
    {row.name}
  </ListItemButton>
))}
```

`selected` on `ListItemButton` is the MUI selected style. It is not the HTML `selected` attribute.

### Stop a child updating forever

The effect depends on a value it also sets.

```jsx
useEffect(() => {
  setPhase(phaseId)
}, [phaseId, setPhase])
```

If `setPhase` always writes a new object, this loops. Write a primitive, or skip the set when the value is already correct:

```jsx
set((state) => (state.phaseId === id ? state : { phaseId: id }))
```

Zustand treats a returned state that is the same reference as “no change” when you use the function form and return the previous state.

### Share a component across layouts

Put it under `src/shared/` or `src/features/` or `src/components/`. Leave `src/shell/Shell.jsx` alone unless the frame itself changes. Copy those folders onto `layout-2`, `layout-3`, and `layout-4` with the command in [the cheat sheet](../09-cheat-sheet.md). Do not copy `Shell.jsx`.

## Build before you call it done

`npm run dev` can be serving a cached module. `npm run build` resolves every import from scratch. A non-zero exit is a broken app. The warning about a chunk larger than 500 kB is the map library. It is not a failure.
