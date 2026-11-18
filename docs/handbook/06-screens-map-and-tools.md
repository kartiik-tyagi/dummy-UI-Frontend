# 6. Screens, map, and tools

## Chrome pieces

Every shell uses `TopBar` and `ContextStrip` for the exercise: wordmark, scenario, game, status, clock, and the signed-in user. `ApplicationMenu` is the application menu (scenario management, game, standard data, user management). `MapToolbar` is the picture tools. `ToolDock` shows the tool that was chosen. `StatusFooter` is the readout.

`StatusBadge` shows Live, Offline, or Replay when `flags.statusBadge` is on. Replay wins over Live. Demo shows when the flag `demoMode` is on, or, before the directory loads, when `session.demoMode` is true. It sits in the command bar. The frames do not put a team list under the map.

`IconRail` and `IconStrip` are still in `src/shared/ui/`. The shells do not mount them. A section click does not open a panel. A map tool does.

`ConfirmDialog` is the shared yes/no. Scenario and game confirmation use their own dialog in `ScenarioContext.jsx` because that flow must keep the old value selected until confirm.

## Map stage

`MapStage` reads filters from the session and opacity from the directory. Layer names and the GeoServer WMS address come from the backend map catalog (`/map/config`). The shells pass `readout="none"` and `onReadout`. `StatusFooter` then shows latitude, longitude, height, scale, zoom, and the two CRS names. Height stays blank: this picture has no elevation. Scale is the view resolution at 96 dpi. The cursor is EPSG:4326. The map is EPSG:3857.

`readout="bar"` is a 32px strip under the map. `readout="overlay"` is a small paper at the bottom left. `PictureWorkspace` still uses those. The shells do not.

Changing the GeoServer URL changes `serviceUrl`, which recreates the map. That is intentional.

## Situation map

`SituationMap` creates one OpenLayers `Map` in an effect. It is not a React wrapper. The div is `position: absolute; inset: 0` inside a `position: relative` parent. If that parent’s height is 0, the map is invisible. Layout-2 used to hit that when the workspace was taken out of flow. Keep the parent a flex child with `minHeight: 0` and `flex: 1`.

Tiles are `TileWMS`, version 1.1.1, `serverType: 'geoserver'`, tiled. No `crossOrigin`. Visibility and opacity update in a second effect so the map is not rebuilt when a slider moves.

`onMap(map)` runs after create, and `onMap(null)` on cleanup. `MapWorkbench` waits until `map` is set.

Home animation listens to `resetToken` from the session store. The first run is skipped so login does not animate.

`ResizeObserver` calls `map.updateSize()` so a opening panel does not leave a grey strip.

## Workbench

`MapWorkbench` renders nothing. It adds and removes layers and interactions.

Dependencies that rebuild the vector layer: `revision`, `surface`, `tool`, `curved`, `stampId`, `symbolId`, `userId`, `graphicQuery`. `revision` changes only when the snapshot’s JSON changes.

On the picture it draws features. Units are hidden when team markers are off. Replay positions and scenario markers are extra points. Scenario markers respect the playback flag.

On the board it draws graphics the person owns, or graphics shared with them when `planView` is `shared`. Layer and phase text filters are substrings.

Draw end:

- Measure sets `measure` and does not open the name dialog.
- Anything else sets `pending`. `DraftDialog` asks for a name and a team, then `createFeature` or `createGraphic`. An empty name is rejected by the API with “Enter a name.”

Edit uses `Modify`. The listener is `modify.on('modifyend')`. It is not `map.on('modifyend')`. That event does not exist on the map.

Select uses OpenLayers `Select` with the click condition and opens the entity dialog.

Saved views: `moveend` waits 500 ms and calls `saveMapView` when map settings are on. A ref applies a saved centre once, so the save does not fight the camera.

## Panels

`PanelBody` switches on the panel id. If the directory has not loaded and the panel has a flag, it shows “Opening the directory”. If the flag is off, “This capability is switched off.”

| Panel id | Component | Notes |
| --- | --- | --- |
| filters | `FilterList` | On/off plus opacity slider 0.15–1, step 0.05, committed |
| resources | records from the session | Role-filtered |
| plans | records from the session | Role-filtered |
| exercise-control | `ExerciseControls` | APEX |
| features | `FeatureTable` | Also exported for the dock |
| properties | selected feature, remove | Remove asks `ConfirmDialog` |
| draw | select, unit, route, zone, edit, distance, area, curve, extend | Extend is disabled until something is selected |
| teams | colour legend | |
| map-settings | basemap, URL, layer, zoom, reset views | Apply sends `updateBasemap` |
| planning | board toggle, shapes, stamps, symbols, undo, export, share, comment, promote | |
| alerts | list and mute | |
| sessions | record, name, save, discard, load, scrub, step | |
| scenario-play | play, pause, seek, reset | Slider commits |
| simulation | cadence, time/event, playback, scrub | Scrub also calls `session.seek` |
| stream | address, topic, connect | |
| zones / routes | catalogue edit and delete | |
| directory | users, teams, roles | |
| flags | on/off rows | Not an MUI `Switch`. Those inputs are invisible to automation and easy to miss. |

MUI `Select` accessible name is often the selected value (“Northern Approach”), not the label “Scenario”. When you look for the control in the browser, search the value.

## Theme rules that have already bitten this app

`createAppTheme` must not set `color` on typography variants. MUI then paints text the wrong colour on dark paper.

`MuiIconButton` style overrides must not force `color`. A selected rail icon has to use the primary colour.

`Typography` `display="block"` is the HTML attribute, not CSS. For a block caption use `sx={{ display: 'block' }}`.

`ListItemText` in MUI 9 takes `slotProps`, not `primaryTypographyProps`.

Primary colours come from the catalog row, not from this page. Each theme is its own file under `src/shared/theme/palette/`, and `src/shared/theme/palettes.js` gathers the twenty. `src/shared/theme/swatches.js` holds the twelve map colours and the picture inks. A team locks one of each. APEX may wear any theme without taking it from the team. The map ground uses `background.default`. Unit fill uses the team swatch, so changing the theme does not repaint the forces.

## Drawing a unit, the short version

1. Open Draw and measure.
2. Press Unit.
3. Click the map.
4. The draft dialog opens. Enter a name. Team may be None.
5. Keep. The feature appears in the table and on the map.
6. Cancel discards the geometry. Nothing is stored.

Routes and zones are the same with a line or a ring. Planning shapes work after opening Planning board in the Plan group of the map toolbar.
