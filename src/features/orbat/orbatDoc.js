/**
 * Pure helpers over the ORBAT document: { nodes: [{ id, parentId, nodeTypeId, homeSideId, name, ...extra }] }.
 * Every function returns new arrays; extra node fields are preserved as sent.
 */

export function newId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `n-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export function nodesOf(orbatJson) {
  return Array.isArray(orbatJson?.nodes) ? orbatJson.nodes : []
}

export function indexNodes(nodes) {
  const byId = new Map()
  const children = new Map()
  nodes.forEach((node) => byId.set(node.id, node))
  nodes.forEach((node) => {
    const key = node.parentId && byId.has(node.parentId) ? node.parentId : ''
    if (!children.has(key)) children.set(key, [])
    children.get(key).push(node)
  })
  return { byId, children, roots: children.get('') || [] }
}

export function descendantIds(nodes, id) {
  const { children } = indexNodes(nodes)
  const found = new Set()
  const stack = [id]
  while (stack.length) {
    const current = stack.pop()
    ;(children.get(current) || []).forEach((child) => {
      if (!found.has(child.id)) {
        found.add(child.id)
        stack.push(child.id)
      }
    })
  }
  return found
}

export function pathTo(nodes, id) {
  const { byId } = indexNodes(nodes)
  const path = []
  let current = byId.get(id)
  const guard = new Set()
  while (current && !guard.has(current.id)) {
    guard.add(current.id)
    path.unshift(current)
    current = current.parentId ? byId.get(current.parentId) : null
  }
  return path
}

export function addChild(nodes, parentId, { name, nodeTypeId = null, homeSideId }) {
  const parent = nodes.find((node) => node.id === parentId)
  const node = {
    id: newId(),
    parentId,
    nodeTypeId,
    homeSideId: parent?.homeSideId ?? homeSideId,
    name: String(name).trim(),
  }
  return { nodes: [...nodes, node], node }
}

export function updateNode(nodes, id, patch) {
  return nodes.map((node) => (node.id === id ? { ...node, ...patch } : node))
}

export function removeSubtree(nodes, id) {
  const gone = descendantIds(nodes, id)
  gone.add(id)
  return nodes.filter((node) => !gone.has(node.id))
}

/** A node can move under any node that is neither itself nor one of its descendants; roots stay roots. */
export function canReparent(nodes, id, newParentId) {
  const node = nodes.find((item) => item.id === id)
  if (!node || !node.parentId) return false
  if (!newParentId || newParentId === id || newParentId === node.parentId) return false
  if (!nodes.some((item) => item.id === newParentId)) return false
  return !descendantIds(nodes, id).has(newParentId)
}

export function reparent(nodes, id, newParentId) {
  if (!canReparent(nodes, id, newParentId)) return nodes
  return updateNode(nodes, id, { parentId: newParentId })
}

/** Ids in the order the tree shows them, honouring which branches are open. */
export function visibleOrder(nodes, expanded) {
  const { children, roots } = indexNodes(nodes)
  const order = []
  const walk = (node, depth) => {
    order.push({ id: node.id, depth })
    if (expanded.has(node.id)) (children.get(node.id) || []).forEach((child) => walk(child, depth + 1))
  }
  roots.forEach((root) => walk(root, 0))
  return order
}

export function sameNodes(a, b) {
  return JSON.stringify(a) === JSON.stringify(b)
}
