export function typeCode(type) {
  return type?.code || ''
}

export function fieldsOf(type) {
  return Array.isArray(type?.properties?.fields) ? type.properties.fields : []
}

export function parentsOf(type) {
  return Array.isArray(type?.properties?.parents) ? type.properties.parents : null
}

export function isRootType(type) {
  return Boolean(type?.properties?.root)
}

/** Types that may be added under this parent. Custom types with no parent rule are included. */
export function allowedChildren(types, parentType) {
  const parentCode = typeCode(parentType)
  return types.filter((type) => {
    if (isRootType(type)) return false
    const parents = parentsOf(type)
    if (!parents) return true
    return parents.includes(parentCode)
  })
}

export function childAllowed(typesById, node, parent) {
  const type = typesById.get(node?.nodeTypeId)
  if (!type || isRootType(type)) return false
  const parents = parentsOf(type)
  if (!parents) return true
  return parents.includes(typeCode(typesById.get(parent?.nodeTypeId)))
}
