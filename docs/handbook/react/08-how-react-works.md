# 8. How React works

React’s job is to keep the screen equal to the latest render. You describe the UI as a function of state. React calls that function, compares the result with the previous result, and updates the DOM where they differ.

```jsx
function Row({ name, selected }) {
  return <li className={selected ? 'on' : ''}>{name}</li>
}
```

`Row` does not edit the `<li>` later. The next time React calls `Row`, it gets new props and returns a new description. If `selected` flipped, React changes `class` on the existing `<li>`. If `name` is the same, that text node stays.

## What you return is not the DOM

JSX compiles to an element: a plain object with a type and props. `{ type: 'li', props: { className: 'on', children: 'Blue lead' } }` is not an HTML element yet. React turns it into a DOM node on the first commit, then patches that node afterwards.

A component type is a function (`Row`). React calls it during render. A host type is a string (`'li'`, `'div'`). React creates or updates a DOM node for it. MUI components are functions that eventually return host nodes.

`null`, `false`, and `undefined` as a child produce no node. `0` does produce text. That is why `{count && <Badge />}` shows `0` when count is 0.

## Render, then commit

A state update has two phases.

1. **Render.** React calls your components. This must be pure. No `sessionStorage`, no `fetch`, no `map.addLayer`. Reading state, props, and computing a list are the whole job. React may discard a render and try again. `StrictMode` in development does that on purpose.
2. **Commit.** React applies the DOM changes, runs `useLayoutEffect`, paints, then runs `useEffect`.

If render throws, there is no commit. This app has no error boundary, so `#root` goes blank and the message is in the console.

Setting state during render schedules another render immediately. If that set is unconditional, React stops you with “Maximum update depth exceeded”. A Zustand selector that returns a new array every time does the same thing: the component renders, the subscription sees a new value, it renders again.

## State is a snapshot

Every render closes over the state from that render.

```jsx
function Saver() {
  const [name, setName] = useState('Blue lead')
  function save() {
    setTimeout(() => {
      console.log(name)
    }, 1000)
  }
  return <button onClick={save}>Save</button>
}
```

The timeout prints the name from the render that created `save`, even if the person typed a new name during that second. The fix is to read the latest value from a ref, from the event, or from the functional updater when you are computing the next state:

```jsx
setName((current) => current.trim())
```

The updater receives the state at the moment React applies the update, not a stale copy from the closure.

## Batching

Several `setState` calls in one event handler become one render.

```jsx
setName('North')
setTeam('blue')
```

The component renders once with both values. An `await` between them still batches in React 19: updates from a promise continuation are batched too. You do not need `flushSync` for ordinary forms. `flushSync` from `react-dom` forces a commit before the next line. Use it only when you must read the DOM that the update just produced. It is rare, and it hurts performance.

## Reconciliation and keys

React walks the new element tree and the previous one together.

- Same type in the same place: update that node.
- Different type: destroy the old subtree and mount the new one. State inside it is reset.
- A list: match children by `key`.

```jsx
{features.map((feature) => (
  <Row key={feature.id} feature={feature} />
))}
```

The key must be stable for that row across renders. The id from the data is the right key. The array index is only safe when the list never inserts, deletes, or reorders. `Math.random()` remounts the row every time and wipes its state.

Keys are not props. The child does not see `props.key`.

Moving a component under a different parent type also remounts it. Changing a `key` on purpose is the supported way to reset a subtree:

```jsx
<DraftForm key={pending?.id || 'new'} />
```

## Why a parent render does not always redo the DOM

React still calls child functions when the parent renders, unless the child is wrapped in `memo` and its props are shallow-equal. Calling the function is cheap. Touching the DOM is the expensive part, and React skips DOM updates when the host props are the same.

`memo` compares props with `Object.is` one level deep. A new object or a new function fails that compare:

```jsx
<Row style={{ color: 'white' }} onSelect={() => select(id)} />
```

Both props are new every render, so `memo` never bails out. Pass stable props, or do not bother with `memo`. This app does not wrap its rows in `memo`. The lists are small.

## Events

React registers listeners on the root, not on every node, and calls your function when the event reaches it. You pass a function.

```jsx
<button onClick={() => setOpen(true)}>Open</button>
```

`onClick={setOpen(true)}` calls `setOpen` while rendering and passes `undefined` as the listener. The dialog opens during render, or the page throws.

The event object is reused in the sense that you should read `event.target.value` inside the handler, not after an `await` in older React. In React 19 the event object is not pooled. Reading it after `await` is safe. Reading `event.currentTarget` after an `await` is still unsafe, because the browser nulls `currentTarget` after the handler finishes its synchronous turn. Layout-3 stores the anchor element before any await:

```jsx
const anchor = event.currentTarget
```

`currentTarget` is the node the listener is on. `target` is the node that was hit, which may be the icon inside the button. A popover anchored to the icon jumps when the icon is smaller than the button.

`onChange` on an input fires for every edit. `onSubmit` on a form fires for Enter and for the submit button, and it reloads the page unless you call `event.preventDefault()`.

## Effects are not part of render

Render asks “what should the screen be?”. An effect asks “what should the outside world do now that the screen is that?”. The outside world includes timers, subscriptions, `document.title`, and OpenLayers.

```jsx
useEffect(() => {
  const map = new Map({ target: el.current })
  return () => map.setTarget(null)
}, [])
```

The returned function runs before the effect runs again, and when the component unmounts. `StrictMode` runs effect, cleanup, effect on mount in development so a missing cleanup shows up immediately.

If the effect’s result can be calculated from props, it is not an effect. Filter the list while rendering.

## Context

Context passes a value to any descendant without threading props through the middle.

```jsx
const ThemeContext = createContext(null)
```

`ThemeProvider` from MUI is this mechanism. `useTheme()` reads it. A provider value that is a new object every render (`value={{ panel }}`) forces every consumer to render. Keep the value stable, or use Zustand, which notifies only the selectors that changed.

## Refs

A ref is a mutable box that does not participate in render. React sets `ref.current` to the DOM node after the node is created, and to `null` when it is removed. Reading `ref.current` during render is usually `null` on the first pass and stale as a source of UI. Read it in an effect or a handler.

React 19 lets a function component accept `ref` as a normal prop. `forwardRef` still works. New components in this repo do not need it.

## Suspense, lazy, and transitions

`lazy(() => import('./NotesPage'))` returns a component whose first render throws a promise. `Suspense` catches that promise and shows `fallback` until the module loads. A normal exception is not a promise. `Suspense` does not catch it.

`startTransition(() => setQuery(text))` marks the update as non-urgent. React keeps the old UI on screen and can interrupt the slow render if a new click arrives. `useDeferredValue` is the same idea for a value you already have. The lists in this app are small enough that neither is required.

## What this means for GIS Warplan

| You see | The mechanism |
| --- | --- |
| Typing in a dialog updates one field | `useState` in that dialog. The store is not involved. |
| A flag hides a menu item | `commit` replaces the directory snapshot. Selectors that read `navigation` render again. |
| Dragging a slider does not rebuild the map | `onChange` can update local state. The API runs on `onChangeCommitted`. `apply` ignores an identical snapshot. |
| The map dies while drawing | Something bumps `revision` on a timer, the effect cleanup destroys `Draw`, and the new effect builds another one. |
| Refresh keeps the user and drops the clock | Only `{ userId }` is in `sessionStorage`. The rest is rebuilt, or reset, in the store’s initial state. |

The next chapter is every hook, one by one: [Hooks](09-hooks.md).
