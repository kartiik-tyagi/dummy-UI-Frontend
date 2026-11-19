import {
  Box,
  Button,
  Chip,
  Stack,
  Slider,
  Switch,
  Typography,
} from '@mui/material'
import LayersOutlinedIcon from '@mui/icons-material/LayersOutlined'
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import { useCommit, useDirectoryStore } from '../../features/directory/useDirectoryStore'
import { useSessionStore } from '../../features/session/useSessionStore'
import * as api from '../../shared/api/client'
import { EMPTY_LIST, EMPTY_OBJECT } from '../lib/empty'

function groupFilters(filters) {
  const groups = []
  for (const filter of filters) {
    const group = groups.find((item) => item.name === filter.group)
    if (group) group.filters.push(filter)
    else groups.push({ name: filter.group, filters: [filter] })
  }
  return groups
}

export function FilterList() {
  const filters = useSessionStore((state) => state.session?.filters ?? EMPTY_LIST)
  const setFilter = useSessionStore((state) => state.setFilter)
  const setAllFilters = useSessionStore((state) => state.setAllFilters)
  const opacity = useDirectoryStore((state) => state.data?.opacity ?? EMPTY_OBJECT)
  const opacityEnabled = useDirectoryStore((state) => state.data?.flags?.layerOpacity !== false)
  const commit = useCommit()

  const shown = filters.filter((filter) => filter.visible).length
  const hidden = filters.length - shown
  const groups = groupFilters(filters)

  if (!filters.length) {
    return (
      <Stack spacing={2} alignItems="center" sx={{ py: 4, px: 2, textAlign: 'center' }}>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: 2,
            display: 'grid',
            placeItems: 'center',
            bgcolor: 'action.hover',
            color: 'text.secondary',
          }}
        >
          <LayersOutlinedIcon />
        </Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 650 }}>
          No layers available
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 280 }}>
          Map layers will appear here once the map catalog has layers for this session.
        </Typography>
      </Stack>
    )
  }

  return (
    <Stack spacing={2} sx={{ minWidth: 0 }}>
      <Stack direction="row" spacing={1.5} alignItems="flex-start">
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 2,
            display: 'grid',
            placeItems: 'center',
            bgcolor: 'action.hover',
            color: 'primary.main',
            flexShrink: 0,
          }}
        >
          <LayersOutlinedIcon fontSize="small" />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 650, lineHeight: 1.3 }}>
            Map filters
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.35 }}>
            Show or hide layers on the picture. Adjust opacity for layers that are on.
          </Typography>
        </Box>
      </Stack>

      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center">
        <Chip
          size="small"
          icon={<VisibilityOutlinedIcon />}
          color={shown ? 'primary' : 'default'}
          variant={shown ? 'filled' : 'outlined'}
          label={`${shown} shown`}
        />
        <Chip
          size="small"
          icon={<VisibilityOffOutlinedIcon />}
          variant="outlined"
          label={`${hidden} hidden`}
        />
        <Box sx={{ flex: 1, minWidth: 8 }} />
        <Button size="small" onClick={() => setAllFilters(true)} sx={{ textTransform: 'none', fontWeight: 600 }}>
          Show all
        </Button>
        <Button size="small" onClick={() => setAllFilters(false)} sx={{ textTransform: 'none', fontWeight: 600 }}>
          Hide all
        </Button>
      </Stack>

      <Stack spacing={1.75}>
        {groups.map((group) => (
          <Box
            key={group.name || 'layers'}
            sx={{
              borderRadius: 2,
              border: 1,
              borderColor: 'divider',
              bgcolor: 'background.paper',
              overflow: 'hidden',
            }}
          >
            <Box
              sx={{
                px: 1.75,
                py: 1.1,
                borderBottom: 1,
                borderColor: 'divider',
                bgcolor: 'action.hover',
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <Typography
                variant="overline"
                color="text.secondary"
                sx={{ letterSpacing: '0.1em', lineHeight: 1.2, flex: 1 }}
              >
                {group.name || 'Layers'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {group.filters.filter((item) => item.visible).length}/{group.filters.length} on
              </Typography>
            </Box>

            <Stack spacing={0} divider={<Box sx={{ borderBottom: 1, borderColor: 'divider' }} />}>
              {group.filters.map((filter) => {
                const value = opacity[filter.id] ?? filter.opacity ?? 1
                const percent = Math.round(value * 100)
                return (
                  <Box
                    key={filter.id}
                    sx={{
                      px: 1.5,
                      py: 1.25,
                      bgcolor: filter.visible ? 'action.selected' : 'transparent',
                      transition: 'background-color 120ms ease',
                    }}
                  >
                    <Stack direction="row" spacing={1.25} alignItems="center">
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: filter.visible ? 650 : 500,
                            color: 'text.primary',
                            lineHeight: 1.3,
                          }}
                        >
                          {filter.label}
                        </Typography>
                        {opacityEnabled && filter.visible ? (
                          <Typography variant="caption" color="text.secondary">
                            Opacity {percent}%
                          </Typography>
                        ) : (
                          <Typography variant="caption" color="text.secondary">
                            {filter.visible ? 'Visible on map' : 'Hidden'}
                          </Typography>
                        )}
                      </Box>
                      <Chip
                        size="small"
                        label={filter.visible ? 'On' : 'Off'}
                        color={filter.visible ? 'primary' : 'default'}
                        variant={filter.visible ? 'filled' : 'outlined'}
                        sx={{ fontWeight: 600, minWidth: 44 }}
                      />
                      <Switch
                        size="small"
                        checked={Boolean(filter.visible)}
                        onChange={() => setFilter(filter.id, !filter.visible)}
                        inputProps={{ 'aria-label': `${filter.label} visibility` }}
                      />
                    </Stack>

                    {opacityEnabled && filter.visible ? (
                      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 1, px: 0.25 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ minWidth: 28 }}>
                          Dim
                        </Typography>
                        <Slider
                          size="small"
                          min={0.15}
                          max={1}
                          step={0.05}
                          value={value}
                          aria-label={`${filter.label} opacity`}
                          onChangeCommitted={(_, next) =>
                            commit((userId) => api.setLayerOpacity(userId, filter.id, next))
                          }
                          sx={{ flex: 1 }}
                        />
                        <Typography variant="caption" color="text.secondary" sx={{ minWidth: 36, textAlign: 'right' }}>
                          Solid
                        </Typography>
                      </Stack>
                    ) : null}
                  </Box>
                )
              })}
            </Stack>
          </Box>
        ))}
      </Stack>
    </Stack>
  )
}
