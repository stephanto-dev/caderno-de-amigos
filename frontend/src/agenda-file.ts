import { AgendaReadErrorCode, AgendaReadException, build_agenda_contacts_for_import, check_agenda_file_for_import, VCARD_AGENDA_EXTENSION } from './agenda'
import type { AgendaImportResult } from './agenda'
import { read_google_csv_contacts_for_import } from './agenda-csv'
import { read_vcard_contacts_for_import } from './agenda-vcard'

/** Read untrusted agenda bytes locally, returning only fields needed by the friend form. */
export function read_agenda_contacts_for_file(name: string, bytes: Uint8Array): AgendaImportResult {
  check_agenda_file_for_import({ name, size: bytes.byteLength })
  if (name.toLowerCase().endsWith(VCARD_AGENDA_EXTENSION)) return build_agenda_contacts_for_import(read_vcard_contacts_for_import(bytes))
  let text: string
  try { text = new TextDecoder('utf-8', { fatal: true }).decode(bytes) } catch { throw new AgendaReadException(AgendaReadErrorCode.INVALID_FILE) }
  if (!text.trim()) throw new AgendaReadException(AgendaReadErrorCode.EMPTY_FILE)
  return build_agenda_contacts_for_import(read_google_csv_contacts_for_import(text))
}
