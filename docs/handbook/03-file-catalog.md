# 3. File catalog

Every file under `src/` that the app loads. Paths are from the project root. “Differs by branch” means `layout-1` … `layout-4` are allowed to disagree. Everything else should be identical.

## Entry

| File | Purpose |
| --- | --- |
| `index.html` | The only HTML page. Title starts as “GIS Warplan”. Root node is `#root`. |
| `vite.config.js` | React plugin. Dev `127.0.0.1:5173`. Preview `127.0.0.1:4173`. Both strict. |
| `src/main.jsx` | `createRoot`, `StrictMode`, fonts, CSS. |
| `src/index.css` | Page height. The map needs a parent with a real height. |
| `src/app/App.jsx` | Providers, then `DirectoryGate` around the shell, toasts, entity dialog, draft dialog. |
| `src/app/queryClient.js` | TanStack client. Memory only. Retry 1. No refetch on window focus. Cache time 5 minutes. |
| `src/app/ThemeBridge.jsx` | `createAppTheme` from the session theme, or the login context theme while signed out. |
| `src/app/SessionGate.jsx` | Blocks children until `restore()` finishes. |
| `src/app/DirectoryGate.jsx` | Loads and clears the workbench. Plays a tone when a new alert id appears. |

## Shell (differs by branch)

| File | Purpose |
| --- | --- |
| `src/shell/Shell.jsx` | Routes `/login` and `/`. The frame for this branch. |
| `src/shell/meta.js` | `LAYOUT_ID` and `LAYOUT_NAME`. Not imported. A label for humans. |

| Branch | Frame |
| --- | --- |
| layout-1 | Workstation. Application rail on the left, map-tool shelf, tool dock on the right |
| layout-2 | Menu shelf. Application menu in the command bar, map-tool shelf under it |
| layout-3 | Dual rail. Map tools on the left, application menu on the right |
| layout-4 | Command band. Named application band, map tools on request |

## Login and session

| File | Purpose |
| --- | --- |
| `src/features/login/LoginPage.jsx` | Floating form over `public/login-background.png`. Position select, password, sign in. |
| `src/features/session/useSessionStore.js` | Sign-in, restore, sign-out, scenario, game, theme, filters, phases, clock, `seek`. |
| `src/features/session/useSections.js` | The four layout sections from `session.sections`. Selection does not open a page. |
| `src/features/session/useChrome.js` | Which panel is open, whether the rail is expanded, the user menu. Not persisted. |
| `src/shared/lib/sessionKey.js` | Read and write `gis-warplan.session` and `gis-warplan.exercise`. |
| `src/shared/lib/logger.js` | `info`, `warn`, `error`. |
| `src/shared/lib/gameStatus.js` | Labels Ready, Running, Paused, Ended. |
| `src/shared/lib/tone.js` | Short beep. Swallows autoplay refusal. |
| `src/shared/lib/empty.js` | `EMPTY_LIST` and `EMPTY_OBJECT` for Zustand selectors. |

## API client

| File | Purpose |
| --- | --- |
| `src/shared/api/client.js` | The only module UI code imports for data. Login, session, scenario, game, and a re-export of the directory. |
| `src/shared/api/directory.js` | Picture, plan, alerts, recordings, simulation, stream, catalogues, users, flags, password, map settings. |
| `src/shared/api/fixtures.js` | Residual map defaults (clock start, planned centers). Login and directory data come from the backend. |
| `src/shared/api/errors.js` | `ApiError` with `message` and `code`. Re-exported from `client.js`. |

## Directory store

| File | Purpose |
| --- | --- |
| `src/features/directory/useDirectoryStore.js` | Snapshot, revision, tool state, `load`, `reset`, `run`. |
| `src/features/directory/useNavigation.js` | `useNavigation()` and `useSignedUserId()`. |
| `src/features/feedback/useToastStore.js` | `push(message, severity)`. Dismisses after 4.2 seconds. |

## Map

| File | Purpose |
| --- | --- |
| `src/components/SituationMap.jsx` | OpenLayers map, GeoServer WMS tiles, pointer, zoom, home animation. Calls `onMap`. |
| `src/components/MapWorkbench.jsx` | Vector features, draw, edit, select, measure, saved view. Renders `null`. |
| `src/shared/ui/MapStage.jsx` | Combines the base map, the workbench, and the measure chip. Reports cursor and view to the footer. |
| `src/shared/ui/StatusFooter.jsx` | Latitude, longitude, height, scale, zoom, and CRS. |
| `src/shared/ui/ApplicationMenu.jsx` | Application sections as a rail, a band, an icon row, or a menu. |
| `src/shared/ui/MapToolbar.jsx` | Map, plan, game, and administration tools. Each group opens on its own. |
| `src/shared/ui/ToolDock.jsx` | Holds `ToolPanel` beside the map, or under it on a narrow screen. |
| `src/shared/ui/PictureWorkspace.jsx` | `dock` / `overlay` / `plain` / `phase` around `MapStage`. |

## Chrome components

| File | Purpose |
| --- | --- |
| `src/shared/ui/TopBar.jsx` | Wordmark, scenario, game, status, clock, game chip, user menu. `ContextStrip` is the second row on some layouts. |
| `src/shared/ui/IconRail.jsx` | Vertical grouped menu. Collapses to icons. |
| `src/shared/ui/IconStrip.jsx` | Horizontal grouped menu. Passes the click event so layout-3 can anchor a popover. |
| `src/shared/ui/navIcons.jsx` | Icon name to MUI icon. Unknown names fall back to the layers icon. |
| `src/shared/ui/ToolPanel.jsx` | Title, close, and `<PanelBody panel={panel} />`. |
| `src/shared/ui/workbench/Panels.jsx` | Every tool body, plus `FeatureTable`. |
| `src/shared/ui/FilterList.jsx` | Layer on/off and opacity. |
| `src/shared/ui/ScenarioContext.jsx` | Scenario and game controls, with confirmation. |
| `src/shared/ui/ExerciseClock.jsx` | Exercise time. |
| `src/shared/ui/ExerciseControls.jsx` | Start, pause, resume, restart, end. APEX only. |
| `src/shared/ui/GameStateChip.jsx` | Ready / Running / Paused / Ended. |
| `src/shared/ui/StatusBadge.jsx` | Live / Offline / Replay, and Demo. |
| `src/shared/ui/UserMenu.jsx` | Theme, change password, sign out. |
| `src/shared/ui/ConfirmDialog.jsx` | Shared yes/no dialog. |
| `src/shared/ui/DraftDialog.jsx` | Name and team after a draw. |
| `src/shared/ui/EntityDialog.jsx` | Read-only details for the selected feature or graphic. |
| `src/shared/ui/ToastHost.jsx` | Stack of alerts, bottom right. |
| `src/shared/theme/createAppTheme.js` | MUI theme from the server colour record. |

Small states, reused by panels:

| File | Purpose |
| --- | --- |
| `src/shared/ui/LoadingState.jsx` | Centred label. |
| `src/shared/ui/EmptyState.jsx` | Title and message when a list is empty. |
| `src/shared/ui/ErrorState.jsx` | Title, message, retry. |
| `src/shared/ui/Panel.jsx` | Title block. Not the tool panel chrome. |
| `src/shared/ui/PasswordField.jsx` | Password input used by login. |
| `src/shared/ui/PositionSelect.jsx` | Appointment dropdown. |

## Static files that are used

| File | Purpose |
| --- | --- |
| `public/login-background.png` | Login backdrop. |
| `public/favicon.svg` | Tab icon. |
| `public/avatars/*.svg` | Appointment portraits. URLs are on the user record. |

## Static files that are not used

`public/config/app.json`, `layout.json`, `map.json`, `navigation.json`, `forces.json`, `scenario.json`, `theme.json`. Nothing in `src/` fetches them. Change `fixtures.js` or `directory.js` instead.

## Where a change belongs

| You want to change | Edit |
| --- | --- |
| Who can sign in, their grant, theme, filters | `fixtures.js` |
| A picture, plan, flag, alert, recording, catalogue | `directory.js`, then the panel if the screen needs a new control |
| Wording of a toast that comes from the API | The `ApiError` message in `client.js` or `directory.js` |
| Which panel id shows which component | `ToolPanel.jsx` titles and `PanelBody` in `Panels.jsx` |
| Where the panel sits on one layout | That branch’s `Shell.jsx` only |
| Colour rules for every theme | `createAppTheme.js` |
| A colour for one theme | The theme object in `fixtures.js` |
| What survives refresh | `sessionKey.js` and the session store. Do not persist the directory. |
