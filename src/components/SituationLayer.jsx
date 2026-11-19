import { useEffect, useMemo, useState } from 'react'
import { Box, Paper, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import Feature from 'ol/Feature'
import Point from 'ol/geom/Point'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import Cluster from 'ol/source/Cluster'
import { fromLonLat } from 'ol/proj'
import { Circle, Fill, Icon, Stroke, Style, Text } from 'ol/style'
import { get } from '../shared/api/http'
import { themeFromEntity } from '../shared/api/mappers'
import { createAppTheme } from '../shared/theme/createAppTheme'
import { useOrbatPicture } from '../features/orbat/useOrbatPicture'
import { useSituation } from '../features/situation/useSituation'
import { CLUSTER_DISTANCE, CLUSTER_MIN_DISTANCE, cachedIcon, finite, loadIcon, membersOf, zoomUntilOneSeparates } from './orbatMarkers'

/** Side id -> that team's theme. Sides and themes are already returned to any signed-in user. */
function useTeamIconThemes() {
  const [rows, setRows] = useState({ sides: [], themes: [] })
  useEffect(() => {
    let live = true
    Promise.all([get('/sides').catch(() => []), get('/themes').catch(() => [])]).then(([sides, themes]) => {
      if (live) setRows({ sides: sides || [], themes: themes || [] })
    })
    return () => { live = false }
  }, [])
  return useMemo(() => {
    const byTheme = new Map()
    rows.themes.forEach((row) => {
      if (row?.id == null) return
      byTheme.set(String(row.id), createAppTheme(themeFromEntity(row)))
    })
    const bySide = new Map()
    rows.sides.forEach((side) => {
      const theme = byTheme.get(String(side.themeId))
      if (theme) bySide.set(String(side.id), theme)
    })
    return bySide
  }, [rows])
}

function samePlace(items) {
  if (items.length < 2) return false
  const firstLat = Number(items[0].latitude).toFixed(4)
  const firstLon = Number(items[0].longitude).toFixed(4)
  return items.every((item) => Number(item.latitude).toFixed(4) === firstLat && Number(item.longitude).toFixed(4) === firstLon)
}

function HoverCard() {
  const hover = useSituation((state) => state.hover)
  if (!hover?.items?.length) return null
  const items = hover.items
  const single = items.length === 1 ? items[0] : null
  return (
    <Paper
      elevation={6}
      sx={{
        position: 'fixed',
        left: hover.x + 14,
        top: hover.y + 14,
        zIndex: 1400,
        px: 1.25,
        py: 0.75,
        maxWidth: 280,
        pointerEvents: 'none',
        bgcolor: 'background.paper',
        color: 'text.primary',
      }}
    >
      {single ? (
        <Box>
          <Typography variant="body2">{single.name}</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{single.typeName || 'Node'}</Typography>
          {single.code ? <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{single.code}</Typography> : null}
          {single.locationName ? <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{single.locationName}</Typography> : null}
          {single.homeSideName ? <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{single.homeSideName}</Typography> : null}
          {single.parentName ? <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Under {single.parentName}</Typography> : null}
          {single.orbatName ? <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{single.orbatName}</Typography> : null}
        </Box>
      ) : (
        <Box>
          <Typography variant="body2">{items.length} at this place</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
            {samePlace(items) ? 'They share one position.' : 'Zoom in to separate them.'}
          </Typography>
          {items.slice(0, 6).map((item) => (
            <Typography key={item.id} variant="caption" sx={{ display: 'block' }}>{item.name} · {item.typeName || 'Node'}</Typography>
          ))}
          {items.length > 6 ? <Typography variant="caption" color="text.secondary">and {items.length - 6} more</Typography> : null}
        </Box>
      )}
    </Paper>
  )
}

function detailOf(feature) {
  return {
    id: feature.get('nodeId'),
    name: feature.get('name') || 'Node',
    typeName: feature.get('typeName') || '',
    code: feature.get('code') || '',
    locationName: feature.get('locationName') || '',
    homeSideName: feature.get('homeSideName') || '',
    parentName: feature.get('parentName') || '',
    orbatName: feature.get('orbatName') || '',
    latitude: feature.get('latitude'),
    longitude: feature.get('longitude'),
  }
}

/** Read-only markers for the finalized playing ORBATs the signed-in user is allowed to see. */
export function SituationLayer({ map }) {
  const viewerTheme = useTheme()
  const teamThemes = useTeamIconThemes()
  const orbats = useSituation((state) => state.orbats)
  const editingId = useOrbatPicture((state) => (state.active ? state.editingId : null))
  const [iconsReady, setIconsReady] = useState(0)

  useEffect(() => {
    if (!map) return undefined
    const source = new VectorSource()
    const clusters = new Cluster({ distance: CLUSTER_DISTANCE, minDistance: CLUSTER_MIN_DISTANCE, source })
    const layer = new VectorLayer({ source: clusters, zIndex: 15 })
    map.addLayer(layer)

    const onClick = (event) => {
      const hit = map.forEachFeatureAtPixel(event.pixel, (feature) => feature, { layerFilter: (item) => item === layer })
      const members = membersOf(hit)
      if (members.length < 2) return
      const zoom = zoomUntilOneSeparates(map.getView(), source.getFeatures(), members)
      if (zoom == null) return
      const view = map.getView()
      view.cancelAnimations()
      view.animate({ center: hit.getGeometry().getCoordinates(), zoom, duration: 280 })
    }
    const onMove = (event) => {
      if (event.dragging) return
      const pixel = map.getEventPixel(event.originalEvent)
      const hit = map.forEachFeatureAtPixel(pixel, (feature) => feature, { layerFilter: (item) => item === layer })
      const items = membersOf(hit).map(detailOf).filter((item) => item.id)
      if (!items.length) {
        useSituation.getState().clearHover()
        return
      }
      useSituation.getState().showHover({ x: event.originalEvent.clientX, y: event.originalEvent.clientY, items })
    }
    const onLeave = () => useSituation.getState().clearHover()
    map.getViewport().addEventListener('pointerleave', onLeave)
    map.on('singleclick', onClick)
    map.on('pointermove', onMove)
    layer.set('situation', true)
    layer.set('situationSource', source)

    return () => {
      map.getViewport().removeEventListener('pointerleave', onLeave)
      map.un('pointermove', onMove)
      map.un('singleclick', onClick)
      map.removeLayer(layer)
      useSituation.getState().clearHover()
    }
  }, [map])

  useEffect(() => {
    if (!map) return
    const layer = map.getLayers().getArray().find((item) => item.get('situation'))
    if (!layer) return
    const source = layer.get('situationSource')
    if (!source) return
    source.clear()
    const skip = editingId == null ? null : Number(editingId)
    const shown = orbats.filter((orbat) => skip == null || Number(orbat.playingOrbatId) !== skip)
    const placed = []
    shown.forEach((orbat) => {
      const byId = new Map((orbat.nodes || []).map((node) => [node.id, node]))
      ;(orbat.nodes || []).forEach((node) => {
        if (finite(node.latitude) == null || finite(node.longitude) == null) return
        const parent = node.parentId ? byId.get(node.parentId) : null
        placed.push({ node, orbat, parentName: parent?.name || '' })
      })
    })
    const pending = []
    const seen = new Set()
    placed.forEach(({ node, orbat }) => {
      const iconTheme = teamThemes.get(String(orbat.sideId))
      if (!iconTheme || !node.iconPath || cachedIcon(node.iconPath, iconTheme)) return
      const key = `${orbat.sideId}\n${node.iconPath}`
      if (seen.has(key)) return
      seen.add(key)
      pending.push(loadIcon(node.iconPath, iconTheme))
    })
    if (pending.length) Promise.all(pending).then(() => setIconsReady((value) => value + 1))
    const byFeature = new Map()
    placed.forEach(({ node, orbat, parentName }) => {
      const feature = new Feature({ geometry: new Point(fromLonLat([finite(node.longitude), finite(node.latitude)])) })
      feature.set('nodeId', node.id)
      feature.set('name', node.short_name || node.name || 'Node')
      feature.set('typeName', node.nodeTypeName || '')
      feature.set('code', node.code || '')
      feature.set('locationName', node.location_name || '')
      feature.set('homeSideName', node.homeSideName || '')
      feature.set('parentName', parentName)
      feature.set('orbatName', orbat.name || '')
      feature.set('colour', orbat.colour || '#2f6fed')
      feature.set('iconPath', node.iconPath || '')
      feature.set('iconTheme', teamThemes.get(String(orbat.sideId)) || null)
      feature.set('latitude', node.latitude)
      feature.set('longitude', node.longitude)
      source.addFeature(feature)
      byFeature.set(node.id, feature)
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
      const member = members[0]
      const nodeId = member?.get('nodeId')
      if (!byFeature.get(nodeId)) return null
      const iconTheme = member.get('iconTheme')
      const icon = iconTheme ? cachedIcon(member.get('iconPath'), iconTheme) : ''
      const colour = member.get('colour') || '#2f6fed'
      return new Style({
        image: icon
          ? new Icon({ src: icon, scale: 1.5, anchor: [0.5, 0.5] })
          : new Circle({ radius: 6, fill: new Fill({ color: colour }), stroke: new Stroke({ color: viewerTheme.palette.background.paper, width: 2 }) }),
        text: new Text({
          text: member.get('name') || '',
          offsetY: -16,
          font: '12px Roboto',
          fill: new Fill({ color: viewerTheme.palette.text.primary }),
          stroke: new Stroke({ color: viewerTheme.palette.background.paper, width: 3 }),
        }),
      })
    })
  }, [map, orbats, editingId, iconsReady, teamThemes, viewerTheme])

  return <HoverCard />
}
