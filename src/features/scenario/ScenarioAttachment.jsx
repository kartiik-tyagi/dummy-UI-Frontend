import { useEffect, useRef, useState } from 'react'
import { Box, Button, Stack, Typography } from '@mui/material'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined'
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined'
import { ApiError } from '../../shared/api/errors'
import { API_BASE, del, httpBlob } from '../../shared/api/http'
import { getToken } from '../../shared/api/tokenStore'

const ACCEPT = '.txt,.doc,.docx,.pdf,.jpg,.jpeg,text/plain,application/pdf,image/jpeg,application/msword'
const MAX_BYTES = 10 * 1024 * 1024

function extensionOf(name) {
  const parts = String(name || '').toLowerCase().split('.')
  return parts.length > 1 ? parts.at(-1) : ''
}

function kindOf(name) {
  const ext = extensionOf(name)
  if (ext === 'jpg' || ext === 'jpeg') return 'image'
  if (ext === 'pdf') return 'pdf'
  if (ext === 'txt') return 'text'
  if (ext === 'doc' || ext === 'docx') return 'document'
  return 'other'
}

export async function uploadAttachment(scenarioId, file) {
  const formData = new FormData()
  formData.append('file', file)
  const headers = { Accept: 'application/json' }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  let response
  try {
    response = await fetch(`${API_BASE}/scenarios/${scenarioId}/attachment`, {
      method: 'POST',
      headers,
      body: formData,
    })
  } catch {
    throw new ApiError('The GIS Warplan service is not reachable.', 'UNAVAILABLE')
  }
  if (!response.ok) {
    let payload = null
    try {
      payload = await response.json()
    } catch {
      payload = null
    }
    throw new ApiError(payload?.message || `Upload failed (${response.status}).`, payload?.code || 'HTTP_' + response.status)
  }
  return response.json()
}

function AttachmentPreview({ fileName, previewUrl, textPreview }) {
  const kind = kindOf(fileName)
  if (!fileName) return null

  return (
    <Box sx={{ mt: 1 }}>
      <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
        {fileName}
      </Typography>
      {kind === 'image' && previewUrl ? (
        <Box
          component="img"
          src={previewUrl}
          alt={fileName}
          sx={{
            display: 'block',
            maxWidth: '100%',
            maxHeight: 360,
            borderRadius: 1,
            border: 1,
            borderColor: 'divider',
          }}
        />
      ) : null}
      {kind === 'pdf' && previewUrl ? (
        <Box
          component="iframe"
          title={fileName}
          src={previewUrl}
          sx={{
            width: '100%',
            height: 420,
            border: 1,
            borderColor: 'divider',
            borderRadius: 1,
          }}
        />
      ) : null}
      {kind === 'text' && textPreview ? (
        <Box
          component="pre"
          sx={{
            m: 0,
            p: 1.5,
            maxHeight: 320,
            overflow: 'auto',
            border: 1,
            borderColor: 'divider',
            borderRadius: 1,
            bgcolor: 'action.hover',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
            fontSize: '0.85rem',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {textPreview}
        </Box>
      ) : null}
      {kind === 'document' ? (
        <Typography variant="body2" color="text.secondary">
          Word documents open via Download — browsers cannot preview .doc/.docx inline.
        </Typography>
      ) : null}
    </Box>
  )
}

/** Upload + view/download for a scenario attachment (txt, doc, pdf, jpg). */
export function ScenarioAttachment({
  scenarioId,
  fileName,
  pendingFile = null,
  onPendingChange,
  onChanged,
  disabled = false,
}) {
  const inputRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [previewUrl, setPreviewUrl] = useState(null)
  const [textPreview, setTextPreview] = useState('')
  const isCreate = !scenarioId
  const displayName = pendingFile?.name || fileName || ''
  const kind = kindOf(displayName)

  useEffect(() => {
    let live = true
    let objectUrl = null
    setPreviewUrl(null)
    setTextPreview('')
    setError('')

    if (pendingFile) {
      const pendingKind = kindOf(pendingFile.name)
      ;(async () => {
        try {
          if (pendingKind === 'text') {
            const text = await pendingFile.text()
            if (live) setTextPreview(text)
            return
          }
          if (pendingKind === 'image' || pendingKind === 'pdf') {
            objectUrl = URL.createObjectURL(pendingFile)
            if (live) setPreviewUrl(objectUrl)
          }
        } catch {
          if (live) setError('The selected file could not be previewed.')
        }
      })()
      return () => {
        live = false
        if (objectUrl) URL.revokeObjectURL(objectUrl)
      }
    }

    if (!scenarioId || !fileName) return undefined

    ;(async () => {
      try {
        const blob = await httpBlob(`/scenarios/${scenarioId}/attachment`)
        if (!live) return
        if (kind === 'text') {
          setTextPreview(await blob.text())
          return
        }
        if (kind === 'image' || kind === 'pdf') {
          objectUrl = URL.createObjectURL(blob)
          setPreviewUrl(objectUrl)
        }
      } catch {
        if (live) setError('The attachment could not be loaded.')
      }
    })()

    return () => {
      live = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [scenarioId, fileName, kind, pendingFile])

  const pick = () => inputRef.current?.click()

  const onFile = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    if (file.size > MAX_BYTES) {
      setError('The attachment is too large (max 10 MB).')
      return
    }

    if (isCreate) {
      setError('')
      onPendingChange?.(file)
      return
    }

    setBusy(true)
    setError('')
    try {
      const result = await uploadAttachment(scenarioId, file)
      onChanged?.(result.attachedFile || file.name)
    } catch (failure) {
      setError(failure?.message || 'Upload failed.')
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (isCreate) {
      onPendingChange?.(null)
      setError('')
      return
    }
    if (!scenarioId) return
    setBusy(true)
    setError('')
    try {
      await del(`/scenarios/${scenarioId}/attachment`)
      onChanged?.(null)
    } catch (failure) {
      setError(failure?.message || 'The attachment could not be removed.')
    } finally {
      setBusy(false)
    }
  }

  const download = async () => {
    if (pendingFile) {
      const url = URL.createObjectURL(pendingFile)
      const link = document.createElement('a')
      link.href = url
      link.download = pendingFile.name
      link.click()
      URL.revokeObjectURL(url)
      return
    }
    try {
      const blob = await httpBlob(`/scenarios/${scenarioId}/attachment`)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName || 'attachment'
      link.click()
      URL.revokeObjectURL(url)
    } catch (failure) {
      setError(failure?.message || 'Download failed.')
    }
  }

  const hasFile = Boolean(displayName)

  return (
    <Box
      sx={{
        border: 1,
        borderColor: 'divider',
        borderRadius: 2,
        bgcolor: 'background.paper',
        p: 2,
      }}
    >
      <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
        Attachment
      </Typography>
      <Typography variant="caption" sx={{ display: 'block', mb: 1.5, color: 'text.secondary' }}>
        {disabled
          ? 'Attached file for this scenario.'
          : isCreate
            ? 'Choose a txt, doc, docx, pdf, or jpg file (max 10 MB). It uploads when you create the scenario.'
            : 'Upload a txt, doc, docx, pdf, or jpg file (max 10 MB). It is stored with this scenario and shown below.'}
      </Typography>

      <input ref={inputRef} type="file" accept={ACCEPT} hidden onChange={onFile} />

      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mb: hasFile ? 2 : 0 }}>
        {!disabled ? (
          <Button
            variant="outlined"
            startIcon={<UploadFileOutlinedIcon />}
            onClick={pick}
            disabled={busy}
          >
            {hasFile ? (isCreate ? 'Change file' : 'Replace file') : isCreate ? 'Choose file' : 'Upload file'}
          </Button>
        ) : null}
        {hasFile ? (
          <>
            <Button startIcon={<DownloadOutlinedIcon />} onClick={download} disabled={busy}>
              Download
            </Button>
            {!disabled ? (
              <Button color="error" startIcon={<DeleteOutlinedIcon />} onClick={remove} disabled={busy}>
                Remove
              </Button>
            ) : null}
          </>
        ) : null}
      </Stack>

      {disabled && !hasFile ? (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          No attachment on this scenario.
        </Typography>
      ) : null}

      <AttachmentPreview fileName={displayName} previewUrl={previewUrl} textPreview={textPreview} />

      {error ? (
        <Typography variant="body2" color="error" sx={{ mt: 1.5 }}>
          {error}
        </Typography>
      ) : null}
    </Box>
  )
}
