import { useState } from 'react'
import { SECTION_PANEL } from '../../shared/auth/access'
import { EMPTY_LIST } from '../../shared/lib/empty'
import { useChromeBus } from './useChromeBus'
import { useSessionStore } from './useSessionStore'

export function useSections() {
  const sections = useSessionStore((state) => state.session?.sections ?? EMPTY_LIST)
  const openPanel = useChromeBus((state) => state.open)
  const [sectionId, setSectionId] = useState(null)
  const selected = sections.some((section) => section.id === sectionId) ? sectionId : null
  const select = (id) => {
    setSectionId(id)
    const panel = SECTION_PANEL[id]
    if (panel) openPanel(panel)
  }
  return { sections, sectionId: selected, select }
}
