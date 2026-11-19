import { useState } from 'react'
import { useChromeBus } from './useChromeBus'
import { useSessionStore } from './useSessionStore'

export function useChrome() {
  const requestExtent = useSessionStore((state) => state.requestExtent)
  const pinnedPanel = useChromeBus((state) => state.pinnedPanel)
  const clearPin = useChromeBus((state) => state.close)
  const [localPanel, setLocalPanel] = useState(null)
  const [expanded, setExpanded] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  // Menu pin wins until closed; toolbar selection uses local panel after clearing the pin.
  const panel = pinnedPanel || localPanel

  const select = (id) => {
    if (id === 'extent') {
      requestExtent()
      return
    }
    clearPin()
    setLocalPanel((current) => (current === id ? null : id))
  }

  const closePanel = () => {
    clearPin()
    setLocalPanel(null)
  }

  return {
    expanded,
    setExpanded,
    panel,
    closePanel,
    menuOpen,
    setMenuOpen,
    select,
  }
}
