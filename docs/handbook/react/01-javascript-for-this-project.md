# 1. JavaScript used in this project

The files are `.js` and `.jsx`. They are ES modules (`"type": "module"` in `package.json`). There is no TypeScript. A value can be anything until you check it.

## Values

```js
const name = 'APEX'          // cannot be reassigned
let zoom = 5                 // can be reassigned
const filters = ['countries'] // the binding is fixed; the array can still be edited
```

Prefer `const`. Use `let` when the variable truly changes. Do not use `var`.

Strings: `'APEX'`, `"APEX"`, and `` `Hello ${name}` ``. The third form is a template string. Use it when you are inserting a value.

Numbers: `0.04`, `NaN`. `Number('5')` is `5`. `Number('')` is `0`. `Number.isFinite(zoom)` is the check this app uses before accepting a zoom or a clock instant. `Number.isNaN` is not the same as the global `isNaN`. Prefer `Number.isFinite`.

Booleans: `true`, `false`. These are falsy: `false`, `0`, `''`, `null`, `undefined`, `NaN`. A non-empty string is truthy, including `'0'`.

`null` means “there is a value and it is empty”, by convention. `undefined` means “not set”.

## Objects and arrays

```js
const user = { id: 'apex', title: 'APEX' }
user.title            // 'APEX'
user.grant?.admin     // undefined if grant is missing, no throw
const title = user.title ?? 'Unknown'   // only if title is null or undefined
```

`?.` stops when the left side is `null` or `undefined`. `??` substitutes only for `null` or `undefined`. `||` also substitutes for `0` and `''`. This app uses `??` for lists so a real empty list is kept. See `EMPTY_LIST` in the project handbook.

```js
const next = { ...user, title: 'New' }     // copy, then override
const both = [...filters, 'coast']         // new array
const { id, title } = user                 // pull fields out
const [first] = filters                    // first element
```

Spread does a shallow copy. Nested objects are still shared.

Arrays you will see every day:

| Method | Returns | Mutates? |
| --- | --- | --- |
| `map` | New array, one result per item | No |
| `filter` | New array, items that passed | No |
| `find` | The item or `undefined` | No |
| `some` | Boolean | No |
| `includes` | Boolean, for a value | No |
| `push` | New length | Yes |
| `splice` | Removed items | Yes |

The API client mutates its module-level arrays (`features.push`). React state does not. In a component, copy, then set state. Do not `push` onto an array you stored in state and expect a re-render. The array’s identity did not change.

## Functions

```js
function statusLabel(status) {
  return STATUS_LABEL[status] || 'Ready'
}

const format = (value) => Number(value).toFixed(4)

export function NavIcon({ name }) {
  const Icon = ICONS[name] || LayersOutlinedIcon
  return <Icon fontSize="small" />
}
```

Arrow functions do not have their own `this`. This codebase does not use `this` in components. Do not write `function Component()` methods that need `this`.

Default arguments: `function PictureWorkspace({ variant = 'plain' })`.

A function that starts with `async` returns a Promise. `await` pauses that function until the promise settles. `await` is legal inside `async` functions, and inside the top level of a module. It is not legal inside a normal event handler unless that handler is `async`.

```js
commit((userId) => api.login({ userId, password }))
  .then((session) => signIn(session))
  .catch((error) => { /* store already toasted */ })
```

`.then` runs on success. `.catch` runs on throw or `reject`. If you `await` inside `try/catch`, that is the same split.

Throwing `new ApiError('Access refused.', 'VALIDATION')` rejects the promise of an `async` function.

## Modules

```js
import { useState } from 'react'
import * as api from '../shared/api/client'
import Shell from '../shell/Shell'
export function ToolPanel() {}
export default function App() {}
```

- Named import `{ useState }` requires `export function useState` or `export { useState }`.
- `import * as api` gathers every named export into one object.
- Default import has no braces and matches `export default`.
- The path is relative to the file. `../` is the parent folder. Packages (`react`, `ol/...`) have no `./`.
- A cycle (A imports B and B imports A) often yields `undefined` for one of the bindings. Do not import a store from the API, or the API from a component that the API imports.

## JSON and storage

```js
const raw = sessionStorage.getItem('gis-warplan.session')
const parsed = JSON.parse(raw)          // throws on bad JSON
sessionStorage.setItem('gis-warplan.session', JSON.stringify({ userId }))
```

`JSON.stringify` drops functions and turns `Map` into `{}`. The password map is not in the snapshot, which is why it is not persisted. `structuredClone` in the API copies plain data. It throws on functions.

## Comparisons that matter here

```js
scenarioId === session.activeScenarioId   // same value and type
feature.id === selectedId
```

Use `===`. `==` coerces types and hides bugs.

Optional grouping you will read in JSX conditions:

```js
flags?.featureTable && !phone && (variant === 'dock' || (variant === 'phase' && phaseId === 'review'))
```

`&&` stops at the first falsy value and returns it. `{count && <span>{count}</span>}` renders `0` when count is 0. Prefer `count > 0 ? <span>{count}</span> : null`.

## Regular expressions

New team, role, and user ids must match `/^[a-z][a-z0-9-]{1,20}$/`. A letter, then 1 to 20 letters, digits, or hyphens. `Apex` fails because of the capital. `a` fails because it is too short.

## What you can ignore until you meet it

`class`, `prototype`, and `this` are real JavaScript. This app’s components do not use them. OpenLayers objects do, inside `ol`. You call methods on those objects (`map.addLayer(layer)`). You do not write new classes for screens.
