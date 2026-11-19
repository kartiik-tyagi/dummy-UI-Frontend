import { httpBlob, httpText } from '../shared/api/http'
import { iconCssVars, resolveThemedSvg } from '../shared/icons/iconTheme'
import { isSvgPath } from '../shared/icons/svgDocument'

const iconUrls = new Map()

export const CLUSTER_DISTANCE = 42
export const CLUSTER_MIN_DISTANCE = 18

function themeStamp(theme) {
  return Object.entries(iconCssVars(theme)).map(([name, value]) => `${name}=${value}`).join(';')
}

export function iconKey(path, theme) {
  return `${path}\n${themeStamp(theme)}`
}

export function cachedIcon(path, theme) {
  if (!path) return ''
  return iconUrls.get(iconKey(path, theme)) || ''
}

export function loadIcon(path, theme) {
  if (!path) return Promise.resolve('')
  const key = iconKey(path, theme)
  if (iconUrls.has(key)) return Promise.resolve(iconUrls.get(key))
  const request = isSvgPath(path)
    ? httpText('/icons/content', { query: { path } }).then((markup) => new Blob([resolveThemedSvg(markup, theme)], { type: 'image/svg+xml' }))
    : httpBlob('/icons/content', { query: { path } })
  return request
    .then((blob) => {
      const url = URL.createObjectURL(blob)
      iconUrls.set(key, url)
      return url
    })
    .catch(() => '')
}

export function finite(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

export function membersOf(feature) {
  return feature?.get('features') || []
}

/**
 * Same grouping as OpenLayers: a point joins the first seed whose square of
 * CLUSTER_DISTANCE pixels contains it. Feature order is the source order.
 */
export function clusterGroups(features, resolution) {
  const reach = CLUSTER_DISTANCE * resolution
  const used = new Set()
  const groups = []
  for (const feature of features) {
    if (used.has(feature)) continue
    const origin = feature.getGeometry()?.getCoordinates()
    if (!origin) continue
    const group = []
    for (const neighbor of features) {
      if (used.has(neighbor)) continue
      const point = neighbor.getGeometry()?.getCoordinates()
      if (!point) continue
      if (Math.abs(point[0] - origin[0]) <= reach && Math.abs(point[1] - origin[1]) <= reach) {
        used.add(neighbor)
        group.push(neighbor)
      }
    }
    groups.push(group)
  }
  return groups
}

/** Next zoom at which the clicked group is no longer one cluster. Null when zoom cannot separate them. */
export function zoomUntilOneSeparates(view, features, members) {
  const start = view.getZoom()
  const max = view.getMaxZoom()
  if (start == null || members.length < 2) return null
  const wanted = new Set(members)
  const together = (zoom) => clusterGroups(features, view.getResolutionForZoom(zoom)).some((group) => {
    let count = 0
    for (const feature of group) if (wanted.has(feature)) count += 1
    return count === members.length
  })
  const last = Math.floor(max * 10)
  for (let tenths = Math.floor(start * 10) + 1; tenths <= last; tenths += 1) {
    const zoom = tenths / 10
    if (!together(zoom)) return zoom
  }
  return null
}
