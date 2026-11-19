export const LIMITS = {
  fields: 30,
  options: 40,
  parents: 40,
  label: 80,
  key: 40,
  option: 40,
  code: 60,
  name: 120,
  description: 500,
  iconPath: 300,
}

const KEY = /^[a-z][a-z0-9_]*$/
const CODE = /^[A-Za-z][A-Za-z0-9_]*$/
const PARENT = /^[A-Z][A-Z0-9_]*$/
const RESERVED = new Set(['id', 'parentid', 'nodetypeid', 'homesideid', 'name', 'iconpath', 'sourcenodeid'])
const MAPPED = /^(code|name|description|iconPath|properties|properties\.(root|parents|fields|seeded)|properties\.parents\[\d+\]|properties\.fields\[\d+\](\.(key|label|type|required|options)(\[\d+\])?)?)$/

export function attributeKey(label) {
  const slug = String(label || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  if (!slug) return ''
  const keyed = /^[a-z]/.test(slug) ? slug : `field_${slug}`
  return keyed.slice(0, LIMITS.key).replace(/_+$/g, '')
}

export function optionKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, LIMITS.option)
    .replace(/_+$/g, '')
}

export function optionLabel(value) {
  return String(value || '').replaceAll('_', ' ')
}

export function parentNames(type) {
  const parents = type?.properties?.parents
  if (!Array.isArray(parents)) return []
  return parents.map((code) => optionLabel(String(code).toLowerCase()))
}

export function parentsLabel(type) {
  const names = parentNames(type)
  const root = Boolean(type?.properties?.root)
  const list = names.length > 3 ? `${names.slice(0, 2).join(', ')} +${names.length - 2}` : names.join(', ')
  if (root && !names.length) return 'Root only'
  if (root) return `Root · ${list}`
  if (!names.length) return 'Any parent'
  return list
}

export function parentsDetail(type) {
  const names = parentNames(type)
  const root = Boolean(type?.properties?.root)
  if (root && !names.length) return 'Can only sit at the top of an ORBAT.'
  if (root) return `Can sit at the top, or under ${names.join(', ')}.`
  if (!names.length) return 'Can sit under any node. Choose parents to restrict it.'
  return `Can sit under ${names.join(', ')}.`
}

export function fieldsLabel(type) {
  const count = Array.isArray(type?.properties?.fields) ? type.properties.fields.length : 0
  if (!count) return 'No attributes'
  if (count === 1) return '1 attribute'
  return `${count} attributes`
}

export function fieldsDetail(type) {
  const fields = Array.isArray(type?.properties?.fields) ? type.properties.fields : []
  if (!fields.length) return 'The node form asks for a name and an icon only.'
  return fields.map((field) => field?.label || field?.key).filter(Boolean).join(', ')
}

export function blankAttribute(localId) {
  return {
    localId,
    key: '',
    label: '',
    type: 'text',
    required: false,
    options: [],
    keyTouched: false,
    optionWarning: '',
  }
}

export function formFromProperties(properties) {
  const source = properties && typeof properties === 'object' ? properties : {}
  const fields = Array.isArray(source.fields) ? source.fields : []
  return {
    root: Boolean(source.root),
    parentCodes: Array.isArray(source.parents)
      ? source.parents.map((code) => String(code).trim().toUpperCase()).filter(Boolean)
      : [],
    fields: fields.map((field, index) => ({
      localId: `loaded-${index}-${field?.key || 'field'}`,
      key: typeof field?.key === 'string' ? field.key : '',
      label: typeof field?.label === 'string' ? field.label : '',
      type: field?.type === 'number' || field?.type === 'choice' ? field.type : 'text',
      required: Boolean(field?.required),
      options: Array.isArray(field?.options) ? field.options.map((option) => optionKey(String(option))).filter(Boolean) : [],
      keyTouched: true,
      optionWarning: '',
    })),
  }
}

export function propertiesFromForm({ root, parentCodes, fields }) {
  const properties = {
    seeded: false,
    root: Boolean(root),
    fields: (fields || []).map((field) => {
      const item = {
        key: String(field.key || '').trim().toLowerCase(),
        label: String(field.label || '').trim().replace(/\s+/g, ' '),
        type: field.type,
        required: Boolean(field.required),
      }
      if (field.type === 'choice') item.options = field.options || []
      return item
    }),
  }
  if (parentCodes?.length) properties.parents = parentCodes
  return properties
}

export function validateNodeType(input) {
  const errors = {}
  const code = String(input.code || '').trim()
  const name = String(input.name || '').trim()
  const description = String(input.description || '')
  const iconPath = String(input.iconPath || '')
  if (!input.seeded) {
    if (!code) errors.code = 'Enter a code.'
    else if (code.length > LIMITS.code) errors.code = `Code must be ${LIMITS.code} characters or fewer.`
    else if (!CODE.test(code)) errors.code = 'Use a letter, then letters, numbers, or underscores.'
    else if (input.catalogueReady && takenCode(input, code)) errors.code = 'A node type with this code already exists.'
  }
  if (!name) errors.name = 'Enter a name.'
  else if (name.length > LIMITS.name) errors.name = `Name must be ${LIMITS.name} characters or fewer.`
  if (description.trim().length > LIMITS.description) {
    errors.description = `Description must be ${LIMITS.description} characters or fewer.`
  }
  if (iconPath.length > LIMITS.iconPath) errors.iconPath = `Icon path must be ${LIMITS.iconPath} characters or fewer.`
  if (input.seeded) return errors

  const parentCodes = input.parentCodes || []
  const own = code.toUpperCase()
  if (parentCodes.length > LIMITS.parents) errors['properties.parents'] = `Choose at most ${LIMITS.parents} parents.`
  const seenParents = new Set()
  parentCodes.forEach((parent, index) => {
    const path = `properties.parents[${index}]`
    if (!parent || parent.length > LIMITS.code || !PARENT.test(parent)) {
      errors[path] = 'Use a letter, then letters, numbers, or underscores.'
      return
    }
    if (parent === own) {
      errors[path] = 'A type cannot list itself as a parent.'
      return
    }
    if (input.catalogueReady && !knownCode(input, parent)) {
      errors[path] = 'No node type uses this code.'
      return
    }
    if (seenParents.has(parent)) {
      errors[path] = 'This parent is listed more than once.'
      return
    }
    seenParents.add(parent)
  })

  const fields = input.fields || []
  if (fields.length > LIMITS.fields) errors['properties.fields'] = `A node type can have at most ${LIMITS.fields} attributes.`
  const keys = []
  const labels = []
  fields.slice(0, LIMITS.fields).forEach((field, index) => {
    const path = `properties.fields[${index}]`
    const key = String(field.key || '').trim().toLowerCase()
    const label = String(field.label || '').trim().replace(/\s+/g, ' ')
    if (!key) errors[`${path}.key`] = 'Enter a key.'
    else if (key.length > LIMITS.key) errors[`${path}.key`] = `Key must be ${LIMITS.key} characters or fewer.`
    else if (!KEY.test(key)) errors[`${path}.key`] = 'Use a letter, then lowercase letters, numbers, or underscores.'
    else if (RESERVED.has(key)) errors[`${path}.key`] = 'This key is reserved.'
    keys.push(errors[`${path}.key`] ? '' : key)

    if (!label) errors[`${path}.label`] = 'Enter a label.'
    else if (label.length > LIMITS.label) errors[`${path}.label`] = `Label must be ${LIMITS.label} characters or fewer.`
    labels.push(errors[`${path}.label`] ? '' : label.toLowerCase())

    if (!['text', 'number', 'choice'].includes(field.type)) errors[`${path}.type`] = 'Choose text, number, or choice.'
    if (field.type === 'choice') {
      const options = field.options || []
      if (!options.length) errors[`${path}.options`] = 'Add at least one option.'
      else if (options.length > LIMITS.options) errors[`${path}.options`] = `An attribute can have at most ${LIMITS.options} options.`
      const seen = new Set()
      options.slice(0, LIMITS.options).forEach((option, optionIndex) => {
        if (!option || option.length > LIMITS.option || !/^[a-z0-9_]+$/.test(option)) {
          errors[`${path}.options[${optionIndex}]`] = 'Use letters or numbers.'
        } else if (seen.has(option)) errors[`${path}.options[${optionIndex}]`] = 'This option is listed more than once.'
        else seen.add(option)
      })
    } else if ((field.options || []).length) errors[`${path}.options`] = 'Options are only for a choice.'
  })
  markDuplicates(keys, 'key', 'Another attribute already uses this key.', errors)
  markDuplicates(labels, 'label', 'Another attribute already uses this label.', errors)
  return errors
}

export function commitOptions(rawList) {
  const options = []
  let warning = ''
  const parts = []
  ;(rawList || []).forEach((raw) => {
    String(raw).split(/[,;\n]/).forEach((part) => parts.push(part))
  })
  for (const raw of parts) {
    const key = optionKey(raw)
    if (!String(raw || '').trim()) continue
    if (!key) {
      warning = 'Use letters or numbers for each option.'
      continue
    }
    if (options.includes(key)) {
      warning = 'This option is listed more than once.'
      continue
    }
    if (options.length >= LIMITS.options) {
      warning = `An attribute can have at most ${LIMITS.options} options.`
      break
    }
    options.push(key)
  }
  return { options, warning }
}

export function firstError(errors, base) {
  if (!errors) return ''
  if (errors[base]) return errors[base]
  const match = Object.keys(errors).find((key) => key.startsWith(`${base}[`) || key.startsWith(`${base}.`))
  return match ? errors[match] : ''
}

export function unmappedErrors(errors) {
  return Object.entries(errors || {}).filter(([key]) => !MAPPED.test(key))
}

export function holdersOf(rows, target) {
  if (!target?.code) return []
  return (rows || []).filter(
    (row) => row.id !== target.id && Array.isArray(row.properties?.parents) && row.properties.parents.includes(target.code),
  )
}

function takenCode(input, code) {
  const own = code.toUpperCase()
  return (input.catalogue || []).some((type) => String(type.code).toUpperCase() === own && String(type.id) !== String(input.currentId ?? ''))
}

function knownCode(input, code) {
  return (input.catalogue || []).some((type) => String(type.code).toUpperCase() === code && String(type.id) !== String(input.currentId ?? ''))
}

function markDuplicates(values, field, message, errors) {
  values.forEach((value, index) => {
    if (!value) return
    const first = values.indexOf(value)
    if (first === index) return
    const firstPath = `properties.fields[${first}].${field}`
    const path = `properties.fields[${index}].${field}`
    if (!errors[firstPath]) errors[firstPath] = message
    if (!errors[path]) errors[path] = message
  })
}
