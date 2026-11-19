import { create } from 'zustand'

/** The ORBAT draft the map draws. The panel publishes it and clears it on close. */
export const useOrbatPicture = create((set) => ({
  active: false,
  nodes: [],
  colour: '#2f6fed',
  placeTypeId: null,
  placeToken: 0,
  place: null,
  moveToken: 0,
  move: null,
  selectToken: 0,
  selectedId: null,
  parentId: null,
  show: (nodes, colour) => set({ active: true, nodes, colour: colour || '#2f6fed' }),
  hide: () => set({ active: false, nodes: [], placeTypeId: null }),
  setPlaceType: (placeTypeId) => set({ placeTypeId }),
  requestPlace: (longitude, latitude) => set((state) => ({
    place: { longitude, latitude, nodeTypeId: state.placeTypeId, parentId: state.parentId },
    placeToken: state.placeToken + 1,
    placeTypeId: null,
  })),
  requestMove: (id, longitude, latitude) => set((state) => ({
    move: { id, longitude, latitude },
    moveToken: state.moveToken + 1,
  })),
  requestSelect: (id) => set((state) => ({ selectedId: id, selectToken: state.selectToken + 1 })),
}))
