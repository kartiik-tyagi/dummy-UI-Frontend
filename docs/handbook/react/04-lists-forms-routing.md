# 4. Lists, forms, and routing

## Rendering a list

`map` turns data into elements. React needs a `key` on the outermost element you return, and the key must be stable for that row.

```jsx
{features.map((feature) => (
  <ListItemButton key={feature.id} selected={feature.id === selectedId} onClick={() => select(feature.id)}>
    <ListItemText primary={feature.name} />
  </ListItemButton>
))}
```

| Key | Result |
| --- | --- |
| `feature.id` | React keeps the row when the list reorders. Use this. |
| The array index | Typing in row 2 can show row 3’s state after a delete. Use it only for a list that never changes order or identity. |
| `Math.random()` | New key every render. The row remounts and loses state. Never. |
| Missing key | React warns. It may reuse the wrong DOM node. |

`key` is not passed into your component as a prop. If the child needs the id, pass it again: `id={feature.id}`.

An empty array renders nothing. Show a sentence when that would look broken:

```jsx
{features.length === 0 ? <EmptyState label="No features on this picture." /> : features.map(/* ... */)}
```

Do not build the list with `|| []` inside a Zustand selector. That is a new array every time and can loop. See `EMPTY_LIST` in [data](05-data-zustand-query-mui.md).

## Two pieces of UI from one row

Return a fragment with the key on the fragment:

```jsx
{items.map((item) => (
  <Fragment key={item.id}>
    <ListItemButton>{item.label}</ListItemButton>
    <Slider />
  </Fragment>
))}
```

`<>...</>` cannot take a `key`. Import `Fragment` from `'react'` when you need one. A `Box` around the pair also works and is what `FilterList` does.

## Controlled fields

The React state is the value. The DOM shows that value. An `onChange` writes the state.

```jsx
const [name, setName] = useState('')

<TextField
  label="Name"
  value={name}
  onChange={(event) => setName(event.target.value)}
  fullWidth
/>
```

`value` without `onChange` is read-only. `defaultValue` without `value` is uncontrolled: the DOM keeps the text, React does not. Do not switch one field from `value` to `defaultValue` while it is mounted. Pick one.

A `<select>` and MUI `Select` follow the same rule: `value` plus `onChange`.

```jsx
<Select label="Team" value={teamId} onChange={(event) => setTeamId(event.target.value)}>
  {teams.map((team) => (
    <MenuItem key={team.id} value={team.id}>{team.name}</MenuItem>
  ))}
</Select>
```

If `teamId` is `''` and no `MenuItem` has that value, MUI warns. Either include an empty item or do not render the select until `teamId` is a real id.

Number inputs are still strings in the DOM:

```jsx
const zoom = Number(event.target.value)
if (!Number.isFinite(zoom)) return
```

Checkboxes: `checked={open}` and `onChange={(event) => setOpen(event.target.checked)}`. This app mostly uses `ListItemButton` with `aria-pressed` instead of MUI `Switch`, because the real switch input is painted at opacity 0 and is easy to miss. If you add a `Switch`, give it a visible label and test it with the keyboard.

## Submitting

A `<form onSubmit>` reloads the page unless you prevent that.

```jsx
function onSubmit(event) {
  event.preventDefault()
  commit((userId) => api.saveZone(userId, { name }))
    .then(() => setName(''))
    .catch(() => {})
}
```

Disable the button while the request is in flight if a double click would create two rows. `useMutation` exposes `isPending` for that. `useCommit` does not. A local `saving` flag works:

```jsx
const [saving, setSaving] = useState(false)
function onSubmit(event) {
  event.preventDefault()
  setSaving(true)
  commit((userId) => api.saveZone(userId, { name }))
    .then(() => setName(''))
    .catch(() => {})
    .finally(() => setSaving(false))
}
```

Close a dialog in `.then`, not before the promise. On failure the toast is already shown and the dialog should stay open so the person can correct the field.

## Showing a validation message

The API client throws `ApiError`. `useDirectoryStore.run` toasts `error.message` and rethrows. You usually do not render the message yourself.

When you do (login uses TanStack Query):

```jsx
{attempt.isError ? <Alert severity="error">{attempt.error.message}</Alert> : null}
```

Do not show `error.stack` on screen.

## Dialogs

MUI `Dialog` renders a layer above the page. `open` controls it.

```jsx
<Dialog open={Boolean(edit)} onClose={() => setEdit(null)} fullWidth maxWidth="xs">
  <DialogTitle>Zone</DialogTitle>
  <DialogContent>
    <TextField label="Name" value={edit?.name || ''} onChange={/* set edit.name */} />
  </DialogContent>
  <DialogActions>
    <Button onClick={() => setEdit(null)}>Cancel</Button>
    <Button onClick={save}>Save</Button>
  </DialogActions>
</Dialog>
```

`onClose` runs for Escape and the backdrop. If a save is in progress, ignore `onClose` until it finishes.

`ConfirmDialog` in `src/shared/ui/ConfirmDialog.jsx` is the shared yes/no. Reuse it. Do not build a second confirmation style.

Reset fields when the dialog opens, not only when it first mounts. A dialog that stays mounted keeps its `useState`. `DraftDialog` clears its fields in an effect when `pending` changes.

## Downloads

The planning export does not navigate. It builds a blob and clicks a temporary link. That pattern is browser code, not a React API:

```js
const blob = new Blob([JSON.stringify(collection)], { type: 'application/geo+json' })
const url = URL.createObjectURL(blob)
const link = document.createElement('a')
link.href = url
link.download = 'gis-warplan-plan.geojson'
link.click()
URL.revokeObjectURL(url)
```

Do that in the click handler, after the API call resolves.

## Routing in this app

`App` wraps the tree in `BrowserRouter`. `Shell` declares the table:

```jsx
<Routes>
  <Route path="/login" element={session ? <Navigate to="/" replace /> : <LoginPage />} />
  <Route path="/" element={session ? <Picture /> : <Navigate to="/login" replace />} />
  <Route path="*" element={<Navigate to={session ? '/' : '/login'} replace />} />
</Routes>
```

| Piece | Job |
| --- | --- |
| `BrowserRouter` | Listens to the address bar. One per app. It is already in `App.jsx`. |
| `Routes` | Renders the first matching `Route`. |
| `Route path element` | When the path matches, render `element`. |
| `Navigate` | Redirect. `replace` does not add a history entry. |
| `path="*"` | Anything that matched nothing above. |
| `useNavigate()` | `navigate('/')` from a click or a mutation success. |

`LoginPage` calls `navigate('/')` after `signIn`. The route also sends a signed-in person away from `/login`. Both are there so a refresh on `/login` does not stay on the form.

There is no `createBrowserRouter`, no loader, and no `Outlet`. Do not add a data router beside `BrowserRouter`. One router is enough.

## Adding a page

1. Create `src/features/notes/NotesPage.jsx` that exports a component.
2. In `Shell.jsx` add a route **above** `path="*"`:

```jsx
<Route path="/notes" element={session ? <NotesPage /> : <Navigate to="/login" replace />} />
```

3. Link to it from a button that belongs in that layout:

```jsx
import { Link as RouterLink } from 'react-router-dom'
import { Link } from '@mui/material'

<Link component={RouterLink} to="/notes">Notes</Link>
```

MUI `Link` and the router `Link` are different. `component={RouterLink}` makes the MUI link change the address without a full reload.

`Shell.jsx` is the file that differs per branch. A new route must be copied onto the other three shells, or added in a shared component that every shell already renders. Prefer a shared component if the page is the same everywhere. The route table itself lives in each `Shell.jsx` today, so a new path is a four-branch edit unless you move the table into `src/app/`.

## Reading the URL

This app does not read query strings. When you need to:

```jsx
import { useParams, useSearchParams, useLocation } from 'react-router-dom'

// Route path="/features/:featureId"
const { featureId } = useParams()

const [params, setParams] = useSearchParams()
const layer = params.get('layer') || ''
setParams({ layer: 'zones' })

const location = useLocation()
// location.pathname, location.search, location.hash
```

`useParams()` returns strings. `useSearchParams`’s setter replaces the query string. Pass `{ replace: true }` as the second argument when you should not push history.

`navigate(-1)` goes back. Use it only for a real back action. After sign-in, go to a known path (`'/'`), not back, or the person lands on `/login` again.

## Nested routes

Not used here. The shape, if a layout grows child pages:

```jsx
<Route path="/admin" element={<AdminFrame />}>
  <Route index element={<DirectoryPanel />} />
  <Route path="flags" element={<FlagPanel />} />
</Route>
```

`AdminFrame` must render `<Outlet />` where the child appears. Paths without a leading `/` are relative to the parent. `index` is the parent path exactly.

## What the router will not do

It will not keep you signed in. `session` in the Zustand store does that. A route element that checks `session` is the gate. There is no router loader calling `resumeSession`. `SessionGate` does it before `Shell` renders.

It will not scroll a panel. Panels are state (`chrome.panel`), not URLs. Do not move every tool onto its own path unless you have a reason to share that URL.
