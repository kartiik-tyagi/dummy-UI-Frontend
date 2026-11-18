import { useEffect, useState } from 'react'
import { Box, Button, Checkbox, FormControlLabel, List, ListItemButton, ListItemText, MenuItem, Slider, Stack, TextField, Typography } from '@mui/material'
import dayjs from 'dayjs'
import * as api from '../../../shared/api/client'
import { useCommit, useDirectoryStore } from '../../../features/directory/useDirectoryStore'
import { useSessionStore } from '../../../features/session/useSessionStore'
import { useToastStore } from '../../../features/feedback/useToastStore'
import { ConfirmDialog } from '../ConfirmDialog'
import { FilterList } from '../FilterList'
import { ExerciseControls } from '../ExerciseControls'
import { LoadingState } from '../LoadingState'
import { EMPTY_LIST } from '../../lib/empty'
import { FunctionalityCodes, hasFunctionality } from '../../auth/functionalityCodes'
import { canOpenOrbat } from '../../auth/access'
import OrbatPanel from '../../../features/orbat/OrbatPanel'
import { IconField } from '../IconPicker'

function Caption({ children }) {
  return (
    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
      {children}
    </Typography>
  )
}

function switched(data, flag) {
  return data && flag && data.flags[flag] === false
}

export function PanelBody({ panel }) {
  const data = useDirectoryStore((state) => state.data)
  const resources = useSessionStore((state) => state.session?.resources ?? EMPTY_LIST)
  const plans = useSessionStore((state) => state.session?.plans ?? EMPTY_LIST)
  const flag = {
    features: 'featureTable',
    properties: 'propertiesPanel',
    sides: 'sideMapIcons',
    'map-settings': 'mapSettings',
    planning: 'planningCanvas',
    alerts: 'alertsPanel',
    sessions: 'sessionReplay',
    'scenario-play': 'scenarioPlayback',
    simulation: 'simulationExtras',
    stream: 'liveStream',
    zones: 'zonesAdmin',
    routes: 'routesAdmin',
    directory: 'adminPanel',
  }[panel]
  if (flag && !data) return <LoadingState label="Opening the directory" />
  if (panel === 'draw' && data && !data.flags.drawingTools && !data.flags.measurementTools) return <Caption>This capability is switched off.</Caption>
  if (switched(data, flag)) return <Caption>This capability is switched off.</Caption>
  if (panel === 'filters') return <FilterList />
  if (panel === 'resources') return <Records items={resources} empty="No resources are released to this role." />
  if (panel === 'plans') return <Records items={plans} empty="No plans are released to this role." />
  if (panel === 'exercise-control') return <ExerciseControls />
  if (panel === 'features') return <FeatureTable />
  if (panel === 'properties') return <PropertiesPanel />
  if (panel === 'draw') return <DrawPanel />
  if (panel === 'sides') return <SideLegend />
  if (panel === 'map-settings') return <MapSettings />
  if (panel === 'planning') return <PlanningPanel />
  if (panel === 'alerts') return <AlertsPanel />
  if (panel === 'sessions') return <SessionPanel />
  if (panel === 'scenario-play') return <ScenarioPanel />
  if (panel === 'simulation') return <SimulationPanel />
  if (panel === 'stream') return <StreamPanel />
  if (panel === 'zones') return <Catalogue kind="zone" />
  if (panel === 'routes') return <Catalogue kind="route" />
  if (panel === 'directory') return <DirectoryPanel />
  if (panel === 'orbat') return <OrbatGate />
  if (panel === 'flags') return <FlagPanel />
  return <Caption>This panel is not available.</Caption>
}

function Records({ items, empty }) {
  if (!items.length) return <Caption>{empty}</Caption>
  return (
    <Stack spacing={1}>
      {items.map((item) => (
        <Box key={item.id}>
          <Typography variant="body2">{item.name}</Typography>
          <Caption>
            {item.status} · {item.detail}
          </Caption>
        </Box>
      ))}
    </Stack>
  )
}

export function FeatureTable() {
  const features = useDirectoryStore((state) => state.data?.features ?? EMPTY_LIST)
  const selectedId = useDirectoryStore((state) => state.selectedId)
  const select = useDirectoryStore((state) => state.select)
  if (!features.length) return <Caption>No features on the picture yet.</Caption>
  return (
    <List disablePadding>
      {features.map((feature) => (
        <ListItemButton key={functionality.id} selected={feature.id === selectedId} onClick={() => select(feature.id, true)}>
          <ListItemText primary={functionality.name} secondary={`${feature.featureType} · ${feature.layerId}`} />
        </ListItemButton>
      ))}
    </List>
  )
}

function PropertiesPanel() {
  const data = useDirectoryStore((state) => state.data)
  const selectedId = useDirectoryStore((state) => state.selectedId)
  const select = useDirectoryStore((state) => state.select)
  const commit = useCommit()
  const feature = data?.features?.find((item) => item.id === selectedId)
  const [confirming, setConfirming] = useState(false)
  if (!feature) return <Caption>Select a feature on the map or in the table.</Caption>
  return (
    <Stack spacing={1}>
      <Typography variant="body2">{functionality.name}</Typography>
      <Caption>Type {feature.featureType}</Caption>
      <Caption>Layer {feature.layerId}</Caption>
      <Caption>Geometry {feature.geometry?.type}</Caption>
      <Caption>Side {data.sides.find((side) => side.id === feature.sideId)?.name || 'None'}</Caption>
      <Button color="error" onClick={() => setConfirming(true)}>
        Remove
      </Button>
      <ConfirmDialog
        open={confirming}
        title="Remove feature"
        message={`Remove ${functionality.name} from the picture?`}
        confirmLabel="Remove"
        onClose={() => setConfirming(false)}
        onConfirm={() =>
          commit((userId) => api.deleteFeature(userId, feature.id)).then(() => {
            select(null, false)
            setConfirming(false)
          })
        }
      />
    </Stack>
  )
}

const DRAW = [
  ['select', 'Select'],
  ['unit', 'Unit'],
  ['route', 'Route'],
  ['zone', 'Zone'],
  ['edit', 'Edit'],
  ['measure-line', 'Distance'],
  ['measure-area', 'Area'],
]

function DrawPanel() {
  const tool = useDirectoryStore((state) => state.tool)
  const setTool = useDirectoryStore((state) => state.setTool)
  const curved = useDirectoryStore((state) => state.curved)
  const setCurved = useDirectoryStore((state) => state.setCurved)
  const measure = useDirectoryStore((state) => state.measure)
  const selectedId = useDirectoryStore((state) => state.selectedId)
  const flags = useDirectoryStore((state) => state.data?.flags)
  const commit = useCommit()
  const tools = DRAW.filter(([id]) => {
    if (id.startsWith('measure')) return flags?.measurementTools !== false
    if (id === 'select') return true
    return flags?.drawingTools !== false
  })
  return (
    <Stack spacing={1}>
      <Caption>Draw on the picture. A name is asked before anything is kept.</Caption>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
        {tools.map(([id, label]) => (
          <Button key={id} size="small" variant={tool === id ? 'contained' : 'outlined'} onClick={() => setTool(id)}>
            {label}
          </Button>
        ))}
      </Box>
      {flags?.drawingTools !== false ? (
        <Button size="small" variant={curved ? 'contained' : 'text'} onClick={() => setCurved(!curved)}>
          Curved route
        </Button>
      ) : null}
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button size="small" disabled={!selectedId} onClick={() => commit((userId) => api.extendFeature(userId, selectedId, 'start'))}>
          Extend start
        </Button>
        <Button size="small" disabled={!selectedId} onClick={() => commit((userId) => api.extendFeature(userId, selectedId, 'end'))}>
          Extend end
        </Button>
      </Box>
      {measure ? <Caption>{measure}</Caption> : null}
    </Stack>
  )
}

function SideLegend() {
  const sides = useDirectoryStore((state) => state.data?.sides ?? EMPTY_LIST)
  const swatches = useDirectoryStore((state) => state.data?.swatches ?? EMPTY_LIST)
  return (
    <Stack spacing={1}>
      <Caption>Side colour is drawn on units when side markers are switched on.</Caption>
      {sides.map((side) => {
        const swatch = swatches.find((item) => item.id === side.swatchId)
        return (
          <Typography key={side.id} variant="body2">
            {side.name} · {swatch?.name || 'Unassigned'}
          </Typography>
        )
      })}
    </Stack>
  )
}

function MapSettings() {
  const settings = useDirectoryStore((state) => state.data?.settings)
  const commit = useCommit()
  const [draft, setDraft] = useState(null)
  const form = draft || settings
  if (!form) return null
  return (
    <Stack spacing={1}>
      <TextField select size="small" label="Basemap" value={form.source} onChange={(event) => setDraft({ ...form, source: event.target.value })}>
        <MenuItem value="wms">GeoServer</MenuItem>
        <MenuItem value="osm">OpenStreetMap</MenuItem>
      </TextField>
      <TextField size="small" label="GeoServer address" value={form.geoserverUrl} onChange={(event) => setDraft({ ...form, geoserverUrl: event.target.value })} />
      <TextField size="small" label="WMS layer" value={form.wmsLayer} onChange={(event) => setDraft({ ...form, wmsLayer: event.target.value })} />
      <TextField size="small" label="Default zoom" type="number" value={form.defaultZoom} onChange={(event) => setDraft({ ...form, defaultZoom: Number(event.target.value) })} />
      <Button variant="contained" onClick={() => commit((userId) => api.updateBasemap(userId, form)).then(() => setDraft(null))}>
        Apply
      </Button>
      <Button onClick={() => commit((userId) => api.resetMapViews(userId))}>Reset saved views</Button>
      <Caption>Each picture keeps the last pan and zoom for this tab.</Caption>
    </Stack>
  )
}

const PLAN_TOOLS = ['select', 'edit', 'rectangle', 'circle', 'ellipse', 'polygon', 'line', 'arrow', 'freehand', 'point', 'stamp', 'symbol']
const STAMPS = ['objective', 'checkpoint', 'rally', 'hazard', 'lz', 'cp']
const SYMBOLS = ['friendly-infantry', 'friendly-armor', 'hostile-infantry', 'hostile-armor', 'neutral-unit', 'unknown-contact']
const ECHELONS = ['', 'team', 'squad', 'platoon', 'company', 'battalion', 'brigade', 'division']

function PlanningPanel() {
  const data = useDirectoryStore((state) => state.data)
  const tool = useDirectoryStore((state) => state.tool)
  const setTool = useDirectoryStore((state) => state.setTool)
  const setSurface = useDirectoryStore((state) => state.setSurface)
  const surface = useDirectoryStore((state) => state.surface)
  const stampId = useDirectoryStore((state) => state.stampId)
  const symbolId = useDirectoryStore((state) => state.symbolId)
  const setStamp = useDirectoryStore((state) => state.setStamp)
  const setSymbol = useDirectoryStore((state) => state.setSymbol)
  const selectedId = useDirectoryStore((state) => state.selectedId)
  const select = useDirectoryStore((state) => state.select)
  const query = useDirectoryStore((state) => state.graphicQuery)
  const setQuery = useDirectoryStore((state) => state.setGraphicQuery)
  const userId = useSessionStore((state) => state.session?.profile?.id)
  const commit = useCommit()
  const [share, setShare] = useState('')
  const [comment, setComment] = useState('')
  const graphic = data?.graphics?.find((item) => item.id === selectedId)
  const visible = (data?.graphics || []).filter((item) => {
    const mine = item.ownerId === userId
    const shared = item.properties.sharedWith?.includes(userId)
    if (data?.planView === 'shared' ? !shared || mine : !mine) return false
    if (query.layer && !(item.properties.layer || '').includes(query.layer)) return false
    if (query.phase && !(item.properties.phase || '').includes(query.phase)) return false
    return true
  })
  return (
    <Stack spacing={1}>
      <Button size="small" variant={surface === 'planning' ? 'contained' : 'outlined'} onClick={() => setSurface(surface === 'planning' ? 'picture' : 'planning')}>
        {surface === 'planning' ? 'Show the picture' : 'Show the planning board'}
      </Button>
      {data?.flags?.planningShare ? (
        <TextField select size="small" label="View" value={data.planView} onChange={(event) => commit((id) => api.setPlanView(id, event.target.value))}>
          <MenuItem value="mine">My plan</MenuItem>
          <MenuItem value="shared">Shared with me</MenuItem>
        </TextField>
      ) : null}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
        {PLAN_TOOLS.map((id) => (
          <Button key={id} size="small" variant={tool === id ? 'contained' : 'outlined'} onClick={() => { setSurface('planning'); setTool(id) }}>
            {id}
          </Button>
        ))}
      </Box>
      <TextField select size="small" label="Stamp" value={stampId} onChange={(event) => setStamp(event.target.value)}>
        {STAMPS.map((id) => (
          <MenuItem key={id} value={id}>{id}</MenuItem>
        ))}
      </TextField>
      <TextField select size="small" label="Symbol" value={symbolId} onChange={(event) => setSymbol(event.target.value)}>
        {SYMBOLS.map((id) => (
          <MenuItem key={id} value={id}>{id}</MenuItem>
        ))}
      </TextField>
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button size="small" disabled={!data?.canUndo} onClick={() => commit((id) => api.undoPlanning(id))}>Undo</Button>
        <Button size="small" disabled={!data?.canRedo} onClick={() => commit((id) => api.redoPlanning(id))}>Redo</Button>
        {data?.flags?.planningExport ? (
          <Button
            size="small"
            onClick={() =>
              api.exportPlan(userId).then((collection) => {
                const url = URL.createObjectURL(new Blob([JSON.stringify(collection, null, 2)], { type: 'application/geo+json' }))
                const link = document.createElement('a')
                link.href = url
                link.download = 'gis-warplan-plan.geojson'
                link.click()
                URL.revokeObjectURL(url)
              }).catch((error) => useToastStore.getState().push(error.message, 'error'))
            }
          >
            Export
          </Button>
        ) : null}
      </Box>
      <TextField size="small" label="Layer filter" value={query.layer} onChange={(event) => setQuery({ layer: event.target.value })} />
      <TextField size="small" label="Phase filter" value={query.phase} onChange={(event) => setQuery({ phase: event.target.value })} />
      <List disablePadding>
        {visible.map((item) => (
          <ListItemButton key={item.id} selected={item.id === selectedId} onClick={() => select(item.id, false)}>
            <ListItemText primary={item.name} secondary={item.shapeType} />
          </ListItemButton>
        ))}
      </List>
      {graphic ? (
        <GraphicEditor graphic={graphic} share={share} setShare={setShare} comment={comment} setComment={setComment} />
      ) : (
        <Caption>Select a graphic to style, share, comment, or promote it.</Caption>
      )}
    </Stack>
  )
}

function GraphicEditor({ graphic, share, setShare, comment, setComment }) {
  const flags = useDirectoryStore((state) => state.data?.flags)
  const userId = useSessionStore((state) => state.session?.profile?.id)
  const commit = useCommit()
  const readOnly = graphic.ownerId !== userId
  const properties = graphic.properties
  const patch = (propertiesPatch) => commit((id) => api.updateGraphic(id, graphic.id, { properties: propertiesPatch }))
  return (
    <Stack spacing={1}>
      {readOnly ? <Caption>Read only. This graphic was shared with you.</Caption> : null}
      {!readOnly ? (
        <>
          <TextField size="small" label="Stroke" type="color" value={properties.strokeColor} onChange={(event) => patch({ strokeColor: event.target.value })} />
          <TextField size="small" label="Fill" type="color" value={properties.fillColor} onChange={(event) => patch({ fillColor: event.target.value })} />
          <Caption>Fill opacity {properties.fillOpacity}</Caption>
          <Slider size="small" min={0} max={1} step={0.05} value={properties.fillOpacity} onChangeCommitted={(_, value) => patch({ fillOpacity: value })} />
          <TextField select size="small" label="Echelon" value={properties.echelonId || ''} onChange={(event) => patch({ echelonId: event.target.value })}>
            {ECHELONS.map((id) => (
              <MenuItem key={id || 'none'} value={id}>{id || 'None'}</MenuItem>
            ))}
          </TextField>
          <Caption>Echelon bearing {properties.echelonBearingDeg || 0}°</Caption>
          <Slider size="small" min={0} max={359} value={properties.echelonBearingDeg || 0} onChangeCommitted={(_, value) => patch({ echelonBearingDeg: value })} />
          <Button color="error" onClick={() => commit((id) => api.deleteGraphic(id, graphic.id))}>Remove</Button>
        </>
      ) : null}
      {flags?.planningShare && !readOnly ? (
        <Stack direction="row" spacing={1}>
          <TextField size="small" label="Share with user ids" value={share} onChange={(event) => setShare(event.target.value)} />
          <Button onClick={() => commit((id) => api.shareGraphic(id, graphic.id, share.split(',').map((item) => item.trim())))}>Share</Button>
        </Stack>
      ) : null}
      {flags?.planningReview ? (
        <Stack spacing={0.5}>
          {(properties.comments || []).map((item) => (
            <Caption key={item.id}>{item.userId}: {item.text}</Caption>
          ))}
          <Stack direction="row" spacing={1}>
            <TextField size="small" label="Comment" value={comment} onChange={(event) => setComment(event.target.value)} />
            <Button onClick={() => commit((id) => api.addComment(id, graphic.id, comment)).then(() => setComment(''))}>Add</Button>
          </Stack>
        </Stack>
      ) : null}
      {flags?.planningPromote && !readOnly ? (
        <Button onClick={() => commit((id) => api.promoteGraphic(id, graphic.id))}>Promote to zone</Button>
      ) : null}
    </Stack>
  )
}

function AlertsPanel() {
  const alerts = useDirectoryStore((state) => state.data?.alerts ?? EMPTY_LIST)
  const muted = useDirectoryStore((state) => state.data?.alertMuted)
  const commit = useCommit()
  return (
    <Stack spacing={1}>
      <Button size="small" onClick={() => commit((userId) => api.setAlertMuted(userId, !muted))}>{muted ? 'Unmute tone' : 'Mute tone'}</Button>
      {!alerts.length ? <Caption>No active alerts.</Caption> : null}
      {alerts.map((alert) => (
        <Box key={alert.id}>
          <Typography variant="body2">{alert.name}</Typography>
          <Caption>
            {alert.side} · {alert.zone}
          </Caption>
        </Box>
      ))}
    </Stack>
  )
}

function SessionPanel() {
  const data = useDirectoryStore((state) => state.data)
  const commit = useCommit()
  const [name, setName] = useState('')
  if (!data) return null
  return (
    <Stack spacing={1}>
      {data.capture ? (
        <Button onClick={() => commit((userId) => api.stopRecording(userId))}>Stop and save</Button>
      ) : (
        <Button onClick={() => commit((userId) => api.startRecording(userId))}>Record</Button>
      )}
      {data.draftRecording ? (
        <Stack direction="row" spacing={1}>
          <TextField size="small" label="Session name" value={name} onChange={(event) => setName(event.target.value)} />
          <Button onClick={() => commit((userId) => api.saveRecording(userId, name)).then(() => setName(''))}>Save</Button>
          <Button onClick={() => commit((userId) => api.discardRecording(userId))}>Discard</Button>
        </Stack>
      ) : null}
      {data.recordings.map((recording) => (
        <Stack key={recording.id} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Typography variant="body2" sx={{ flex: 1 }}>{recording.name}</Typography>
          <Caption>{recording.durationSec}s</Caption>
          <Button size="small" onClick={() => commit((userId) => api.loadReplay(userId, recording.id))}>Load</Button>
          <Button size="small" onClick={() => commit((userId) => api.deleteRecording(userId, recording.id))}>Remove</Button>
        </Stack>
      ))}
      {data.replay ? (
        <Stack spacing={1}>
          <Caption>
            {data.replay.name} · frame {data.replay.index + 1} / {data.replay.count}
          </Caption>
          <Slider size="small" min={0} max={Math.max(0, data.replay.count - 1)} value={data.replay.index} onChangeCommitted={(_, value) => commit((userId) => api.seekReplay(userId, value))} />
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button size="small" onClick={() => commit((userId) => api.stepReplay(userId, -1))}>Back</Button>
            <Button size="small" onClick={() => commit((userId) => api.setReplayPlaying(userId, !data.replay.playing))}>{data.replay.playing ? 'Pause' : 'Play'}</Button>
            <Button size="small" onClick={() => commit((userId) => api.stepReplay(userId, 1))}>Forward</Button>
            <Button size="small" onClick={() => commit((userId) => api.closeReplay(userId))}>Close</Button>
          </Box>
        </Stack>
      ) : null}
    </Stack>
  )
}

function ScenarioPanel() {
  const scenario = useDirectoryStore((state) => state.data?.scenario)
  const commit = useCommit()
  if (!scenario) return null
  return (
    <Stack spacing={1}>
      <Typography variant="body2">{scenario.name}</Typography>
      <Caption>{scenario.description}</Caption>
      <Caption>
        {scenario.t}s / {scenario.durationSec}s
      </Caption>
      <Slider size="small" min={0} max={scenario.durationSec} step={0.5} value={scenario.t} onChangeCommitted={(_, value) => commit((userId) => api.seekScenario(userId, value))} />
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button size="small" onClick={() => commit((userId) => api.setScenarioPlaying(userId, !scenario.playing))}>{scenario.playing ? 'Pause' : 'Play'}</Button>
        <Button size="small" onClick={() => commit((userId) => api.seekScenario(userId, 0))}>Reset</Button>
      </Box>
    </Stack>
  )
}

function SimulationPanel() {
  const simulation = useDirectoryStore((state) => state.data?.simulation)
  const clockStart = useSessionStore((state) => state.session?.clockStart)
  const seek = useSessionStore((state) => state.seek)
  const commit = useCommit()
  if (!simulation) return null
  const applySeek = (seconds) => {
    commit((userId) => api.setSimulation(userId, { seekSec: seconds, playback: true })).then(() => {
      if (clockStart) seek(dayjs(clockStart).valueOf() + seconds * 1000)
    })
  }
  return (
    <Stack spacing={1}>
      <Caption>Frame duration {Math.round(simulation.cadenceMs / 100) / 10}s</Caption>
      <Slider size="small" min={100} max={60000} step={100} value={simulation.cadenceMs} onChangeCommitted={(_, value) => commit((userId) => api.setSimulation(userId, { cadenceMs: value }))} />
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button size="small" variant={simulation.mode === 'TIME' ? 'contained' : 'outlined'} onClick={() => commit((userId) => api.setSimulation(userId, { mode: 'TIME' }))}>Time</Button>
        <Button size="small" variant={simulation.mode === 'EVENT' ? 'contained' : 'outlined'} onClick={() => commit((userId) => api.setSimulation(userId, { mode: 'EVENT' }))}>Event</Button>
      </Box>
      <Button size="small" variant={simulation.playback ? 'contained' : 'outlined'} onClick={() => commit((userId) => api.setSimulation(userId, { playback: !simulation.playback }))}>
        {simulation.playback ? 'Leave playback' : 'Playback'}
      </Button>
      <Caption>Scrub {simulation.seekSec}s / {simulation.durationSec}s</Caption>
      <Slider size="small" min={0} max={simulation.durationSec} step={60} value={simulation.seekSec} disabled={!simulation.playback} onChangeCommitted={(_, value) => applySeek(value)} />
    </Stack>
  )
}

function StreamPanel() {
  const stream = useDirectoryStore((state) => state.data?.stream)
  const commit = useCommit()
  const [draft, setDraft] = useState(null)
  const form = draft || stream
  if (!form) return null
  return (
    <Stack spacing={1}>
      <Caption>Status {stream.status}</Caption>
      <TextField size="small" label="WebSocket address" value={form.wsUrl} onChange={(event) => setDraft({ ...form, wsUrl: event.target.value })} />
      <TextField size="small" label="Topic" value={form.topic} onChange={(event) => setDraft({ ...form, topic: event.target.value })} />
      <Button onClick={() => commit((userId) => api.updateStream(userId, form)).then(() => setDraft(null))}>Apply address</Button>
      {stream.status === 'live' ? (
        <Button onClick={() => commit((userId) => api.disconnectStream(userId))}>Disconnect</Button>
      ) : (
        <Button variant="contained" onClick={() => commit((userId) => api.connectStream(userId))}>Connect</Button>
      )}
    </Stack>
  )
}

function Catalogue({ kind }) {
  const features = useDirectoryStore((state) => state.data?.features ?? EMPTY_LIST)
  const sides = useDirectoryStore((state) => state.data?.sides ?? EMPTY_LIST)
  const commit = useCommit()
  const rows = features.filter((feature) => feature.featureType === kind)
  const [edit, setEdit] = useState(null)
  return (
    <Stack spacing={1}>
      <Caption>Draw a {kind} on the picture, then name and assign it here.</Caption>
      {rows.map((row) => (
        <Stack key={row.id} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Typography variant="body2" sx={{ flex: 1 }}>{row.name}</Typography>
          <Button size="small" onClick={() => setEdit(row)}>Edit</Button>
          <Button size="small" onClick={() => commit((userId) => api.deleteCatalogue(userId, row.id))}>Remove</Button>
        </Stack>
      ))}
      {edit ? (
        <Stack spacing={1}>
          <TextField size="small" label="Name" value={edit.name} onChange={(event) => setEdit({ ...edit, name: event.target.value })} />
          <TextField select size="small" label="Side" value={edit.sideId || ''} onChange={(event) => setEdit({ ...edit, sideId: event.target.value })}>
            <MenuItem value="">None</MenuItem>
            {sides.map((side) => (
              <MenuItem key={side.id} value={side.id}>{side.name}</MenuItem>
            ))}
          </TextField>
          <Button
            variant="contained"
            onClick={() =>
              commit((userId) => (kind === 'zone' ? api.saveZone(userId, edit) : api.saveRoute(userId, edit))).then(() => setEdit(null))
            }
          >
            Save
          </Button>
        </Stack>
      ) : null}
    </Stack>
  )
}

function choiceLabel(item, sides, selfId) {
  if (!item.takenBy || item.takenBy === selfId) return item.name
  const holder = sides.find((side) => side.id === item.takenBy)
  return `${item.name} · ${holder?.name || 'in use'}`
}

function ChoiceField({ label, value, onChange, options, selfId, sides }) {
  return (
    <TextField select size="small" label={label} value={value} onChange={onChange}>
      <MenuItem value="">Choose</MenuItem>
      {options.map((item) => (
        <MenuItem key={item.id} value={item.id} disabled={Boolean(item.takenBy) && item.takenBy !== selfId}>
          {choiceLabel(item, sides, selfId)}
        </MenuItem>
      ))}
    </TextField>
  )
}

function SideEditor({ side, swatches, themes, sides, canEdit }) {
  const commit = useCommit()
  const [draft, setDraft] = useState({ name: side.name, swatchId: side.swatchId, themeId: side.themeId, icon: side.icon })
  const [confirming, setConfirming] = useState(false)
  useEffect(() => {
    setDraft({ name: side.name, swatchId: side.swatchId, themeId: side.themeId, icon: side.icon })
  }, [side.name, side.swatchId, side.themeId, side.icon])
  const kind = side.kind === 'alliance' ? 'alliance' : 'country'
  if (!canEdit) {
    return (
      <Typography variant="body2">
        {side.name} <Caption>{kind}</Caption>
      </Typography>
    )
  }
  return (
    <Stack spacing={1}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: side.colour || 'action.disabledBackground', flexShrink: 0 }} aria-hidden />
        <Typography variant="body2" sx={{ flex: 1 }}>{side.name}</Typography>
        <Caption>{kind}</Caption>
      </Stack>
      <TextField size="small" label="Name" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
      <ChoiceField
        label="Map colour"
        value={draft.swatchId}
        options={swatches}
        selfId={side.id}
        sides={sides}
        onChange={(event) => setDraft({ ...draft, swatchId: event.target.value })}
      />
      <ChoiceField
        label="Theme"
        value={draft.themeId}
        options={themes}
        selfId={side.id}
        sides={sides}
        onChange={(event) => setDraft({ ...draft, themeId: event.target.value })}
      />
      <IconField value={draft.icon} onChange={(icon) => setDraft({ ...draft, icon })} />
      <Stack direction="row" spacing={1}>
        <Button size="small" onClick={() => commit((userId) => api.saveSide(userId, { id: side.id, ...draft }))}>
          Save
        </Button>
        <Button size="small" color="error" onClick={() => setConfirming(true)}>
          Remove
        </Button>
      </Stack>
      <ConfirmDialog
        open={confirming}
        title="Remove side"
        message={`Remove ${side.name}? Its ORBATs and members are affected.`}
        confirmLabel="Remove"
        onClose={() => setConfirming(false)}
        onConfirm={() => commit((userId) => api.deleteSide(userId, side.id)).then(() => setConfirming(false)).catch(() => setConfirming(false))}
      />
    </Stack>
  )
}

function UserRow({ item, roles, sides, canEdit }) {
  const commit = useCommit()
  const [password, setPassword] = useState('')
  return (
    <Stack spacing={1}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <Typography variant="body2" sx={{ flex: 1, opacity: item.active ? 1 : 0.55 }}>{item.title}</Typography>
        <Caption>{item.active ? item.role || 'No role' : 'Inactive'}</Caption>
      </Stack>
      {canEdit && !item.protected ? (
        <>
          <TextField
            select
            size="small"
            label="Roles"
            value={item.roleIds}
            onChange={(event) => commit((userId) => api.saveUser(userId, { id: item.id, roleIds: event.target.value }))}
            slotProps={{ select: { multiple: true } }}
          >
            {roles.map((role) => (
              <MenuItem key={role.id} value={role.numericId}>{role.name}</MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Administers side"
            value={item.sideId || ''}
            onChange={(event) => commit((userId) => api.assignUserSide(userId, item.id, event.target.value))}
          >
            {sides.map((entry) => (
              <MenuItem key={entry.id} value={entry.id}>{entry.name}</MenuItem>
            ))}
          </TextField>
          <Stack direction="row" spacing={1}>
            <TextField size="small" type="password" label="New password" value={password} onChange={(event) => setPassword(event.target.value)} sx={{ flex: 1 }} />
            <Button
              size="small"
              disabled={password.length < 3}
              onClick={() => commit((userId) => api.saveUser(userId, { id: item.id, password })).then(() => setPassword(''))}
            >
              Set
            </Button>
          </Stack>
          <Button
            size="small"
            color={item.active ? 'error' : 'primary'}
            onClick={() => commit((userId) => api.saveUser(userId, { id: item.id, active: !item.active }))}
          >
            {item.active ? 'Deactivate' : 'Activate'}
          </Button>
        </>
      ) : null}
      {item.protected ? <Caption>APEX is the protected administrator.</Caption> : null}
    </Stack>
  )
}

function RoleEditor({ role, catalog, canEdit }) {
  const commit = useCommit()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState({ name: role.name, functionalityIds: role.functionalityIds })
  useEffect(() => {
    setDraft({ name: role.name, functionalityIds: role.functionalityIds })
  }, [role.name, role.functionalityIds])
  const toggle = (id) =>
    setDraft((current) => ({
      ...current,
      functionalityIds: current.functionalityIds.includes(id) ? current.functionalityIds.filter((item) => item !== id) : [...current.functionalityIds, id],
    }))
  return (
    <Stack spacing={0.5}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <Typography variant="body2" sx={{ flex: 1 }}>{role.name}</Typography>
        <Caption>{role.code}</Caption>
        {canEdit ? <Button size="small" onClick={() => setOpen(!open)}>{open ? 'Close' : 'Edit'}</Button> : null}
      </Stack>
      {canEdit && open ? (
        <Stack spacing={0.5}>
          <TextField size="small" label="Name" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
          {catalog.map((functionality) => (
            <FormControlLabel
              key={functionality.id}
              label={functionality.name}
              control={<Checkbox size="small" checked={draft.functionalityIds.includes(functionality.id)} onChange={() => toggle(functionality.id)} />}
              sx={{ m: 0, '& .MuiFormControlLabel-label': { fontSize: 13 } }}
            />
          ))}
          <Stack direction="row" spacing={1}>
            <Button size="small" onClick={() => commit((userId) => api.saveRole(userId, { id: role.id, ...draft })).then(() => setOpen(false))}>Save</Button>
            <Button size="small" color="error" onClick={() => commit((userId) => api.deleteRole(userId, role.id))}>Remove</Button>
          </Stack>
        </Stack>
      ) : null}
    </Stack>
  )
}

function DirectoryPanel() {
  const data = useDirectoryStore((state) => state.data)
  const functionalities = useSessionStore((state) => state.session?.functionalities)
  const commit = useCommit()
  const [side, setSide] = useState({ name: '', swatchId: '', themeId: '', icon: '' })
  const [role, setRole] = useState({ newId: '', name: '' })
  if (!data) return null
  const canUsers = hasFunctionality(functionalities, FunctionalityCodes.MANAGE_USERS)
  const canSides = hasFunctionality(functionalities, FunctionalityCodes.MANAGE_SIDES)
  const canRoles = hasFunctionality(functionalities, FunctionalityCodes.MANAGE_ROLES)
  const swatches = data.swatches ?? EMPTY_LIST
  const themes = data.themeChoices ?? EMPTY_LIST
  const catalog = data.functionalityCatalog ?? EMPTY_LIST
  if (!canUsers && !canSides && !canRoles && !hasFunctionality(functionalities, FunctionalityCodes.MANAGE_THEMES)) {
    return <Caption>Your role does not include administration.</Caption>
  }
  return (
    <Stack spacing={2}>
      {canUsers ? (
        <>
          <Typography variant="subtitle2">Users</Typography>
          <Caption>
            New users are created from an ORBAT node{hasFunctionality(functionalities, FunctionalityCodes.MARK_AS_USER) ? ' (ORBAT, then Mark as user)' : ''}.
          </Caption>
          {data.users.map((item) => (
            <UserRow key={item.id} item={item} roles={data.roles} sides={data.sides} canEdit={canUsers} />
          ))}
        </>
      ) : null}
      <Typography variant="subtitle2">Sides</Typography>
      {data.sides.map((item) => (
        <SideEditor key={item.id} side={item} swatches={swatches} themes={themes} sides={data.sides} canEdit={canSides} />
      ))}
      {canSides ? (
        <>
          <Typography variant="caption" color="text.secondary">Add a side</Typography>
          <TextField size="small" label="Side name" value={side.name} onChange={(event) => setSide({ ...side, name: event.target.value })} />
          <ChoiceField label="Map colour" value={side.swatchId} options={swatches} selfId="" sides={data.sides} onChange={(event) => setSide({ ...side, swatchId: event.target.value })} />
          <ChoiceField label="Theme" value={side.themeId} options={themes} selfId="" sides={data.sides} onChange={(event) => setSide({ ...side, themeId: event.target.value })} />
          <IconField value={side.icon} onChange={(icon) => setSide({ ...side, icon })} />
          <Button disabled={!side.name.trim()} onClick={() => commit((userId) => api.saveSide(userId, side)).then(() => setSide({ name: '', swatchId: '', themeId: '', icon: '' }))}>
            Add side
          </Button>
        </>
      ) : null}
      {canRoles || canUsers ? (
        <>
          <Typography variant="subtitle2">Roles</Typography>
          {data.roles.map((item) => (
            <RoleEditor key={item.id} role={item} catalog={catalog} canEdit={canRoles} />
          ))}
        </>
      ) : null}
      {canRoles ? (
        <>
          <TextField size="small" label="Role code" value={role.newId} onChange={(event) => setRole({ ...role, newId: event.target.value })} />
          <TextField size="small" label="Role name" value={role.name} onChange={(event) => setRole({ ...role, name: event.target.value })} />
          <Button disabled={!role.newId.trim() || !role.name.trim()} onClick={() => commit((userId) => api.saveRole(userId, role)).then(() => setRole({ newId: '', name: '' }))}>Add role</Button>
        </>
      ) : null}
    </Stack>
  )
}

function OrbatGate() {
  const functionalities = useSessionStore((state) => state.session?.functionalities)
  if (!canOpenOrbat(functionalities)) return <Caption>Your role does not include ORBAT.</Caption>
  return <OrbatPanel />
}

function FlagPanel() {
  const flags = useDirectoryStore((state) => state.data?.flagList ?? EMPTY_LIST)
  const commit = useCommit()
  return (
    <List disablePadding>
      {flags.map((flag) => (
        <ListItemButton key={flag.key} onClick={() => commit((userId) => api.setFlag(userId, flag.key, !flag.enabled))}>
          <ListItemText primary={flag.label} secondary={flag.group} />
          <Typography variant="caption" color={flag.enabled ? 'primary.main' : 'text.secondary'}>
            {flag.enabled ? 'On' : 'Off'}
          </Typography>
        </ListItemButton>
      ))}
    </List>
  )
}
