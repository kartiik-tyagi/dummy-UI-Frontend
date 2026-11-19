import { useEffect, useState } from 'react'
import { useTheme } from '@mui/material/styles'
import Feature from 'ol/Feature'
import Point from 'ol/geom/Point'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import Translate from 'ol/interaction/Translate'
import { fromLonLat, toLonLat } from 'ol/proj'
import { Circle, Fill, Icon, Stroke, Style, Text } from 'ol/style'
import { httpBlob } from '../shared/api/http'
import { useOrbatPicture } from '../features/orbat/useOrbatPicture'

const iconUrls = new Map()

function loadIcon(path) {
  if (!path) return Promise.resolve('')
  if (iconUrls.has(path)) return Promise.resolve(iconUrls.get(path))
  return httpBlob('/icons/content', { query: { path } })
    .then((blob) => {
      const url = URL.createObjectURL(blob)
      iconUrls.set(path, url)
      return url
    })
    .catch(() => '')
}

function finite(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

/** Spreads markers that share a point so each one can be clicked. Stored coordinates are unchanged. */
function displayPoint(node, indexInGroup, groupSize) {
  const latitude = finite(node.latitude)
  const longitude = finite(node.longitude)
  if (latitude == null || longitude == null || groupSize < 2) return [longitude, latitude]
  const angle = (Math.PI * 2 * indexInGroup) / groupSize
  return [longitude + Math.cos(angle) * 0.02, latitude + Math.sin(angle) * 0.02]
}

/** Draws the open ORBAT draft on the situation map and reports clicks and drags. */
export function OrbatLayer({ map }) {
  const theme = useTheme()
  const active = useOrbatPicture((state) => state.active)
  const nodes = useOrbatPicture((state) => state.nodes)
  const colour = useOrbatPicture((state) => state.colour)
  const placeTypeId = useOrbatPicture((state) => state.placeTypeId)
  const [iconsReady, setIconsReady] = useState(0)

  useEffect(() => {
    if (!map) return undefined
    const source = new VectorSource()
    const layer = new VectorLayer({ source, zIndex: 20 })
    const translate = new Translate({ layers: [layer] })
    map.addLayer(layer)
    map.addInteraction(translate)

    let armed = false
    const onDown = () => {
      armed = true
    }
    const onClick = (event) => {
      if (!armed) return
      armed = false
      const hit = map.forEachFeatureAtPixel(event.pixel, (feature) => feature, { layerFilter: (item) => item === layer })
      if (hit) {
        useOrbatPicture.getState().requestSelect(hit.get('nodeId'))
        return
      }
      if (!useOrbatPicture.getState().placeTypeId) return
      const [longitude, latitude] = toLonLat(event.coordinate)
      useOrbatPicture.getState().requestPlace(longitude, latitude)
    }
    const onEnd = (event) => {
      event.features.forEach((feature) => {
        const [longitude, latitude] = toLonLat(feature.getGeometry().getCoordinates())
        useOrbatPicture.getState().requestMove(feature.get('nodeId'), longitude, latitude)
      })
    }
    map.getViewport().addEventListener('pointerdown', onDown)
    map.on('singleclick', onClick)
    translate.on('translateend', onEnd)
    layer.set('orbat', true)

    return () => {
      translate.un('translateend', onEnd)
      map.getViewport().removeEventListener('pointerdown', onDown)
      map.un('singleclick', onClick)
      map.removeInteraction(translate)
      map.removeLayer(layer)
    }
  }, [map])

  useEffect(() => {
    if (!map) return
    const layer = map.getLayers().getArray().find((item) => item.get('orbat'))
    if (!layer) return
    const source = layer.getSource()
    source.clear()
    if (!active) return
    const placed = nodes.filter((node) => finite(node.latitude) != null && finite(node.longitude) != null)
    const missing = [...new Set(placed.map((node) => node.iconPath).filter((path) => path && !iconUrls.has(path)))]
    if (missing.length) {
      Promise.all(missing.map(loadIcon)).then(() => setIconsReady((value) => value + 1))
    }
    const groups = new Map()
    placed.forEach((node) => {
      const key = `${finite(node.latitude).toFixed(3)}:${finite(node.longitude).toFixed(3)}`
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key).push(node)
    })
    placed.forEach((node) => {
      const key = `${finite(node.latitude).toFixed(3)}:${finite(node.longitude).toFixed(3)}`
      const group = groups.get(key)
      const [longitude, latitude] = displayPoint(node, group.indexOf(node), group.length)
      const feature = new Feature({ geometry: new Point(fromLonLat([longitude, latitude])) })
      feature.set('nodeId', node.id)
      const icon = node.iconPath ? iconUrls.get(node.iconPath) : ''
      feature.setStyle(new Style({
        image: icon
          ? new Icon({ src: icon, scale: 1.5, anchor: [0.5, 0.5] })
          : new Circle({ radius: 6, fill: new Fill({ color: colour }), stroke: new Stroke({ color: theme.palette.background.paper, width: 2 }) }),
        text: new Text({
          text: node.short_name || node.name,
          offsetY: -16,
          font: '12px Roboto',
          fill: new Fill({ color: theme.palette.text.primary }),
          stroke: new Stroke({ color: theme.palette.background.paper, width: 3 }),
        }),
      }))
      source.addFeature(feature)
    })
    map.getTargetElement().style.cursor = placeTypeId ? 'crosshair' : ''
  }, [map, active, nodes, colour, placeTypeId, iconsReady, theme])

  return null
}
