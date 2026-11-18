# 9. Cheat sheet

## Commands

```text
npm run dev          # http://127.0.0.1:5173/
npm run build        # writes dist/
npm run preview      # http://127.0.0.1:4173/
git branch --show-current
git checkout layout-1
```

PowerShell: do not use `&&`.

## Sign-in

Password `123`. APEX can do everything. CoSC can change the scenario. Theatre, air, and maritime cannot change the scenario or the clock.

## Storage

| Key | Value |
| --- | --- |
| `gis-warplan.session` | `{ "userId": "apex" }` |
| `gis-warplan.exercise` | `{ "scenarioId": "southern", "gameId": "bravo" }` |

## Ports

| Port | What |
| --- | --- |
| 5173 | Vite dev |
| 4173 | Vite preview |
| 8080 | GeoServer WMS, optional |

## Import rule

```js
import * as api from '../shared/api/client'
```

Never import `fixtures.js` or `directory.js` from a screen or a store. The directory store imports `client.js`.

## Empty selectors

```js
import { EMPTY_LIST, EMPTY_OBJECT } from '../shared/lib/empty'
useDirectoryStore((state) => state.data?.features ?? EMPTY_LIST)
```

## Commit a change

```jsx
const commit = useCommit()
commit((userId) => api.setFlag(userId, 'featureTable', false))
  .then(() => { /* close a dialog */ })
  .catch(() => { /* toast already shown */ })
```

## Layout frames

| Branch | Frame |
| --- | --- |
| layout-1 | Workstation. Left application rail, map-tool shelf, footer |
| layout-2 | Menu shelf. Application menu in the command bar, tool shelf under it |
| layout-3 | Dual rail. Tools on the left, application menu on the right |
| layout-4 | Command band. Named application band, tools on request |

Sections, from the API client: Scenario management, Game, Standard data, User management. They do not open a page. Map tools do open a panel.

Copy shared files. Do not copy `src/shell/Shell.jsx`.

```text
git checkout layout-2
git checkout layout-1 -- src/app src/components src/features src/shared
```

## Menu ids

`filters` `extent` `features` `properties` `draw` `teams` `map-settings` `planning` `resources` `plans` `exercise-control` `alerts` `sessions` `scenario-play` `simulation` `stream` `zones` `routes` `directory` `flags`

## Flag keys

`layerOpacity` `featureTable` `propertiesPanel` `drawingTools` `measurementTools` `teamMapIcons` `mapSettings` `planningCanvas` `planningExport` `planningShare` `planningReview` `planningPromote` `geofenceAlerts` `alertSound` `alertsPanel` `sessionReplay` `scenarioPlayback` `simulationExtras` `liveStream` `statusBadge` `zonesAdmin` `routesAdmin` `adminPanel` `demoMode`

## Seed ids

Users: `apex` `cosc` `etc` `wtc` `ntc` `esc` `aoc` `foc`

Features: `unit-1` Blue lead, `unit-2` Red contact, `route-1` Northern road, `zone-1` Holding area, `zone-2` Contact box

Graphic: `graphic-1` Objective north

Teams: `blue`, `red`

Games: `alpha`, `bravo` open, `charlie` closed

Scenarios: `northern`, `southern`

## Map

Home: lat 24.5, lon 82, zoom 5, min 3, max 12.

WMS: `http://127.0.0.1:8080/geoserver/wms`, layer `ne:countries` plus the reference layers in chapter 1.

No `crossOrigin: 'anonymous'`.

`modify.on('modifyend')`, not `map.on('modifyend')`.

## Clock

Start `2026-10-28T06:00:00`. Running adds 60 exercise seconds per real second. Running or paused blocks scenario and game changes.

## Files you open most

```text
src/shell/Shell.jsx
src/shared/api/client.js
src/shared/api/directory.js
src/shared/api/fixtures.js
src/features/session/useSessionStore.js
src/features/directory/useDirectoryStore.js
src/shared/ui/workbench/Panels.jsx
src/components/MapWorkbench.jsx
src/components/SituationMap.jsx
src/shared/ui/PictureWorkspace.jsx
```

## Not used

`public/config/*.json`

`leaflet`, `react-leaflet`, `@mui/x-data-grid` are in `package.json` and unused by `src/`.

## Not built

GeoJSON import, Cesium, audit log, real auth server, server RBAC, config editor, real STOMP client.
