import { useEffect, useState } from 'react'
import { Alert, Avatar, Box, Button, Stack, TextField, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { getLoginContext, login } from '../../shared/api/client'
import { ErrorState } from '../../shared/ui/ErrorState'
import { LoadingState } from '../../shared/ui/LoadingState'
import { PasswordField } from '../../shared/ui/PasswordField'
import { useSessionStore } from '../session/useSessionStore'

function Fact({ label, value }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
        {label}
      </Typography>
      <Typography variant="body2" color="text.primary">
        {value}
      </Typography>
    </Box>
  )
}

export default function LoginPage() {
  const navigate = useNavigate()
  const signIn = useSessionStore((state) => state.signIn)
  const notice = useSessionStore((state) => state.notice)
  const clearNotice = useSessionStore((state) => state.clearNotice)
  const [userId, setUserId] = useState('')
  const [password, setPassword] = useState('')
  const context = useQuery({ queryKey: ['login-context'], queryFn: getLoginContext })

  useEffect(() => {
    document.title = 'Jayant'
  }, [])

  useEffect(() => {
    const first = context.data?.users?.[0]?.id
    if (first && !userId) setUserId(first)
  }, [context.data, userId])

  const attempt = useMutation({
    mutationFn: login,
    onSuccess: (session) => {
      signIn(session)
      navigate('/')
    },
  })

  if (context.isPending) return <LoadingState label="Opening Jayant" />

  if (context.isError) {
    return (
      <Box sx={{ p: 3, maxWidth: 560 }}>
        <ErrorState title="Jayant is unavailable" message={context.error.message} onRetry={() => context.refetch()} />
      </Box>
    )
  }

  const data = context.data
  const selected = data.users.find((user) => user.id.toLowerCase() === userId.trim().toLowerCase())

  return (
    <Box
      sx={(theme) => ({
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        color: 'text.primary',
        backgroundImage: `linear-gradient(90deg, ${alpha(theme.palette.background.default, 0.2)}, ${alpha(theme.palette.background.default, 0.45)}), url(${data.backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      })}
    >
      <Box
        sx={{
          px: 2,
          minHeight: 32,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          bgcolor: (theme) => alpha(theme.palette.background.paper, 0.72),
          color: 'text.primary',
        }}
      >
        <Typography variant="caption" sx={{ letterSpacing: '0.16em' }}>
          {data.classification}
        </Typography>
        <Typography variant="caption" sx={{ letterSpacing: '0.06em' }}>
          {data.accessNotice}
        </Typography>
      </Box>
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflow: 'auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: { xs: 'center', md: 'flex-end' },
          px: { xs: 2, md: 6 },
          py: 3,
        }}
      >
        <Box
          component="form"
          onSubmit={(event) => {
            event.preventDefault()
            clearNotice()
            attempt.mutate({ userId, password })
          }}
          sx={{
            width: 'min(400px, 100%)',
            p: { xs: 2.5, sm: 3 },
            bgcolor: (theme) => alpha(theme.palette.background.paper, 0.94),
            border: 1,
            borderColor: 'divider',
            boxShadow: 8,
          }}
        >
            <Stack spacing={2.5}>
              <Box>
                <Typography variant="overline" color="primary" sx={{ letterSpacing: '0.2em' }}>
                  {data.systemName}
                </Typography>
                <Typography variant="h5" component="h1" color="text.primary">
                  {data.exerciseTitle}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {data.purpose}
                </Typography>
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <Fact label="Active scenario" value={data.activeScenarioName || 'Shown after sign in'} />
                <Fact label="Active game" value={data.activeGameName || 'Shown after sign in'} />
              </Box>
              {selected ? (
                <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
                  <Avatar src={selected.avatarUrl} alt="" variant="rounded" sx={{ width: 40, height: 40 }} />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" noWrap>
                      {selected.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {selected.role} · {selected.service}
                    </Typography>
                  </Box>
                </Stack>
              ) : null}
              <TextField
                required
                fullWidth
                autoFocus
                label="User name"
                value={userId}
                onChange={(event) => setUserId(event.target.value)}
                autoComplete="username"
                slotProps={{ htmlInput: { autoCapitalize: 'off', spellCheck: false } }}
              />
              <PasswordField value={password} onChange={setPassword} />
              {notice ? (
                <Alert severity="warning" onClose={clearNotice}>
                  {notice}
                </Alert>
              ) : null}
              {attempt.isError ? <Alert severity="error">{attempt.error.message}</Alert> : null}
              <Button type="submit" variant="contained" disabled={attempt.isPending || !userId} sx={{ minHeight: 44 }}>
                {attempt.isPending ? 'Signing in' : 'Sign in'}
              </Button>
              {data.passwordHint ? (
                <Typography variant="caption" color="text.secondary">
                  {data.passwordHint}
                </Typography>
              ) : null}
            </Stack>
        </Box>
      </Box>
    </Box>
  )
}
