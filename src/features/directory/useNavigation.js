import { useSessionStore } from '../../features/session/useSessionStore'
import { EMPTY_LIST } from '../../shared/lib/empty'

/** Navigation comes only from session functionalities — never from local directory flags. */
export function useNavigation() {
  return useSessionStore((state) => state.session?.navigation ?? EMPTY_LIST)
}

export function useSignedUserId() {
  return useSessionStore((state) => state.session?.profile?.id || null)
}
