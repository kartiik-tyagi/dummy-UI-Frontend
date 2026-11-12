import { create } from 'zustand'
import * as api from '../../shared/api/client'
import { useToastStore } from '../feedback/useToastStore'
import { useSessionStore } from '../session/useSessionStore'

let subscription = null

function apply(set, get, data) {
  const previous = get().data
  const changed = JSON.stringify(previous) !== JSON.stringify(data)
  if (previous && !changed) return
  set({ data, ready: true, revision: get().revision + 1 })
}

export const useDirectoryStore = create((set, get) => ({
  ready: false,
  data: null,
  revision: 0,
  surface: 'picture',
  tool: 'select',
  curved: false,
  stampId: 'objective',
  symbolId: 'friendly-infantry',
  pending: null,
  measure: '',
  selectedId: null,
  entityOpen: false,
  graphicQuery: { layer: '', phase: '' },
  contextMenu: null,
  componentDraft: null,
  async load(userId) {
    const data = await api.loadWorkbench(userId)
    apply(set, get, data)
    if (subscription) subscription()
    subscription = api.subscribeWorkbench(userId, (next) => {
      if (next) apply(set, get, next)
    })
  },
  reset() {
    if (subscription) subscription()
    subscription = null
    set({
      ready: false,
      data: null,
      surface: 'picture',
      tool: 'select',
      pending: null,
      measure: '',
      selectedId: null,
      entityOpen: false,
      contextMenu: null,
      componentDraft: null,
    })
  },
  async run(work) {
    try {
      const data = await work()
      apply(set, get, data)
      return data
    } catch (error) {
      useToastStore.getState().push(error?.message || 'The change could not be made.', 'error')
      throw error
    }
  },
  setSurface(surface) {
    set({ surface, tool: 'select', measure: '' })
  },
  setTool(tool) {
    set({ tool, measure: '' })
  },
  setCurved(curved) {
    set({ curved })
  },
  setStamp(stampId) {
    set({ stampId })
  },
  setSymbol(symbolId) {
    set({ symbolId })
  },
  setPending(pending) {
    set({ pending })
  },
  setMeasure(measure) {
    set({ measure })
  },
  select(id, entityOpen = false) {
    set({ selectedId: id, entityOpen })
  },
  closeEntity() {
    set({ entityOpen: false })
  },
  setGraphicQuery(patch) {
    set({ graphicQuery: { ...get().graphicQuery, ...patch } })
  },
  openContextMenu(contextMenu) {
    set({ contextMenu, componentDraft: null })
  },
  closeContextMenu() {
    set({ contextMenu: null })
  },
  openComponentDraft(componentDraft) {
    set({ contextMenu: null, componentDraft })
  },
  closeComponentDraft() {
    set({ componentDraft: null })
  },
}))

export function useCommit() {
  const userId = useSessionStore((state) => state.session?.profile?.id)
  const run = useDirectoryStore((state) => state.run)
  return (work) => run(() => work(userId))
}
