import type { ContactWriteData } from './api/friends'

/** Shared labels and SVG paths for recording and reading a contact. */
export const CONTACT_OPTIONS = {
  message: { value: 'message', label: 'Mensagem', icon: 'M21 11a9 9 0 0 1-9 9 10 10 0 0 1-4-1l-5 2 2-5a10 10 0 0 1-1-4 9 9 0 0 1 17-1Z' },
  call: { value: 'call', label: 'Ligação', icon: 'm7 3 3 5-3 3a15 15 0 0 0 6 6l3-3 5 3v3a2 2 0 0 1-2 2A19 19 0 0 1 2 5a2 2 0 0 1 2-2Z' },
  meeting: { value: 'meeting', label: 'Encontro', icon: 'M4 8h12v7a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5ZM16 8h2a3 3 0 0 1 0 6h-2M7 2v3M12 2v3M2 22h18' },
} as const satisfies Record<ContactWriteData['kind'], { value: ContactWriteData['kind']; label: string; icon: string }>
