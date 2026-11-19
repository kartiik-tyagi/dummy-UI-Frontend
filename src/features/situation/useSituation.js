import { create } from 'zustand'

/** The live picture of finalized playing ORBATs on the active game. */
export const useSituation = create((set) => ({
  gameId: null,
  orbats: [],
  hover: null,
  revision: 0,
  setPicture: (picture) => set({
    gameId: picture?.gameId ?? null,
    orbats: Array.isArray(picture?.orbats) ? picture.orbats : [],
  }),
  refresh: () => set((state) => ({ revision: state.revision + 1 })),
  showHover: (hover) => set({ hover }),
  clearHover: () => set({ hover: null }),
}))

export function refreshSituation() {
  useSituation.getState().refresh()
}
