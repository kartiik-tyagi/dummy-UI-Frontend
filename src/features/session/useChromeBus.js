import { create } from 'zustand'

/**
 * Application-menu dock requests. `pinnedPanel` lives outside the map shell so it
 * survives leaving a full page and remounting `/`.
 */
export const useChromeBus = create((set) => ({
  pinnedPanel: null,
  open: (panel) => set({ pinnedPanel: panel }),
  close: () => set({ pinnedPanel: null }),
}))
