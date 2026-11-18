# 4. People, session, and the exercise

Appointments are positions. The screen shows the title (APEX, CoSC), not a person’s name.

## Password

The default password for every appointment is `123` until that appointment changes it. The check lives in `fixtures.js` (`checkPassword`, `changePassword`) in a `Map` that starts empty. An empty map means “use `123`”.

`updatePassword` in `directory.js` returns a snapshot on success and throws:

The API always throws code `VALIDATION` for these. The message is what the toast shows.

| When | Message |
| --- | --- |
| Current password does not match | The current password is not correct. |
| New password shorter than 3 characters | Use at least 3 characters. |
| New password equals the current one | Choose a different password. |

The dialog stays open on failure so the person can try again. Never log the password. Never put it in `sessionStorage`.

A refresh forgets a changed password, because the map lives in the module. That is API-client behaviour.

## Appointments

| Id | Title | Grant | Can select scenario | Can control the game | Administration |
| --- | --- | --- | --- | --- | --- |
| apex | APEX | apex | Yes | Yes | Yes |
| cosc | CoSC | direction | Yes | No | No |
| etc | Eastern Theatre Commander | theatre | No | No | No |
| wtc | Western Theatre Commander | theatre | No | No | No |
| ntc | Northern Theatre Commander | theatre | No | No | No |
| esc | Eastern Strike Corps Commander | theatre | No | No | No |
| aoc | Eastern Air Command AoC | air | No | No | No |
| foc | Western Naval Command FoC | maritime | No | No | No |

`canSelectGame` is the same boolean as `canControlGame`. Only APEX changes the game. CoSC can change the scenario and cannot start the clock.

Grants also filter which map layers, resources, and plans the session contains. A maritime session does not receive the boundaries layer or the air plan. The directory menu hides administration unless `grant.admin` is true.

APEX starts on Cobalt, night and may choose any of the twenty catalog themes from the profile menu. That choice stays on his record. CoSC and the theatre appointments sit on Blue force, which uses Pine, night. Eastern Air Command and Western Naval Command sit on Red force, which uses Cobalt, night. They cannot change the theme.

## Sign-in

`LoginPage` loads `getLoginContext()`. The first appointment is selected when the list arrives. Submit calls `login({ userId, password })`.

Failures:

| Case | Result |
| --- | --- |
| Empty password | “Enter the access password.” |
| Wrong password | “Access refused.” Event `auth.rejected`. |
| Unknown user id | “This session is no longer valid.” or the profile error from the schema, depending on where it fails. |
| Success | `signIn` writes `{ userId }` and logs `auth.signed_in` with `persisted: true/false`. |

The form is a floating card about 400px wide, not a side column. The background image is `public/login-background.png`.

## Restore

On load, `SessionGate` calls `restore`:

| Saved value | Result | Log |
| --- | --- | --- |
| No key | Login page | none |
| JSON that is not `{ userId: string }` | Login, notice “The saved session is not valid.” Key removed. | `session.storage_invalid` |
| `sessionStorage` throws | Login, same notice | `session.storage_unreadable` |
| User id the directory does not know | Login, the API message. Key removed. | `session.restore_rejected` |
| Known user | Shell | `session.restored` |

`writeSessionKey` failure still signs in for this tab and logs `persisted: false`. The next refresh asks for the password again.

Sign-out removes `gis-warplan.session`, logs `auth.signed_out`, and resets clock status to Ready. It does not remove `gis-warplan.exercise`.

## Scenario and game

Scenarios: Northern Approach (`northern`), Southern Approach (`southern`).

Games: Alpha open, Bravo open, Charlie closed. A closed game is a disabled menu item “Game Charlie · Closed”.

The dropdowns do not change anything until the person confirms. Cancel closes the dialog and does not log. Choosing the current id is a quiet no-op.

Blocked while status is `running` or `paused`:

- Scenario: “End the game before changing the scenario.” Code `GAME_IN_PROGRESS`.
- Game: “End the game before changing the game.”

`ready` and `ended` allow the change. The clock is not reset by the change. If the API rejects, the dialog stays open with the error so they can end the game and confirm again.

The store checks the rule and logs `scenario.change_rejected` or `game.change_rejected` **before** calling the API, so a blocked click is one log line, not two. The API checks again.

A successful change writes `gis-warplan.exercise` as `{ scenarioId, gameId }` and logs `scenario.changed` or `game.changed`. On the next page load, `hydrateExercise()` in the API adopts that choice. An unknown scenario or a closed or unknown game is dropped with a warning. The default remains.

Labels on the bar are “Scenario” and “Game”.

## Clock

Start instant: `2026-10-28T06:00:00`. While status is `running`, each real second adds 60 exercise seconds (`tick` in the session store). The tick interval is started by `ExerciseClock`.

APEX transport, all no-ops for anyone else:

| Action | From | To |
| --- | --- | --- |
| Start | ready or ended | running. Start does nothing if already running or paused. |
| Pause | running | paused |
| Resume | paused | running |
| Restart | any | ready, clock back to the start instant |
| End | running or paused | ended. Does nothing from ready or ended. |

`seek(epochMs)` is for the simulation scrub. It requires `canControlGame`, sets the clock to that instant, and sets status to `paused`.

## Phases

No shell shows Plan, Conduct, or Review. `applyPhase` is still on the session store. It sets `phaseId` and turns filters on or off from that phase’s `filterIds`. Nothing calls it from the current frames.

| Phase | Layers forced on |
| --- | --- |
| plan | countries, boundaries, places |
| conduct | countries, places, coast |
| review | countries, coast, disputed |

Choosing a filter by hand clears `phaseId`. The frames do not dock a feature table or an alert strip under the map. The readout footer is separate from the map and stays visible.
