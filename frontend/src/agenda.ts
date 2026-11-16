import { parsePhoneNumberFromString } from 'libphonenumber-js/max'
import { format_birthday_for_display } from './birthday'
import { get_normalized_phone_for_friend } from './phone'

export const MAX_AGENDA_FILE_BYTES = 5 * 1024 * 1024
export const MAX_AGENDA_CONTACTS = 5_000
export const VCARD_AGENDA_EXTENSION = '.vcf'
const CSV_AGENDA_EXTENSION = '.csv'
export const MOBILE_AGENDA_LABEL = /(?:^|[\s,;])(?:cell|mobile|celular)(?:$|[\s,;])/i
const MOBILE_PHONE_TYPE = 'MOBILE'

export enum AgendaReadErrorCode {
  INVALID_FILE = 'invalid_file',
  EMPTY_FILE = 'empty_file',
  NO_NAMED_CONTACTS = 'no_named_contacts',
  TOO_LARGE = 'too_large',
  READ_FAILED = 'read_failed',
}

const AGENDA_READ_MESSAGES: Record<AgendaReadErrorCode, string> = {
  invalid_file: 'Esse arquivo não parece uma agenda. Exporte de novo no app Contatos, no iCloud ou no Google Contatos e tente outro.',
  empty_file: 'Esse arquivo está vazio. Exporte de novo e escolha outro.',
  no_named_contacts: 'Não achei nenhum contato com nome nesse arquivo. Exporte contatos com nome e escolha outro arquivo.',
  too_large: 'Esse arquivo é grande demais. O limite é 5 MB ou 5.000 contatos. Exporte só uma parte da agenda e tente novamente.',
  read_failed: 'Não foi possível ler a agenda. Verifique se o arquivo está disponível e escolha-o novamente.',
}

export class AgendaReadException extends Error {
  constructor(public readonly code: AgendaReadErrorCode) {
    super(AGENDA_READ_MESSAGES[code])
    this.name = 'AgendaReadException'
  }
}

/** Only these contact fields survive decoding; all other agenda data is ignored. */
export interface AgendaSourceContact {
  name: string
  phones: { value: string; is_mobile: boolean }[]
  birthday: string | null
}

export interface AgendaPhone {
  number: string
  is_mobile: boolean
}

/** IDs identify rows in this in-memory import, never people across imports. */
export interface AgendaContact {
  id: string
  name: string
  phones: AgendaPhone[]
  phone: string | null
  birthday: string | null
  source_count: number
}

export interface AgendaImportResult {
  contacts: AgendaContact[]
  skipped_without_name: number
}

export type AgendaWorkerResponse = { result: AgendaImportResult } | { error: AgendaReadErrorCode }

/** Validate before reading bytes; exported agenda files often have an empty MIME type. */
export function check_agenda_file_for_import(file: Pick<File, 'name' | 'size'>): void {
  if (file.size > MAX_AGENDA_FILE_BYTES) throw new AgendaReadException(AgendaReadErrorCode.TOO_LARGE)
  if (!file.size) throw new AgendaReadException(AgendaReadErrorCode.EMPTY_FILE)
  const extension = file.name.toLowerCase()
  if (!extension.endsWith(VCARD_AGENDA_EXTENSION) && !extension.endsWith(CSV_AGENDA_EXTENSION)) throw new AgendaReadException(AgendaReadErrorCode.INVALID_FILE)
}

/** Normalize candidates and merge matching selected phones, retaining the first name/date.
 * Nameless contacts count toward the limit. Contacts without a valid phone remain
 * separate even when their names match; CRM-30 explicitly uses phone identity only.
 */
export function build_agenda_contacts_for_import(source_contacts: AgendaSourceContact[]): AgendaImportResult {
  if (source_contacts.length > MAX_AGENDA_CONTACTS) throw new AgendaReadException(AgendaReadErrorCode.TOO_LARGE)
  const contacts: AgendaContact[] = []
  const contacts_by_phone = new Map<string, AgendaContact>()
  let skipped_without_name = 0
  for (const [index, source] of source_contacts.entries()) {
    const name = source.name.replace(/\s+/g, ' ').trim()
    if (!name) {
      skipped_without_name += 1
      continue
    }
    const phones = get_phones_for_agenda_contact(source.phones)
    const phone = (phones.find((candidate) => candidate.is_mobile) ?? phones[0])?.number ?? null
    const duplicate = phone ? contacts_by_phone.get(phone) : undefined
    if (duplicate) {
      duplicate.source_count += 1
      for (const alternative of phones) {
        const saved_phone = duplicate.phones.find((saved) => saved.number === alternative.number)
        if (saved_phone) saved_phone.is_mobile ||= alternative.is_mobile
        else duplicate.phones.push(alternative)
      }
      continue
    }
    const contact: AgendaContact = {
      id: String(index), name, phones, phone,
      birthday: get_birthday_for_agenda_contact(source.birthday), source_count: 1,
    }
    contacts.push(contact)
    if (phone) contacts_by_phone.set(phone, contact)
  }
  if (!contacts.length) throw new AgendaReadException(AgendaReadErrorCode.NO_NAMED_CONTACTS)
  return { contacts, skipped_without_name }
}

function get_phones_for_agenda_contact(source_phones: AgendaSourceContact['phones']): AgendaPhone[] {
  const phones = new Map<string, AgendaPhone>()
  const labelled_mobile_numbers = new Set<string>()
  for (const source of source_phones) {
    let number: string | null
    try {
      number = get_normalized_phone_for_friend(source.value.replace(/^tel:/i, ''))
    } catch {
      continue
    }
    if (!number) continue
    if (source.is_mobile) labelled_mobile_numbers.add(number)
    // Contact Picker drops TYPE labels; numbering metadata is the remaining hint.
    const is_mobile = source.is_mobile || parsePhoneNumberFromString(number)?.getType() === MOBILE_PHONE_TYPE
    const existing = phones.get(number)
    if (existing) existing.is_mobile ||= is_mobile
    else phones.set(number, { number, is_mobile })
  }
  return [...phones.values()].sort((first, second) => Number(labelled_mobile_numbers.has(second.number)) - Number(labelled_mobile_numbers.has(first.number)))
}

function get_birthday_for_agenda_contact(value: string | null): string | null {
  if (!value) return null
  const date = value.trim().split(/[Tt]/)[0] ?? ''
  const parts = /^(?:[0-9]{4}-?|--)(?<month>[0-9]{2})-?(?<day>[0-9]{2})$/.exec(date)?.groups
  const birthday = parts ? `${parts.day}/${parts.month}` : date
  return format_birthday_for_display(birthday) ? birthday : null
}
