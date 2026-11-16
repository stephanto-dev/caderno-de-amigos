import Papa from 'papaparse'
import { AgendaReadErrorCode, AgendaReadException, MAX_AGENDA_CONTACTS, MOBILE_AGENDA_LABEL } from './agenda'
import type { AgendaSourceContact } from './agenda'

const GOOGLE_NAME_COLUMNS = ['name', 'nome']
const GOOGLE_GIVEN_NAME_COLUMNS = ['first name', 'given name', 'nome proprio', 'primeiro nome']
const GOOGLE_MIDDLE_NAME_COLUMNS = ['middle name', 'additional name', 'nome do meio']
const GOOGLE_FAMILY_NAME_COLUMNS = ['last name', 'family name', 'sobrenome']
const GOOGLE_PREFIX_COLUMNS = ['name prefix', 'prefixo do nome']
const GOOGLE_SUFFIX_COLUMNS = ['name suffix', 'sufixo do nome']
const GOOGLE_BIRTHDAY_COLUMNS = ['birthday', 'aniversario']
const GOOGLE_PHONE_COLUMN = /^(?<prefix>phone|telefone) (?<index>[1-9][0-9]*) - (?:value|valor)$/
const GOOGLE_PHONE_LABEL_SUFFIXES = ['label', 'type', 'rotulo', 'tipo']
const CSV_HEADER_ROWS = 1
const CSV_OVERFLOW_ROWS = 1
const CSV_UNDETECTABLE_DELIMITER = 'UndetectableDelimiter'

/** Read current and legacy Google Contacts CSV columns, without interpreting extra data. */
export function read_google_csv_contacts_for_import(text: string): AgendaSourceContact[] {
  const csv = Papa.parse<string[]>(text, {
    // A row with empty columns still counts as a nameless contact before filtering.
    skipEmptyLines: true, dynamicTyping: false,
    preview: MAX_AGENDA_CONTACTS + CSV_HEADER_ROWS + CSV_OVERFLOW_ROWS,
    delimitersToGuess: [',', ';', '\t'],
  })
  // Google allows a name-only CSV; Papa cannot infer a delimiter for one column.
  if (csv.errors.some((error) => error.code !== CSV_UNDETECTABLE_DELIMITER)) throw new AgendaReadException(AgendaReadErrorCode.INVALID_FILE)
  const [header, ...rows] = csv.data
  if (!header) throw new AgendaReadException(AgendaReadErrorCode.EMPTY_FILE)
  if (rows.length > MAX_AGENDA_CONTACTS) throw new AgendaReadException(AgendaReadErrorCode.TOO_LARGE)
  const columns = header.map(get_google_column_name)
  const name_columns = [...GOOGLE_NAME_COLUMNS, ...GOOGLE_GIVEN_NAME_COLUMNS, ...GOOGLE_FAMILY_NAME_COLUMNS]
  if (!columns.some((column) => name_columns.includes(column)) || new Set(columns).size !== columns.length) {
    throw new AgendaReadException(AgendaReadErrorCode.INVALID_FILE)
  }
  if (!rows.length) throw new AgendaReadException(AgendaReadErrorCode.EMPTY_FILE)
  const phone_columns = columns.flatMap((column, position) => {
    const parts = GOOGLE_PHONE_COLUMN.exec(column)?.groups
    if (!parts) return []
    return [{ position, labels: GOOGLE_PHONE_LABEL_SUFFIXES.map((suffix) => `${parts.prefix} ${parts.index} - ${suffix}`) }]
  })
  return rows.map((row) => {
    if (row.length !== header.length) throw new AgendaReadException(AgendaReadErrorCode.INVALID_FILE)
    const contact = new Map(columns.map((column, index) => [column, row[index] ?? '']))
    const full_name = get_google_contact_field(contact, GOOGLE_NAME_COLUMNS)
    const name = full_name || [GOOGLE_PREFIX_COLUMNS, GOOGLE_GIVEN_NAME_COLUMNS, GOOGLE_MIDDLE_NAME_COLUMNS, GOOGLE_FAMILY_NAME_COLUMNS, GOOGLE_SUFFIX_COLUMNS]
      .map((alternatives) => get_google_contact_field(contact, alternatives)).filter(Boolean).join(' ')
    return {
      name, birthday: get_google_contact_field(contact, GOOGLE_BIRTHDAY_COLUMNS) || null,
      phones: phone_columns.flatMap(({ position, labels }) => (row[position] ?? '').split(':::').map((value) => ({
        value: value.trim(), is_mobile: MOBILE_AGENDA_LABEL.test(get_google_contact_field(contact, labels)),
      }))),
    }
  })
}

function get_google_column_name(value: string): string {
  return value.replace(/^\uFEFF/, '').normalize('NFD').replace(/\p{M}/gu, '').trim().toLowerCase()
}

function get_google_contact_field(contact: Map<string, string>, columns: string[]): string {
  return columns.map((column) => contact.get(column)?.trim() ?? '').find(Boolean) ?? ''
}
