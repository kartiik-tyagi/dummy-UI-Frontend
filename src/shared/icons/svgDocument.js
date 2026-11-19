import { ICON_TOKEN_IDS } from './iconTheme'

const SVG_NS = 'http://www.w3.org/2000/svg'

const DISPLAY_TAGS = new Set([
  'svg', 'g', 'path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon',
  'text', 'tspan', 'title', 'desc', 'defs', 'lineargradient', 'radialgradient', 'stop', 'clippath',
])

const DISPLAY_ATTRS = new Set([
  'id', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'r', 'rx', 'ry', 'width', 'height', 'd', 'points',
  'viewBox', 'preserveAspectRatio', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin',
  'stroke-dasharray', 'stroke-miterlimit', 'opacity', 'fill-opacity', 'stroke-opacity', 'transform',
  'data-wp-fill', 'data-wp-stroke', 'font-size', 'font-family', 'font-weight', 'text-anchor', 'dx', 'dy',
  'offset', 'stop-color', 'stop-opacity', 'gradientUnits', 'gradientTransform', 'spreadMethod', 'fx', 'fy',
  'clip-path', 'fill-rule', 'clip-rule',
])

const TRANSFORM = /^(?:\s*(?:matrix|translate|scale|rotate|skewX|skewY)\(\s*-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?(?:\s*[, ]\s*-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)*\s*\))+\s*$/i

let sequence = 1

export function newId() {
  sequence += 1
  return `s${sequence}`
}

export function isSvgPath(path) {
  return String(path || '').toLowerCase().endsWith('.svg')
}

export function cssPaint(paint) {
  if (!paint || paint.mode === 'none') return 'none'
  if (paint.mode === 'token') return `var(--wp-${paint.token})`
  return paint.color || '#000000'
}

export function serializeIcon(viewBox, shapes) {
  const x = coord(viewBox?.x || 0)
  const y = coord(viewBox?.y || 0)
  const w = num(viewBox?.w || 24, 1, 10000)
  const h = num(viewBox?.h || 24, 1, 10000)
  const body = (shapes || []).map(serializeShape).filter(Boolean).join('')
  return `<svg xmlns="${SVG_NS}" width="${w}" height="${h}" viewBox="${x} ${y} ${w} ${h}">${body}</svg>`
}

export function parseIcon(markup) {
  const result = { viewBox: { x: 0, y: 0, w: 24, h: 24 }, shapes: [], lossy: false, error: '' }
  if (typeof DOMParser === 'undefined') {
    result.error = 'This file is not an SVG the editor can open.'
    return result
  }
  const doc = new DOMParser().parseFromString(String(markup || ''), 'image/svg+xml')
  const root = doc.documentElement
  if (!root || localName(root) !== 'svg' || doc.querySelector('parsererror')) {
    result.error = 'This file is not an SVG the editor can open.'
    return result
  }
  const parts = (root.getAttribute('viewBox') || '').trim().split(/[\s,]+/).map(Number)
  if (parts.length === 4 && parts.every((part) => Number.isFinite(part)) && parts[2] > 0 && parts[3] > 0) {
    result.viewBox = { x: parts[0], y: parts[1], w: parts[2], h: parts[3] }
  }
  walk(root, null, result)
  return result
}

/** A DOM node safe to append. Scripts, handlers, and external links are left out. */
export function sanitizeToNode(markup) {
  if (typeof DOMParser === 'undefined' || typeof document === 'undefined') return null
  const doc = new DOMParser().parseFromString(String(markup || ''), 'image/svg+xml')
  const root = doc.documentElement
  if (!root || localName(root) !== 'svg' || doc.querySelector('parsererror')) return null
  const svg = document.createElementNS(SVG_NS, 'svg')
  copyElement(root, svg)
  svg.setAttribute('width', '100%')
  svg.setAttribute('height', '100%')
  if (!svg.getAttribute('preserveAspectRatio')) svg.setAttribute('preserveAspectRatio', 'xMidYMid meet')
  svg.setAttribute('aria-hidden', 'true')
  svg.setAttribute('focusable', 'false')
  return svg
}

export function bounds(shape) {
  switch (shape?.type) {
    case 'rect':
      return { x: shape.x, y: shape.y, w: shape.width, h: shape.height }
    case 'ellipse':
      return { x: shape.cx - shape.rx, y: shape.cy - shape.ry, w: shape.rx * 2, h: shape.ry * 2 }
    case 'circle':
      return { x: shape.cx - shape.r, y: shape.cy - shape.r, w: shape.r * 2, h: shape.r * 2 }
    case 'line': {
      const x = Math.min(shape.x1, shape.x2)
      const y = Math.min(shape.y1, shape.y2)
      return { x, y, w: Math.abs(shape.x2 - shape.x1), h: Math.abs(shape.y2 - shape.y1) }
    }
    case 'polygon':
    case 'polyline':
      return pointBounds(shape.points)
    case 'text': {
      const size = shape.fontSize || 4
      const width = Math.max(size, String(shape.text || '').length * size * 0.55)
      const anchor = shape.textAnchor || 'middle'
      const x = anchor === 'middle' ? shape.x - width / 2 : anchor === 'end' ? shape.x - width : shape.x
      return { x, y: shape.y - size, w: width, h: size }
    }
    case 'path': {
      const box = pointBounds(coordinatesIn(shape.d))
      const shift = translateOf(shape.transform)
      return { x: box.x + shift.x, y: box.y + shift.y, w: box.w, h: box.h }
    }
    default:
      return { x: 0, y: 0, w: 0, h: 0 }
  }
}

export function hitShape(shape, point, tolerance) {
  if (!shape) return false
  if (shape.type === 'line') {
    return distanceToSegment(point, { x: shape.x1, y: shape.y1 }, { x: shape.x2, y: shape.y2 }) <= tolerance
  }
  if (shape.type === 'polyline') return nearChain(shape.points, point, tolerance, false)
  if (shape.type === 'polygon') return pointInPolygon(point, shape.points) || nearChain(shape.points, point, tolerance, true)
  if (shape.type === 'ellipse' || shape.type === 'circle') {
    const rx = (shape.type === 'circle' ? shape.r : shape.rx) + tolerance
    const ry = (shape.type === 'circle' ? shape.r : shape.ry) + tolerance
    if (rx <= 0 || ry <= 0) return false
    const nx = (point.x - shape.cx) / rx
    const ny = (point.y - shape.cy) / ry
    return nx * nx + ny * ny <= 1
  }
  const box = bounds(shape)
  return point.x >= box.x - tolerance && point.x <= box.x + box.w + tolerance
    && point.y >= box.y - tolerance && point.y <= box.y + box.h + tolerance
}

export function translateShape(shape, dx, dy) {
  if (!dx && !dy) return shape
  switch (shape.type) {
    case 'rect':
      return { ...shape, x: shape.x + dx, y: shape.y + dy }
    case 'ellipse':
    case 'circle':
      return { ...shape, cx: shape.cx + dx, cy: shape.cy + dy }
    case 'line':
      return { ...shape, x1: shape.x1 + dx, y1: shape.y1 + dy, x2: shape.x2 + dx, y2: shape.y2 + dy }
    case 'polygon':
    case 'polyline':
      return { ...shape, points: (shape.points || []).map((p) => ({ x: p.x + dx, y: p.y + dy })) }
    case 'text':
      return { ...shape, x: shape.x + dx, y: shape.y + dy }
    case 'path':
      return { ...shape, transform: mergeTranslate(shape.transform, dx, dy) }
    default:
      return shape
  }
}

export function handles(shape) {
  if (!shape) return []
  if (shape.type === 'rect') return [{ kind: 'resize', x: shape.x + shape.width, y: shape.y + shape.height }]
  if (shape.type === 'ellipse') return [{ kind: 'resize', x: shape.cx + shape.rx, y: shape.cy + shape.ry }]
  if (shape.type === 'circle') return [{ kind: 'resize', x: shape.cx + shape.r, y: shape.cy }]
  if (shape.type === 'line') {
    return [
      { kind: 'start', x: shape.x1, y: shape.y1 },
      { kind: 'end', x: shape.x2, y: shape.y2 },
    ]
  }
  return []
}

export function applyHandle(shape, kind, point) {
  if (kind === 'resize' && shape.type === 'rect') {
    return { ...shape, width: Math.max(0.4, point.x - shape.x), height: Math.max(0.4, point.y - shape.y) }
  }
  if (kind === 'resize' && shape.type === 'ellipse') {
    return { ...shape, rx: Math.max(0.4, point.x - shape.cx), ry: Math.max(0.4, point.y - shape.cy) }
  }
  if (kind === 'resize' && shape.type === 'circle') {
    return { ...shape, r: Math.max(0.4, Math.hypot(point.x - shape.cx, point.y - shape.cy)) }
  }
  if (shape.type === 'line' && kind === 'start') return { ...shape, x1: point.x, y1: point.y }
  if (shape.type === 'line' && kind === 'end') return { ...shape, x2: point.x, y2: point.y }
  return shape
}

function serializeShape(shape) {
  const paint = `${paintAttr('fill', 'data-wp-fill', shape.fill, true)}${paintAttr('stroke', 'data-wp-stroke', shape.stroke, false)}`
  const stroked = shape.stroke && shape.stroke.mode !== 'none'
  const strokeExtra = stroked
    ? ` stroke-width="${num(shape.strokeWidth || 1, 0, 1000)}"${shape.lineCap ? ` stroke-linecap="${shape.lineCap}"` : ''}${shape.lineJoin ? ` stroke-linejoin="${shape.lineJoin}"` : ''}`
    : ''
  const opacity = shape.opacity != null && shape.opacity < 1 ? ` opacity="${num(shape.opacity, 0, 1)}"` : ''
  const transform = shape.transform ? ` transform="${escapeAttr(shape.transform)}"` : ''
  const common = `${paint}${strokeExtra}${opacity}${transform}`
  switch (shape.type) {
    case 'rect': {
      const width = Number(shape.width)
      const height = Number(shape.height)
      if (!(width > 0) || !(height > 0)) return ''
      const rx = shape.rx ? ` rx="${num(shape.rx, 0, 10000)}"` : ''
      const ry = shape.ry ? ` ry="${num(shape.ry, 0, 10000)}"` : ''
      return `<rect x="${coord(shape.x)}" y="${coord(shape.y)}" width="${num(width, 0, 10000)}" height="${num(height, 0, 10000)}"${rx}${ry}${common}/>`
    }
    case 'ellipse':
      if (!(shape.rx > 0) || !(shape.ry > 0)) return ''
      return `<ellipse cx="${coord(shape.cx)}" cy="${coord(shape.cy)}" rx="${num(shape.rx, 0, 10000)}" ry="${num(shape.ry, 0, 10000)}"${common}/>`
    case 'circle':
      if (!(shape.r > 0)) return ''
      return `<circle cx="${coord(shape.cx)}" cy="${coord(shape.cy)}" r="${num(shape.r, 0, 10000)}"${common}/>`
    case 'line':
      return `<line x1="${coord(shape.x1)}" y1="${coord(shape.y1)}" x2="${coord(shape.x2)}" y2="${coord(shape.y2)}"${common}/>`
    case 'polygon':
    case 'polyline': {
      if (!shape.points || shape.points.length < (shape.type === 'polygon' ? 3 : 2)) return ''
      const points = shape.points.map((p) => `${coord(p.x)},${coord(p.y)}`).join(' ')
      const tag = shape.type === 'polygon' ? 'polygon' : 'polyline'
      return `<${tag} points="${points}"${common}/>`
    }
    case 'path':
      if (!shape.d) return ''
      return `<path d="${escapeAttr(shape.d)}"${common}/>`
    case 'text':
      return `<text x="${coord(shape.x)}" y="${coord(shape.y)}" font-size="${num(shape.fontSize || 4, 0.5, 500)}" font-family="Roboto, sans-serif" text-anchor="${shape.textAnchor || 'middle'}"${common}>${escapeText(String(shape.text || '').slice(0, 200))}</text>`
    default:
      return ''
  }
}

function paintAttr(attr, dataAttr, paint, isFill) {
  if (!paint || paint.mode === 'none') {
    return isFill ? ` ${attr}="none" ${dataAttr}="locked"` : ''
  }
  if (paint.mode === 'token' && ICON_TOKEN_IDS.has(paint.token)) {
    return ` ${attr}="var(--wp-${paint.token})" ${dataAttr}="${paint.token}"`
  }
  const color = isConcreteColor(paint.color) ? String(paint.color).toLowerCase() : '#000000'
  return ` ${attr}="${color}" ${dataAttr}="locked"`
}

function walk(element, inherited, result) {
  element.childNodes.forEach((child) => {
    if (child.nodeType !== 1) return
    const name = localName(child)
    if (name === 'title' || name === 'desc') return
    if (name === 'g') {
      if (child.getAttribute('transform')) result.lossy = true
      walk(child, inheritFrom(child, inherited), result)
      return
    }
    if (name === 'defs' || name === 'lineargradient' || name === 'radialgradient' || name === 'style' || name === 'script' || name === 'clippath') {
      result.lossy = true
      return
    }
    const built = shapeFrom(child, inherited)
    if (!built) {
      result.lossy = true
      return
    }
    if (built.lossy) result.lossy = true
    result.shapes.push(built.shape)
  })
}

function shapeFrom(element, inherited) {
  const name = localName(element)
  const paint = presentation(element, inherited)
  const transform = safeTransform(element.getAttribute('transform'))
  if (element.getAttribute('transform') && !transform) paint.lossy = true
  const base = {
    id: newId(),
    fill: paint.fill,
    stroke: paint.stroke,
    strokeWidth: paint.strokeWidth,
    opacity: paint.opacity,
    lineCap: lineCap(element.getAttribute('stroke-linecap')),
    lineJoin: lineJoin(element.getAttribute('stroke-linejoin')),
    transform: transform || undefined,
  }
  if (element.getAttribute('stroke-dasharray')) paint.lossy = true
  let shape = null
  if (name === 'rect') {
    shape = { ...base, type: 'rect', x: numAttr(element, 'x'), y: numAttr(element, 'y'), width: numAttr(element, 'width'), height: numAttr(element, 'height'), rx: optionalNum(element, 'rx'), ry: optionalNum(element, 'ry') }
  } else if (name === 'ellipse') {
    shape = { ...base, type: 'ellipse', cx: numAttr(element, 'cx'), cy: numAttr(element, 'cy'), rx: numAttr(element, 'rx'), ry: numAttr(element, 'ry') }
  } else if (name === 'circle') {
    shape = { ...base, type: 'circle', cx: numAttr(element, 'cx'), cy: numAttr(element, 'cy'), r: numAttr(element, 'r') }
  } else if (name === 'line') {
    shape = { ...base, type: 'line', x1: numAttr(element, 'x1'), y1: numAttr(element, 'y1'), x2: numAttr(element, 'x2'), y2: numAttr(element, 'y2') }
  } else if (name === 'polygon' || name === 'polyline') {
    const points = parsePoints(element.getAttribute('points'))
    if (points.length < (name === 'polygon' ? 3 : 2)) return null
    shape = { ...base, type: name, points }
  } else if (name === 'path') {
    const d = element.getAttribute('d') || ''
    if (!d || d.length > 8000 || /[<>"]/.test(d)) return null
    shape = { ...base, type: 'path', d: d.trim() }
  } else if (name === 'text') {
    const text = textOf(element)
    if (text.lossy) paint.lossy = true
    shape = {
      ...base,
      type: 'text',
      x: numAttr(element, 'x'),
      y: numAttr(element, 'y'),
      text: text.text || 'Text',
      fontSize: numAttr(element, 'font-size') || 4,
      textAnchor: textAnchor(element.getAttribute('text-anchor')),
    }
  }
  if (!shape) return null
  return { shape, lossy: paint.lossy }
}

function inheritFrom(element, inherited) {
  const paint = presentation(element, inherited)
  return { fill: paint.fill, stroke: paint.stroke, strokeWidth: paint.strokeWidth, opacity: paint.opacity }
}

function presentation(element, inherited) {
  const style = readStyle(element)
  const fill = readPaint(element, 'fill', 'data-wp-fill', style.fill, inherited?.fill)
  const stroke = readPaint(element, 'stroke', 'data-wp-stroke', style.stroke, inherited?.stroke)
  const strokeWidth = numberOr(element.getAttribute('stroke-width') || style.strokeWidth, inherited?.strokeWidth ?? 1)
  const opacity = numberOr(element.getAttribute('opacity') || style.opacity, inherited?.opacity ?? 1)
  const name = localName(element)
  const defaultFill = name === 'line' || name === 'polyline' ? { mode: 'none' } : { mode: 'locked', color: '#000000' }
  return {
    fill: fill.paint || defaultFill,
    stroke: stroke.paint || { mode: 'none' },
    strokeWidth: strokeWidth == null ? 1 : strokeWidth,
    opacity: opacity == null ? 1 : Math.max(0, Math.min(1, opacity)),
    lossy: Boolean(style.lossy || fill.lossy || stroke.lossy),
  }
}

function readPaint(element, attr, dataAttr, styleValue, fallback) {
  const role = element.getAttribute(dataAttr)
  const raw = element.getAttribute(attr) || styleValue || ''
  if (!raw && !role) return { paint: fallback || null, lossy: false }
  if (raw === 'none' || raw === 'transparent') return { paint: { mode: 'none' }, lossy: false }
  if (role && role !== 'locked' && role !== 'current' && ICON_TOKEN_IDS.has(role)) {
    return { paint: { mode: 'token', token: role }, lossy: false }
  }
  const variable = /^var\(\s*--wp-([A-Za-z]+)\s*\)$/.exec(raw)
  if (variable && ICON_TOKEN_IDS.has(variable[1])) return { paint: { mode: 'token', token: variable[1] }, lossy: false }
  if (raw === 'currentColor' || role === 'current') return { paint: { mode: 'token', token: 'textPrimary' }, lossy: false }
  if (isConcreteColor(raw)) return { paint: { mode: 'locked', color: String(raw).toLowerCase() }, lossy: false }
  return { paint: fallback || { mode: 'none' }, lossy: true }
}

function readStyle(element) {
  const style = element.getAttribute('style') || ''
  if (!style) return { lossy: false }
  if (/url\(|expression|javascript|@import/i.test(style)) return { lossy: true }
  const found = { lossy: false }
  style.split(';').forEach((part) => {
    const index = part.indexOf(':')
    if (index < 0) return
    const key = part.slice(0, index).trim().toLowerCase()
    const value = part.slice(index + 1).trim()
    if (key === 'fill' || key === 'stroke' || key === 'opacity') found[key] = value
    else if (key === 'stroke-width') found.strokeWidth = value
    else if (key) found.lossy = true
  })
  return found
}

function copyElement(source, target) {
  copyAttributes(source, target)
  absorbStyle(source, target)
  source.childNodes.forEach((child) => {
    if (child.nodeType === 3) {
      if (isTextTag(localName(target)) && child.textContent) {
        target.appendChild(document.createTextNode(child.textContent.slice(0, 200)))
      }
      return
    }
    if (child.nodeType !== 1) return
    const name = localName(child)
    if (!DISPLAY_TAGS.has(name) || name === 'svg') return
    const next = document.createElementNS(SVG_NS, child.localName || child.nodeName)
    copyElement(child, next)
    target.appendChild(next)
  })
}

function copyAttributes(source, target) {
  for (let i = 0; i < source.attributes.length; i += 1) {
    const attr = source.attributes[i]
    const name = attr.localName || attr.name
    if (!isSafeAttribute(name, attr.value)) continue
    target.setAttribute(name, attr.value.trim())
  }
}

function absorbStyle(source, target) {
  const style = readStyle(source)
  ;['fill', 'stroke', 'opacity'].forEach((key) => {
    if (!style[key] || target.hasAttribute(key)) return
    if ((key === 'fill' || key === 'stroke') && !isPaintValue(style[key])) return
    if (key === 'opacity' && !isUnit(style[key], 0, 1)) return
    target.setAttribute(key, style[key])
  })
  if (style.strokeWidth && !target.hasAttribute('stroke-width') && isLength(style.strokeWidth)) {
    target.setAttribute('stroke-width', style.strokeWidth)
  }
}

function isSafeAttribute(name, value) {
  if (!name || name.includes(':') || name === 'xmlns' || name.length > 40) return false
  const lower = name.toLowerCase()
  if (lower.startsWith('on') || lower === 'href' || lower === 'src' || lower === 'style') return false
  if (!DISPLAY_ATTRS.has(name) || value == null || String(value).length > 8000) return false
  if (/javascript:|expression\s*\(/i.test(value)) return false
  if (name === 'fill' || name === 'stroke' || name === 'stop-color' || name === 'color') return isPaintValue(value)
  if (name === 'clip-path') return /^url\(#[A-Za-z_][A-Za-z0-9_-]{0,40}\)$/.test(value.trim())
  if (name === 'transform' || name === 'gradientTransform') return TRANSFORM.test(value.trim())
  if (name === 'id') return /^[A-Za-z_][A-Za-z0-9_-]{0,40}$/.test(value.trim())
  if (name === 'data-wp-fill' || name === 'data-wp-stroke') return value === 'locked' || value === 'current' || ICON_TOKEN_IDS.has(value)
  return true
}

function isPaintValue(value) {
  const text = String(value || '').trim()
  if (/^(none|transparent|currentColor)$/i.test(text)) return true
  if (isConcreteColor(text)) return true
  const variable = /^var\(\s*--wp-([A-Za-z]+)\s*\)$/.exec(text)
  if (variable) return ICON_TOKEN_IDS.has(variable[1])
  return /^url\(#[A-Za-z_][A-Za-z0-9_-]{0,40}\)$/.test(text)
}

function isConcreteColor(value) {
  const text = String(value || '').trim()
  if (/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(text)) return true
  return /^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(?:,\s*(?:0|1|0?\.\d+)\s*)?\)$/.test(text)
}

function isLength(value) {
  return /^-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?(?:px)?$/i.test(String(value || '').trim())
}

function isUnit(value, min, max) {
  const n = Number(value)
  return Number.isFinite(n) && n >= min && n <= max
}

function isTextTag(name) {
  return name === 'text' || name === 'tspan' || name === 'title' || name === 'desc'
}

function textOf(element) {
  let text = ''
  let lossy = false
  element.childNodes.forEach((child) => {
    if (child.nodeType === 3) text += child.textContent
    else if (child.nodeType === 1 && localName(child) === 'tspan') {
      lossy = true
      text += textOf(child).text
    } else if (child.nodeType === 1 && localName(child) !== 'title' && localName(child) !== 'desc') lossy = true
  })
  return { text: text.replace(/\s+/g, ' ').trim().slice(0, 200), lossy }
}

function safeTransform(value) {
  const text = String(value || '').trim()
  if (!text) return ''
  return TRANSFORM.test(text) ? text.replace(/\s+/g, ' ') : ''
}

function parsePoints(text) {
  const nums = String(text || '').trim().split(/[\s,]+/).map(Number).filter((n) => Number.isFinite(n))
  const points = []
  for (let i = 0; i + 1 < nums.length; i += 2) points.push({ x: nums[i], y: nums[i + 1] })
  return points
}

function pointBounds(points) {
  if (!points?.length) return { x: 0, y: 0, w: 0, h: 0 }
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  points.forEach((p) => {
    minX = Math.min(minX, p.x)
    minY = Math.min(minY, p.y)
    maxX = Math.max(maxX, p.x)
    maxY = Math.max(maxY, p.y)
  })
  return { x: minX, y: minY, w: Math.max(0, maxX - minX), h: Math.max(0, maxY - minY) }
}

function coordinatesIn(d) {
  const nums = String(d || '').match(/-?(?:\d+\.?\d*|\.\d+)/g)?.map(Number) || []
  const points = []
  for (let i = 0; i + 1 < nums.length; i += 2) points.push({ x: nums[i], y: nums[i + 1] })
  return points
}

function translateOf(transform) {
  const match = /translate\(\s*(-?\d+(?:\.\d+)?)\s*[ ,]\s*(-?\d+(?:\.\d+)?)\s*\)/.exec(transform || '')
  if (!match) return { x: 0, y: 0 }
  return { x: Number(match[1]), y: Number(match[2]) }
}

function mergeTranslate(existing, dx, dy) {
  const current = String(existing || '').trim()
  const match = /^translate\(\s*(-?\d+(?:\.\d+)?)\s*[ ,]\s*(-?\d+(?:\.\d+)?)\s*\)$/.exec(current)
  if (!current) return `translate(${coord(dx)} ${coord(dy)})`
  if (match) return `translate(${coord(Number(match[1]) + dx)} ${coord(Number(match[2]) + dy)})`
  return `${current} translate(${coord(dx)} ${coord(dy)})`
}

function distanceToSegment(point, a, b) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = dx * dx + dy * dy
  if (!len) return Math.hypot(point.x - a.x, point.y - a.y)
  const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / len))
  return Math.hypot(point.x - (a.x + t * dx), point.y - (a.y + t * dy))
}

function nearChain(points, point, tolerance, closed) {
  if (!points?.length) return false
  for (let i = 0; i < points.length - 1; i += 1) {
    if (distanceToSegment(point, points[i], points[i + 1]) <= tolerance) return true
  }
  if (closed && points.length > 2 && distanceToSegment(point, points[points.length - 1], points[0]) <= tolerance) return true
  return false
}

function pointInPolygon(point, points) {
  if (!points || points.length < 3) return false
  let inside = false
  for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
    const yi = points[i].y
    const yj = points[j].y
    const intersect = (yi > point.y) !== (yj > point.y)
      && point.x < ((points[j].x - points[i].x) * (point.y - yi)) / ((yj - yi) || 0.00001) + points[i].x
    if (intersect) inside = !inside
  }
  return inside
}

function localName(node) {
  return (node?.localName || node?.nodeName || '').toLowerCase()
}

function numAttr(element, name) {
  const value = Number(element.getAttribute(name))
  return Number.isFinite(value) ? value : 0
}

function optionalNum(element, name) {
  if (!element.hasAttribute(name)) return undefined
  const value = Number(element.getAttribute(name))
  return Number.isFinite(value) ? value : undefined
}

function numberOr(value, fallback) {
  if (value == null || value === '') return fallback
  const n = Number(String(value).replace(/px$/i, ''))
  return Number.isFinite(n) ? n : fallback
}

function lineCap(value) {
  return value === 'round' || value === 'square' || value === 'butt' ? value : undefined
}

function lineJoin(value) {
  return value === 'round' || value === 'bevel' || value === 'miter' ? value : undefined
}

function textAnchor(value) {
  return value === 'start' || value === 'end' || value === 'middle' ? value : 'middle'
}

function coord(value) {
  return num(value, -10000, 10000)
}

function num(value, min, max) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '0'
  const clamped = Math.max(min, Math.min(max, Math.round(n * 100) / 100))
  return String(Object.is(clamped, -0) ? 0 : clamped)
}

function escapeAttr(value) {
  return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
}

function escapeText(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
