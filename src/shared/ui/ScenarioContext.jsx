import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import FlagOutlinedIcon from '@mui/icons-material/FlagOutlined'
import NightlightOutlinedIcon from '@mui/icons-material/NightlightOutlined'
import SportsEsportsOutlinedIcon from '@mui/icons-material/SportsEsportsOutlined'
import { useSessionStore } from '../../features/session/useSessionStore'

const NONE = '__none__'
const ADD = '__add__'
const ADD_GAME = '__add_game__'

function Mark({ label, children }) {
  return (
    <Tooltip title={label}>
      <Box component="span" sx={{ display: 'inline-flex', color: 'text.secondary', flexShrink: 0 }} aria-hidden>
        {children}
      </Box>
    </Tooltip>
  )
}

function Fact({ label, icon, children }) {
  return (
    <Box sx={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 0.75 }}>
      <Mark label={label}>{icon}</Mark>
      {children}
    </Box>
  )
}

export function ScenarioContext() {
  const navigate = useNavigate()
  const session = useSessionStore((state) => state.session)
  const changeScenario = useSessionStore((state) => state.changeScenario)
  const changeGame = useSessionStore((state) => state.changeGame)
  const refresh = useSessionStore((state) => state.refresh)
  const [pending, setPending] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!session) return undefined
    let live = true
    refresh().catch(() => {
      if (!live) return
    })
    return () => {
      live = false
    }
  }, [refresh, session?.profile?.id])

  if (!session) return null

  const scenarios = session.scenarios || []
  const games = (session.games || []).filter(
    (item) => !session.activeScenarioId || item.scenarioId === session.activeScenarioId,
  )
  const scenario = scenarios.find((item) => item.id === session.activeScenarioId)
  const game = games.find((item) => item.id === session.activeGame.id) || session.activeGame
  const scenarioValue = session.activeScenarioId || NONE
  const gameValue = session.activeGame.id && games.some((item) => item.id === session.activeGame.id)
    ? session.activeGame.id
    : ''

  function askScenario(id) {
    if (busy) return
    if (id === ADD) {
      navigate('/exercise/scenarios/new')
      return
    }
    if (id === NONE) {
      if (!session.activeScenarioId) return
      setError('')
      setPending({
        kind: 'scenario',
        id: '',
        name: 'No active scenario',
        from: scenario?.name || 'the current scenario',
        clearing: true,
      })
      return
    }
    if (id === session.activeScenarioId) return
    const next = scenarios.find((item) => item.id === id)
    if (!next) return
    setError('')
    setPending({ kind: 'scenario', id, name: next.name, from: scenario?.name || 'none' })
  }

  function askGame(id) {
    if (busy) return
    if (id === ADD_GAME) {
      const query = session.activeScenarioId ? `?scenarioId=${session.activeScenarioId}` : ''
      navigate(`/exercise/games/new${query}`)
      return
    }
    if (!id || id === session.activeGame.id) return
    const next = games.find((item) => item.id === id)
    if (!next || !next.open) return
    setError('')
    setPending({ kind: 'game', id, name: next.name, from: game?.name || 'the current game' })
  }

  function close() {
    if (busy) return
    setPending(null)
    setError('')
  }

  async function confirm() {
    if (!pending) return
    setBusy(true)
    setError('')
    try {
      if (pending.kind === 'scenario') await changeScenario(pending.id)
      else await changeGame(pending.id)
      setPending(null)
    } catch (failure) {
      setError(failure?.message || 'The change could not be made.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Stack direction="row" spacing={2} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
        {session.canSelectScenario ? (
          <Fact label="Scenario" icon={<FlagOutlinedIcon fontSize="small" />}>
            <TextField
              select
              size="small"
              hiddenLabel
              value={scenarioValue}
              disabled={busy}
              onChange={(event) => askScenario(event.target.value)}
              aria-label="Scenario"
              sx={{ minWidth: 188, maxWidth: 280, '& .MuiInputBase-root': { minHeight: 36 }, '& .MuiSelect-select': { py: 0.75 } }}
            >
              <MenuItem value={NONE}>No active scenario</MenuItem>
              {scenarios.length ? <Divider /> : null}
              {scenarios.map((item) => (
                <MenuItem key={item.id} value={item.id} sx={{ minHeight: 40 }}>
                  {item.name}
                  {item.active || item.id === session.activeScenarioId ? ' · active' : ''}
                </MenuItem>
              ))}
              <Divider />
              <MenuItem value={ADD} sx={{ minHeight: 40 }}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <AddIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="Add scenario…" />
              </MenuItem>
            </TextField>
          </Fact>
        ) : (
          <Fact label="Scenario" icon={<FlagOutlinedIcon fontSize="small" />}>
            <Typography variant="body2" noWrap color={scenario?.name ? 'text.primary' : 'text.secondary'}>
              {scenario?.name || 'None active'}
            </Typography>
          </Fact>
        )}
        {session.canSelectGame ? (
          <Fact label="Game" icon={<SportsEsportsOutlinedIcon fontSize="small" />}>
            <TextField
              select
              size="small"
              hiddenLabel
              value={gameValue}
              disabled={busy || !session.activeScenarioId}
              onChange={(event) => askGame(event.target.value)}
              aria-label="Game"
              displayEmpty
              sx={{ minWidth: 168, maxWidth: 240, '& .MuiInputBase-root': { minHeight: 36 }, '& .MuiSelect-select': { py: 0.75 } }}
            >
              {!session.activeScenarioId ? (
                <MenuItem value="" disabled>
                  Select a scenario first
                </MenuItem>
              ) : !games.length ? (
                <MenuItem value="" disabled>
                  No games yet
                </MenuItem>
              ) : (
                <MenuItem value="" disabled>
                  {gameValue ? 'Select game' : 'No active game'}
                </MenuItem>
              )}
              {games.map((item) => (
                <MenuItem key={item.id} value={item.id} disabled={!item.open} sx={{ minHeight: 40 }}>
                  {item.open ? item.name : `${item.name} · Closed`}
                  {item.active || item.id === session.activeGame.id ? ' · active' : ''}
                </MenuItem>
              ))}
              {session.activeScenarioId ? <Divider /> : null}
              {session.activeScenarioId ? (
                <MenuItem value={ADD_GAME} sx={{ minHeight: 40 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <AddIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary="Add game…" />
                </MenuItem>
              ) : null}
            </TextField>
          </Fact>
        ) : (
          <Fact label="Game" icon={<SportsEsportsOutlinedIcon fontSize="small" />}>
            <Typography variant="body2" noWrap color={session.activeGame.name ? 'text.primary' : 'text.secondary'}>
              {session.activeGame.name || 'None active'}
            </Typography>
          </Fact>
        )}
        {game?.dateTime ? (
          <Fact label="Game time" icon={<SportsEsportsOutlinedIcon fontSize="small" />}>
            <Typography variant="body2" noWrap>
              {new Date(game.dateTime).toLocaleString()}
            </Typography>
          </Fact>
        ) : null}
        {game?.moonphases ? (
          <Fact label="Moonphases" icon={<NightlightOutlinedIcon fontSize="small" />}>
            <Typography variant="body2" noWrap>
              {game.moonphases}
            </Typography>
          </Fact>
        ) : null}
      </Stack>
      <Dialog open={Boolean(pending)} onClose={close} fullWidth maxWidth="xs">
        <DialogTitle>
          {pending?.clearing ? 'Clear the active scenario' : pending?.kind === 'game' ? 'Activate game' : 'Activate scenario'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.primary">
            {pending?.clearing
              ? 'Clear the active scenario and game? The exercise will have no open scenario until you choose one again.'
              : pending
                ? `Set ${pending.kind} to ${pending.name}? This becomes the open exercise.`
                : ''}
          </Typography>
          {error ? (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={close} disabled={busy}>
            Cancel
          </Button>
          <Button variant="contained" onClick={confirm} disabled={busy || !pending}>
            {busy ? 'Working…' : pending?.clearing ? 'Clear' : 'Activate'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
