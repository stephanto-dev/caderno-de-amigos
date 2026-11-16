import { AgendaReadErrorCode, AgendaReadException, MAX_AGENDA_CONTACTS, MOBILE_AGENDA_LABEL } from './agenda'
import type { AgendaSourceContact } from './agenda'

const VCARD_VERSIONS = new Set(['2.1', '3.0', '4.0'])
const VCARD_FIELDS = new Set(['FN', 'N', 'TEL', 'BDAY'])
const DEFAULT_VCARD_CHARSET = 'utf-8'
const BINARY_TEXT_CHUNK_BYTES = 8_192
const UTF8_BOM = [0xef, 0xbb, 0xbf] as const
const QUOTED_PRINTABLE_ENCODING = 'QUOTED-PRINTABLE'
const BASE64_ENCODINGS = new Set(['B', 'BASE64'])
const RAW_VCARD_ENCODINGS = new Set(['7BIT', '8BIT'])
const HEX_BYTE_PATTERN = /^[0-9a-f]{2}$/i

interface VcardProperty {
  name: string
  parameters: Map<string, string[]>
  value: string
}

interface VcardContact extends AgendaSourceContact {
  version: string
  structured_name: string
}

/** Decode vCard 2.1/3.0/4.0 contact files, including legacy per-property charsets.
 * Work from byte-preserving lines: decoding the whole file as UTF-8 first would
 * corrupt legacy names before CHARSET and quoted-printable can be interpreted.
 * PHOTO, URL and other unused properties are never decoded or fetched.
 */
export function read_vcard_contacts_for_import(bytes: Uint8Array): AgendaSourceContact[] {
  const contacts: AgendaSourceContact[] = []
  let contact: VcardContact | null = null
  let contact_count = 0
  for (const line of get_logical_vcard_lines(bytes)) {
    if (!line.trim()) continue
    if (/^BEGIN\s*:\s*VCARD\s*$/i.test(line)) {
      if (contact) throw new AgendaReadException(AgendaReadErrorCode.INVALID_FILE)
      contact_count += 1
      if (contact_count > MAX_AGENDA_CONTACTS) throw new AgendaReadException(AgendaReadErrorCode.TOO_LARGE)
      contact = { name: '', structured_name: '', phones: [], birthday: null, version: '' }
      continue
    }
    if (/^END\s*:\s*VCARD\s*$/i.test(line)) {
      if (!contact || !VCARD_VERSIONS.has(contact.version)) throw new AgendaReadException(AgendaReadErrorCode.INVALID_FILE)
      contacts.push({ name: contact.name || contact.structured_name, phones: contact.phones, birthday: contact.birthday })
      contact = null
      continue
    }
    if (!contact) throw new AgendaReadException(AgendaReadErrorCode.INVALID_FILE)
    const property = get_vcard_property_for_contact(line)
    if (property.name === 'VERSION') {
      if (contact.version) throw new AgendaReadException(AgendaReadErrorCode.INVALID_FILE)
      contact.version = property.value.trim()
      continue
    }
    if (!VCARD_FIELDS.has(property.name)) continue
    if (property.name === 'BDAY') {
      // A broken optional birthday must not discard an otherwise readable friend.
      try { contact.birthday = get_decoded_vcard_value(property) } catch { contact.birthday = null }
      continue
    }
    const value = get_decoded_vcard_value(property)
    if (property.name === 'FN' && !contact.name) contact.name = get_unescaped_vcard_text(value).trim()
    if (property.name === 'N' && !contact.structured_name) {
      const [family = '', given = '', middle = '', prefix = '', suffix = ''] = get_vcard_text_parts(value, ';')
      contact.structured_name = [prefix, given, middle, family, suffix].map(get_unescaped_vcard_text).join(' ').trim()
    }
    if (property.name === 'TEL') contact.phones.push({
      value: get_unescaped_vcard_text(value),
      is_mobile: MOBILE_AGENDA_LABEL.test(property.parameters.get('TYPE')?.join(',') ?? ''),
    })
  }
  if (contact || !contact_count) throw new AgendaReadException(AgendaReadErrorCode.INVALID_FILE)
  return contacts
}

function* get_logical_vcard_lines(bytes: Uint8Array): Generator<string> {
  const has_bom = UTF8_BOM.every((byte, index) => bytes[index] === byte)
  const chunks: string[] = []
  for (let offset = has_bom ? UTF8_BOM.length : 0; offset < bytes.length; offset += BINARY_TEXT_CHUNK_BYTES) {
    chunks.push(String.fromCharCode(...bytes.subarray(offset, offset + BINARY_TEXT_CHUNK_BYTES)))
  }
  const text = chunks.join('')
  if (!text.trim()) throw new AgendaReadException(AgendaReadErrorCode.EMPTY_FILE)
  let logical_line = ''
  for (const line of text.split(/\r\n|\n|\r/)) {
    // vCard 2.1 QP soft breaks can continue without the usual folding whitespace.
    if (logical_line.endsWith('=') && /^[^:]*;ENCODING="?QUOTED-PRINTABLE"?(?:;|:)/i.test(logical_line)) {
      logical_line = logical_line.slice(0, -1) + line.replace(/^[ \t]/, '')
    } else if (/^[^:]*;ENCODING="?(?:BASE64|B)"?(?:;|:)/i.test(logical_line) && /^[a-z0-9+/=]+$/i.test(line)) {
      logical_line += line
    } else if (/^[ \t]/.test(line) && logical_line) {
      logical_line += line.slice(1)
    } else {
      if (logical_line) yield logical_line
      logical_line = line
    }
  }
  if (logical_line) yield logical_line
}

function get_vcard_property_for_contact(line: string): VcardProperty {
  let is_quoted = false
  let separator = -1
  for (let index = 0; index < line.length; index += 1) {
    if (line[index] === '"') is_quoted = !is_quoted
    if (line[index] === ':' && !is_quoted) { separator = index; break }
  }
  if (separator < 1) throw new AgendaReadException(AgendaReadErrorCode.INVALID_FILE)
  const header = line.slice(0, separator).match(/(?:[^;"\r\n]|"[^"]*")+/g) ?? []
  const name = header.shift()?.trim().split('.').at(-1)?.toUpperCase() ?? ''
  const parameters = new Map<string, string[]>()
  for (const parameter of header) {
    const equal = parameter.indexOf('=')
    const key = equal < 0 ? 'TYPE' : parameter.slice(0, equal).trim().toUpperCase()
    const value = (equal < 0 ? parameter : parameter.slice(equal + 1)).trim().replace(/^"|"$/g, '')
    parameters.set(key, [...(parameters.get(key) ?? []), ...value.split(',')])
  }
  return { name, parameters, value: line.slice(separator + 1) }
}

function get_decoded_vcard_value(property: VcardProperty): string {
  let value = property.value
  const encoding = property.parameters.get('ENCODING')?.[0]?.toUpperCase()
  if (encoding === QUOTED_PRINTABLE_ENCODING) {
    value = value.replace(/=([\s\S]{0,2})/g, (_match: string, hex: string) => {
      if (!HEX_BYTE_PATTERN.test(hex)) throw new AgendaReadException(AgendaReadErrorCode.INVALID_FILE)
      return String.fromCharCode(Number.parseInt(hex, 16))
    })
  } else if (encoding && BASE64_ENCODINGS.has(encoding)) {
    try { value = atob(value) } catch { throw new AgendaReadException(AgendaReadErrorCode.INVALID_FILE) }
  } else if (encoding && !RAW_VCARD_ENCODINGS.has(encoding)) {
    throw new AgendaReadException(AgendaReadErrorCode.INVALID_FILE)
  }
  try {
    const charset = property.parameters.get('CHARSET')?.[0] ?? DEFAULT_VCARD_CHARSET
    return new TextDecoder(charset, { fatal: true }).decode(Uint8Array.from(value, (character) => character.charCodeAt(0)))
  } catch {
    throw new AgendaReadException(AgendaReadErrorCode.INVALID_FILE)
  }
}

function get_vcard_text_parts(value: string, separator: string): string[] {
  const parts: string[] = []
  let part = ''
  let is_escaped = false
  for (const character of value) {
    if (character === separator && !is_escaped) { parts.push(part); part = ''; continue }
    part += character
    is_escaped = character === '\\' && !is_escaped
  }
  parts.push(part)
  return parts
}

function get_unescaped_vcard_text(value: string): string {
  return value.replace(/\\([nN,;\\])/g, (_match: string, character: string) => /[nN]/.test(character) ? '\n' : character)
}
