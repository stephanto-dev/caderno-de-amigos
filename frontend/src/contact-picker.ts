import { build_agenda_contacts_for_import } from './agenda'
import type { AgendaImportResult } from './agenda'

interface BrowserAgendaContact {
  name?: string[]
  tel?: string[]
}

/** Browser API contract; requesting name/tel excludes unrelated contact fields. */
interface BrowserContactPicker {
  select(properties: ('name' | 'tel')[], options: { multiple: true }): Promise<BrowserAgendaContact[]>
}

function is_browser_contact_picker(value: unknown): value is BrowserContactPicker {
  return typeof value === 'object' && value !== null && 'select' in value && typeof value.select === 'function'
}

export function is_contact_picker_available_for_browser(): boolean {
  return window.isSecureContext === true && window.top === window && 'ContactsManager' in window
    && 'contacts' in navigator && is_browser_contact_picker(navigator.contacts)
}

/** Call directly from the user's click: awaiting other work first loses activation. */
export async function get_agenda_contacts_from_browser(): Promise<AgendaImportResult | null> {
  if (!is_contact_picker_available_for_browser() || !('contacts' in navigator) || !is_browser_contact_picker(navigator.contacts)) {
    throw new Error('Não deu pra abrir a agenda. Você pode enviar um arquivo .vcf.')
  }
  let contacts: BrowserAgendaContact[]
  try {
    contacts = await navigator.contacts.select(['name', 'tel'], { multiple: true })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return null
    throw new Error('Não deu pra abrir a agenda. Você pode enviar um arquivo .vcf.')
  }
  if (!contacts.length) return null
  return build_agenda_contacts_for_import(contacts.map((contact) => ({
    name: contact.name?.find((name) => name.trim()) ?? '', birthday: null,
    // Chrome drops semantic labels; the shared reader infers mobile from the number.
    phones: (contact.tel ?? []).map((value) => ({ value, is_mobile: false })),
  })))
}
