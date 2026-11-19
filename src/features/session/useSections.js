import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { SECTION_PANEL, SECTION_ROUTE } from '../../shared/auth/access'
import { EMPTY_LIST } from '../../shared/lib/empty'
import { useChromeBus } from './useChromeBus'
import { useSessionStore } from './useSessionStore'

export function useSections() {
  const sections = useSessionStore((state) => state.session?.sections ?? EMPTY_LIST)
  const openPanel = useChromeBus((state) => state.open)
  const clearPanel = useChromeBus((state) => state.close)
  const navigate = useNavigate()
  const location = useLocation()
  const [sectionId, setSectionId] = useState(null)
  const selected = sections.some((section) => section.id === sectionId) ? sectionId : null

  const select = (id) => {
    setSectionId(id)
    const route = SECTION_ROUTE[id]
    if (route) {
      clearPanel()
      navigate(route)
      return
    }
    const panel = SECTION_PANEL[id]
    if (!panel) return
    // Open the dock on the map shell; leave any full page first.
    openPanel(panel)
    if (location.pathname !== '/') navigate('/')
  }

  return { sections, sectionId: selected, select }
}
