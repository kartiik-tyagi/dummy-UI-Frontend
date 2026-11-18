# 8. Debugging and logs

## Where to look

| Symptom | Look here first |
| --- | --- |
| Blank white page | Browser console. Then the Vite terminal. |
| Red overlay from Vite | The file and line in the overlay. Save a fix and it reloads. |
| Toast at the bottom right | `error.message` from `ApiError`. The console has the matching warn. |
| Wrong menu | `useNavigation` and `navigationFor` in `directory.js`. |
| Map is a thin line or missing | Parent height. See below. |
| Tiles missing, tools fine | GeoServer on port 8080, and `/map/config` returning a WMS URL and layers. |
| Sign-in loop | `sessionStorage` key `gis-warplan.session`. |
| Slider or draw “does nothing” | `revision` bumping every tick. See below. |

Open the console with F12. Filter on `gis-warplan`.

## Log lines

Shape: `[gis-warplan] event` and an object `{ time, level, event, ...fields }`.

There is no password field. If you add a log and the object could contain a password, you have a bug.

### Auth and session

| Event | Level | When |
| --- | --- | --- |
| `auth.signed_in` | info | Password accepted. `persisted` says whether `sessionStorage` accepted the id. |
| `auth.signed_out` | info | Sign-out. |
| `auth.rejected` | warn | Refused sign-in. |
| `session.restored` | info | Refresh kept the user. |
| `session.restore_rejected` | warn | Saved id is no longer valid. |
| `session.storage_invalid` | warn | JSON was not `{ userId }`. |
| `session.storage_unreadable` | warn | `sessionStorage` threw while reading. |
| `session.storage_unavailable` | warn | Write or delete threw. |
| `scenario.changed` | info | Confirmed scenario change. |
| `scenario.change_rejected` | warn | Forbidden, unknown, or game in progress. |
| `scenario.restore_rejected` | warn | Saved scenario id was dropped on load. |
| `game.changed` | info | Confirmed game change. |
| `game.change_rejected` | warn | Forbidden, closed, unknown, or game in progress. |
| `game.restore_rejected` | warn | Saved game was closed or unknown. |
| `exercise.storage_invalid` | warn | Exercise JSON had neither id. |
| `exercise.storage_unreadable` | warn | Exercise key threw. |
| `exercise.storage_unavailable` | warn | Exercise key could not be written. |
| `directory.unreadable` | error | Login context or session failed Zod. |

Cancel on the scenario dialog does not log. The same id does not log.

### Directory

| Event | When |
| --- | --- |
| `workbench.loaded` | Snapshot loaded for this sign-in. |
| `workbench.tick_failed` | The 500 ms loop threw. Error level. |
| `alert.raised` | A unit entered a zone. Once per pair until it leaves. |
| `feature.created`, `feature.extended`, `feature.deleted` | Picture edits. |
| `feature.rejected` | Validation or missing feature. |
| `planning.created`, `planning.deleted`, `planning.undo`, `planning.redo`, `planning.exported`, `planning.shared`, `planning.commented`, `planning.promoted` | Board edits. |
| `planning.rejected` | Board validation. |
| `session.recording_started`, `session.saved`, `session.deleted` | Recordings. |
| `session.rejected` | Recording validation. |
| `simulation.changed` | A committed simulation change. |
| `simulation.rejected` | Forbidden or out of range. |
| `stream.connected`, `stream.disconnected` | Live stream. |
| `stream.rejected` | Bad address or topic. |
| `catalogue.saved`, `catalogue.rejected` | Zones and routes. |
| `team.saved`, `team.deleted`, `team.rejected` | Teams. |
| `role.saved`, `role.deleted`, `role.rejected` | Roles. |
| `user.saved`, `user.deleted`, `user.rejected` | Users. |
| `flag.changed`, `flag.rejected` | Feature switches. |
| `password.changed`, `password.rejected` | Password. No password value. |
| `map.views_reset`, `map.basemap_changed` | Map settings. |
| `map.view_rejected`, `map.basemap_rejected`, `layer.opacity_rejected` | Bad map input. |
| `directory.rejected` | Unknown user, not an administrator, or a flag that is off. |

Opacity commits and map pans do not log on success. A rejected opacity does.

## Blank page

React’s “Maximum update depth exceeded” means a component set state while rendering, or a store selector returned a new object every time. In this repo the second one has happened: `state.data?.alerts || []` when `data` was null. Use `?? EMPTY_LIST`.

A Vite import error (“Could not resolve”) means a wrong relative path or an icon that is not in `@mui/icons-material`. `Panels.jsx` is one folder deeper than the other UI files.

`createRoot` on a container that already has a root throws if a second copy of `main.jsx` loads. Do not import `main.jsx` from another file.

## Map has no height

The map div is absolutely positioned inside `MapStage`. The stage must be `flex: 1` with `minHeight: 0` inside a column that has a real height (`height: 100%` from the shell down). A parent with `position: absolute` and no positioned ancestor collapses on the phone layout. `PictureWorkspace` stays in normal flow for every variant.

## Drawing dies after a second

`useDirectoryStore.apply` must ignore an unchanged snapshot. If you remove that compare, the 500 ms subscription bumps `revision`, `MapWorkbench` destroys the `Draw` interaction, and the click never finishes.

`modifyend` belongs on the `Modify` interaction.

## Session surprises

| What you see | Why |
| --- | --- |
| Password `123` fails after you changed it, then refreshed | The new password lived in module memory. Refresh reseeds `123`. |
| Filters reset | By design. They are not in `sessionStorage`. |
| Clock is Ready after refresh | By design. |
| Scenario stayed on Southern Approach | `gis-warplan.exercise` survived. Sign-out does not clear it. |
| “The saved session is not valid.” | Corrupt `gis-warplan.session`. It is removed. |
| Game Charlie cannot be chosen | `open: false`. |
| “End the game before changing the scenario.” | Status is running or paused. End it, then confirm. The dialog stays open. |

Clear both keys from the console if you need a clean login:

```js
sessionStorage.removeItem('gis-warplan.session')
sessionStorage.removeItem('gis-warplan.exercise')
```

## MUI controls that are hard to see

`Switch` and `Radio` paint the real input at opacity 0. This app uses buttons and list rows instead, on purpose. If you add a `Switch`, test it with the keyboard and with a pointer. Do not assume the invisible input is the thing a person hits.

A `Select`’s accessible name is often the selected text, not the label above it.

## Vite and the branch

The dev server serves the working tree. `git checkout layout-3` changes `Shell.jsx` on disk and Vite reloads. If the terminal was started in this folder, you do not need a new `npm run dev`.

A full reload after a dependency change (`optimized dependencies changed. reloading` in the Vite log) is normal the first time a new icon or OpenLayers import appears.

## Build versus dev

`npm run build` catches missing imports that a half-loaded dev tab might still be hiding. Run it before you call a large change done. The chunk-size warning is not a failure. A non-zero exit is a failure.
