# 5. The API client

Import data functions from `src/shared/api/client.js` only.

```js
import * as api from '../../shared/api/client'
import { ApiError } from '../../shared/api/client'
```

`client.js` owns login, resume, scenario, and game. It re-exports the directory. Users, sides, roles, themes, and map catalog come from `/api/v1`. A component may not import `directory.js` or `fixtures.js`.

`ApiError` has `message` (shown to the person) and `code` (for logs and branches).

## Login and session functions

They call the backend over HTTP and validate the result with Zod.

| Function | Returns | Throws |
| --- | --- | --- |
| `getLoginContext()` | Application name, active users, login theme (from `GET /auth/login-context`) | Unavailable / invalid payload |
| `login({ userId, password })` | Full session | Validation, unauthorized, unavailable |
| `resumeSession()` | Full session | Missing or invalid token |
| `changeScenario({ scenarioId })` | Active scenario plus exercise delta | Forbidden, missing, unknown |
| `changeGame({ gameId })` | Active game plus exercise delta | Forbidden, missing, unknown |

The session object includes `profile`, `theme`, `themes`, `scenarios`, `games`, `navigation`, `sections`, `filters` (from `/map/config`), `mapView`, `mapService`, `functionalities`, and `me`. Navigation is built only from `me.functionalityCodes`.

## Directory functions

Each one takes `userId` first. Each successful call returns a **full workbench snapshot**. The store replaces `data` with it.

`loadWorkbench(userId)` logs `workbench.loaded`.

`subscribeWorkbench(userId, onChange)` starts a 500 ms interval and returns an unsubscribe function. The callback receives a snapshot, or the interval logs `workbench.tick_failed` and skips that tick. Only one subscriber exists. A second call clears the previous timer.

### Snapshot fields you will read in the UI

| Field | Meaning |
| --- | --- |
| `navigation` | Menu groups built from flags and the grant |
| `opacity` | Map `{ layerId: number }` from 0 to 1 |
| `features` | Units, routes, zones on the picture |
| `graphics` | Planning drawings |
| `teams`, `roles`, `users` | Administration lists |
| `planView` | `mine` or `shared` |
| `canUndo`, `canRedo` | Planning history, capped at 30 |
| `alerts` | Units currently inside a zone |
| `alertMuted`, `alertSound` | Tone |
| `recordings` | `{ id, name, durationSec, frameCount }` only. Frames stay inside the API. |
| `draftRecording`, `capture` | A recording in progress or waiting for a name |
| `replay` | Loaded recording, index, and positions for the current frame |
| `scenario` | Track name, `t`, `playing`, marker positions |
| `simulation` | Cadence, `TIME` or `EVENT`, playback, seek |
| `stream` | `offline`, `live`, or left as replay status is decided in the badge |
| `flags`, `flagList` | Switches |
| `settings` | Basemap, GeoServer URL, WMS layer, default zoom, saved views, `homeToken` |
| `showTeams` | Mirror of the team-marker flag |

### Picture

| Function | Rule |
| --- | --- |
| `setLayerOpacity(userId, layerId, value)` | 0–1. No log on success. |
| `createFeature(userId, draft)` | Needs a trimmed name. Types are unit, route, zone. Geometry is GeoJSON in lon/lat. |
| `updateFeature(userId, featureId, patch)` | Geometry or properties. |
| `extendFeature(userId, featureId, edge)` | `start` or `end` of a route. A unit or zone throws “Select a route before extending it.” |
| `deleteFeature(userId, featureId)` | Any signed-in user. |
| `saveMapView(userId, surface, view)` | `surface` is `picture` or `planning`. View is longitude, latitude, zoom. |
| `resetMapViews(userId)` | Clears saved views, increments `homeToken`, logs `map.views_reset`. |
| `updateBasemap(userId, patch)` | Removed from the product surface; the picture uses GeoServer WMS only. |

Seed picture, near India:

| Id | Name | Type | Team |
| --- | --- | --- | --- |
| unit-1 | Blue lead | unit, point `[80.2, 26.4]` | blue |
| unit-2 | Red contact | unit, point `[83.1, 24.8]` | red |
| route-1 | Northern road | route | blue |
| zone-1 | Holding area | polygon | blue |
| zone-2 | Contact box | polygon, about 83.5–84.3 by 24.4–25.2 | red |

Blue lead starts inside Holding area, so the alert list is not empty after the first snapshot.

### Planning

| Function | Rule |
| --- | --- |
| `createGraphic` | Name, team, shape, geometry. Stamp and symbol ids are stored when that tool was used. |
| `updateGraphic` | Owner only. A properties patch keeps existing comments and `sharedWith`. |
| `deleteGraphic` | Owner only. |
| `undoPlanning` / `redoPlanning` | Stack of graphic lists. |
| `exportPlan` | GeoJSON `FeatureCollection`. The panel downloads `gis-warplan-plan.geojson`. The download is the browser using API data. |
| `setPlanView` | `mine` or `shared`. Requires the share flag. |
| `shareGraphic` | User ids. Rejects unknown ids and sharing with yourself. |
| `addComment` | Instructor text on a graphic. |
| `promoteGraphic` | Area shapes whose geometry is a Polygon become a zone. Line, arrow, and point do not promote. |

Seed graphic: “Objective north”, owned by `apex`, rectangle, echelon company.

Shape tools the panel offers: select, edit, rectangle, circle, ellipse, polygon, line, arrow, freehand, point, stamp, symbol.

Stamps: objective, checkpoint, rally, hazard, lz, cp.

Symbols: friendly-infantry, friendly-armor, hostile-infantry, hostile-armor, neutral-unit, unknown-contact.

Echelons: team, squad, platoon, company, battalion, brigade, division.

Circle and ellipse are drawn as OpenLayers circles and saved as polygons. Ellipse scales the ring 1.6 on x and 0.7 on y. Rectangle uses `createBox`. Measure does not save. It sets the readout string.

### Exercise tools inside the API

| Function | Rule |
| --- | --- |
| `setAlertMuted` | Boolean. |
| `startRecording` / `stopRecording` | Stop leaves a draft. |
| `saveRecording(userId, name)` | Name required. |
| `discardRecording` | Drops the draft. |
| `deleteRecording` | Removes a saved one. |
| `loadReplay` / `seekReplay` / `setReplayPlaying` / `stepReplay` / `closeReplay` | Replay badge becomes Replay while a replay is loaded. |
| `seekScenario` / `setScenarioPlaying` | Track “Northern Approach”, 60 seconds. Blue lead moves from `[80.2, 26.4]` toward `[81.1, 25.8]`. |
| `setSimulation` | Cadence 100–300000 ms. Mode `TIME` or `EVENT`. `seekSec` 0–7200. Logs `simulation.changed` on a committed change. |
| `connectStream` / `disconnectStream` | Address must start with `ws`. Topic must start with `/`. Connect sets status live. Every other tick each unit steps 0.04° east. Disconnect sets offline unless a replay is loaded. |
| `updateStream` | Saves the address and topic. |

Geofence: point-in-polygon of unit points against zone rings. A new pair logs `alert.raised` once, until the unit leaves. The tone is played by `DirectoryGate`, not by the API, and only when the sound flag is on and mute is off.

### Administration

Requires `grant.admin` (APEX).

| Function | Rule |
| --- | --- |
| `saveZone` / `saveRoute` | Edit an existing drawn feature. Creating one with no geometry is refused. Draw first. |
| `deleteCatalogue` | Admin check, then delete. |
| `saveTeam` / `deleteTeam` | New id matches `/^[a-z][a-z0-9-]{1,20}$/`. Delete refuses a team that still has features or graphics (`CONFLICT`). |
| `saveRole` / `deleteRole` | Same id rule. Delete refuses a role whose name still matches a user’s role string. |
| `saveUser` / `deleteUser` | Same id rule. Deleting APEX is `PROTECTED`. |
| `setFlag(userId, key, enabled)` | Turns a capability on or off and rebuilds navigation. |
| `updatePassword` | See the session chapter. |

Team icons stored on the record: `shield`, `flag`, `anchor`, `flight`. The map draws a coloured circle from `team.color`, not the glyph. The glyph is for the admin list.

## Feature flags

All default to on. Keys, in menu order:

| Key | Label | Group |
| --- | --- | --- |
| layerOpacity | Layer opacity | Map |
| featureTable | Feature table | Map |
| propertiesPanel | Properties | Map |
| drawingTools | Drawing | Map |
| measurementTools | Measure | Map |
| teamMapIcons | Team markers | Map |
| mapSettings | Map settings | Map |
| planningCanvas | Planning board | Plan |
| planningExport | Plan export | Plan |
| planningShare | Share a plan | Plan |
| planningReview | Plan comments | Plan |
| planningPromote | Promote to zone | Plan |
| geofenceAlerts | Geofence alerts | Exercise |
| alertSound | Alert tone | Exercise |
| alertsPanel | Alerts | Exercise |
| sessionReplay | Session record and replay | Exercise |
| scenarioPlayback | Scenario playback | Exercise |
| simulationExtras | Simulation speed and playback | Exercise |
| liveStream | Live position stream | Exercise |
| statusBadge | Live status | Exercise |
| zonesAdmin | Zones catalogue | Administration |
| routesAdmin | Routes catalogue | Administration |
| adminPanel | Users, teams, and roles | Administration |
| demoMode | Demo badge | Administration |

The flags tool itself stays in the administration group so an administrator can turn things back on. Turning `featureTable` off removes the Features menu item and the docked table.

A flag that is off makes `requireFlag` throw `SWITCHED_OFF` with “This capability is switched off.” The panel also shows that sentence without calling the API.

Simulation extras and exercise control are also hidden unless `canControlGame`.

## How to add a function without touching every screen

1. Write the function in `directory.js`. Check the user, the flag, and the input. Throw `ApiError`. Return `snapshot(userId)`.
2. Add the name to the `export { ... } from './directory'` list in `client.js`.
3. Call it from a panel with `useCommit`.
4. If the tool is new, add it in `navigationFor` and in `PanelBody`, and add a title in `ToolPanel.jsx` and an icon in `navIcons.jsx`.

When a real server arrives, replace the body of the client functions with `fetch`. Keep the same function names, argument order, and snapshot shape, and the panels stay.

Do not import `directory.js` from a component “just this once”. That is the seam you would have to find later.
