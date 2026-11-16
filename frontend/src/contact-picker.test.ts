import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { get_agenda_contacts_from_browser, is_contact_picker_available_for_browser } from './contact-picker'

describe('Native contact selection', () => {
  beforeEach(() => { vi.stubGlobal('isSecureContext', true); vi.stubGlobal('ContactsManager', class {}) })
  afterEach(() => { Reflect.deleteProperty(navigator, 'contacts'); vi.unstubAllGlobals() })

  it('requests only name/tel with multiple selection and adapts mobile without a birthday', async () => {
    const select = vi.fn().mockResolvedValue([
      { name: ['Ana'], tel: ['1123456789', '11999999999'], email: ['ignored@example.test'] },
      { name: [], tel: ['21988887777'] },
      { name: ['Bia'], tel: [] },
    ])
    Object.defineProperty(navigator, 'contacts', { configurable: true, value: { select } })

    expect(is_contact_picker_available_for_browser()).toBe(true)
    const result = await get_agenda_contacts_from_browser()

    expect(select).toHaveBeenCalledExactlyOnceWith(['name', 'tel'], { multiple: true })
    expect(result?.contacts.map((contact) => contact.name)).toEqual(['Ana', 'Bia'])
    expect(result?.contacts[0]).toMatchObject({ phone: '+5511999999999', birthday: null })
    expect(result?.skipped_without_name).toBe(1)
  })

  it('does not expose the picker outside a secure context', () => {
    Object.defineProperty(navigator, 'contacts', { configurable: true, value: { select: vi.fn() } })
    vi.stubGlobal('isSecureContext', false)

    expect(is_contact_picker_available_for_browser()).toBe(false)
  })

  it('does not expose the picker when the browser lacks the API', () => {
    expect(is_contact_picker_available_for_browser()).toBe(false)
  })

  it('treats an empty selection as cancellation', async () => {
    Object.defineProperty(navigator, 'contacts', { configurable: true, value: { select: vi.fn().mockResolvedValue([]) } })

    expect(await get_agenda_contacts_from_browser()).toBeNull()
  })

  it('treats AbortError as cancellation', async () => {
    Object.defineProperty(navigator, 'contacts', { configurable: true, value: { select: vi.fn().mockRejectedValue(new DOMException('Cancelled', 'AbortError')) } })

    expect(await get_agenda_contacts_from_browser()).toBeNull()
  })

  it('offers file import when the browser refuses contact access', async () => {
    Object.defineProperty(navigator, 'contacts', { configurable: true, value: { select: vi.fn().mockRejectedValue(new DOMException('Denied', 'NotAllowedError')) } })

    await expect(get_agenda_contacts_from_browser()).rejects.toThrow('Você pode enviar um arquivo .vcf.')
  })
})
