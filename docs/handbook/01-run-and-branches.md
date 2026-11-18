# 1. Run, build, and the four layouts

## What you need on the machine

| Tool | This project | Notes |
| --- | --- | --- |
| Node.js | `package.json` asks for `>=22.12` and `<25` | The machine that built this copy was Node 20. The app still starts. You may see an `EBADENGINE` warning. That warning is not a crash. |
| npm | Comes with Node | Installs libraries into `node_modules` |
| A browser | Current Chrome or Edge | The app is at `http://127.0.0.1:5173/` |
| GeoServer | Optional | `http://127.0.0.1:8080/geoserver/wms`. Without it the base map tiles fail. The tools, menus, and drawings still work. |

Copy the **whole project folder**, including `node_modules`, when you move to a machine with no network. `package.json` does not list every library the source imports. On this copy these are already installed and the screens import them:

| Import in `src/` | Installed version | Listed in `package.json`? |
| --- | --- | --- |
| `react`, `react-dom` | 19.2 / 19.3 line | Yes |
| `react-router-dom` | 7 | Yes |
| `@mui/material`, `@mui/icons-material`, `@emotion/react`, `@emotion/styled` | MUI 9 | Yes |
| `zustand` | 5 | Yes |
| `dayjs` | 1.11 | Yes |
| `ol` (OpenLayers) | 10.11.0 | **No.** Present in `node_modules`. |
| `zod` | 4.6.7 | **No.** Present in `node_modules`. |
| `@tanstack/react-query` | 5.105.1 | **No.** Present in `node_modules`. |

`leaflet`, `react-leaflet`, and `@mui/x-data-grid` are listed in `package.json`. No file under `src/` imports them. The map uses OpenLayers.

`proj4` is in `node_modules`. No screen imports it. The map uses OpenLayers’ built-in `EPSG:3857` and `EPSG:4326`.

If a fresh `npm install` then fails with “failed to resolve import ol” (or `zod`, or `@tanstack/react-query`), the `node_modules` folder was not copied. On a machine that can see an npm cache or a registry, from the project root:

```text
npm install ol@10.11.0 zod@4.6.7 @tanstack/react-query@5.105.1
```

Air-gapped, that command cannot download. Carry `node_modules` with the source.

## Start

From the project root, in PowerShell:

```text
npm run dev
```

That runs `vite --host 127.0.0.1 --port 5173`. Open `http://127.0.0.1:5173/`. The port is reserved (`strictPort: true` in `vite.config.js`). If something else holds 5173, Vite stops. It does not pick another port.

Sign in as **APEX** with password **123**.

## Build a static copy

```text
npm run build
```

Output is `dist/`. Serve it with:

```text
npm run preview
```

Preview listens on `http://127.0.0.1:4173/`. The preview server is not the dev server. It does not hot-reload.

A production build warning about a chunk larger than 500 kB is expected. OpenLayers and MUI are in one bundle. The build can still succeed.

## The four branches

The same product is checked out as four local git branches. Shared code is the same. Only the shell differs.

| Branch | `src/shell/meta.js` | What the person sees |
| --- | --- | --- |
| `layout-1` | Workstation | Command bar on top. Application menu is a left rail that collapses to icons. Map tools are a shelf over the map and can hide. The tool you open docks on the right. A readout footer spans the bottom. |
| `layout-2` | Menu shelf | No side column. Application is a menu on the command bar. Map tools are a shelf under that bar and can hide. The open tool docks on the right. |
| `layout-3` | Dual rail | Map tools are a rail on the left. The application menu is a rail on the right. Either rail can hide. The open tool docks beside the tool rail. |
| `layout-4` | Command band | The application menu is a named band under the command bar and can hide. Map tools stay hidden until the command bar asks for them. The open tool docks on the right. |

Files that **must stay different** per branch:

- `src/shell/Shell.jsx`
- `src/shell/meta.js`

`meta.js` is not imported by any screen. It labels the branch for a human. The shell is what the browser renders.

Every other file under `src/` should match across the four branches. If you change `src/shared/ui/ToolPanel.jsx` on `layout-1` only, the other three layouts keep the old panel until you copy the file.

See which branch you are on:

```text
git branch --show-current
```

Switch:

```text
git checkout layout-2
```

Vite will reload. You do not restart it for a branch change, unless the terminal was closed.

## PowerShell

This machine’s shell is PowerShell.

- Do not chain commands with `&&`. Use `;`.
- A commit message uses a here-string:

```text
git commit -m @"
Say why the change exists.

"@
```

- `git checkout` of another layout **drops uncommitted edits to tracked files** that differ between branches. Commit, or copy the file out, before you switch if you care about the edit.
- Untracked new files usually come with you when you switch branches.

## What a refresh keeps

| Stored | Key | Survives refresh? | Cleared by sign-out? |
| --- | --- | --- | --- |
| Signed-in user id only | `sessionStorage` `gis-warplan.session` | Yes | Yes |
| Scenario id and game id | `sessionStorage` `gis-warplan.exercise` | Yes | No. The exercise is shared. |
| Password | nowhere | — | Never store it |
| Map filters | memory | No. They return to the role defaults. | — |
| Exercise clock and game status | memory | No. Status returns to Ready. | — |
| Drawn features, plans, flags, recordings | memory inside the API module | No. A refresh reloads the seed. | — |
| Theme | memory, from the user record | The user’s default theme returns. A theme picked in the menu does not stick. | — |

## GeoServer

Base map layers, when the basemap source is GeoServer:

| Filter id | WMS layer |
| --- | --- |
| countries | `ne:countries` |
| places | `ne:populated_places` |
| coast | `ne:coastlines` |
| boundaries | `ne:boundary_lines` |
| disputed | `ne:disputed_areas` |

Home view: latitude 24.5, longitude 82, zoom 5, minimum 3, maximum 12. The ocean of `ne:countries` is transparent, so a dark band around the land is the page background, not a missing tile.

Do not set `crossOrigin: 'anonymous'` on these tiles. The canvas taints and the picture breaks. Image tiles draw without that attribute.
