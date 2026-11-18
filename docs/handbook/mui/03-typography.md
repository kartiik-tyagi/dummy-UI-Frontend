# Typography

```jsx
import { Typography } from '@mui/material'

<Typography variant="h6" component="h1">
  GIS Warplan
</Typography>
<Typography variant="body2" color="text.secondary" sx={{ display: 'block' }}>
  Northern Approach
</Typography>
<Typography variant="caption" noWrap>
  Blue lead
</Typography>
```

## Variants

| `variant` | Default element | Use |
| --- | --- | --- |
| `h1` … `h6` | `h1` … `h6` | A heading. This theme shrinks `h4` and `h5` with `clamp`. |
| `subtitle1`, `subtitle2` | `h6` | A section label. The top bar uses `subtitle2`. |
| `body1` | `p` | Default. 16px. |
| `body2` | `p` | Denser body. Most panels. |
| `caption` | `span` | Secondary line under a title. |
| `overline` | `span` | Small tracking label. |
| `button` | (mapping) | Matches button type. You rarely set this yourself. |
| `inherit` | `p` | Take the parent’s type. |

`component` overrides the element without changing the look:

```jsx
<Typography variant="h6" component="h1">GIS Warplan</Typography>
```

The visual style is `h6`. The document outline sees `h1`. Use that when the design size and the heading level disagree. Do not skip heading levels for decoration. A page can have one `h1`.

## Colour

`color` is a palette key: `'primary'`, `'text.secondary'` written as `color="text.secondary"`, `'error'`, `'success'`, `'warning'`, `'info'`. Prefer these over a hex so sand and night both stay readable.

There is no `display` prop on `Typography` in this version. `display="block"` does not set CSS display. Caption renders a `span`, which is inline, so a caption that must sit on its own line needs `sx={{ display: 'block' }}` or `component="div"`.

## Wrapping

`noWrap` sets ellipsis. The parent needs a bounded width and, inside a flex row, `minWidth: 0`. Otherwise the text widens the row and never overflows.

`gutterBottom` adds margin under the block. `align="center"` sets text alignment. `paragraph` is not a prop. A stack of paragraphs is several `Typography` nodes, or one with `whiteSpace: 'pre-wrap'` if you must keep line breaks from a string.

## Do not put colour in the theme variant

`createAppTheme` sets size and weight on `h4`, `h5`, `h6`, `body2`, and `button`. It does not set `color` there. A colour inside the variant overrides `color="text.primary"` in a way that breaks the light theme. Set colour on the palette and on the component.
