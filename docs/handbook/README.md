# GIS Warplan frontend handbook

Human reference for people working **without the internet**. The running code is the authority. If a page here disagrees with a file under `src/`, trust the file and correct this handbook later.

This book has three jobs:

1. Let you run, read, change, and extend **this** application.
2. Teach enough **React** that you can do that work, and ordinary React work, from these pages alone.
3. Teach **Material UI 9** and styling the same way, one component at a time, for the libraries installed in this folder.

You do not need a backend. Sign-in, the map tools, planning, the exercise, and administration all talk to a API client inside `src/shared/api/`. A future real server replaces that folder. The screens stay.

## Read this first

| Order | Page | You will be able to |
| --- | --- | --- |
| 1 | [Run, build, and the four layouts](01-run-and-branches.md) | Start the app on this machine and know which branch you are on |
| 2 | [How the app is built](02-how-the-app-is-built.md) | Follow a click from the browser to the API client and back |
| 3 | [File catalog](03-file-catalog.md) | Open the right file the first time |
| 4 | [People, session, and the exercise](04-people-session-and-exercise.md) | Sign in, restore a refresh, change scenario and game |
| 5 | [API client](05-api-client.md) | Add or replace data without touching a screen |
| 6 | [Screens, map, and tools](06-screens-map-and-tools.md) | Change a panel, a layout, or the map |
| 7 | [Recipes](07-recipes.md) | Do the common jobs step by step |
| 8 | [Debugging and logs](08-debugging.md) | Read a blank page, a toast, and a console line |
| 9 | [Cheat sheet](09-cheat-sheet.md) | Look up a path, a command, a role, or a flag |

React, from the language up through the libraries this repo uses:

| Page | You will be able to |
| --- | --- |
| [React handbook index](react/README.md) | Choose the chapter you need |
| [JavaScript used here](react/01-javascript-for-this-project.md) | Read every file in `src/` |
| [Components, JSX, and props](react/02-components-jsx-props.md) | Write and change a component |
| [State, events, and effects](react/03-state-events-effects.md) | Make the screen update, and stop it updating too often |
| [Lists, forms, and routing](react/04-lists-forms-routing.md) | Build a panel, a dialog, and a page |
| [Data, Zustand, Query, and MUI](react/05-data-zustand-query-mui.md) | Store data and lay out a screen the way this app does |
| [Vite, debugging, recipes](react/06-vite-debugging-recipes.md) | Run, break, and fix a React app offline |
| [React cheat sheet](react/07-cheat-sheet.md) | Copy a pattern without searching the web |
| [How React works](react/08-how-react-works.md) | Follow a state change from the click to the screen |
| [Hooks](react/09-hooks.md) | Pick the right hook and avoid the stale-value bugs |

Material UI 9.5, one chapter per component. The index is [Material UI](mui/README.md).

Styling, from plain CSS through `sx` and `styled`, is [Styling](styling/README.md).

## I want to…

| Goal | Go to |
| --- | --- |
| Start the app | [01 — Run](01-run-and-branches.md) |
| Sign in | [04 — Session](04-people-session-and-exercise.md). Password is `123` |
| Understand a file | [03 — Catalog](03-file-catalog.md) |
| Add a tool to the menu | [07 — Recipes](07-recipes.md), recipe 1 |
| Add a feature switch | [07 — Recipes](07-recipes.md), recipe 2 |
| Change only one layout | [01 — Branches](01-run-and-branches.md) and [06 — Screens](06-screens-map-and-tools.md) |
| Put a change on all four layouts | [07 — Recipes](07-recipes.md), recipe 8 |
| Replace the API client with HTTP later | [05 — API client](05-api-client.md) |
| The page is blank | [08 — Debugging](08-debugging.md) |
| Learn a React hook | [Hooks](react/09-hooks.md) |
| See why React re-rendered | [How React works](react/08-how-react-works.md) |
| Build a table, menu, sidebar, or form | [Material UI](mui/README.md) |
| Change spacing, colour, or layout CSS | [Styling](styling/README.md) |
| Change colours | [06 — Screens](06-screens-map-and-tools.md) and `src/shared/theme/createAppTheme.js` |
| Draw on the map | [06 — Screens](06-screens-map-and-tools.md) |

## What this application is

GIS Warplan is a GIS picture for an exercise. People sign in by **appointment** (APEX, CoSC, a theatre commander), not by a personal name. The map is the product. Filters, resources, plans, themes, and the menu come from the server stand-in. Layout geometry is fixed in each branch’s `src/shell/Shell.jsx`.

There is no ORBAT screen. Do not add one unless someone asks for a new product.

## What is deliberately not in the product

These exist in the older GIS Foundation application and are **not** built here. Do not document them as if they were, and do not start them unless asked:

- GeoJSON import
- A 3D Cesium globe
- An audit-log screen
- A real authentication server
- Server-enforced role permissions
- An in-app config editor for JSON files
- A live STOMP / Kafka / ActiveMQ client (the stream panel is a stream walker inside the API)

`public/config` was removed. Product configuration comes from the backend (`/auth/login-context`, `/map/config`, directory masters).

## How to keep this book true

After you change behaviour, update the chapter that describes it. A recipe that names a file which does not exist is wrong. Delete or rewrite that step.
