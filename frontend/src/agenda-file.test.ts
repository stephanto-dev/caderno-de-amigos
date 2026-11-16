import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AgendaReadErrorCode, MAX_AGENDA_CONTACTS, MAX_AGENDA_FILE_BYTES } from './agenda'
import { read_agenda_contacts_for_file } from './agenda-file'

function read_agenda_fixture_for_test(name: string) {
  return read_agenda_contacts_for_file(name, readFileSync(resolve('src/test-fixtures/agenda', name)))
}

function read_vcard_for_test(properties: string[], version = '3.0') {
  return read_agenda_contacts_for_file('contacts.vcf', new TextEncoder().encode([
    'BEGIN:VCARD', `VERSION:${version}`, ...properties, 'END:VCARD', '',
  ].join('\r\n')))
}

describe('Local agenda import', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('reads iPhone-style contacts, preferring mobile and ignoring all unrelated fields', () => {
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)

    const result = read_agenda_fixture_for_test('iphone.vcf')

    expect(result).toEqual({ skipped_without_name: 0, contacts: [
      { id: '0', name: 'Ana Beatriz da Silva', phone: '+5511999999999', birthday: '12/03', source_count: 1,
        phones: [{ number: '+5511999999999', is_mobile: true }, { number: '+551123456789', is_mobile: false }] },
      { id: '1', name: 'João da Costa', phone: '+5521988887777', birthday: '29/02', source_count: 1,
        phones: [{ number: '+5521988887777', is_mobile: true }] },
    ] })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('reads Android 2.1 quoted-printable soft breaks and ignores unindented base64 photos', () => {
    const result = read_agenda_fixture_for_test('android.vcf')

    expect(result.contacts[0]).toMatchObject({ name: 'João da Silva', phone: '+5511999999999', birthday: '21/08' })
    expect(result.contacts[0]?.phones).toHaveLength(2)
  })

  it('reads vCard 4.0 URI phones, quoted parameters, escaped names and yearless birthdays', () => {
    const result = read_agenda_fixture_for_test('vcard4.vcf')

    expect(result.contacts[0]).toMatchObject({ name: 'Maria, dos Santos', phone: '+351912345678', birthday: '29/02' })
  })

  it('reads current Google CSV, including commas, quoted text and embedded line breaks', () => {
    const result = read_agenda_fixture_for_test('google.csv')

    expect(result.contacts.map((contact) => contact.name)).toEqual(['Ana Beatriz Silva', 'João Costa'])
    expect(result.contacts[0]).toMatchObject({ phone: '+5511999999999', birthday: '12/03' })
    expect(result.contacts[1]?.birthday).toBe('29/02')
  })

  it('reads legacy Google name/type headers and ignores an invalid birthday', () => {
    const result = read_agenda_fixture_for_test('google-legacy.csv')

    expect(result.contacts[0]).toMatchObject({ name: 'Silva, Ana', phone: '+5511999999999', birthday: '12/03' })
    expect(result.contacts[1]).toMatchObject({ name: 'João da Costa', birthday: null })
  })

  it('accepts UTF-8 BOM, localized headers and semicolon-delimited CSV', () => {
    const text = '\uFEFFNome;Aniversário;Telefone 1 - Rótulo;Telefone 1 - Valor\r\nÁgata;--03-12;Celular;11999999999'

    const result = read_agenda_contacts_for_file('CONTATOS.CSV', new TextEncoder().encode(text))

    expect(result.contacts[0]).toMatchObject({ name: 'Ágata', phone: '+5511999999999', birthday: '12/03' })
  })

  it('accepts a name-only Google CSV and does not turn it into a delimiter error', () => {
    const result = read_agenda_contacts_for_file('contacts.csv', new TextEncoder().encode('Name\nAna\nBia\n'))

    expect(result.contacts.map((contact) => contact.name)).toEqual(['Ana', 'Bia'])
    expect(result.contacts.every((contact) => contact.phone === null)).toBe(true)
  })

  it('decodes declared ISO-8859-1 bytes before validating the name', () => {
    const text = 'BEGIN:VCARD\r\nVERSION:2.1\r\nFN;CHARSET=ISO-8859-1:Jo\xe3o\r\nEND:VCARD'
    const bytes = Uint8Array.from(text, (character) => character.charCodeAt(0))

    expect(read_agenda_contacts_for_file('latin.vcf', bytes).contacts[0]?.name).toBe('João')
  })

  it('decodes quoted-printable with a legacy charset', () => {
    expect(read_vcard_for_test(['FN;CHARSET=ISO-8859-1;ENCODING=QUOTED-PRINTABLE:Jo=E3o'], '2.1').contacts[0]?.name).toBe('João')
  })

  it('accepts folded multibyte UTF-8 by unfolding before character decoding', () => {
    const prefix = new TextEncoder().encode('BEGIN:VCARD\nVERSION:3.0\nFN:Jo')
    const suffix = new TextEncoder().encode('o\nEND:VCARD')
    const bytes = Uint8Array.from([...prefix, 0xc3, 0x0a, 0x20, 0xa3, ...suffix])

    expect(read_agenda_contacts_for_file('folded.vcf', bytes).contacts[0]?.name).toBe('João')
  })

  it('accepts a vCard UTF-8 BOM without treating it as a property', () => {
    const bytes = new TextEncoder().encode('\uFEFFBEGIN:VCARD\nVERSION:3.0\nFN:Ágata\nEND:VCARD')

    expect(read_agenda_contacts_for_file('contacts.vcf', bytes).contacts[0]?.name).toBe('Ágata')
  })

  it('builds a structured name when FN is blank, respecting escaped separators', () => {
    expect(read_vcard_for_test(['FN:   ', 'N:Silva\\; Santos;Ana;Maria;Dra.;Jr.']).contacts[0]?.name).toBe('Dra. Ana Maria Silva; Santos Jr.')
  })

  it('keeps nameless contacts out without replacing their names with company or email', () => {
    const bytes = new TextEncoder().encode('Name,Phone 1 - Value,Email 1 - Value\n,11999999999,private@example.test\nAna,,\n')

    const result = read_agenda_contacts_for_file('contacts.csv', bytes)

    expect(result.skipped_without_name).toBe(1)
    expect(result.contacts).toHaveLength(1)
    expect(result.contacts[0]?.name).toBe('Ana')
  })

  it('keeps same-name contacts without phones separate and drops invalid imported phones', () => {
    const result = read_agenda_contacts_for_file('contacts.csv', new TextEncoder().encode('Name,Phone 1 - Value\nAna,123\nAna,\n'))

    expect(result.contacts).toHaveLength(2)
    expect(result.contacts.every((contact) => contact.phone === null && contact.phones.length === 0)).toBe(true)
  })

  it('merges normalized matching phones while retaining the first name/date and alternatives', () => {
    const result = read_agenda_contacts_for_file('contacts.csv', new TextEncoder().encode([
      'Name,Birthday,Phone 1 - Value,Phone 2 - Value',
      'Ana,1988-03-12,(11) 99999-9999,',
      'Outro nome,1990-04-15,+5511999999999,+351912345678',
    ].join('\n')))

    expect(result.contacts).toHaveLength(1)
    expect(result.contacts[0]).toMatchObject({ name: 'Ana', birthday: '12/03', source_count: 2 })
    expect(result.contacts[0]?.phones.map((phone) => phone.number)).toEqual(['+5511999999999', '+351912345678'])
  })

  it('prefers a labelled mobile over an unlabelled number inferred to be mobile', () => {
    const result = read_vcard_for_test(['FN:Ana', 'TEL:11999999999', 'TEL;TYPE=CELL:+351912345678'])

    expect(result.contacts[0]?.phone).toBe('+351912345678')
  })

  it('infers mobile from numbering metadata when no labels are available', () => {
    const result = read_vcard_for_test(['FN:Ana', 'TEL:1123456789', 'TEL:11999999999'])

    expect(result.contacts[0]?.phone).toBe('+5511999999999')
  })

  it('does not split escaped semicolons or quoted colons in parameters', () => {
    const result = read_vcard_for_test(['N:Silva\\; Santos;Ana;;;', 'TEL;TYPE="work:office,voice":1123456789'])

    expect(result.contacts[0]).toMatchObject({ name: 'Ana Silva; Santos', phone: '+551123456789' })
  })

  it('supports multiple numbers within one Google phone field', () => {
    const bytes = new TextEncoder().encode('Name,Phone 1 - Value\nAna,1123456789 ::: 11999999999\n')

    expect(read_agenda_contacts_for_file('contacts.csv', bytes).contacts[0]?.phones).toHaveLength(2)
  })

  it.each(['--0229', '--02-29', '2001-02-29', '20000229', '29/02'])('retains only day/month for birthday %s', (birthday) => {
    expect(read_vcard_for_test(['FN:Ana', `BDAY:${birthday}`]).contacts[0]?.birthday).toBe('29/02')
  })

  it.each(['2026-02-30', '--1331', 'birthday unknown', '1900', '--02'])('ignores invalid or incomplete birthday %s', (birthday) => {
    expect(read_vcard_for_test(['FN:Ana', `BDAY:${birthday}`]).contacts[0]?.birthday).toBeNull()
  })

  it('ignores an undecodable optional birthday without discarding the friend', () => {
    expect(read_vcard_for_test(['FN:Ana', 'BDAY;ENCODING=QUOTED-PRINTABLE:=ZZ']).contacts[0]?.birthday).toBeNull()
  })

  it.each(['', '  \r\n', '\uFEFF'])('rejects an empty agenda %s', (text) => {
    expect(() => read_agenda_contacts_for_file('contacts.csv', new TextEncoder().encode(text))).toThrowError(expect.objectContaining({ code: AgendaReadErrorCode.EMPTY_FILE }))
  })

  it.each(['vazio.vcf', 'vazio.csv'])('rejects a nameless agenda in %s', (name) => {
    const text = name.endsWith('.vcf') ? 'BEGIN:VCARD\nVERSION:3.0\nTEL:11999999999\nEND:VCARD' : 'Name,Phone 1 - Value\n,11999999999'
    expect(() => read_agenda_contacts_for_file(name, new TextEncoder().encode(text))).toThrowError(expect.objectContaining({ code: AgendaReadErrorCode.NO_NAMED_CONTACTS }))
  })

  it.each([
    'not an agenda',
    'BEGIN:VCARD\nVERSION:3.0\nFN:Ana',
    'BEGIN:VCARD\nVERSION:5.0\nFN:Ana\nEND:VCARD',
    'BEGIN:VCARD\nVERSION:3.0\nFN:Ana\nBEGIN:VCARD\nEND:VCARD',
    'BEGIN:VCARD\nVERSION:3.0\nFN;ENCODING=QUOTED-PRINTABLE:=ZZ\nEND:VCARD',
    'BEGIN:VCARD\nVERSION:3.0\nFN;CHARSET=unknown:Ana\nEND:VCARD',
    'BEGIN:VCARD\nVERSION:3.0\nFN;ENCODING=unknown:Ana\nEND:VCARD',
    'BEGIN:VCARD\nFN:Ana\nEND:VCARD',
    'BEGIN:VCARD\nVERSION:3.0\nFN:Ana\nEND:VCARD\nBEGIN:VCARD\nVERSION:3.0\nFN:Bia',
  ])('rejects structurally invalid vCard instead of returning a partial import: %s', (text) => {
    expect(() => read_agenda_contacts_for_file('invalid.vcf', new TextEncoder().encode(text))).toThrowError(expect.objectContaining({ code: AgendaReadErrorCode.INVALID_FILE }))
  })

  it.each(['Surname,Email\nAna,a@example.test', 'Name,Phone 1 - Value\n"Unclosed,11999999999', 'Name,Phone 1 - Value\nAna,11999999999,extra'])('rejects unsupported or malformed CSV: %s', (text) => {
    expect(() => read_agenda_contacts_for_file('invalid.csv', new TextEncoder().encode(text))).toThrowError(expect.objectContaining({ code: AgendaReadErrorCode.INVALID_FILE }))
  })

  it('rejects unsupported extensions and oversized files before decoding their bytes', () => {
    expect(() => read_agenda_contacts_for_file('contacts.txt', new TextEncoder().encode('Name\nAna'))).toThrowError(expect.objectContaining({ code: AgendaReadErrorCode.INVALID_FILE }))
    expect(() => read_agenda_contacts_for_file('contacts.vcf', new Uint8Array(MAX_AGENDA_FILE_BYTES + 1))).toThrowError(expect.objectContaining({ code: AgendaReadErrorCode.TOO_LARGE }))
  })

  it('reads exactly 5,000 contacts without losing the last one', () => {
    const text = ['Name', ...Array.from({ length: MAX_AGENDA_CONTACTS }, (_, index) => `Amigo ${index}`)].join('\n')

    const result = read_agenda_contacts_for_file('large.csv', new TextEncoder().encode(text))

    expect(result.contacts).toHaveLength(MAX_AGENDA_CONTACTS)
    expect(result.contacts.at(-1)?.name).toBe('Amigo 4999')
  })

  it('accepts exactly 5 MiB and ignores the photo body without decoding it', () => {
    const header = 'BEGIN:VCARD\nVERSION:3.0\nFN:Ana\nPHOTO;ENCODING=B:'
    const ending = '\nEND:VCARD'
    const text = header + 'A'.repeat(MAX_AGENDA_FILE_BYTES - header.length - ending.length) + ending

    const result = read_agenda_contacts_for_file('large.vcf', new TextEncoder().encode(text))

    expect(result.contacts[0]?.name).toBe('Ana')
    expect(result.contacts[0]?.phone).toBeNull()
  })

  it.each(['csv', 'vcf'])('counts nameless contacts toward the 5,000 limit in %s', (extension) => {
    const text = extension === 'csv'
      ? ['Name,Phone 1 - Value', ...Array.from({ length: MAX_AGENDA_CONTACTS + 1 }, () => ',123')].join('\n')
      : 'BEGIN:VCARD\nVERSION:3.0\nTEL:123\nEND:VCARD\n'.repeat(MAX_AGENDA_CONTACTS + 1)

    expect(() => read_agenda_contacts_for_file(`large.${extension}`, new TextEncoder().encode(text))).toThrowError(expect.objectContaining({ code: AgendaReadErrorCode.TOO_LARGE }))
  })

  it('counts empty CSV columns before discarding nameless contacts', () => {
    const text = 'Name,Phone 1 - Value\nAna,11999999999\n,\n'

    const result = read_agenda_contacts_for_file('contacts.csv', new TextEncoder().encode(text))

    expect(result.contacts).toHaveLength(1)
    expect(result.skipped_without_name).toBe(1)
  })

  it('does not let empty CSV columns bypass the record limit', () => {
    const text = ['Name,Phone 1 - Value', 'Ana,11999999999', ...Array(MAX_AGENDA_CONTACTS).fill(',')].join('\n')

    expect(() => read_agenda_contacts_for_file('contacts.csv', new TextEncoder().encode(text)))
      .toThrowError(expect.objectContaining({ code: AgendaReadErrorCode.TOO_LARGE }))
  })
})
