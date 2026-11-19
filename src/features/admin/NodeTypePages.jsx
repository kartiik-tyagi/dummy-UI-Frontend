import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  FormControlLabel,
  FormHelperText,
  IconButton,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined'
import { del, get, post, put } from '../../shared/api/http'
import { EMPTY_LIST } from '../../shared/lib/empty'
import { logger } from '../../shared/lib/logger'
import { ConfirmDialog } from '../../shared/ui/ConfirmDialog'
import { IconField, IconPreview } from '../../shared/ui/IconPicker'
import { LoadingState } from '../../shared/ui/LoadingState'
import { ExerciseLayout } from '../scenario/ExerciseLayout'
import { useToastStore } from '../feedback/useToastStore'
import {
  LIMITS,
  attributeKey,
  blankAttribute,
  commitOptions,
  fieldsDetail,
  fieldsLabel,
  firstError,
  formFromProperties,
  holdersOf,
  optionLabel,
  parentsDetail,
  parentsLabel,
  propertiesFromForm,
  unmappedErrors,
  validateNodeType,
} from './nodeTypeForm'

function Section({ title, description, children, error }) {
  return (
    <Box
      data-field-error={error ? 'true' : undefined}
      sx={{
        p: { xs: 1.5, sm: 2 },
        border: 1,
        borderColor: error ? 'error.main' : 'divider',
        borderRadius: 2,
        bgcolor: 'background.paper',
      }}
    >
      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
        {title}
      </Typography>
      {description ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>
          {description}
        </Typography>
      ) : (
        <Box sx={{ mb: 2 }} />
      )}
      {children}
    </Box>
  )
}

function PlacementSummary({ root, parentCodes }) {
  return <Typography variant="body2">{parentsDetail({ properties: { root, parents: parentCodes } })}</Typography>
}

function AttributeSummary({ fields }) {
  if (!fields.length) {
    return (
      <Typography variant="body2" color="text.secondary">
        This catalogue type has no attributes. A node asks for a name and an icon.
      </Typography>
    )
  }
  return (
    <Stack spacing={1.25}>
      {fields.map((field) => (
        <Box key={field.localId}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {field.label || field.key}
            </Typography>
            <Chip size="small" variant="outlined" label={field.type === 'choice' ? 'Choice' : field.type === 'number' ? 'Number' : 'Text'} />
            <Chip size="small" variant={field.required ? 'filled' : 'outlined'} label={field.required ? 'Required' : 'Optional'} />
            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'ui-monospace, monospace' }}>
              {field.key}
            </Typography>
          </Stack>
          {field.type === 'choice' && field.options.length ? (
            <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap" sx={{ mt: 0.75 }}>
              {field.options.map((option) => (
                <Chip key={option} size="small" label={optionLabel(option)} />
              ))}
            </Stack>
          ) : null}
        </Box>
      ))}
    </Stack>
  )
}

function AttributeRow({ field, index, count, errors, onChange, onMove, onRemove }) {
  const prefix = `properties.fields[${index}]`
  const keyError = errors[`${prefix}.key`] || ''
  const labelError = errors[`${prefix}.label`] || ''
  const typeError = errors[`${prefix}.type`] || ''
  const optionError = firstError(errors, `${prefix}.options`)
  const cardError = Boolean(keyError || labelError || typeError || optionError || errors[prefix])

  const setLabel = (label) => {
    const patch = { label }
    if (!field.keyTouched) patch.key = attributeKey(label)
    onChange(patch)
  }

  const setOptions = (rawList) => {
    const next = commitOptions(rawList)
    onChange({ options: next.options, optionWarning: next.warning })
  }

  return (
    <Box
      data-field-error={cardError ? 'true' : undefined}
      sx={{
        p: 1.5,
        border: 1,
        borderColor: cardError ? 'error.main' : 'divider',
        borderRadius: 1.5,
        bgcolor: 'background.default',
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.25 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, flex: 1 }}>
          Attribute {index + 1}
        </Typography>
        <Tooltip title="Move up">
          <span>
            <IconButton aria-label={`Move attribute ${index + 1} up`} size="small" disabled={index === 0} onClick={() => onMove(index, -1)}>
              <ArrowUpwardIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Move down">
          <span>
            <IconButton
              aria-label={`Move attribute ${index + 1} down`}
              size="small"
              disabled={index === count - 1}
              onClick={() => onMove(index, 1)}
            >
              <ArrowDownwardIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Remove attribute">
          <IconButton aria-label={`Remove attribute ${index + 1}`} size="small" color="error" onClick={() => onRemove(field.localId)}>
            <DeleteOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>
      <Box
        sx={{
          display: 'grid',
          gap: 1.25,
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
        }}
      >
        <TextField
          id={`attribute-label-${field.localId}`}
          size="small"
          label="Label"
          value={field.label}
          required
          error={Boolean(labelError)}
          helperText={labelError || 'Shown on the node form'}
          slotProps={{ htmlInput: { maxLength: LIMITS.label } }}
          onChange={(event) => setLabel(event.target.value)}
        />
        <TextField
          size="small"
          label="Key"
          value={field.key}
          required
          error={Boolean(keyError)}
          helperText={keyError || (field.keyTouched ? 'Stored on the node' : 'Suggested from the label until you edit it')}
          slotProps={{ htmlInput: { maxLength: LIMITS.key, autoComplete: 'off', spellCheck: false } }}
          sx={{ '& input': { fontFamily: 'ui-monospace, monospace' } }}
          onChange={(event) => onChange({ key: event.target.value.toLowerCase(), keyTouched: true })}
        />
        <TextField
          select
          size="small"
          label="Type"
          value={field.type}
          error={Boolean(typeError)}
          helperText={typeError || ' '}
          onChange={(event) => onChange({ type: event.target.value, options: event.target.value === 'choice' ? field.options : [], optionWarning: '' })}
        >
          <MenuItem value="text">Text</MenuItem>
          <MenuItem value="number">Number</MenuItem>
          <MenuItem value="choice">Choice</MenuItem>
        </TextField>
        <Box sx={{ display: 'flex', alignItems: 'center', minHeight: 40 }}>
          <FormControlLabel
            sx={{ ml: 0 }}
            label="Required"
            control={<Switch size="small" checked={Boolean(field.required)} onChange={(event) => onChange({ required: event.target.checked })} />}
          />
        </Box>
      </Box>
      {field.type === 'choice' ? (
        <Autocomplete
          multiple
          freeSolo
          size="small"
          options={[]}
          value={field.options}
          forcePopupIcon={false}
          getOptionLabel={(option) => optionLabel(option)}
          autoSelect
          open={false}
          onOpen={() => {}}
          onClose={() => {}}
          onChange={(_, value) => setOptions(value)}
          sx={{ mt: 1.25 }}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Options"
              placeholder="Type an option and press Enter"
              error={Boolean(optionError || field.optionWarning)}
              helperText={optionError || field.optionWarning || 'Separate several options with commas. They are saved in lower case.'}
            />
          )}
        />
      ) : null}
    </Box>
  )
}

function NodeTypesList() {
  const navigate = useNavigate()
  const push = useToastStore((state) => state.push)
  const [rows, setRows] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [busyDelete, setBusyDelete] = useState(false)

  const load = useCallback(async () => {
    try {
      setRows((await get('/node-types')) || EMPTY_LIST)
    } catch (error) {
      setRows(EMPTY_LIST)
      push(error?.message || 'Node types could not be loaded.', 'error')
    }
  }, [push])

  useEffect(() => {
    load()
  }, [load])

  const confirmDelete = async () => {
    if (!deleting) return
    setBusyDelete(true)
    try {
      await del(`/node-types/${deleting.id}`)
      push('Node type removed.', 'success')
      setDeleting(null)
      await load()
    } catch (error) {
      push(error?.message || 'The node type could not be removed.', 'error')
    } finally {
      setBusyDelete(false)
    }
  }

  const askDelete = (row) => {
    const holders = holdersOf(rows, row)
    if (holders.length) {
      const names = holders.map((holder) => holder.name).join(', ')
      push(`${names} still lists “${row.name}” as an allowed parent. Edit ${holders.length === 1 ? 'that node type' : 'those node types'} first.`, 'error')
      return
    }
    setDeleting(row)
  }

  if (!rows) return <LoadingState label="Loading node types" />

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        Each type sets where a node can sit and which attributes the node form asks for. Catalogue types keep their
        parent rules and attributes. You can still change their name, description, and icon.
      </Typography>

      {!rows.length ? (
        <Box
          sx={{
            py: 8,
            px: 3,
            textAlign: 'center',
            border: 1,
            borderColor: 'divider',
            borderStyle: 'dashed',
            borderRadius: 2,
          }}
        >
          <Typography variant="h6" sx={{ mb: 1 }}>
            No node types yet
          </Typography>
          <Typography variant="body2" sx={{ mb: 2.5, color: 'text.secondary' }}>
            Create a node type for ORBAT nodes to use.
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/standard/node-types/new')}>
            New node type
          </Button>
        </Box>
      ) : (
        <Stack spacing={1.25}>
          {rows.map((row) => (
            <Box
              key={row.id}
              sx={{
                p: 2,
                borderRadius: 2,
                border: 1,
                borderColor: 'divider',
                bgcolor: 'background.paper',
              }}
            >
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 0.75 }} flexWrap="wrap" useFlexGap>
                {row.iconPath ? <IconPreview path={row.iconPath} size={24} /> : null}
                <Typography variant="h6" sx={{ flex: 1, minWidth: 0, fontWeight: 600, fontSize: '1.05rem' }}>
                  {row.name}
                </Typography>
                <Chip size="small" variant="outlined" label={row.code} />
                {row.properties?.seeded ? <Chip size="small" color="primary" label="Catalogue" /> : null}
                <Tooltip title={parentsDetail(row)}>
                  <Chip size="small" variant="outlined" label={parentsLabel(row)} />
                </Tooltip>
                <Tooltip title={fieldsDetail(row)}>
                  <Chip size="small" variant="outlined" label={fieldsLabel(row)} />
                </Tooltip>
              </Stack>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5 }}>
                {row.description || 'No description'}
              </Typography>
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<EditOutlinedIcon />}
                  onClick={() => navigate(`/standard/node-types/${row.id}`)}
                >
                  Edit
                </Button>
                {!row.properties?.seeded ? (
                  <Button
                    size="small"
                    color="error"
                    variant="outlined"
                    startIcon={<DeleteOutlinedIcon />}
                    disabled={busyDelete}
                    onClick={() => askDelete(row)}
                  >
                    Remove
                  </Button>
                ) : null}
              </Stack>
            </Box>
          ))}
        </Stack>
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Remove node type"
        message={deleting ? `Remove “${deleting.name}”? Nodes that already use it must be changed first.` : ''}
        confirmLabel="Remove"
        busy={busyDelete}
        onClose={() => {
          if (!busyDelete) setDeleting(null)
        }}
        onConfirm={confirmDelete}
      />
    </Stack>
  )
}

function NodeTypeEditor() {
  const { id } = useParams()
  const isNew = !id || id === 'new'
  const navigate = useNavigate()
  const push = useToastStore((state) => state.push)
  const formRef = useRef(null)
  const idRef = useRef(1)
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [banner, setBanner] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [serverErrors, setServerErrors] = useState({})
  const [errorTick, setErrorTick] = useState(0)
  const [deleting, setDeleting] = useState(false)
  const [busyDelete, setBusyDelete] = useState(false)
  const [catalogue, setCatalogue] = useState([])
  const [catalogueState, setCatalogueState] = useState('loading')
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [iconPath, setIconPath] = useState('')
  const [loadedProperties, setLoadedProperties] = useState({ seeded: false })
  const [root, setRoot] = useState(false)
  const [parentCodes, setParentCodes] = useState([])
  const [fields, setFields] = useState([])
  const seeded = Boolean(loadedProperties?.seeded)

  const applyRow = useCallback((row) => {
    const form = formFromProperties(row?.properties)
    setCode(row?.code || '')
    setName(row?.name || '')
    setDescription(row?.description || '')
    setIconPath(row?.iconPath || '')
    setLoadedProperties(row?.properties || { seeded: false })
    setRoot(form.root)
    setParentCodes(form.parentCodes)
    setFields(form.fields)
  }, [])

  useEffect(() => {
    let live = true
    setReady(false)
    setSubmitted(false)
    setBanner('')
    setServerErrors({})
    ;(async () => {
      const cataloguePromise = get('/node-types')
        .then((rows) => {
          if (!live) return
          setCatalogue(rows || EMPTY_LIST)
          setCatalogueState('ready')
        })
        .catch((error) => {
          if (!live) return
          setCatalogue(EMPTY_LIST)
          setCatalogueState('error')
          push(error?.message || 'Node types could not be loaded.', 'error')
        })
      try {
        if (isNew) {
          await cataloguePromise
          if (live) setReady(true)
          return
        }
        const row = await get(`/node-types/${id}`)
        await cataloguePromise
        if (!live) return
        applyRow(row)
        setReady(true)
      } catch (error) {
        if (!live) return
        push(error?.message || 'The node type could not be opened.', 'error')
        navigate('/standard/node-types', { replace: true })
      }
    })()
    return () => {
      live = false
    }
  }, [id, isNew, navigate, push, applyRow])

  const draft = useMemo(
    () => ({
      code,
      name,
      description,
      iconPath,
      seeded,
      root,
      parentCodes,
      fields,
      catalogue,
      currentId: isNew ? null : id,
      catalogueReady: catalogueState === 'ready',
    }),
    [code, name, description, iconPath, seeded, root, parentCodes, fields, catalogue, currentIdSafe(isNew, id), catalogueState],
  )
  const liveErrors = useMemo(() => (submitted ? validateNodeType(draft) : {}), [submitted, draft])
  const errors = submitted ? { ...serverErrors, ...liveErrors } : serverErrors
  const loose = unmappedErrors(errors)
  const alertText = Object.keys(errors).length
    ? 'Fix the highlighted fields before saving.'
    : banner

  useEffect(() => {
    if (!errorTick) return
    const node = formRef.current?.querySelector('[aria-invalid="true"]')
    if (node) {
      node.scrollIntoView({ block: 'center', behavior: 'smooth' })
      node.focus?.({ preventScroll: true })
      return
    }
    formRef.current?.querySelector('[data-field-error="true"]')?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [errorTick])

  const noteEdit = () => setServerErrors({})

  const parentOptions = useMemo(() => {
    const options = catalogue
      .filter((type) => isNew || String(type.id) !== String(id))
      .map((type) => ({ code: String(type.code || '').toUpperCase(), name: type.name || type.code, missing: false }))
      .sort((left, right) => left.name.localeCompare(right.name))
    const known = new Set(options.map((option) => option.code))
    parentCodes.forEach((parent) => {
      if (!known.has(parent)) options.push({ code: parent, name: parent, missing: catalogueState === 'ready' })
    })
    return options
  }, [catalogue, parentCodes, id, isNew, catalogueState])
  const selectedParents = parentCodes.map(
    (parent) => parentOptions.find((option) => option.code === parent) || { code: parent, name: parent, missing: true },
  )
  const parentError = firstError(errors, 'properties.parents')
  const placementText = parentsDetail({ properties: { root, parents: parentCodes } })

  const reveal = () => setErrorTick((tick) => tick + 1)

  const save = async () => {
    setSubmitted(true)
    setBanner('')
    setServerErrors({})
    const nextErrors = validateNodeType({ ...draft, seeded })
    if (Object.keys(nextErrors).length) {
      push('Fix the highlighted fields before saving.', 'error')
      reveal()
      return
    }
    setBusy(true)
    try {
      const body = {
        code: code.trim(),
        name: name.trim(),
        description: description.trim(),
        iconPath: iconPath || null,
        properties: seeded ? loadedProperties : propertiesFromForm({ root, parentCodes, fields }),
      }
      if (isNew) {
        const created = await post('/node-types', body)
        logger.info('node_type.admin_saved', { nodeTypeId: created.id, code: body.code })
        push('Node type created.', 'success')
        navigate(`/standard/node-types/${created.id}`, { replace: true })
      } else {
        const saved = await put(`/node-types/${id}`, body)
        logger.info('node_type.admin_saved', { nodeTypeId: id, code: body.code })
        applyRow(saved)
        setSubmitted(false)
        push('Node type saved.', 'success')
      }
    } catch (error) {
      const fieldErrors = error?.fieldErrors || {}
      if (Object.keys(fieldErrors).length) setServerErrors(fieldErrors)
      else if (/already exists/i.test(error?.message || '')) setServerErrors({ code: 'A node type with this code already exists.' })
      setBanner(error?.message || 'The node type could not be saved.')
      push(error?.message || 'The node type could not be saved.', 'error')
      reveal()
    } finally {
      setBusy(false)
    }
  }

  const addAttribute = () => {
    if (fields.length >= LIMITS.fields) return
    const localId = `new-${idRef.current++}`
    setFields((current) => [...current, blankAttribute(localId)])
    noteEdit()
    window.requestAnimationFrame(() => {
      document.getElementById(`attribute-label-${localId}`)?.focus()
    })
  }

  const patchAttribute = (localId, patch) => {
    noteEdit()
    setFields((current) => current.map((field) => (field.localId === localId ? { ...field, ...patch } : field)))
  }

  const moveAttribute = (index, delta) => {
    noteEdit()
    setFields((current) => {
      const target = index + delta
      if (target < 0 || target >= current.length) return current
      const next = current.slice()
      const [item] = next.splice(index, 1)
      next.splice(target, 0, item)
      return next
    })
  }

  const removeAttribute = (localId) => {
    noteEdit()
    setFields((current) => current.filter((field) => field.localId !== localId))
  }

  const askDelete = () => {
    const holders = holdersOf(catalogue, { id: Number(id), code: code.trim().toUpperCase() })
    if (holders.length) {
      const names = holders.map((holder) => holder.name).join(', ')
      push(`${names} still lists this type as an allowed parent. Edit ${holders.length === 1 ? 'that node type' : 'those node types'} first.`, 'error')
      return
    }
    setDeleting(true)
  }

  const confirmDelete = async () => {
    setBusyDelete(true)
    try {
      await del(`/node-types/${id}`)
      push('Node type removed.', 'success')
      navigate('/standard/node-types')
    } catch (error) {
      push(error?.message || 'The node type could not be removed.', 'error')
      setDeleting(false)
    } finally {
      setBusyDelete(false)
    }
  }

  if (!ready) return <LoadingState label="Opening node type" />

  return (
    <Stack ref={formRef} spacing={2} sx={{ maxWidth: 880 }}>
      {alertText ? (
        <Alert severity="error">
          {alertText}
          {loose.length ? (
            <Box component="ul" sx={{ mt: 1, mb: 0, pl: 2.5 }}>
              {loose.map(([key, message]) => (
                <li key={key}>{message}</li>
              ))}
            </Box>
          ) : null}
        </Alert>
      ) : null}
      {seeded ? (
        <Alert severity="info">Catalogue rules stay with this type. You can change the name, description, and icon.</Alert>
      ) : null}

      <Section title="Identity" description="The code is stored in capitals and used by parent rules." error={Boolean(errors.code || errors.name || errors.description || errors.iconPath)}>
        <Stack spacing={2}>
          <TextField
            label="Code"
            value={code}
            onChange={(event) => {
              noteEdit()
              setCode(event.target.value)
            }}
            fullWidth
            required={!seeded}
            disabled={seeded}
            error={Boolean(errors.code)}
            helperText={errors.code || (seeded ? 'Catalogue codes cannot be changed.' : 'A letter, then letters, numbers, or underscores.')}
            slotProps={{ htmlInput: { maxLength: LIMITS.code, autoComplete: 'off' } }}
          />
          <TextField
            label="Name"
            value={name}
            onChange={(event) => {
              noteEdit()
              setName(event.target.value)
            }}
            fullWidth
            required
            error={Boolean(errors.name)}
            helperText={errors.name || ' '}
            slotProps={{ htmlInput: { maxLength: LIMITS.name } }}
          />
          <TextField
            label="Description"
            value={description}
            onChange={(event) => {
              noteEdit()
              setDescription(event.target.value)
            }}
            fullWidth
            multiline
            minRows={2}
            error={Boolean(errors.description)}
            helperText={errors.description || ' '}
            slotProps={{ htmlInput: { maxLength: LIMITS.description } }}
          />
          <Box>
            <IconField value={iconPath} onChange={(value) => { noteEdit(); setIconPath(value) }} />
            {errors.iconPath ? <FormHelperText error>{errors.iconPath}</FormHelperText> : null}
          </Box>
        </Stack>
      </Section>

      <Section
        title="Where it can sit"
        description="Parent rules decide which nodes this type can be added under."
        error={Boolean(errors['properties.root'] || parentError)}
      >
        {seeded ? (
          <PlacementSummary root={root} parentCodes={parentCodes} />
        ) : (
          <Stack spacing={1.5}>
            <FormControlLabel
              sx={{ ml: 0, alignItems: 'flex-start' }}
              label={
                <Box>
                  <Typography variant="body2">Root type</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Can sit at the top of an ORBAT. With no parents selected, it cannot sit anywhere else.
                  </Typography>
                </Box>
              }
              control={<Switch size="small" checked={root} onChange={(event) => { noteEdit(); setRoot(event.target.checked) }} />}
            />
            {errors['properties.root'] ? <FormHelperText error>{errors['properties.root']}</FormHelperText> : null}
            <Autocomplete
              multiple
              disableCloseOnSelect
              filterSelectedOptions
              size="small"
              loading={catalogueState === 'loading'}
              options={parentOptions}
              value={selectedParents}
              getOptionKey={(option) => option.code}
              getOptionLabel={(option) => (option.missing ? `${option.code} (not found)` : option.name)}
              isOptionEqualToValue={(left, right) => left.code === right.code}
              noOptionsText={catalogueState === 'error' ? 'Node types could not be loaded' : 'No other node types'}
              onChange={(_, value) => {
                noteEdit()
                const codes = []
                value.forEach((option) => {
                  const next = String(option.code || '').toUpperCase()
                  if (next && !codes.includes(next)) codes.push(next)
                })
                setParentCodes(codes)
              }}
              renderOption={(props, option) => {
                const { key, ...rest } = props
                return (
                  <li key={key} {...rest}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2">{option.missing ? `${option.code} (not found)` : option.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {option.code}
                      </Typography>
                    </Box>
                  </li>
                )
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Allowed parents"
                  placeholder={parentCodes.length ? '' : 'Any parent'}
                  error={Boolean(parentError)}
                  helperText={
                    parentError
                    || (catalogueState === 'error'
                      ? 'The parent list could not be loaded. Parent checks will run when you save.'
                      : catalogueState === 'loading'
                        ? 'Loading node types…'
                        : placementText)
                  }
                />
              )}
            />
          </Stack>
        )}
      </Section>

      <Section
        title="Attributes"
        description="These fields appear when someone adds or edits a node of this type. Required attributes must be filled in before the ORBAT can be saved."
        error={Boolean(firstError(errors, 'properties.fields'))}
      >
        {seeded ? (
          <AttributeSummary fields={fields} />
        ) : !fields.length ? (
          <Box
            sx={{
              py: 3,
              px: 2,
              textAlign: 'center',
              border: 1,
              borderColor: 'divider',
              borderStyle: 'dashed',
              borderRadius: 2,
            }}
          >
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              No attributes yet. A node of this type will only ask for a name and an icon.
            </Typography>
            <Button variant="outlined" startIcon={<AddIcon />} onClick={addAttribute}>
              Add attribute
            </Button>
          </Box>
        ) : (
          <Stack spacing={1.25}>
            {errors['properties.fields'] ? <FormHelperText error>{errors['properties.fields']}</FormHelperText> : null}
            {fields.map((field, index) => (
              <AttributeRow
                key={field.localId}
                field={field}
                index={index}
                count={fields.length}
                errors={errors}
                onChange={(patch) => patchAttribute(field.localId, patch)}
                onMove={moveAttribute}
                onRemove={removeAttribute}
              />
            ))}
            <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
              <Button variant="outlined" startIcon={<AddIcon />} disabled={fields.length >= LIMITS.fields} onClick={addAttribute}>
                Add attribute
              </Button>
              <Typography variant="caption" color="text.secondary">
                {fields.length} of {LIMITS.fields}
              </Typography>
            </Stack>
          </Stack>
        )}
      </Section>

      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
        <Button onClick={() => navigate('/standard/node-types')} disabled={busy || busyDelete}>
          Back to list
        </Button>
        <Button variant="contained" startIcon={<SaveOutlinedIcon />} disabled={busy || busyDelete} onClick={save}>
          {busy ? 'Saving…' : isNew ? 'Create node type' : 'Save node type'}
        </Button>
        {!isNew && !seeded ? (
          <Button color="error" startIcon={<DeleteOutlinedIcon />} disabled={busy || busyDelete} onClick={askDelete}>
            Remove
          </Button>
        ) : null}
      </Stack>
      <ConfirmDialog
        open={deleting}
        title="Remove node type"
        message="Remove this node type? This cannot be undone."
        confirmLabel="Remove"
        busy={busyDelete}
        onClose={() => {
          if (!busyDelete) setDeleting(false)
        }}
        onConfirm={confirmDelete}
      />
    </Stack>
  )
}

function currentIdSafe(isNew, id) {
  return isNew ? '' : id
}

export function NodeTypesListPage() {
  const navigate = useNavigate()
  return (
    <ExerciseLayout
      kicker="Standard data"
      title="Node types"
      actions={
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/standard/node-types/new')}>
          New node type
        </Button>
      }
    >
      <NodeTypesList />
    </ExerciseLayout>
  )
}

export function NodeTypeEditorPage() {
  const { id } = useParams()
  const isNew = !id || id === 'new'
  return (
    <ExerciseLayout kicker="Standard data" title={isNew ? 'New node type' : 'Edit node type'}>
      <NodeTypeEditor />
    </ExerciseLayout>
  )
}
