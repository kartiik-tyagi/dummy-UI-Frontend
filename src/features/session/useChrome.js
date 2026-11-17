import { useEffect, useRef, useState } from 'react'
import { useChromeBus } from './useChromeBus'
import { useSessionStore } from './useSessionStore'

export function useChrome() {
  const requestExtent = useSessionStore((state) => state.requestExtent)
  const request = useChromeBus((state) => state.request)
  const mountedAt = useRef(Date.now())
  const [expanded, setExpanded] = useState(false)
  const [panel, setPanel] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)

  // An application-menu section asked for a panel: open it (never toggle it shut).
  useEffect(() => {
    if (request?.panel && request.at >= mountedAt.current) setPanel(request.panel)
  }, [request])

  const select = (id) => {
    if (id === 'extent') {
      requestExtent()
      return
    }
    setPanel((current) => (current === id ? null : id))
  }

  return {
    expanded,
    setExpanded,
    panel,
    closePanel: () => setPanel(null),
    menuOpen,
    setMenuOpen,
    select,
  }
}
