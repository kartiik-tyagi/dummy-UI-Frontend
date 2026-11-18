# 7. React cheat sheet

React 19. Function components. JSX in `.jsx` files. Hooks only at the top level, in the same order every render.

## Component

```jsx
export function Hint({ label = 'Note', children }) {
  return <p className="hint">{label}: {children}</p>
}

<Hint label="Zone">Holding area</Hint>
```

| JSX | Remember |
| --- | --- |
| `className` | not `class` |
| `htmlFor` | not `for` |
| `{value}` | JavaScript inside markup |
| `onClick={fn}` | do not call `fn` in the braces |
| `style={{ color }}` | object, not a string. Prefer MUI `sx` |
| `null` | renders nothing |
| `{cond ? <A /> : null}` | conditional |
| `{list.map((item) => <Row key={item.id} item={item} />)}` | stable key |

## State

```jsx
const [name, setName] = useState('')
setName('North')
setName((current) => current.trim())
```

Replace objects. Do not mutate them and expect a render.

```jsx
setForm({ ...form, name: 'North' })
```

## Events

```jsx
<Button onClick={() => setOpen(true)}>Open</Button>
<TextField value={name} onChange={(event) => setName(event.target.value)} />
<form onSubmit={(event) => { event.preventDefault() }} />
```

MUI `Slider` `onChangeCommitted={(event, value) => ...}`.

## Effects and refs

```jsx
useEffect(() => {
  const map = new Map({ target: el.current })
  return () => map.setTarget(null)
}, [])

const el = useRef(null)
const latest = useRef(onPointer)
latest.current = onPointer
```

| Deps | When it runs |
| --- | --- |
| none written | every commit. Do not. |
| `[]` | mount, cleanup on unmount |
| `[userId]` | mount and when `userId` changes |

Development `StrictMode` runs setup, cleanup, setup once.

## Hooks

| Hook | One line |
| --- | --- |
| `useState` | Value that survives renders and triggers a render when set |
| `useReducer` | `useState` when the next value is a switch on an action |
| `useEffect` | After paint. Subscribe, timer, map. Always clean up. |
| `useLayoutEffect` | Like an effect, before paint. Measuring. |
| `useRef` | Mutable box. Does not render. DOM node or instance. |
| `useContext` | Read a context. Prefer Zustand in this app. |
| `useMemo` | Cache a calculation. Skip it until you measure. |
| `useCallback` | Cache a function for a memoized child or an effect. |
| `useId` | Stable id for a label. Not a list key. |
| `useTransition` | Mark a setState as non-urgent. |
| `useDeferredValue` | Lag a copy of a fast-changing value. |
| `useImperativeHandle` | Custom value exposed via `ref`. Rare. |
| `useSyncExternalStore` | Subscribe to something outside React. Zustand uses it. |
| `useActionState` | React 19 form action. This app uses `useCommit` instead. |
| `useOptimistic` | Show a guessed next list. Easy to fight the snapshot. |
| `useFormStatus` | `{ pending }` from inside a child of `<form action>`. |
| `use` | React 19. Read context or unwrap a promise. May be conditional. |

`memo(Component)` skips render when props are shallow-equal.

`lazy(() => import('./Page'))` plus `<Suspense fallback={...}>` splits a module.

## Context

```jsx
const ChromeContext = createContext(null)
<ChromeContext.Provider value={chrome}>{children}</ChromeContext.Provider>
const chrome = useContext(ChromeContext)
```

A new `value={{ ... }}` every render re-renders every consumer.

## Error boundary

Class component, `static getDerivedStateFromError`, optional `componentDidCatch`. This app does not include one. A render throw blanks `#root`. Event-handler errors are not caught by it. Use `.catch`.

## Router 7, as wired in `App.jsx`

```jsx
<BrowserRouter>
  <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/" element={<Picture />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
</BrowserRouter>

const navigate = useNavigate()
navigate('/')
navigate('/login', { replace: true })

const { featureId } = useParams()          // path="/features/:featureId"
const [params, setParams] = useSearchParams()
params.get('layer')
```

MUI link that routes: `<Link component={RouterLink} to="/notes">`.

Nested child outlet: parent renders `<Outlet />`. Not used today.

## Zustand 5

```jsx
export const useBox = create((set, get) => ({
  n: 0,
  inc: () => set({ n: get().n + 1 }),
}))

const n = useBox((state) => state.n)
useBox.getState().inc()
```

Selector must return a stable reference. `?? EMPTY_LIST`, never `|| []`.

```js
export const EMPTY_LIST = []
export const EMPTY_OBJECT = {}
```

```jsx
const commit = useCommit()
commit((userId) => api.setFlag(userId, 'featureTable', true))
  .then(() => {})
  .catch(() => {})
```

## TanStack Query 5

```jsx
const q = useQuery({ queryKey: ['login-context'], queryFn: getLoginContext })
q.isPending
q.isError
q.data
q.refetch()

const m = useMutation({ mutationFn: login, onSuccess: (session) => signIn(session) })
m.mutate({ userId, password })
m.isPending
```

Defaults in `queryClient.js`: `retry: 1`, `refetchOnWindowFocus: false`, `gcTime: 5 * 60 * 1000`.

## MUI 9

```jsx
<Box sx={{ display: 'flex', flex: 1, minHeight: 0, gap: 1, p: 2, color: 'text.primary' }}>
  <Typography variant="body2" color="text.secondary" sx={{ display: 'block' }}>Label</Typography>
  <Button variant="contained">Save</Button>
</Box>

<ListItemText primary={label} slotProps={{ primary: { variant: 'body2', color: 'text.primary' } }} />
```

`useMediaQuery(theme.breakpoints.down('sm'))` is the phone split.

Do not set `color` on typography variants in the theme. Do not force `color` on `MuiIconButton`. `display="block"` on `Typography` is not CSS. Use `sx`.

## OpenLayers

Map instance in a ref. Create and destroy in an effect. `modify.on('modifyend')`. No `crossOrigin: 'anonymous'` on this WMS. Geometries stored as GeoJSON, EPSG:4326. View is EPSG:3857.

## Files

| Task | File |
| --- | --- |
| Mount | `src/main.jsx` |
| Providers | `src/app/App.jsx` |
| Routes | `src/shell/Shell.jsx` on the current branch |
| Session | `src/features/session/useSessionStore.js` |
| Workbench | `src/features/directory/useDirectoryStore.js` |
| HTTP-shaped API | `src/shared/api/client.js` |
| API stand-in behaviour | `src/shared/api/directory.js` and `fixtures.js` |
| Theme | `src/shared/theme/createAppTheme.js` |
| Empty selectors | `src/shared/lib/empty.js` |

## Rules that prevent the bugs this repo already hit

- Screens import `src/shared/api/client.js` only.
- Selectors use `EMPTY_LIST` and `EMPTY_OBJECT`.
- `apply` ignores a snapshot whose JSON is unchanged, or drawing breaks.
- Dialogs close in `.then`, and `.catch(() => {})` so the toast is the only report.
- Shared edits are copied to all four branches. `Shell.jsx` and `meta.js` are not part of that copy.
- `public/config/*.json` is not live.
