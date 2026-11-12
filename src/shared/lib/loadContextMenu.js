let cached = null
let loading = null

export async function loadContextMenu() {
  if (cached) return cached
  if (loading) return loading
  loading = (async () => {
    const response = await fetch('/config/context-menu.json')
    if (!response.ok) throw new Error('The context menu could not be loaded.')
    const data = await response.json()
    if (!Array.isArray(data?.menus) || !data.menus.length) throw new Error('The context menu file is empty.')
    cached = data
    return data
  })().finally(() => {
    loading = null
  })
  return loading
}
