export function typeCode(type) {
  return type?.code || ''
}

export function fieldsOf(type) {
  return Array.isArray(type?.properties?.fields) ? type.properties.fields : []
}

/** A missing or empty parent list means any parent. */
export function parentsOf(type) {
  const parents = type?.properties?.parents
  if (!Array.isArray(parents) || !parents.length) return null
  return parents
}

export function isRootType(type) {
  return Boolean(type?.properties?.root)
}

function typeById(typesById, id) {
  if (id == null || id === '') return null
  return typesById.get(id) || typesById.get(Number(id)) || typesById.get(String(id)) || null
}

/**
 * A root with no parent list can only sit at the top. A root that names parents may also sit under those
 * types. Any other type with no parent list may sit anywhere.
 */
export function canSitUnder(type, parentCode) {
  if (!type) return false
  const parents = parentsOf(type)
  if (isRootType(type) && !parents) return false
  if (!parents) return true
  return parents.includes(parentCode)
}

/** Types that may be added under this parent. */
export function allowedChildren(types, parentType) {
  const parentCode = typeCode(parentType)
  return types.filter((type) => canSitUnder(type, parentCode))
}

export function childAllowed(typesById, node, parent) {
  const type = typeById(typesById, node?.nodeTypeId)
  const parentType = typeById(typesById, parent?.nodeTypeId)
  return canSitUnder(type, typeCode(parentType))
}
