import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Button, Typography } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { useSessionStore } from '../session/useSessionStore'
import { ApplicationMenu } from '../../shared/ui/ApplicationMenu'
import { TopBar } from '../../shared/ui/TopBar'

/** Full-viewport exercise admin shell — no map, no GIS dock. */
export function ExerciseLayout({ title, kicker, actions, children }) {
  const navigate = useNavigate()
  const refresh = useSessionStore((state) => state.refresh)

  // Keep the top-bar scenario/game dropdowns in sync after creates on these pages.
  useEffect(() => {
    refresh().catch(() => {})
  }, [refresh])

  return (
    <Box
      sx={{
        height: '100%',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default',
        color: 'text.primary',
      }}
    >
      <TopBar
        leading={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
            <ApplicationMenu presentation="menu" />
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate('/')}
              sx={{
                textTransform: 'none',
                color: 'text.primary',
                flexShrink: 0,
                fontSize: '1rem',
                fontWeight: 600,
                px: 1.5,
                minHeight: 40,
              }}
            >
              Back to map
            </Button>
          </Box>
        }
      />
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflow: 'auto',
          backgroundImage: (theme) =>
            `linear-gradient(180deg, ${theme.palette.action.hover} 0%, transparent 220px)`,
        }}
      >
        <Box
          sx={{
            maxWidth: 960,
            mx: 'auto',
            px: { xs: 2.5, sm: 3.5, md: 4 },
            py: { xs: 3, md: 4.5 },
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: { xs: 'stretch', sm: 'flex-end' },
              justifyContent: 'space-between',
              gap: 2.5,
              flexDirection: { xs: 'column', sm: 'row' },
              mb: 3.5,
              pb: 3,
              borderBottom: 1,
              borderColor: 'divider',
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              {kicker ? (
                <Typography
                  variant="overline"
                  color="text.secondary"
                  sx={{ letterSpacing: '0.12em', display: 'block', mb: 0.75, fontSize: '0.8rem' }}
                >
                  {kicker}
                </Typography>
              ) : null}
              <Typography
                variant="h4"
                component="h1"
                sx={{
                  fontWeight: 650,
                  letterSpacing: '-0.02em',
                  lineHeight: 1.25,
                  fontSize: { xs: '1.75rem', sm: '2rem' },
                }}
              >
                {title}
              </Typography>
            </Box>
            {actions ? (
              <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>{actions}</Box>
            ) : null}
          </Box>
          {children}
        </Box>
      </Box>
    </Box>
  )
}
