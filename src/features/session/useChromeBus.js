import { create } from 'zustand'

/** Lets menus outside the shell frame (application sections) ask the frame to open a tool panel. */
export const useChromeBus = create((set) => ({
  request: null,
  open: (panel) => set({ request: { panel, at: Date.now() } }),
}))
