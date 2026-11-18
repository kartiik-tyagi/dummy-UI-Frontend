import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Menu,
  MenuItem,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material'
import { FunctionalityCodes, hasFunctionality } from '../../shared/auth/functionalityCodes'
import { hasAny } from '../../shared/auth/access'
import { get } from '../../shared/api/http'
import * as directoryApi from '../../shared/api/client'
import { EMPTY_LIST } from '../../shared/lib/empty'
import { ConfirmDialog } from '../../shared/ui/ConfirmDialog'
import { LoadingState } from '../../shared/ui/LoadingState'
import { useDirectoryStore } from '../directory/useDirectoryStore'
import { useToastStore } from '../feedback/useToastStore'
import { useSessionStore } from '../session/useSessionStore'
import * as api from './orbatApi'
import { AllianceDialog, MarkAsUserDialog, NodeNameDialog, ReplicaDialog } from './OrbatDialogs'
import { OrbatTree } from './OrbatTree'
import { addChild, descendantIds, indexNodes, nodesOf, pathTo, removeSubtree, reparent, sameNodes, updateNode } from './orbatDoc'

function Caption({ children }) {
  return (
    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
      {children}
    </Typography>
  )
}

function statusOf(record) {
  return record?.metadata?.status === 'finalized' ? 'finalized' : 'draft'
}

function NodeDetails({ node, nodes, nodeTypes, sidesById, userName, editable, canMark, onChange, onAdd, onDelete, onMark }) {
  const [name, setName] = useState(node?.name || '')
  useEffect(() => {
    setName(node?.name || '')
  }, [node?.id, node?.name])
  if (!node) return <Caption>Select a node to see its details.</Caption>
  const parent = nodes.find((item) => item.id === node.parentId)
  const path = pathTo(nodes, node.id).map((item) => item.name).join(' / ')
  const kids = nodes.filter((item) => item.parentId === node.id).length
  const commitName = () => {
    const next = name.trim()
    if (!next) setName(node.name)
    else if (next !== node.name) onChange({ name: next })
  }
  return (
    <Stack spacing={1.25}>
      <Typography variant="subtitle2">Details</Typography>
      <TextField
        size="small"
        label="Name"
        value={name}
        disabled={!editable}
        onChange={(event) => setName(event.target.value)}
        onBlur={commitName}
        onKeyDown={(event) => event.key === 'Enter' && event.currentTarget.blur()}
      />
      <TextField
        select
        size="small"
        label="Node type"
        value={node.nodeTypeId ?? ''}
        disabled={!editable}
        onChange={(event) => onChange({ nodeTypeId: event.target.value === '' ? null : event.target.value })}
      >
        <MenuItem value="">None</MenuItem>
        {[...nodeTypes.values()].map((type) => (
          <MenuItem key={type.id} value={type.id}>{type.name}</MenuItem>
        ))}
      </TextField>
      <Box>
        <Caption>Home side</Caption>
        <Typography variant="body2">{sidesById.get(node.homeSideId)?.name || `Side ${node.homeSideId}`}</Typography>
      </Box>
      <Box>
        <Caption>Position</Caption>
        <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>{path}</Typography>
        <Caption>{parent ? `Under ${parent.name}` : 'Root'} · {kids} {kids === 1 ? 'child' : 'children'}</Caption>
      </Box>
      {node.sourceNodeId ? (
        <Box>
          <Caption>Copied from standard node</Caption>
          <Typography variant="caption" sx={{ wordBreak: 'break-all' }}>{node.sourceNodeId}</Typography>
        </Box>
      ) : null}
      {userName ? (
        <Box>
          <Caption>Marked as user</Caption>
          <Typography variant="body2">{userName}</Typography>
        </Box>
      ) : null}
      <Divider />
      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
        {editable ? <Button size="small" onClick={onAdd}>Add child</Button> : null}
        {editable && node.parentId ? <Button size="small" color="error" onClick={onDelete}>Delete</Button> : null}
        {canMark && !userName ? <Button size="small" onClick={onMark}>Mark as user</Button> : null}
      </Stack>
    </Stack>
  )
}

export default function OrbatPanel() {
  const session = useSessionStore((state) => state.session)
  const push = useToastStore((state) => state.push)
  const functionalities = session?.functionalities
  const userId = session?.profile?.id

  const canStandard = hasFunctionality(functionalities, FunctionalityCodes.MANAGE_STANDARD_ORBAT)
  const canMark = hasFunctionality(functionalities, FunctionalityCodes.MARK_AS_USER)
  const canPlaying = hasFunctionality(functionalities, FunctionalityCodes.MANAGE_PLAYING_ORBAT)
  const canAlliance = hasFunctionality(functionalities, FunctionalityCodes.MANAGE_ALLIANCE)
  const showStandard = canStandard || canMark || hasAny(functionalities, FunctionalityCodes.MANAGE_USERS)
  const showPlaying = canPlaying || canAlliance

  const [tab, setTab] = useState(showStandard ? 'standard' : 'playing')
  const [sides, setSides] = useState(null)
  const [nodeTypes, setNodeTypes] = useState(() => new Map())
  const [roles, setRoles] = useState(EMPTY_LIST)
  const [themes, setThemes] = useState(EMPTY_LIST)
  const [scenarios, setScenarios] = useState(session?.scenarios || EMPTY_LIST)
  const [markedNodes, setMarkedNodes] = useState(() => new Map())

  const [sideId, setSideId] = useState('')
  const [scenarioId, setScenarioId] = useState(session?.activeScenarioId || '')
  const [games, setGames] = useState(() => (session?.games || EMPTY_LIST).filter((item) => item.scenarioId === (session?.activeScenarioId || '')))
  const [gameId, setGameId] = useState(session?.activeGame?.id || '')
  const [orbats, setOrbats] = useState(EMPTY_LIST)
  const [orbatId, setOrbatId] = useState('')
  const [standard, setStandard] = useState(undefined)

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [saveError, setSaveError] = useState('')

  const [nodes, setNodes] = useState(EMPTY_LIST)
  const [selectedId, setSelectedId] = useState(null)
  const [expanded, setExpanded] = useState(() => new Set())
  const [menu, setMenu] = useState(null)
  const [dialog, setDialog] = useState(null)
  const [discard, setDiscard] = useState(null)

  const record = tab === 'standard' ? standard : orbats.find((item) => String(item.id) === orbatId) || null
  const serverNodes = useMemo(() => nodesOf(record?.orbatJson), [record])
  const dirty = Boolean(record) && !sameNodes(nodes, serverNodes)
  const status = statusOf(record)
  const editable = tab === 'standard' ? canStandard && Boolean(record) : (canPlaying || canAlliance) && Boolean(record)

  const sidesById = useMemo(() => new Map((sides || []).map((side) => [side.id, side])), [sides])
  const countrySides = useMemo(() => (sides || []).filter((side) => side.kind === 'country'), [sides])
  const index = useMemo(() => indexNodes(nodes), [nodes])
  const selected = index.byId.get(selectedId) || null
  const userByNode = useMemo(() => markedNodes, [markedNodes])

  const guard = (action) => {
    if (dirty) setDiscard({ run: action })
    else action()
  }

  // Reference data
  useEffect(() => {
    let live = true
    const soft = (promise, apply) =>
      promise.then((value) => live && apply(value)).catch(() => {})
    api
      .listSides()
      .then((rows) => {
        if (!live) return
        setSides(rows)
        const countries = rows.filter((side) => side.kind === 'country')
        const own = countries.find((side) => side.id === session?.me?.administeredSideId)
        setSideId((current) => current || String((own || countries[0])?.id ?? ''))
      })
      .catch((error) => live && setLoadError(error?.message || 'The sides could not be loaded.'))
    soft(api.listNodeTypes(), (rows) => setNodeTypes(new Map(rows.map((type) => [type.id, type]))))
    if (canMark) soft(api.listRoles(), setRoles)
    soft(get('/themes'), setThemes)
    if (hasFunctionality(functionalities, FunctionalityCodes.MANAGE_USERS)) {
      soft(api.listUsers(), (rows) => {
        const next = new Map()
        rows.forEach((user) => user.standardNodeId && next.set(user.standardNodeId, user.name))
        setMarkedNodes((current) => new Map([...next, ...current]))
      })
    }
    if (hasFunctionality(functionalities, FunctionalityCodes.MANAGE_SCENARIO)) {
      soft(api.listScenarios(), (rows) =>
        setScenarios(rows.map((row) => ({ id: String(row.id), name: row.name, active: Boolean(row.active) }))),
      )
    }
    return () => {
      live = false
    }
  }, [canMark, functionalities, session?.me?.administeredSideId])

  // Standard ORBAT of the chosen side
  const loadStandard = useCallback(async () => {
    if (!sideId) return
    setLoading(true)
    setLoadError('')
    try {
      setStandard(await api.getStandardOrbat(sideId))
    } catch (error) {
      setStandard(undefined)
      setLoadError(error?.message || 'The standard ORBAT could not be loaded.')
    } finally {
      setLoading(false)
    }
  }, [sideId])

  useEffect(() => {
    if (tab === 'standard') loadStandard()
  }, [tab, loadStandard])

  // Games of the chosen scenario
  useEffect(() => {
    if (!scenarioId) {
      setGames(EMPTY_LIST)
      setGameId('')
      return undefined
    }
    let live = true
    const fromSession = (session?.games || EMPTY_LIST).filter((item) => item.scenarioId === scenarioId)
    const pick = (rows) => {
      setGames(rows)
      setGameId((current) => {
        if (current && rows.some((row) => row.id === current)) return current
        return (rows.find((row) => row.active) || rows[0])?.id || ''
      })
    }
    api
      .listGames(scenarioId)
      .then((rows) => live && pick(rows.map((row) => ({ id: String(row.id), name: row.name, active: Boolean(row.active), moonphases: row.moonphases || '' }))))
      .catch(() => live && pick(fromSession))
    return () => {
      live = false
    }
  }, [scenarioId, session?.games])

  // Playing ORBATs of the chosen game
  const loadPlaying = useCallback(async (keepId) => {
    if (!gameId) {
      setOrbats(EMPTY_LIST)
      return
    }
    setLoading(true)
    setLoadError('')
    try {
      const rows = await api.listPlayingOrbats(gameId)
      setOrbats(rows)
      setOrbatId((current) => {
        const wanted = keepId ?? current
        if (wanted && rows.some((row) => String(row.id) === String(wanted))) return String(wanted)
        return rows[0] ? String(rows[0].id) : ''
      })
    } catch (error) {
      setOrbats(EMPTY_LIST)
      setLoadError(error?.message || 'The playing ORBATs could not be loaded.')
    } finally {
      setLoading(false)
    }
  }, [gameId])

  useEffect(() => {
    if (tab === 'playing') loadPlaying()
  }, [tab, loadPlaying])

  // A new server record replaces the local edit copy.
  const recordKey = `${tab}:${record?.id ?? ''}`
  const recordVersion = `${recordKey}:${record?.version ?? ''}`
  useEffect(() => {
    setNodes(serverNodes)
    setSelectedId((current) => (serverNodes.some((node) => node.id === current) ? current : indexNodes(serverNodes).roots[0]?.id ?? null))
    setSaveError('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordVersion])
  useEffect(() => {
    setExpanded(new Set(indexNodes(serverNodes).roots.map((root) => root.id)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordKey])

  // ---- editing
  const openAdd = (id) => setDialog({ kind: 'add', id })
  const openRename = (id) => setDialog({ kind: 'rename', id })
  const openDelete = (id) => setDialog({ kind: 'delete', id })
  const openMark = (id) => {
    if (dirty) {
      push('Save the ORBAT first: the node must exist on the server.', 'warning')
      return
    }
    setDialog({ kind: 'mark', id })
  }

  const onTreeAction = (action, id) => {
    if (action === 'add') openAdd(id)
    if (action === 'rename') openRename(id)
    if (action === 'delete') openDelete(id)
  }

  const homeSideNumeric = tab === 'standard' ? Number(sideId) : record?.sideId

  const addNode = async ({ name, nodeTypeId }) => {
    const result = addChild(nodes, dialog.id, { name, nodeTypeId, homeSideId: homeSideNumeric })
    setNodes(result.nodes)
    setSelectedId(result.node.id)
    setExpanded((current) => new Set(current).add(dialog.id))
    setDialog(null)
  }

  const renameNode = async ({ name }) => {
    setNodes((current) => updateNode(current, dialog.id, { name }))
    setDialog(null)
  }

  const deleteNode = () => {
    const id = dialog.id
    const parentId = index.byId.get(id)?.parentId
    setNodes((current) => removeSubtree(current, id))
    setSelectedId(parentId || null)
    setDialog(null)
  }

  const moveNode = (id, parentId) => setNodes((current) => reparent(current, id, parentId))

  const save = async (metadata) => {
    if (!record) return null
    setSaving(true)
    setSaveError('')
    try {
      const body = { orbatJson: { ...(record.orbatJson || {}), nodes }, metadata, version: record.version }
      const saved = tab === 'standard' ? await api.saveStandardOrbat(sideId, { ...body, metadata: record.metadata || undefined }) : await api.savePlayingOrbat(gameId, record.id, body)
      if (tab === 'standard') setStandard(saved)
      else setOrbats((current) => current.map((item) => (item.id === saved.id ? saved : item)))
      push(metadata?.status === 'finalized' ? 'ORBAT finalized.' : 'ORBAT saved.', 'success')
      return saved
    } catch (error) {
      const conflict = error?.code === 'CONFLICT' || /version|conflict/i.test(error?.message || '')
      const message = conflict
        ? (error?.message || 'Another user saved this ORBAT. Reload and try again.')
        : (error?.message || 'The ORBAT could not be saved.')
      setSaveError(message)
      push(message, 'error')
      return null
    } finally {
      setSaving(false)
    }
  }

  const reload = () => (tab === 'standard' ? loadStandard() : loadPlaying(orbatId))

  const markUser = async ({ name, password, roleIds }) => {
    const node = index.byId.get(dialog.id)
    const created = await api.markAsUser({ standardOrbatId: record.id, standardNodeId: node.id, name, password, roleIds })
    setMarkedNodes((current) => new Map(current).set(node.id, created.name))
    push(`User ${created.name} created.`, 'success')
    setDialog(null)
    if (hasFunctionality(functionalities, FunctionalityCodes.MANAGE_USERS)) {
      useDirectoryStore.getState().run(() => directoryApi.loadWorkbench(userId)).catch(() => {})
    }
  }

  const createStandard = async () => {
    setSaving(true)
    try {
      setStandard(await api.createStandardOrbat(sideId))
    } catch (error) {
      push(error?.message || 'The standard ORBAT could not be created.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const replicate = async (id) => {
    const created = await api.replicatePlayingOrbat(gameId, id)
    setDialog(null)
    push(`Playing ORBAT for ${created.name} created.`, 'success')
    await loadPlaying(created.id)
  }

  const createAlliance = async (body) => {
    const created = await api.createAlliance(gameId, body)
    setDialog(null)
    push(`Alliance ${created.side?.name || ''} created.`, 'success')
    await loadPlaying(created.playingOrbatId)
  }

  const finalize = async () => {
    const saved = await save({ status: 'finalized' })
    if (saved) setDialog(null)
  }

  const removeOrbat = async () => {
    try {
      await api.deletePlayingOrbat(gameId, record.id)
      push('Playing ORBAT deleted.', 'success')
      setDialog(null)
      setOrbatId('')
      await loadPlaying('')
    } catch (error) {
      push(error?.message || 'The playing ORBAT could not be deleted.', 'error')
      setDialog(null)
    }
  }

  const menuNode = menu ? index.byId.get(menu.id) : null
  const closeMenu = () => setMenu(null)
  const markedHere = (id) => userByNode.has(id)

  if (!showStandard && !showPlaying) return <Caption>Your role does not include ORBAT.</Caption>
  if (!sides && !loadError) return <LoadingState label="Opening ORBAT" />

  const replicaSides = countrySides.filter((side) => !orbats.some((item) => item.sideId === side.id))
  const delNode = dialog?.kind === 'delete' ? index.byId.get(dialog.id) : null
  const delCount = delNode ? descendantIds(nodes, delNode.id).size : 0

  return (
    <Stack spacing={1.5}>
      {showStandard && showPlaying ? (
        <Tabs
          value={tab}
          onChange={(_, value) => guard(() => setTab(value))}
          variant="fullWidth"
          sx={{ minHeight: 36, '& .MuiTab-root': { minHeight: 36, textTransform: 'none' } }}
        >
          <Tab value="standard" label="Standard" />
          <Tab value="playing" label="Playing" />
        </Tabs>
      ) : null}

      {tab === 'standard' ? (
        <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            select
            size="small"
            label="Side"
            value={sideId}
            onChange={(event) => guard(() => setSideId(event.target.value))}
            sx={{ minWidth: 200 }}
          >
            {countrySides.map((side) => (
              <MenuItem key={side.id} value={String(side.id)}>{side.name}</MenuItem>
            ))}
          </TextField>
          {standard === null && canStandard ? (
            <Button size="small" variant="outlined" onClick={createStandard} disabled={saving}>Create standard ORBAT</Button>
          ) : null}
        </Stack>
      ) : (
        <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            select
            size="small"
            label="Scenario"
            value={scenarioId}
            onChange={(event) => guard(() => setScenarioId(event.target.value))}
            sx={{ minWidth: 170 }}
            disabled={!scenarios.length}
            helperText={!scenarios.length ? 'Needs Manage scenario' : undefined}
          >
            {scenarios.map((item) => (
              <MenuItem key={item.id} value={item.id}>{item.name}{item.active ? ' · active' : ''}</MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Game"
            value={gameId}
            onChange={(event) => guard(() => setGameId(event.target.value))}
            sx={{ minWidth: 150 }}
            disabled={!games.length}
            helperText={scenarioId && !games.length ? 'No games' : undefined}
          >
            {games.map((item) => (
              <MenuItem key={item.id} value={item.id}>{item.name}{item.active ? ' · active' : ''}</MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Side"
            value={orbatId}
            onChange={(event) => guard(() => setOrbatId(event.target.value))}
            sx={{ minWidth: 190 }}
            disabled={!orbats.length}
          >
            {orbats.map((item) => (
              <MenuItem key={item.id} value={String(item.id)}>
                {item.name}{item.metadata?.alliance ? ' (alliance)' : ''} · {statusOf(item)}
              </MenuItem>
            ))}
          </TextField>
          {canPlaying ? <Button size="small" variant="outlined" onClick={() => setDialog({ kind: 'replica' })} disabled={!gameId}>Replica</Button> : null}
          {canAlliance ? <Button size="small" variant="outlined" onClick={() => setDialog({ kind: 'alliance' })} disabled={!gameId}>Alliance</Button> : null}
        </Stack>
      )}

      {loadError ? (
        <Alert severity="error" action={<Button color="inherit" size="small" onClick={reload}>Retry</Button>}>{loadError}</Alert>
      ) : null}
      {saveError ? (
        <Alert severity="error" action={<Button color="inherit" size="small" onClick={reload}>Reload</Button>}>{saveError}</Alert>
      ) : null}

      {record ? (
        <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <Typography variant="subtitle2" sx={{ minWidth: 0 }} noWrap>{record.name}</Typography>
          <Chip size="small" label={`v${record.version}`} variant="outlined" />
          {tab === 'playing' ? <Chip size="small" label={status} color={status === 'finalized' ? 'success' : 'default'} /> : null}
          {dirty ? <Chip size="small" label="Unsaved" color="warning" /> : null}
          <Box sx={{ flex: 1 }} />
          {editable ? (
            <>
              <Button size="small" disabled={!dirty || saving} onClick={() => setNodes(serverNodes)}>Discard</Button>
              <Button size="small" variant="contained" disabled={!dirty || saving} onClick={() => save(undefined)}>{saving ? 'Saving' : 'Save'}</Button>
            </>
          ) : null}
          {tab === 'playing' && editable ? (
            <>
              <Button size="small" color="success" variant="outlined" disabled={saving || (status === 'finalized' && !dirty)} onClick={() => setDialog({ kind: 'finalize' })}>Finalize</Button>
              <Button size="small" color="error" disabled={saving} onClick={() => setDialog({ kind: 'delete-orbat' })}>Delete</Button>
            </>
          ) : null}
        </Stack>
      ) : null}

      {loading ? <LoadingState label="Loading ORBAT" /> : null}

      {!loading && !record && !loadError ? (
        <Caption>
          {tab === 'standard'
            ? !countrySides.length
              ? 'No country sides yet. Open Users and sides to add a side first.'
              : standard === null
                ? 'This side has no standard ORBAT yet.'
                : 'Choose a side.'
            : !gameId
              ? 'Choose a scenario and a game.'
              : 'This game has no playing ORBAT yet. Replicate a standard ORBAT or create an alliance.'}
        </Caption>
      ) : null}

      {record && !loading ? (
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 1.5, minHeight: 320 }}>
          <Box sx={{ flex: 1, minWidth: 0, maxHeight: { md: 'calc(100vh - 330px)' }, overflow: 'auto', border: 1, borderColor: 'divider', borderRadius: 1 }}>
            {nodes.length ? (
              <OrbatTree
                nodes={nodes}
                nodeTypes={nodeTypes}
                selectedId={selectedId}
                onSelect={setSelectedId}
                expanded={expanded}
                setExpanded={setExpanded}
                editable={editable}
                onContextMenu={(point, id) => setMenu({ ...point, id })}
                onMove={moveNode}
                onAction={onTreeAction}
                userByNode={userByNode}
              />
            ) : (
              <Box sx={{ p: 2 }}><Caption>This ORBAT has no nodes.</Caption></Box>
            )}
          </Box>
          <Box
            component="aside"
            aria-label="Node details"
            sx={{ width: { xs: '100%', md: 250 }, flexShrink: 0, borderLeft: { md: 1 }, borderTop: { xs: 1, md: 0 }, borderColor: 'divider', pl: { md: 1.5 }, pt: { xs: 1.5, md: 0 }, overflow: 'auto', maxHeight: { md: 'calc(100vh - 330px)' } }}
          >
            <NodeDetails
              node={selected}
              nodes={nodes}
              nodeTypes={nodeTypes}
              sidesById={sidesById}
              userName={selected ? userByNode.get(selected.id) : ''}
              editable={editable}
              canMark={tab === 'standard' && canMark}
              onChange={(patch) => setNodes((current) => updateNode(current, selected.id, patch))}
              onAdd={() => openAdd(selected.id)}
              onDelete={() => openDelete(selected.id)}
              onMark={() => openMark(selected.id)}
            />
          </Box>
        </Box>
      ) : null}

      <Menu
        open={Boolean(menu)}
        onClose={closeMenu}
        anchorReference="anchorPosition"
        anchorPosition={menu ? { top: menu.y, left: menu.x } : undefined}
      >
        {editable ? <MenuItem onClick={() => { closeMenu(); openAdd(menu.id) }}>Add child</MenuItem> : null}
        {editable ? <MenuItem onClick={() => { closeMenu(); openRename(menu.id) }}>Rename</MenuItem> : null}
        {editable && menuNode?.parentId ? <MenuItem onClick={() => { closeMenu(); openDelete(menu.id) }}>Delete</MenuItem> : null}
        {tab === 'standard' && canMark && menu && !markedHere(menu.id) ? <MenuItem onClick={() => { closeMenu(); openMark(menu.id) }}>Mark as user</MenuItem> : null}
        {!editable && !(tab === 'standard' && canMark) ? <MenuItem disabled>Read only</MenuItem> : null}
      </Menu>

      <NodeNameDialog
        open={dialog?.kind === 'add'}
        title={`Add a child under ${index.byId.get(dialog?.id)?.name || ''}`}
        submitLabel="Add"
        withType
        nodeTypes={[...nodeTypes.values()]}
        onClose={() => setDialog(null)}
        onSubmit={addNode}
      />
      <NodeNameDialog
        open={dialog?.kind === 'rename'}
        title="Rename node"
        initialName={index.byId.get(dialog?.id)?.name || ''}
        onClose={() => setDialog(null)}
        onSubmit={renameNode}
      />
      <ConfirmDialog
        open={dialog?.kind === 'delete'}
        title="Delete node"
        message={delNode ? `Delete ${delNode.name}${delCount ? ` and its ${delCount} descendant${delCount === 1 ? '' : 's'}` : ''}? Nothing is kept until you save.` : ''}
        confirmLabel="Delete"
        onClose={() => setDialog(null)}
        onConfirm={deleteNode}
      />
      <MarkAsUserDialog
        open={dialog?.kind === 'mark'}
        node={index.byId.get(dialog?.id)}
        roles={roles}
        onClose={() => setDialog(null)}
        onSubmit={markUser}
      />
      <ReplicaDialog open={dialog?.kind === 'replica'} sides={replicaSides} onClose={() => setDialog(null)} onSubmit={replicate} />
      <AllianceDialog open={dialog?.kind === 'alliance'} sides={countrySides} themes={themes} onClose={() => setDialog(null)} onSubmit={createAlliance} />
      <ConfirmDialog
        open={dialog?.kind === 'finalize'}
        title="Finalize playing ORBAT"
        message={`Save ${record?.name || 'this ORBAT'} and mark it finalized? Users marked on its standard nodes are assigned to it and can then work.`}
        confirmLabel="Finalize"
        busy={saving}
        error={saveError}
        onClose={() => setDialog(null)}
        onConfirm={finalize}
      />
      <ConfirmDialog
        open={dialog?.kind === 'delete-orbat'}
        title="Delete playing ORBAT"
        message={`Delete ${record?.name || 'this ORBAT'} from the game? Users assigned to it are unassigned.`}
        confirmLabel="Delete"
        onClose={() => setDialog(null)}
        onConfirm={removeOrbat}
      />
      <ConfirmDialog
        open={Boolean(discard)}
        title="Discard changes"
        message="This ORBAT has unsaved changes. Discard them?"
        confirmLabel="Discard"
        onClose={() => setDiscard(null)}
        onConfirm={() => {
          const next = discard
          setDiscard(null)
          setNodes(serverNodes)
          next?.run()
        }}
      />
    </Stack>
  )
}
