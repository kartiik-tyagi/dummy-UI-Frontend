# 9. Hooks

A hook is a function React calls to attach state, a subscription, or a ref to one component. The name starts with `use`. React matches each call to the previous render by position, not by name. The rules follow from that.

## Rules

1. Call hooks at the top level of a component or of another hook.
2. Call them in the same order every render. No hook inside `if`, `for`, or after a `return` that sometimes runs.
3. Only call them from React functions. A plain helper, an event handler, and a Zustand `create` callback are not React functions. `useDirectoryStore.getState()` is how non-React code reads a store.

```jsx
if (open) {
  const commit = useCommit() // illegal: skipped when open is false
}
```

Put the hook first. Branch afterwards.

A custom hook is just a function that calls hooks, so the same rules apply inside it.

```jsx
export function useCommit() {
  const userId = useSessionStore((state) => state.session?.profile?.id)
  const run = useDirectoryStore((state) => state.run)
  return (work) => run(() => work(userId))
}
```

## `useState`

```jsx
const [name, setName] = useState('')
const [box, setBox] = useState(() => ({ name: '', teamId: 'blue' }))
```

The argument is the initial value, used on the first render only. Pass a function when the initial value is expensive or must be computed once. React calls that function once. It does not call it on later renders.

`setName('North')` schedules a render. If the next value is `Object.is` to the current one, React skips the render of that component. Setting the same string twice is a no-op. Setting a new object is never a no-op, even when the fields match, because the reference changed.

When the next value depends on the previous one, use the function form. Two updates in one handler both see the latest value:

```jsx
setCount((n) => n + 1)
setCount((n) => n + 1)
```

That ends at 2. `setCount(count + 1)` twice in one handler ends at 1, because both read the same snapshot.

Replace objects and arrays. Do not `push` and then `setList(list)`.

```jsx
setList((current) => [...current, row])
setForm((current) => ({ ...current, name: 'North' }))
```

Lazy reset: if you need the state to start over when an id changes, set `key` on the component. Copying props into state with an effect goes stale the moment the prop changes and you forget a dependency.

## `useReducer`

Use this when the next state is a named action and several fields move together.

```jsx
function reducer(state, action) {
  if (action.type === 'rename') return { ...state, name: action.name }
  if (action.type === 'reset') return { name: '', teamId: 'blue' }
  return state
}

const [state, dispatch] = useReducer(reducer, { name: '', teamId: 'blue' })
dispatch({ type: 'rename', name: 'Holding area' })
```

The third argument, when you pass it, is an init function: `useReducer(reducer, props.seed, (seed) => ({ name: seed }))`. React calls it once.

`dispatch` is stable. It is safe in an effect dependency list. The reducer itself must be pure. Do not fetch inside it.

## `useEffect`

```jsx
useEffect(() => {
  document.title = 'GIS Warplan'
  return () => {
    document.title = 'GIS Warplan'
  }
}, [])
```

| Dependency array | Runs |
| --- | --- |
| omitted | after every committed render |
| `[]` | after the first commit, cleanup on unmount |
| `[userId]` | after the first commit, and after any commit where `userId` failed `Object.is` with the previous one |

The cleanup runs before the next effect and on unmount. In development `StrictMode` it also runs once on mount: effect, cleanup, effect. A subscription that is not returned as cleanup will be doubled.

Every value from the component that the effect reads belongs in the array. Omitting one keeps the old value. The exhaustive style is: if you would be wrong with a stale copy, list it.

Do not use an effect to:

- compute a label from state (do it while rendering)
- respond to a click (do it in the handler)
- reset a form when `key` would remount it
- copy props into state

A legitimate effect in this repo is `DirectoryGate` loading the workbench when `userId` changes, and `SituationMap` constructing the map.

Race: if `userId` changes before the request finishes, ignore the old response.

```jsx
useEffect(() => {
  let cancelled = false
  load(userId).then((data) => {
    if (!cancelled) setData(data)
  })
  return () => {
    cancelled = true
  }
}, [userId])
```

## `useLayoutEffect`

Same signature as `useEffect`. It runs after DOM updates and before the browser paints. Use it to measure a node and set state before the user sees a frame. The map does not need it. Prefer `useEffect` unless you have seen a flicker.

## `useInsertionEffect`

Same signature. It runs before layout effects. CSS-in-JS libraries use it to insert style tags before any layout read. Application code in this repo should not call it. Emotion already does.

## `useRef`

```jsx
const el = useRef(null)
const saved = useRef(false)
return <div ref={el} />
```

`.current` survives renders. Writing it does not render. On the first render `el.current` is still `null` during render. After commit it is the DOM node. MUI `Box` forwards `ref` to the DOM.

Use a ref for an OpenLayers map, a “already applied” flag, and the latest callback when an effect must not restart:

```jsx
const onPointerRef = useRef(onPointer)
onPointerRef.current = onPointer

useEffect(() => {
  function handle(event) {
    onPointerRef.current(event)
  }
  map.on('pointermove', handle)
  return () => map.un('pointermove', handle)
}, [map])
```

Do not read or write `ref.current` of a child during render to decide what to display. That value is not an input to render, so React will not update when it changes.

## `useImperativeHandle`

Exposes a custom object on a `ref` the parent holds. Rare. Prefer a normal prop callback (`onClose`). If you need it:

```jsx
useImperativeHandle(ref, () => ({ focus: () => inputRef.current?.focus() }), [])
```

The parent uses `<Field ref={fieldRef} />` and `fieldRef.current.focus()`. React 19 accepts `ref` as a prop, so the child does not need `forwardRef`.

## `useContext`

```jsx
const ChromeContext = createContext(null)

export function useChromeContext() {
  const value = useContext(ChromeContext)
  if (!value) throw new Error('useChromeContext must be inside its provider')
  return value
}
```

```jsx
<ChromeContext.Provider value={chrome}>{children}</ChromeContext.Provider>
```

`useContext(ChromeContext)` re-renders when the provider value fails `Object.is`. This app stores session and directory data in Zustand instead, because a context value would re-render every consumer. MUI’s theme is a context, and that is the right tool for it: almost everything may read colours, and the theme object changes only when the appointment changes.

`use(ChromeContext)` in React 19 reads the same context and may be called conditionally. `useContext` may not.

## `useMemo`

```jsx
const visible = useMemo(
  () => features.filter((feature) => feature.teamId === teamId),
  [features, teamId],
)
```

React caches the return value until a dependency changes. Use it when the calculation is slow enough to measure, or when a child relies on the same reference. Filtering a few dozen features during render is fine without it. A missing dependency returns a stale list and looks like a bug in the filter.

`useMemo` does not guarantee it never recomputes. React may throw the cache away. Do not put a side effect in it.

## `useCallback`

```jsx
const close = useCallback(() => setOpen(false), [])
```

It is `useMemo` for a function. The function identity stays the same until a dependency changes. Use it when the function is a dependency of an effect or a prop of a `memo` child. A click handler that is not in a dependency list does not need it. `useCommit()` returns a new function every render. Do not put that function in an effect array unless you want the effect to re-subscribe every render.

## `useId`

```jsx
const id = useId()
<label htmlFor={id}>Name</label>
<input id={id} />
```

Returns a stable string for this component position, including across the double render in `StrictMode`. MUI uses this to tie a `TextField` label to its input. Do not use the value as a list key or as a database id. It is not stable between the server and the client, and this app does not server-render.

## `useTransition`

```jsx
const [isPending, startTransition] = useTransition()

function onType(event) {
  const next = event.target.value
  setText(next)
  startTransition(() => setQuery(next))
}
```

The update inside `startTransition` is interruptible. Typing stays on the urgent update (`setText`). `isPending` is true while the slow update is rendering. You do not need this for the feature table. You would need it for a filter that walked thousands of geometries on the main thread.

`startTransition` from `'react'` is the same function without `isPending`.

## `useDeferredValue`

```jsx
const deferred = useDeferredValue(query)
const visible = filter(features, deferred)
```

`deferred` lags behind `query` when React is busy. The input stays controlled by `query`. The list uses `deferred`. Pass the deferred value down. Do not copy it into state.

## `useSyncExternalStore`

Subscribe to a store React does not own.

```jsx
function useOnline() {
  return useSyncExternalStore(
    (notify) => {
      window.addEventListener('online', notify)
      window.addEventListener('offline', notify)
      return () => {
        window.removeEventListener('online', notify)
        window.removeEventListener('offline', notify)
      }
    },
    () => navigator.onLine,
    () => true,
  )
}
```

The second function reads the client snapshot. It must return a comparable value. Returning a new object every call loops, the same way a Zustand selector does. The third function is the snapshot during server render. This app is client-only. A constant is enough.

Zustand’s `useSessionStore(selector)` is built on this hook. You do not call `useSyncExternalStore` to read the session.

## `use` (React 19)

```jsx
const theme = use(ThemeContext)
const session = use(sessionPromise)
```

With a context, it works like `useContext` and may sit inside a condition. With a promise, it suspends the component until the promise resolves. A `Suspense` boundary above shows the fallback. A rejected promise is a render error. This app loads the workbench in `DirectoryGate` with an effect and a loading state. Do not wrap that load in `use` unless you add the boundary.

## `useActionState` (React 19)

```jsx
function save(previous, formData) {
  const name = String(formData.get('name') || '').trim()
  if (!name) return { message: 'Enter a name.' }
  return { message: '' }
}

const [state, action, pending] = useActionState(save, { message: '' })

<form action={action}>
  <input name="name" />
  <button disabled={pending}>Save</button>
  <p>{state.message}</p>
</form>
```

`save` receives the previous state and the `FormData`. It returns the next state. Directory writes in this app go through `useCommit` so the snapshot and the toast stay on one path. Use `useActionState` for a form that does not touch the directory store.

## `useFormStatus` (react-dom, React 19)

```jsx
import { useFormStatus } from 'react-dom'

function Submit() {
  const { pending } = useFormStatus()
  return <button disabled={pending}>Save</button>
}
```

Call it in a component rendered **inside** the `<form>`, not in the component that renders the form. It reads the nearest parent form action. It does not see a `useCommit` click.

## `useOptimistic` (React 19)

```jsx
const [shown, add] = useOptimistic(features, (current, next) => [...current, next])

function onAdd(row) {
  startTransition(async () => {
    add(row)
    await commit((userId) => api.createFeature(userId, row))
  })
}
```

`shown` includes `row` until the transition ends, then snaps back to `features`. The directory store replaces the whole list on a 500 ms tick. An optimistic row fights that tick. Do not use it for map features. It fits a screen where you own the list and the request is the only writer.

## `useDebugValue`

```jsx
useDebugValue(userId ? 'signed-in' : 'signed-out')
```

Shows a label next to the custom hook in React DevTools. It does nothing in the running app. Optional.

## Custom hooks in this repo

| Hook | File | Holds |
| --- | --- | --- |
| `useCommit` | `src/features/directory/useDirectoryStore.js` | Signed-in id plus `run` |
| `useNavigation` | `src/features/directory/useNavigation.js` | Menu from the directory, or the session until that loads |
| `useSignedUserId` | the same file | `session.profile.id` |
| `useChrome` | `src/features/session/useChrome.js` | Which tool panel is open |
| `useSessionStore` | a Zustand hook, not a file of `useState` | Session, clock, phase |
| `useDirectoryStore` | Zustand | Workbench snapshot and draw tool |
| `useToastStore` | Zustand | The toast queue |

When you add a hook, name it `use…`, keep the rules, and put it next to the feature that owns the data. A hook that imports `fixtures.js` is in the wrong layer. Call `client.js`.

## Which hook to reach for

| You need | Hook |
| --- | --- |
| A field or a dialog flag | `useState` |
| Several fields and named actions | `useReducer` |
| A timer, a title, a map, a subscription | `useEffect` |
| Measure before paint | `useLayoutEffect` |
| A DOM node or a mutable flag | `useRef` |
| Theme, or a value for a whole subtree | `useContext` or MUI `useTheme` |
| A cached calculation or function | `useMemo` / `useCallback`, after you have a reason |
| An id for a label | `useId` |
| Keep typing smooth while a list catches up | `useTransition` or `useDeferredValue` |
| `navigator.onLine` or a similar browser store | `useSyncExternalStore` |
| Session, workbench, toasts | the Zustand hooks already in `src/features` |
| A directory mutation | `useCommit` |
