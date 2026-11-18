# 7. Recipes

Each recipe says which files to touch. After a shared-file recipe, copy the files onto the other three branches. Recipe 8 is that copy. Do not copy `src/shell/Shell.jsx` or `src/shell/meta.js` unless the recipe is about one layout.

## 1. Add a tool to the menu

Example: a “Remarks” tool.

1. In `src/shared/api/directory.js`, inside `navigationFor`, push an item:

```js
item('remarks', 'Remarks', 'info')
```

Put it in the group that matches the job. Gate it with a flag if it can be switched off.

2. In `src/shared/ui/ToolPanel.jsx`, add `remarks: 'Remarks'` to `TITLES`.

3. In `src/shared/ui/workbench/Panels.jsx`, inside `PanelBody`, return your component when `panel === 'remarks'`.

4. If the icon name is new, add it to `ICONS` in `src/shared/ui/navIcons.jsx`. Use an outlined icon from `@mui/icons-material/...Outlined`. The package does not always have the unsuffixed name (`PlayCircleOutline` failed here; `PlayCircleOutlined` works).

5. The rail and the strip already read `useNavigation()`. You do not edit them for a normal tool.

## 2. Add a feature switch

1. Add a row to `FLAG_LIST` in `directory.js`. The `flags` object is built from that list, so the default is on.
2. Call `requireFlag('yourKey')` at the start of the API function that should refuse when the switch is off.
3. In `navigationFor`, push the menu item only when `flags.yourKey` is true.
4. In `PanelBody`, add the id to the `flag` map so the panel shows “This capability is switched off.” if someone still has it open.

No screen should read a boolean you invented in the component. The snapshot’s `flags` object is the source.

## 3. Add a API client function

```js
export function renameFeature(userId, featureId, name) {
  requireUser(userId)
  requireFlag('propertiesPanel')
  const feature = features.find((item) => item.id === featureId)
  if (!feature) fail('feature.rejected', { userId, featureId }, 'That feature is no longer on the picture.', 'NOT_FOUND')
  feature.name = requireName(name, 'feature.rejected')
  logger.info('feature.renamed', { userId, featureId })
  return snapshot(userId)
}
```

Export it from the list at the bottom of `client.js`. From the panel:

```jsx
commit((userId) => api.renameFeature(userId, feature.id, name))
```

Log the success once. Log the rejection inside `fail`, which already warns. Do not log the name if it could be a secret. A feature name is fine.

## 4. Change one layout only

Edit `src/shell/Shell.jsx` on that branch. Typical choices:

- Which `PictureWorkspace` variant.
- Rail on the left or the right (`edge`).
- Panel in a column, a drawer, or a popover.
- Extra chrome such as the phase switch.

Leave `PanelBody` alone if the tool already exists. The layout decides where the panel sits, not what the tool does.

Layout-3’s `select` needs the click event:

```js
const select = (id, event) => {
  chrome.select(id)
  setAnchor(event?.currentTarget || null)
}
```

`IconStrip` already passes the event. Do not change it back to `onSelect(item.id)` only.

## 5. Add a dialog

Use MUI `Dialog`. Keep it a separate component if it is not tied to one panel. Mount it once in `App.jsx` next to `DraftDialog` if it must survive a panel closing.

Pattern this app uses:

- Open flag in a store or in `useState`.
- Cancel calls the close function and does not call the API.
- Confirm calls `commit(...).then(() => close()).catch(() => {})`.
- The store toasts the error. The `.catch` only marks the rejection as handled.
- Do not close the dialog in `catch`. The person needs the form to try again.

`ConfirmDialog` is enough for a destructive yes/no.

## 6. Change colours

One theme’s colours: the object in `fixtures.js` (`fieldTheme`, `nightTheme`, `sandTheme`). Keep `primaryContrast` dark on a light green and light on a dark sand, or MUI’s contained buttons become unreadable.

Rules for every theme: `createAppTheme.js`. Do not set `color` on `typography` variants. Do not force `color` on `MuiIconButton`.

The theme picked in the user menu is memory only. The user’s `themeId` is what returns after refresh.

## 7. Add a draw tool on the picture

1. Add a button in `DrawPanel` inside `Panels.jsx` that calls `setTool('my-tool')`.
2. In `MapWorkbench.jsx`, add the tool to the `drawing` map (`Point`, `LineString`, `Polygon`, or `Circle`).
3. In the `drawend` handler, set `pending` with `featureType` set to `unit`, `route`, or `zone`. Those are the only types `createFeature` accepts.
4. If the geometry is a circle, `readGeometry` already converts it to a polygon.

A tool that should not be stored uses the measure path: set `measure`, do not set `pending`.

## 8. Copy a shared change onto the other layouts

Shared means everything except `src/shell/Shell.jsx` and `src/shell/meta.js`.

When the change is committed on `layout-1`:

```text
git checkout layout-2
git checkout layout-1 -- src/app src/components src/features src/shared
```

Repeat for `layout-3` and `layout-4`. Then return:

```text
git checkout layout-1
```

Review `git status` before you commit. If `src/shell/Shell.jsx` appears, you copied a shell by mistake. Restore that branch’s shell with `git checkout -- src/shell/Shell.jsx` before committing, or the four layouts become the same screen.

PowerShell has no `&&`. Run the commands one after another, or separate them with `;` only when the first one is allowed to fail without stopping you. A failed `git checkout layout-2` should stop you.

Do not push unless someone asks.

## 9. Point one function at a real server later

Keep the export name and the snapshot shape. Replace the body:

```js
export async function loadWorkbench(userId) {
  const response = await fetch(`/api/workbench?user=${encodeURIComponent(userId)}`)
  if (!response.ok) throw new ApiError('The directory could not be opened.', 'SESSION')
  return response.json()
}
```

Do this in `client.js` or in `directory.js`. Do not start `fetch` from a component. `subscribeWorkbench` is the function a WebSocket replaces. The React store already accepts “call me with the next snapshot”.

## 10. Add an appointment

In `fixtures.js`, push a user with `id`, `title`, `role`, `service`, `avatarUrl`, `themeId`, and `grant`. `grant` must be a key of `grants`: `apex`, `direction`, `theatre`, `air`, `maritime`.

The login list is `loginContext().users`. You do not edit the login page to add a row.

Deleting APEX from the directory panel is refused. Do not remove that check.

## 11. The page is blank after your edit

See [Debugging](08-debugging.md). The usual causes in this repo:

- A Zustand selector returns a new `[]` or `{}` on every read.
- `PictureWorkspace` or a parent has no height.
- An import path is one `../` short. `Panels.jsx` lives in `shared/ui/workbench/`, so shared code is `../` and features are `../../../features/...`.
- An MUI icon path does not exist. The dev overlay names the file.
