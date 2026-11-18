# Snackbar and Alert

## Alert

A sentence inside the page. Login errors use this.

```jsx
import { Alert } from '@mui/material'

<Alert severity="error" onClose={() => setMessage('')}>
  The current password is not correct.
</Alert>
<Alert severity="warning">End the game before changing the scenario.</Alert>
<Alert severity="info">This capability is switched off.</Alert>
<Alert severity="success">Password changed.</Alert>
```

`severity` sets the colour and the icon. `variant` is `standard` (default), `outlined`, or `filled`. `onClose` shows a close icon and is called when it is pressed. Without `onClose` there is no close icon.

`AlertTitle` is an optional bold first line:

```jsx
<Alert severity="error">
  <AlertTitle>GIS Warplan is unavailable</AlertTitle>
  The session could not be read.
</Alert>
```

Put an alert in the form, above the button, when the person must read it before they continue. Put a toast at the edge of the screen when the work already happened and the page should stay put.

## Snackbar

A toast. This app’s `ToastHost` is the shared one, driven by `useToastStore`. Prefer `push(message, 'error')` so every panel toasts the same way. Build a `Snackbar` yourself only for a local, non-error notice that the store should not know about.

```jsx
import { Alert, Snackbar } from '@mui/material'

<Snackbar
  open={open}
  autoHideDuration={4200}
  onClose={(_, reason) => {
    if (reason === 'clickaway') return
    setOpen(false)
  }}
  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
>
  <Alert severity="error" variant="filled" onClose={() => setOpen(false)} sx={{ width: '100%' }}>
    {message}
  </Alert>
</Snackbar>
```

`autoHideDuration` is milliseconds. `4200` matches the app’s toast. `onClose` runs for the timeout, Escape, and a click outside. Returning early on `'clickaway'` keeps the toast up when the person clicks the map. A click on the Alert’s close icon is your `setOpen(false)`.

The snackbar anchors to the viewport. `bottom` / `right` stays clear of a left rail. `bottom` / `center` covers the map’s scale line. Prefer the right.

One snackbar at a time unless you queue them. Two `Snackbar`s with `open` stack badly. The toast store is a queue. Use it.

## What the text should say

Repeat the API’s sentence. Do not invent a friendlier one that hides the cause. “The current password is not correct.” is the message. “Something went wrong.” is not.

Do not put a password, a token, or a stack trace in the toast. `error.message` from `ApiError` is the line that was written for a person.

## Banner versus toast

| Situation | Use |
| --- | --- |
| Login failed and the form is still there | `Alert` in the form |
| Save failed and a dialog is open | Toast, dialog stays open |
| A capability is switched off and the panel is empty | `Alert` or the existing empty sentence inside the panel |
| The session was restored | Nothing. Do not toast a success on every refresh. |
