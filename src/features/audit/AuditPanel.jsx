import { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material'
import { get } from '../../shared/api/http'
import { EMPTY_LIST } from '../../shared/lib/empty'
import { logger } from '../../shared/lib/logger'
import { LoadingState } from '../../shared/ui/LoadingState'
import { useToastStore } from '../feedback/useToastStore'

const EMPTY_FILTERS = { userId: '', action: '', entityType: '', entityId: '' }
const FILTER_FIELDS = [['userId', 'User ID', true], ['action', 'Action'], ['entityType', 'Entity type'], ['entityId', 'Entity ID', true]]
const SIZES = [25, 50, 100]

function formatTime(value) {
  if (!value) return '-'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString()
}

function LogRow({ item }) {
  return (
    <Box sx={{ py: 1 }}>
      <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
        <Chip size="small" label={item.action} />
        {item.entityType ? <Chip size="small" variant="outlined" label={`${item.entityType}${item.entityId != null ? ` #${item.entityId}` : ''}`} /> : null}
        <Typography variant="caption" color="text.secondary">{formatTime(item.occurredAt)}</Typography>
      </Stack>
      <Typography variant="body2" sx={{ mt: 0.5, wordBreak: 'break-word' }}>{item.summary || '-'}</Typography>
      <Typography variant="caption" color="text.secondary">
        {item.actorUserName || 'System'}{item.actorUserId != null ? ` (#${item.actorUserId})` : ''}
      </Typography>
    </Box>
  )
}

function SessionRow({ item }) {
  return (
    <Box sx={{ py: 1 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>{item.userName || `User #${item.userId}`}</Typography>
        <Chip size="small" color={item.active ? 'success' : 'default'} label={item.active ? 'Active' : item.revokedAt ? 'Revoked' : 'Expired'} />
      </Stack>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
        Login {formatTime(item.loginAt)} · Expires {formatTime(item.expiresAt)}
        {item.logoutAt ? ` · Logout ${formatTime(item.logoutAt)}` : ''}
        {item.revokedAt ? ` · Revoked ${formatTime(item.revokedAt)}` : ''}
      </Typography>
    </Box>
  )
}

/** Read-only audit trail: logs and sign-in sessions (needs VIEW_AUDIT). */
export function AuditPanel() {
  const push = useToastStore((state) => state.push)
  const [tab, setTab] = useState('logs')
  const [draft, setDraft] = useState(EMPTY_FILTERS)
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(50)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    const query = tab === 'logs' ? { ...filters, page, size } : { userId: filters.userId, page, size }
    try {
      setData(await get(`/audit/${tab}`, query))
      logger.info('audit.loaded', { tab, page, size })
    } catch (failure) {
      const text = failure?.message || 'The audit trail could not be loaded.'
      setData(null)
      setError(text)
      push(text, 'error')
      logger.warn('audit.failed', { tab, message: text })
    } finally {
      setLoading(false)
    }
  }, [tab, filters, page, size, push])

  useEffect(() => {
    load()
  }, [load])

  const items = data?.items || EMPTY_LIST
  const total = data?.total ?? 0
  const pages = Math.max(1, Math.ceil(total / size))
  const visibleFields = tab === 'logs' ? FILTER_FIELDS : FILTER_FIELDS.slice(0, 1)

  const apply = () => {
    setPage(0)
    setFilters(draft)
  }
  const clear = () => {
    setDraft(EMPTY_FILTERS)
    setFilters(EMPTY_FILTERS)
    setPage(0)
  }

  return (
    <Stack spacing={1.5}>
      <Typography variant="body2" color="text.secondary">
        Review mutating actions and sign-in sessions.
      </Typography>
      <Tabs
        value={tab}
        onChange={(_, value) => {
          setTab(value)
          setPage(0)
          setData(null)
        }}
        variant="scrollable"
        allowScrollButtonsMobile
        sx={{ minHeight: 36, '& .MuiTab-root': { minHeight: 36, textTransform: 'none' } }}
      >
        <Tab value="logs" label="Logs" />
        <Tab value="sessions" label="Sessions" />
      </Tabs>

      <Stack
        component="form"
        direction="row"
        spacing={1}
        useFlexGap
        sx={{ alignItems: 'flex-start', flexWrap: 'wrap' }}
        onSubmit={(event) => {
          event.preventDefault()
          apply()
        }}
      >
        {visibleFields.map(([name, label, numeric]) => (
          <TextField
            key={name}
            size="small"
            label={label}
            type={numeric ? 'number' : 'text'}
            value={draft[name]}
            onChange={(event) => setDraft((current) => ({ ...current, [name]: event.target.value }))}
            sx={{ width: { xs: '100%', sm: 150 }, minWidth: { sm: 140 } }}
          />
        ))}
        <TextField
          select
          size="small"
          label="Page size"
          value={size}
          onChange={(event) => {
            setSize(Number(event.target.value))
            setPage(0)
          }}
          slotProps={{ select: { native: true } }}
          sx={{ width: { xs: '100%', sm: 110 } }}
        >
          {SIZES.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </TextField>
        <Button type="submit" size="small" variant="contained" sx={{ mt: { sm: 0.5 } }}>Filter</Button>
        <Button size="small" onClick={clear} sx={{ mt: { sm: 0.5 } }}>Clear</Button>
      </Stack>

      {error ? <Alert severity="error" action={<Button color="inherit" size="small" onClick={load}>Retry</Button>}>{error}</Alert> : null}
      {loading && !data ? <LoadingState label="Loading audit trail" /> : null}

      {data ? (
        <Box sx={{ opacity: loading ? 0.6 : 1 }}>
          {items.length ? (
            items.map((item, index) => (
              <Box key={item.id}>
                {index ? <Divider /> : null}
                {tab === 'logs' ? <LogRow item={item} /> : <SessionRow item={item} />}
              </Box>
            ))
          ) : (
            <Typography variant="body2" color="text.secondary">No {tab} match these filters.</Typography>
          )}
        </Box>
      ) : null}

      {data ? (
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Button size="small" disabled={page <= 0 || loading} onClick={() => setPage((current) => current - 1)}>Previous</Button>
          <Typography variant="caption" color="text.secondary">Page {page + 1} of {pages} · {total} total</Typography>
          <Button size="small" disabled={page + 1 >= pages || loading} onClick={() => setPage((current) => current + 1)}>Next</Button>
        </Stack>
      ) : null}
    </Stack>
  )
}

export default AuditPanel
