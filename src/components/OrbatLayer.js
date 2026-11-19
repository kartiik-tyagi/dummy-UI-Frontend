import { useEffect, useState } from 'react'
import { useTheme } from '@mui/material/styles'
import Feature from 'ol/Feature'
import Point from 'ol/geom/Point'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import Cluster from 'ol/source/Cluster'
import Translate from 'ol/interaction/Translate'
import { fromLonLat, toLonLat } from 'ol/proj'
import { Circle, Fill, Icon, Stroke, Style, Text } from 'ol/style'
import { useOrbatPicture } from '../features/orbat/useOrbatPicture'
import { CLUSTER_DISTANCE, CLUSTER_MIN_DISTANCE, cachedIcon, finite, loadIcon, membersOf, zoomUntilOneSeparates } from './orbatMarkers'

/** Draws the open ORBAT draft on the situation map. Nearby markers cluster as you zoom out. */
export function OrbatLayer({ map }) {
  const viewerTheme = useTheme()
  const iconTheme = useOrbatPicture((state) => state.iconTheme)
  const active = useOrbatPicture((state) => state.active)
  const nodes = useOrbatPicture((state) => state.nodes)
  const colour = useOrbatPicture((state) => state.colour)
  const placeTypeId = useOrbatPicture((state) => state.placeTypeId)
  const [iconsReady, setIconsReady] = useState(0)

  useEffect(() => {
    if (!map) return undefined
    const source = new VectorSource()
    const clusters = new Cluster({ distance: CLUSTER_DISTANCE, minDistance: CLUSTER_MIN_DISTANCE, source })
    const layer = new VectorLayer({ source: clusters, zIndex: 20 })
    const translate = new Translate({
      layers: [layer],
      filter: (feature) => membersOf(feature).length === 1 && useOrbatPicture.getState().editable,
    })
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
      const members = membersOf(hit)
      if (members.length > 1) {
        const zoom = zoomUntilOneSeparates(map.getView(), source.getFeatures(), members)
        if (zoom == null) return
        const view = map.getView()
        view.cancelAnimations()
        view.animate({ center: hit.getGeometry().getCoordinates(), zoom, duration: 280 })
        return
      }
      if (members.length === 1) {
        useOrbatPicture.getState().requestSelect(members[0].get('nodeId'))
        return
      }
      if (!useOrbatPicture.getState().editable || !useOrbatPicture.getState().placeTypeId) return
      const [longitude, latitude] = toLonLat(event.coordinate)
      useOrbatPicture.getState().requestPlace(longitude, latitude)
    }
    const onEnd = (event) => {
      if (!useOrbatPicture.getState().editable) return
      event.features.forEach((feature) => {
        const member = membersOf(feature)[0]
        if (!member) return
        const [longitude, latitude] = toLonLat(feature.getGeometry().getCoordinates())
        useOrbatPicture.getState().requestMove(member.get('nodeId'), longitude, latitude)
      })
    }
    const atEvent = (event) => {
      const pixel = map.getEventPixel(event)
      const hit = map.forEachFeatureAtPixel(pixel, (feature) => feature, { layerFilter: (item) => item === layer })
      return membersOf(hit).map((feature) => feature.get('nodeId')).filter(Boolean)
    }
    const onMove = (event) => {
      if (event.dragging) return
      const nodeIds = atEvent(event.originalEvent)
      if (!nodeIds.length) {
        useOrbatPicture.getState().clearHover()
        return
      }
      useOrbatPicture.getState().showHover({ x: event.originalEvent.clientX, y: event.originalEvent.clientY, nodeIds })
    }
    const onContext = (event) => {
      event.preventDefault()
      const nodeIds = atEvent(event)
      const [longitude, latitude] = toLonLat(map.getEventCoordinate(event))
      useOrbatPicture.getState().openMenu({ x: event.clientX, y: event.clientY, longitude, latitude, nodeIds })
    }
    const onLeave = () => useOrbatPicture.getState().clearHover()
    map.getViewport().addEventListener('pointerdown', onDown)
    map.getViewport().addEventListener('pointerleave', onLeave)
    map.getViewport().addEventListener('contextmenu', onContext)
    map.on('singleclick', onClick)
    map.on('pointermove', onMove)
    translate.on('translateend', onEnd)
    layer.set('orbat', true)
    layer.set('orbatSource', source)

    return () => {
      translate.un('translateend', onEnd)
      map.getViewport().removeEventListener('pointerdown', onDown)
      map.getViewport().removeEventListener('pointerleave', onLeave)
      map.getViewport().removeEventListener('contextmenu', onContext)
      map.un('pointermove', onMove)
      map.un('singleclick', onClick)
      map.removeInteraction(translate)
      map.removeLayer(layer)
    }
  }, [map])

  useEffect(() => {
    if (!map) return
    const layer = map.getLayers().getArray().find((item) => item.get('orbat'))
    if (!layer) return
    const source = layer.get('orbatSource')
    if (!source) return
    source.clear()
    if (!active) return
    const placed = nodes.filter((node) => finite(node.latitude) != null && finite(node.longitude) != null)
    const missing = iconTheme
      ? [...new Set(placed.map((node) => node.iconPath).filter((path) => path && !cachedIcon(path, iconTheme)))]
      : []
    if (missing.length) {
      Promise.all(missing.map((path) => loadIcon(path, iconTheme))).then(() => setIconsReady((value) => value + 1))
    }
    const byId = new Map(placed.map((node) => [node.id, node]))
    placed.forEach((node) => {
      const feature = new Feature({ geometry: new Point(fromLonLat([finite(node.longitude), finite(node.latitude)])) })
      feature.set('nodeId', node.id)
      source.addFeature(feature)
    })
    layer.setStyle((feature) => {
      const members = membersOf(feature)
      if (members.length > 1) {
        return new Style({
          image: new Circle({
            radius: 15,
            fill: new Fill({ color: viewerTheme.palette.primary.main }),
            stroke: new Stroke({ color: viewerTheme.palette.background.paper, width: 2 }),
          }),
          text: new Text({
            text: String(members.length),
            font: '600 12px Roboto',
            fill: new Fill({ color: viewerTheme.palette.primary.contrastText }),
          }),
        })
      }
      const node = byId.get(members[0]?.get('nodeId'))
      if (!node) return null
      const icon = iconTheme && node.iconPath ? cachedIcon(node.iconPath, iconTheme) : ''
      return new Style({
        image: icon
          ? new Icon({ src: icon, scale: 1.5, anchor: [0.5, 0.5] })
          : new Circle({ radius: 6, fill: new Fill({ color: colour }), stroke: new Stroke({ color: viewerTheme.palette.background.paper, width: 2 }) }),
        text: new Text({
          text: node.short_name || node.name,
          offsetY: -16,
          font: '12px Roboto',
          fill: new Fill({ color: viewerTheme.palette.text.primary }),
          stroke: new Stroke({ color: viewerTheme.palette.background.paper, width: 3 }),
        }),
      })
    })
    map.getTargetElement().style.cursor = placeTypeId ? 'crosshair' : ''
  }, [map, active, nodes, colour, placeTypeId, iconsReady, iconTheme, viewerTheme])

  return null
}
