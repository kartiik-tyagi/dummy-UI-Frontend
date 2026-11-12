import { useEffect, useRef } from 'react'
import Draw, { createBox } from 'ol/interaction/Draw'
import Modify from 'ol/interaction/Modify'
import Select from 'ol/interaction/Select'
import VectorLayer from 'ol/layer/Vector'
import TileLayer from 'ol/layer/Tile'
import VectorSource from 'ol/source/Vector'
import XYZ from 'ol/source/XYZ'
import GeoJSON from 'ol/format/GeoJSON'
import Point from 'ol/geom/Point'
import { fromCircle } from 'ol/geom/Polygon'
import { fromLonLat, toLonLat } from 'ol/proj'
import { getArea, getLength } from 'ol/sphere'
import { Circle as CircleStyle, Fill, RegularShape, Stroke, Style, Text } from 'ol/style'
import { click } from 'ol/events/condition'
import * as api from '../shared/api/client'
import { useCommit, useDirectoryStore } from '../features/directory/useDirectoryStore'
import { useSessionStore } from '../features/session/useSessionStore'

const format = new GeoJSON()
const projection = { dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857' }

const SERVICE_COLORS = {
  air: '#5aa6d6',
  naval: '#2aa8a0',
  army: '#6b7a3a',
}

function withAlpha(hex, opacity) {
  const value = Math.round(Math.min(1, Math.max(0, Number(opacity) || 0)) * 255)
    .toString(16)
    .padStart(2, '0')
  return `${hex}${value}`
}

function readGeometry(tool, geometry) {
  if (tool === 'ellipse' && geometry.getType() === 'Circle') {
    const polygon = fromCircle(geometry, 48)
    const center = geometry.getCenter()
    polygon.setCoordinates([
      polygon.getCoordinates()[0].map(([x, y]) => [center[0] + (x - center[0]) * 1.6, center[1] + (y - center[1]) * 0.7]),
    ])
    return format.writeGeometryObject(polygon, projection)
  }
  const geom = geometry.getType() === 'Circle' ? fromCircle(geometry, 48) : geometry
  return format.writeGeometryObject(geom, projection)
}

function styleFor(feature, marks) {
  const color = feature.get('color') || marks.objective
  const kind = feature.get('kind')
  if (kind === 'point') {
    return new Style({
      image: new CircleStyle({
        radius: 7,
        fill: new Fill({ color }),
        stroke: new Stroke({ color: marks.halo, width: 1.5 }),
      }),
      text: new Text({
        text: feature.get('label') || '',
        offsetY: -14,
        font: '12px sans-serif',
        fill: new Fill({ color: marks.halo }),
        stroke: new Stroke({ color: marks.outline, width: 3 }),
      }),
    })
  }
  const styles = [
    new Style({
      stroke: new Stroke({ color, width: Number(feature.get('width') || 2) }),
      fill: new Fill({ color: withAlpha(color, feature.get('opacity') ?? 0.2) }),
      text: feature.get('label')
        ? new Text({
            text: feature.get('label'),
            font: '12px sans-serif',
            fill: new Fill({ color: marks.halo }),
            stroke: new Stroke({ color: marks.outline, width: 3 }),
          })
        : undefined,
    }),
  ]
  if (kind === 'arrow') {
    const coordinates = feature.getGeometry().getCoordinates()
    const end = coordinates[coordinates.length - 1]
    const previous = coordinates[coordinates.length - 2] || end
    const rotation = Math.atan2(end[0] - previous[0], end[1] - previous[1])
    styles.push(
      new Style({
        geometry: new Point(end),
        image: new RegularShape({ points: 3, radius: 8, fill: new Fill({ color }), rotation }),
      }),
    )
  }
  return styles
}

function addFeature(source, item, kind) {
  const feature = format.readFeature(
    { type: 'Feature', id: item.id, geometry: item.geometry, properties: {} },
    projection,
  )
  feature.setId(item.id)
  feature.set('kind', kind)
  feature.set('collection', item.collection)
  feature.set('label', item.label || '')
  feature.set('color', item.color)
  feature.set('width', item.width)
  feature.set('opacity', item.opacity)
  feature.set('teamId', item.teamId || '')
  source.addFeature(feature)
}

export function MapWorkbench({ map }) {
  const data = useDirectoryStore((state) => state.data)
  const revision = useDirectoryStore((state) => state.revision)
  const surface = useDirectoryStore((state) => state.surface)
  const tool = useDirectoryStore((state) => state.tool)
  const curved = useDirectoryStore((state) => state.curved)
  const stampId = useDirectoryStore((state) => state.stampId)
  const symbolId = useDirectoryStore((state) => state.symbolId)
  const graphicQuery = useDirectoryStore((state) => state.graphicQuery)
  const setPending = useDirectoryStore((state) => state.setPending)
  const setMeasure = useDirectoryStore((state) => state.setMeasure)
  const select = useDirectoryStore((state) => state.select)
  const openContextMenu = useDirectoryStore((state) => state.openContextMenu)
  const closeContextMenu = useDirectoryStore((state) => state.closeContextMenu)
  const commit = useCommit()
  const userId = useSessionStore((state) => state.session?.profile?.id)
  const home = useSessionStore((state) => state.session?.mapView)
  const saved = useRef(false)

  useEffect(() => {
    if (!map || !data) return undefined
    let basemap = null
    if (data.settings.source === 'osm' && data.settings.osmUrl) {
      basemap = new TileLayer({ source: new XYZ({ url: data.settings.osmUrl }) })
      map.getLayers().insertAt(0, basemap)
    }
    return () => {
      if (basemap) map.removeLayer(basemap)
    }
  }, [map, data?.settings?.source, data?.settings?.osmUrl])

  useEffect(() => {
    if (!map) return undefined
    const target = map.getTargetElement()
    if (!target) return undefined
    const onContextMenu = (event) => {
      event.preventDefault()
      const pixel = map.getEventPixel(event)
      const coordinate = map.getCoordinateFromPixel(pixel)
      if (!coordinate) return
      const [longitude, latitude] = toLonLat(coordinate)
      openContextMenu({
        open: true,
        x: event.clientX,
        y: event.clientY,
        longitude,
        latitude,
      })
    }
    target.addEventListener('contextmenu', onContextMenu)
    return () => {
      target.removeEventListener('contextmenu', onContextMenu)
      closeContextMenu()
    }
  }, [map, openContextMenu, closeContextMenu])

  useEffect(() => {
    if (!map || !data?.settings) return
    const token = data.settings.homeToken
    if (!token) return
    map.getView().animate({
      center: fromLonLat([Number(home?.longitude) || 0, Number(home?.latitude) || 0]),
      zoom: Number(data.settings.defaultZoom) || 5,
      duration: 350,
    })
  }, [map, data?.settings?.homeToken])

  useEffect(() => {
    if (!map || !userId || !data?.flags?.mapSettings) return undefined
    let timer = 0
    const save = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        const view = map.getView()
        const center = view.getCenter()
        if (!center) return
        const [longitude, latitude] = toLonLat(center)
        commit((id) => api.saveMapView(id, surface, { longitude, latitude, zoom: view.getZoom() || 5 }))
      }, 500)
    }
    map.on('moveend', save)
    return () => {
      window.clearTimeout(timer)
      map.un('moveend', save)
    }
  }, [map, userId, surface, data?.flags?.mapSettings])

  useEffect(() => {
    if (!map || !data?.marks) return undefined
    const source = new VectorSource()
    const teamColor = (teamId) => data.teams.find((team) => team.id === teamId)?.color || data.marks.objective
    if (surface === 'planning') {
      const query = graphicQuery
      for (const graphic of data.graphics) {
        const mine = graphic.ownerId === userId
        const shared = graphic.properties.sharedWith?.includes(userId)
        if (data.planView === 'shared' ? !shared || mine : !mine) continue
        if (query.layer && !(graphic.properties.layer || '').includes(query.layer)) continue
        if (query.phase && !(graphic.properties.phase || '').includes(query.phase)) continue
        addFeature(
          source,
          {
            ...graphic,
            collection: 'graphic',
            label: graphic.properties.echelonId || graphic.properties.stampId || graphic.properties.symbolId || graphic.name,
            color: graphic.properties.strokeColor,
            width: graphic.properties.strokeWidth,
            opacity: graphic.properties.fillOpacity,
          },
          graphic.shapeType === 'arrow' ? 'arrow' : graphic.shapeType === 'point' || graphic.shapeType === 'stamp' || graphic.shapeType === 'symbol' ? 'point' : 'area',
        )
      }
    } else {
      for (const feature of data.features) {
        if (feature.featureType === 'unit' && !data.showTeams) continue
        const isComponent = feature.featureType === 'component'
        const isPoint = feature.featureType === 'unit' || isComponent
        addFeature(
          source,
          {
            ...feature,
            collection: 'feature',
            label: feature.name || feature.properties?.kind || '',
            color: isComponent ? SERVICE_COLORS[feature.properties?.service] || data.marks.objective : teamColor(feature.teamId),
            opacity: feature.featureType === 'zone' ? 0.25 : 0,
          },
          isPoint ? 'point' : 'area',
        )
      }
      if (data.replay?.positions?.length) {
        for (const marker of data.replay.positions) {
          addFeature(source, { id: `replay-${marker.id}`, geometry: { type: 'Point', coordinates: [marker.lon, marker.lat] }, label: marker.name, color: data.marks.replay, collection: 'replay' }, 'point')
        }
      }
      for (const marker of data.scenario?.markers || []) {
        if (!data.flags.scenarioPlayback) continue
        addFeature(source, { id: marker.id, geometry: { type: 'Point', coordinates: [marker.lon, marker.lat] }, label: marker.name, color: marker.color, collection: 'scenario' }, 'point')
      }
    }
    const layer = new VectorLayer({ source, style: (feature) => styleFor(feature, data.marks) })
    map.addLayer(layer)

    const interactions = []
    const track = (interaction) => {
      interactions.push(interaction)
      map.addInteraction(interaction)
    }
    const drawing = {
      unit: 'Point',
      point: 'Point',
      stamp: 'Point',
      symbol: 'Point',
      route: 'LineString',
      line: 'LineString',
      arrow: 'LineString',
      'measure-line': 'LineString',
      zone: 'Polygon',
      polygon: 'Polygon',
      'measure-area': 'Polygon',
      freehand: 'LineString',
      circle: 'Circle',
      ellipse: 'Circle',
      rectangle: 'Circle',
    }
    if (drawing[tool]) {
      const draw = new Draw({
        source: new VectorSource(),
        type: drawing[tool],
        freehand: tool === 'freehand',
        geometryFunction: tool === 'rectangle' ? createBox() : undefined,
      })
      draw.on('drawend', (event) => {
        const geometry = readGeometry(tool, event.feature.getGeometry())
        if (tool === 'measure-line' || tool === 'measure-area') {
          const geom = event.feature.getGeometry()
          const value = tool === 'measure-line' ? getLength(geom) : getArea(geom)
          const text = tool === 'measure-line' ? `${(value / 1000).toFixed(2)} km` : `${(value / 1e6).toFixed(2)} km²`
          setMeasure(text)
          return
        }
        if (surface === 'planning') setPending({ surface, shapeType: tool, geometry, stampId, symbolId })
        else setPending({ surface: 'picture', featureType: tool === 'unit' ? 'unit' : tool === 'route' ? 'route' : 'zone', geometry, curved })
      })
      track(draw)
    } else if (tool === 'edit') {
      const modify = new Modify({ source })
      modify.on('modifyend', onModify)
      track(modify)
    } else if (tool === 'select') {
      const picker = new Select({ condition: click, layers: [layer] })
      picker.on('select', (event) => {
        const feature = event.selected[0]
        if (!feature) return
        select(feature.getId(), true)
      })
      track(picker)
    }

    function onModify(event) {
      const feature = event.features?.item(0)
      if (!feature || feature.get('collection') === 'replay' || feature.get('collection') === 'scenario') return
      const geometry = format.writeGeometryObject(feature.getGeometry(), projection)
      const id = feature.getId()
      if (surface === 'planning') commit((user) => api.updateGraphic(user, id, { geometry }))
      else commit((user) => api.updateFeature(user, id, { geometry }))
    }

    return () => {
      for (const interaction of interactions) map.removeInteraction(interaction)
      map.removeLayer(layer)
    }
  }, [map, revision, surface, tool, curved, stampId, symbolId, userId, graphicQuery])

  useEffect(() => {
    if (!map || !data?.settings?.views || saved.current) return
    const view = data.settings.views[surface]
    if (!view) return
    saved.current = true
    map.getView().setCenter(fromLonLat([view.longitude, view.latitude]))
    map.getView().setZoom(view.zoom)
  }, [map, data?.settings?.views, surface])

  return null
}
