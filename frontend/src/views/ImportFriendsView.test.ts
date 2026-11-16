import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import type { BoardFriend } from '../api/friends'
import { AgendaReadErrorCode, AgendaReadException, build_agenda_contacts_for_import } from '../agenda'
import { AgendaImportStep, agenda_import_state, clear_agenda_import } from '../agenda-import'
import { read_agenda_for_import } from '../agenda-worker'
import { friends_state } from '../friends'
import ImportFriendsView from './ImportFriendsView.vue'
import ImportFriendsPreview from './ImportFriendsPreview.vue'

vi.mock('../agenda-worker', () => ({ read_agenda_for_import: vi.fn() }))

const EXISTING_FRIEND: BoardFriend = {
  id: 'existing', name: 'Marina', phone: '+351912345678', birthday: null, is_birthday_today: false,
  cadence_amount: 1, cadence_unit: 'month', column: 'overdue', last_contact_at: null, last_note: null, groups: [],
}
const GROUP = { id: 'group', name: 'Faculdade', color: 'college', friends_count: 0 }
const BULK_CONFIRMATION = 'dialog[aria-labelledby="agenda-bulk-title"]'

function build_contacts_for_test() {
  return build_agenda_contacts_for_import([
    { name: 'Ana', birthday: '1988-03-12', phones: [{ value: '11999999999', is_mobile: true }, { value: '+351912345678', is_mobile: false }] },
    { name: 'Bia', birthday: null, phones: [] },
    { name: 'Já existe', birthday: null, phones: [{ value: '+351912345678', is_mobile: true }] },
  ])
}

function set_api_for_test() {
  const fetch = vi.fn().mockImplementation((path: string, options?: RequestInit) => {
    if (path === '/api/friends/bulk-import/') {
      const body = JSON.parse(String(options?.body))
      return Promise.resolve(Response.json({ created: body.friends.map((friend: object, index: number) => ({ index, friend: { ...EXISTING_FRIEND, ...friend, id: `bulk-${index}` } })), ignored: [] }, { status: 201 }))
    }
    if (path === '/api/groups/') return Promise.resolve(Response.json(options?.method === 'POST' ? { ...GROUP, id: 'created-group', name: 'Escalada' } : [GROUP]))
    if (options?.method === 'POST') {
      const body = JSON.parse(String(options.body))
      return Promise.resolve(Response.json({ ...EXISTING_FRIEND, ...body, id: `saved-${body.name}`, groups: [] }, { status: 201 }))
    }
    return Promise.resolve(Response.json([EXISTING_FRIEND]))
  })
  vi.stubGlobal('fetch', fetch)
  return fetch
}

async function get_import_view_for_test() {
  const router = createRouter({ history: createMemoryHistory(), routes: [
    { path: '/amigos/importar', components: { default: ImportFriendsView, detail: ImportFriendsPreview } },
    { path: '/amigos', component: { template: '<p>Amigos</p>' } },
    { path: '/amigos/:id', component: { template: '<p>Perfil</p>' } },
  ] })
  await router.push('/amigos/importar')
  const wrapper = mount({ template: '<div class="page-content"><RouterView /></div><RouterView name="detail" />' }, { attachTo: document.body, global: { plugins: [router] } })
  await flushPromises()
  return { wrapper, router }
}

async function choose_file_for_test(wrapper: ReturnType<typeof mount>) {
  const input = wrapper.get<HTMLInputElement>('input[type="file"]')
  Object.defineProperty(input.element, 'files', { configurable: true, value: [new File(['fictitious'], 'contacts.vcf')] })
  await input.trigger('change')
  await flushPromises()
}

async function get_completing_view_for_test() {
  vi.mocked(read_agenda_for_import).mockResolvedValue(build_contacts_for_test())
  const view = await get_import_view_for_test()
  await choose_file_for_test(view.wrapper)
  await view.wrapper.get('input[value="0"]').setValue(true)
  await view.wrapper.get('input[value="1"]').setValue(true)
  await view.wrapper.get('.agenda-desktop-continue').trigger('click')
  await flushPromises()
  return view
}

enableAutoUnmount(afterEach)
beforeAll(() => {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value(this: HTMLDialogElement) { this.open = true } })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value(this: HTMLDialogElement) { this.open = false } })
  // jsdom has no layout. Keep the real virtualizer with a deterministic viewport/row size.
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(700)
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(390)
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(96)
  Object.defineProperty(HTMLElement.prototype, 'scrollTo', { configurable: true, value(this: HTMLElement, options: ScrollToOptions) { this.scrollTop = options.top ?? 0; this.dispatchEvent(new Event('scroll')) } })
})
afterAll(() => {
  Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal')
  Reflect.deleteProperty(HTMLDialogElement.prototype, 'close')
  Reflect.deleteProperty(HTMLElement.prototype, 'scrollTo')
  vi.restoreAllMocks()
})
beforeEach(() => { clear_agenda_import(); friends_state.friends = []; vi.mocked(read_agenda_for_import).mockReset(); set_api_for_test() })
afterEach(() => { vi.unstubAllGlobals(); Reflect.deleteProperty(navigator, 'contacts'); clear_agenda_import(); friends_state.friends = [] })

describe('Agenda import screens', () => {
  it('reads a file locally, starts unselected and disables existing phones', async () => {
    vi.mocked(read_agenda_for_import).mockResolvedValue(build_contacts_for_test())
    const { wrapper } = await get_import_view_for_test()

    expect(wrapper.findAll('button').some((button) => button.text() === 'Escolher da agenda')).toBe(false)
    await choose_file_for_test(wrapper)

    expect(wrapper.get('h1').text()).toBe('Quem entra no caderno')
    expect(wrapper.findAll('input[type="checkbox"]:checked')).toHaveLength(0)
    expect(wrapper.get('input[value="2"]').attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('Já no caderno')
    expect(wrapper.get('input[type="search"]').attributes('placeholder')).toBe('Buscar por nome')
    expect(wrapper.get('.agenda-selection-actions button').attributes('disabled')).toBeDefined()
  })

  it('keeps a selection across searches and reflects it on the second notebook page', async () => {
    vi.mocked(read_agenda_for_import).mockResolvedValue(build_contacts_for_test())
    const { wrapper } = await get_import_view_for_test()
    await choose_file_for_test(wrapper)

    await wrapper.get('input[value="0"]').setValue(true)
    await wrapper.get('input[type="search"]').setValue('Bia')
    await wrapper.get('input[value="1"]').setValue(true)
    await wrapper.get('input[type="search"]').setValue('')

    expect(wrapper.findAll('input[type="checkbox"]:checked')).toHaveLength(2)
    expect(wrapper.get('.agenda-preview').text()).toContain('2 selecionados')
    expect(wrapper.get('.agenda-desktop-continue').text()).toBe('Continuar com 2')
  })

  it('rechecks duplicates when the chosen phone changes', async () => {
    vi.mocked(read_agenda_for_import).mockResolvedValue(build_contacts_for_test())
    const { wrapper } = await get_import_view_for_test()
    await choose_file_for_test(wrapper)
    await wrapper.get('input[value="0"]').setValue(true)

    await wrapper.get('select[aria-label="Telefone de Ana"]').setValue('+351912345678')

    expect(wrapper.get('input[value="0"]').attributes('disabled')).toBeDefined()
    expect(wrapper.findAll('input[type="checkbox"]:checked')).toHaveLength(0)
    await wrapper.get('select[aria-label="Telefone de Ana"]').setValue('+5511999999999')
    expect(wrapper.get('input[value="0"]').attributes('disabled')).toBeUndefined()
  })

  it('keeps the other selection when switching a phone to one already selected', async () => {
    const result = build_contacts_for_test()
    result.contacts[1]!.phone = '+351912345678'
    // Both numbers are new for this owner in this scenario.
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json([])))
    vi.mocked(read_agenda_for_import).mockResolvedValue(result)
    const { wrapper } = await get_import_view_for_test()
    await choose_file_for_test(wrapper)
    await wrapper.get('input[value="0"]').setValue(true)
    await wrapper.get('input[value="1"]').setValue(true)

    await wrapper.get('select[aria-label="Telefone de Ana"]').setValue('+351912345678')

    expect(wrapper.get<HTMLInputElement>('input[value="0"]').element.checked).toBe(false)
    expect(wrapper.get<HTMLInputElement>('input[value="1"]').element.checked).toBe(true)
    expect(wrapper.text()).toContain('Mesmo telefone de Bia na seleção')
  })

  it('moves keyboard focus past disabled duplicates and opens search with slash', async () => {
    const result = build_contacts_for_test()
    result.contacts.reverse()
    vi.mocked(read_agenda_for_import).mockResolvedValue(result)
    const { wrapper } = await get_import_view_for_test()
    await choose_file_for_test(wrapper)

    await wrapper.get('input[value="0"]').trigger('keydown', { key: 'Home' })

    expect(document.activeElement).toBe(wrapper.get('input[value="1"]').element)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '/', bubbles: true }))
    expect(document.activeElement).toBe(wrapper.get('input[type="search"]').element)
  })

  it('prefills the existing form and saves edited data with the standard POST', async () => {
    const fetch = set_api_for_test()
    vi.mocked(read_agenda_for_import).mockResolvedValue(build_contacts_for_test())
    const { wrapper } = await get_import_view_for_test()
    await choose_file_for_test(wrapper)
    await wrapper.get('input[value="0"]').setValue(true)
    await wrapper.get('.agenda-desktop-continue').trigger('click')
    await flushPromises()

    expect(wrapper.get<HTMLInputElement>('[name="name"]').element.value).toBe('Ana')
    expect(wrapper.get<HTMLInputElement>('[name="birthday"]').element.value).toBe('12/03')
    expect(wrapper.get<HTMLInputElement>('[name="cadence_amount"]').element.value).toBe('1')
    await wrapper.get('[name="name"]').setValue('Ana editada')
    await wrapper.get('[name="cadence_amount"]').setValue(2)
    await wrapper.get('.group-chip[aria-pressed]').trigger('click')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    const request = fetch.mock.calls.find(([, options]) => options?.method === 'POST')
    expect(JSON.parse(String(request?.[1]?.body))).toMatchObject({ name: 'Ana editada', phone: '+5511999999999', birthday: '12/03', cadence_amount: 2, cadence_unit: 'month', groups: ['group'] })
    expect(wrapper.text()).toContain('1 amigo adicionado.')
    expect(wrapper.find('a[href="/amigos/saved-Ana editada"]').exists()).toBe(true)
    expect(agenda_import_state.is_busy).toBe(false)
  })

  it('skips filling while retaining edited personal data and resetting cadence/groups', async () => {
    const fetch = set_api_for_test()
    vi.mocked(read_agenda_for_import).mockResolvedValue(build_contacts_for_test())
    const { wrapper } = await get_import_view_for_test()
    await choose_file_for_test(wrapper)
    await wrapper.get('input[value="0"]').setValue(true)
    await wrapper.get('input[value="1"]').setValue(true)
    await wrapper.get('.agenda-desktop-continue').trigger('click')
    await flushPromises()
    await wrapper.get('[name="name"]').setValue('Ana editada')
    await wrapper.get('[name="phone"]').setValue('(21) 98888-7777')
    await wrapper.get('[name="birthday"]').setValue('29/02')
    await wrapper.get('[name="cadence_amount"]').setValue(3)
    await wrapper.get('.group-chip[aria-pressed]').trigger('click')

    await wrapper.get('.agenda-skip').trigger('click')
    await flushPromises()

    const request = fetch.mock.calls.find(([, options]) => options?.method === 'POST')
    expect(JSON.parse(String(request?.[1]?.body))).toEqual({ name: 'Ana editada', phone: '+5521988887777', birthday: '29/02', cadence_amount: 1, cadence_unit: 'month', groups: [] })
    expect(wrapper.get<HTMLInputElement>('[name="name"]').element.value).toBe('Bia')
    expect(wrapper.text()).toContain('2 de 2')
  })

  it('creates and selects a group using the existing picker during import', async () => {
    const fetch = set_api_for_test()
    vi.mocked(read_agenda_for_import).mockResolvedValue(build_contacts_for_test())
    const { wrapper } = await get_import_view_for_test()
    await choose_file_for_test(wrapper)
    await wrapper.get('input[value="0"]').setValue(true)
    await wrapper.get('.agenda-desktop-continue').trigger('click')
    await flushPromises()
    await wrapper.get('[name="new-group"]').trigger('click')
    await wrapper.get('[name="group_name"]').setValue('Escalada')
    await wrapper.get('[name="save-group"]').trigger('click')
    await flushPromises()

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    const request = fetch.mock.calls.find(([path, options]) => path === '/api/friends/' && options?.method === 'POST')
    expect(JSON.parse(String(request?.[1]?.body)).groups).toEqual(['created-group'])
  })

  it('blocks repeated saves and navigation until the request completes', async () => {
    const fetch = set_api_for_test()
    let complete_save!: (response: Response) => void
    fetch.mockImplementation((path: string, options?: RequestInit) => options?.method === 'POST'
      ? new Promise<Response>((complete) => { complete_save = complete })
      : Promise.resolve(Response.json(path === '/api/groups/' ? [GROUP] : [EXISTING_FRIEND])))
    vi.mocked(read_agenda_for_import).mockResolvedValue(build_contacts_for_test())
    const { wrapper, router } = await get_import_view_for_test()
    await choose_file_for_test(wrapper)
    await wrapper.get('input[value="0"]').setValue(true)
    await wrapper.get('.agenda-desktop-continue').trigger('click')
    await flushPromises()

    await wrapper.get('form').trigger('submit')
    await wrapper.get('form').trigger('submit')
    await wrapper.get('.agenda-skip').trigger('click')
    await router.push('/amigos')

    expect(fetch.mock.calls.filter(([, options]) => options?.method === 'POST')).toHaveLength(1)
    expect(router.currentRoute.value.path).toBe('/amigos/importar')
    expect(wrapper.text()).toContain('Aguarde a operação terminar')
    complete_save(Response.json({ ...EXISTING_FRIEND, id: 'saved', name: 'Ana' }, { status: 201 }))
    await flushPromises()
    expect(wrapper.text()).toContain('1 amigo adicionado.')
    await router.push('/amigos')
    expect(router.currentRoute.value.path).toBe('/amigos')
  })

  it('retains edits when returning to selection before any friend was saved', async () => {
    vi.mocked(read_agenda_for_import).mockResolvedValue(build_contacts_for_test())
    const { wrapper } = await get_import_view_for_test()
    await choose_file_for_test(wrapper)
    await wrapper.get('input[value="0"]').setValue(true)
    await wrapper.get('.agenda-desktop-continue').trigger('click')
    await flushPromises()
    await wrapper.get('[name="name"]').setValue('Nome guardado')

    await wrapper.get('button.agenda-back-link').trigger('click')
    expect(wrapper.get('dialog').attributes('open')).toBeUndefined()
    await wrapper.get('.agenda-desktop-continue').trigger('click')
    await flushPromises()

    expect(wrapper.get<HTMLInputElement>('[name="name"]').element.value).toBe('Nome guardado')
  })

  it('confirms returning after a save and keeps the saved contact disabled', async () => {
    vi.mocked(read_agenda_for_import).mockResolvedValue(build_contacts_for_test())
    const { wrapper } = await get_import_view_for_test()
    await choose_file_for_test(wrapper)
    await wrapper.get('input[value="0"]').setValue(true)
    await wrapper.get('input[value="1"]').setValue(true)
    await wrapper.get('.agenda-desktop-continue').trigger('click')
    await flushPromises()
    await wrapper.get('.agenda-skip').trigger('click')
    await flushPromises()

    await wrapper.get('button.agenda-back-link').trigger('click')
    expect(wrapper.get('dialog').attributes('open')).toBeDefined()
    expect(wrapper.get('dialog').text()).toContain('1 amigo já entrou')
    await wrapper.get('dialog .stamp-filled').trigger('click')
    await flushPromises()

    expect(wrapper.get('input[value="0"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('.agenda-desktop-continue').text()).toBe('Continuar com 1')
  })

  it('preserves the card and progress after a failed save', async () => {
    const fetch = set_api_for_test()
    fetch.mockImplementation((path: string, options?: RequestInit) => {
      if (options?.method === 'POST') return Promise.reject(new TypeError('Connection lost'))
      return Promise.resolve(Response.json(path === '/api/groups/' ? [GROUP] : [EXISTING_FRIEND]))
    })
    vi.mocked(read_agenda_for_import).mockResolvedValue(build_contacts_for_test())
    const { wrapper } = await get_import_view_for_test()
    await choose_file_for_test(wrapper)
    await wrapper.get('input[value="0"]').setValue(true)
    await wrapper.get('.agenda-desktop-continue').trigger('click')
    await flushPromises()

    await wrapper.get('.agenda-skip').trigger('click')
    await flushPromises()

    expect(wrapper.get<HTMLInputElement>('[name="name"]').element.value).toBe('Ana')
    expect(wrapper.text()).toContain('1 de 1')
    expect(wrapper.get('[role="alert"]').text()).toContain('Não foi possível confirmar')
    expect(agenda_import_state.saved_friends).toHaveLength(0)
  })

  it('shows a recoverable file error without saving or retaining the selected file', async () => {
    const fetch = set_api_for_test()
    vi.mocked(read_agenda_for_import).mockRejectedValue(new AgendaReadException(AgendaReadErrorCode.INVALID_FILE))
    const { wrapper } = await get_import_view_for_test()

    await choose_file_for_test(wrapper)

    expect(wrapper.get('[role="alert"]').text()).toContain('não parece uma agenda')
    expect(wrapper.text()).toContain('Escolher outro arquivo')
    expect(wrapper.get<HTMLInputElement>('input[type="file"]').element.value).toBe('')
    expect(fetch.mock.calls.some(([, options]) => options?.method === 'POST')).toBe(false)
  })

  it('shows the Android picker and goes directly to the first card, skipping existing friends', async () => {
    vi.stubGlobal('isSecureContext', true)
    vi.stubGlobal('ContactsManager', class {})
    const select = vi.fn().mockResolvedValue([{ name: ['Ana'], tel: ['11999999999'] }, { name: ['Marina'], tel: ['+351912345678'] }])
    Object.defineProperty(navigator, 'contacts', { configurable: true, value: { select } })
    const { wrapper } = await get_import_view_for_test()

    await wrapper.findAll('button').find((button) => button.text() === 'Escolher da agenda')!.trigger('click')
    await flushPromises()

    expect(select).toHaveBeenCalledExactlyOnceWith(['name', 'tel'], { multiple: true })
    expect(wrapper.get('h1').text()).toBe('Completar amigos')
    expect(wrapper.get<HTMLInputElement>('[name="name"]').element.value).toBe('Ana')
    expect(wrapper.get<HTMLInputElement>('[name="birthday"]').element.value).toBe('')
    await wrapper.get('.agenda-skip').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('1 já estava no caderno.')
  })

  it('handles all chosen native contacts already being in the book without saving anything', async () => {
    const fetch = set_api_for_test()
    vi.stubGlobal('isSecureContext', true)
    vi.stubGlobal('ContactsManager', class {})
    Object.defineProperty(navigator, 'contacts', { configurable: true, value: { select: vi.fn().mockResolvedValue([{ name: ['Marina'], tel: ['+351912345678'] }]) } })
    const { wrapper } = await get_import_view_for_test()

    await wrapper.findAll('button').find((button) => button.text() === 'Escolher da agenda')!.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('0 amigos adicionados.')
    expect(wrapper.text()).toContain('1 já estava no caderno.')
    expect(wrapper.text()).toContain('Escolher outros contatos')
    expect(fetch.mock.calls.some(([, options]) => options?.method === 'POST')).toBe(false)
  })

  it('clears in-memory contacts on exit and aborts a pending read', async () => {
    vi.mocked(read_agenda_for_import).mockImplementation(() => new Promise(() => {}))
    const { wrapper, router } = await get_import_view_for_test()
    await choose_file_for_test(wrapper)
    const signal = vi.mocked(read_agenda_for_import).mock.calls[0]![1]!

    await router.push('/amigos')
    await flushPromises()

    expect(signal.aborted).toBe(true)
    expect(agenda_import_state.step).toBe(AgendaImportStep.FILE)
    expect(agenda_import_state.contacts).toEqual([])
  })

  it('renders only a small window of a 5,000-contact agenda', async () => {
    vi.mocked(read_agenda_for_import).mockResolvedValue(build_agenda_contacts_for_import(Array.from({ length: 5000 }, (_, index) => ({ name: `Amigo ${index}`, phones: [], birthday: null }))))
    const { wrapper } = await get_import_view_for_test()

    await choose_file_for_test(wrapper)

    const checkboxes = wrapper.findAll('input[type="checkbox"]')
    expect(checkboxes.length).toBeGreaterThan(0)
    expect(checkboxes.length).toBeLessThan(30)
    expect(wrapper.get('.agenda-contact-list li').attributes('aria-setsize')).toBe('5000')
  })

  it('explains bulk defaults and lets the user cancel without saving', async () => {
    const fetch = set_api_for_test()
    const { wrapper } = await get_completing_view_for_test()
    await wrapper.get('.agenda-bulk-action').trigger('click')
    const dialog = wrapper.get(BULK_CONFIRMATION)

    expect(dialog.attributes('open')).toBeDefined()
    expect(dialog.text()).toContain('2 amigos vão com ritmo de 1 mês e sem grupo')
    expect(document.activeElement).toBe(dialog.get('.agenda-text-action').element)
    await dialog.get('.agenda-text-action').trigger('click')

    expect(dialog.attributes('open')).toBeUndefined()
    expect(wrapper.get<HTMLInputElement>('[name="name"]').element.value).toBe('Ana')
    expect(fetch.mock.calls.some(([, options]) => options?.method === 'POST')).toBe(false)
  })

  it('bulk saves edited personal data across drafts and updates the friends list', async () => {
    const fetch = set_api_for_test()
    const { wrapper } = await get_completing_view_for_test()
    await wrapper.get('[name="name"]').setValue('Ana editada')
    await wrapper.get('[name="phone"]').setValue('(21) 98888-7777')
    await wrapper.get('[name="birthday"]').setValue('29/02')
    await wrapper.get('button.agenda-back-link').trigger('click')
    await wrapper.get('input[value="0"]').setValue(false)
    await wrapper.get('.agenda-desktop-continue').trigger('click')
    await flushPromises()
    await wrapper.get('[name="name"]').setValue('Bia editada')
    await wrapper.get('[name="birthday"]').setValue('12/03')
    await wrapper.get('button.agenda-back-link').trigger('click')
    await wrapper.get('input[value="0"]').setValue(true)
    await wrapper.get('.agenda-desktop-continue').trigger('click')
    await flushPromises()
    await wrapper.get('[name="cadence_amount"]').setValue(3)
    await wrapper.get('.group-chip[aria-pressed]').trigger('click')

    fetch.mockResolvedValueOnce(Response.json({ created: [
      { index: 0, friend: { ...EXISTING_FRIEND, id: 'bulk-ana', name: 'Ana editada', phone: '+5521988887777', birthday: '29/02' } },
      { index: 1, friend: { ...EXISTING_FRIEND, id: 'bulk-bia', name: 'Bia editada', phone: null, birthday: '12/03' } },
    ], ignored: [] }, { status: 201 }))

    await wrapper.get('.agenda-bulk-action').trigger('click')
    await wrapper.get(`${BULK_CONFIRMATION} .stamp-filled`).trigger('click')
    await flushPromises()

    const request = fetch.mock.calls.find(([path]) => path === '/api/friends/bulk-import/')
    expect(JSON.parse(String(request?.[1]?.body))).toEqual({ friends: [
      { name: 'Ana editada', phone: '(21) 98888-7777', birthday: '29/02' },
      { name: 'Bia editada', phone: null, birthday: '12/03' },
    ] })
    expect(wrapper.text()).toContain('2 amigos adicionados.')
    expect(friends_state.friends.map((friend) => friend.name)).toEqual(['Ana editada', 'Bia editada'])
  })

  it('submits only remaining cards after an individual save', async () => {
    const fetch = set_api_for_test()
    const { wrapper } = await get_completing_view_for_test()
    await wrapper.get('.agenda-skip').trigger('click')
    await flushPromises()

    await wrapper.get('.agenda-bulk-action').trigger('click')
    expect(wrapper.get(BULK_CONFIRMATION).text()).toContain('1 amigo vai')
    await wrapper.get(`${BULK_CONFIRMATION} .stamp-filled`).trigger('click')
    await flushPromises()

    const request = fetch.mock.calls.find(([path]) => path === '/api/friends/bulk-import/')
    expect(JSON.parse(String(request?.[1]?.body)).friends).toEqual([{ name: 'Bia', phone: null, birthday: null }])
    expect(wrapper.text()).toContain('2 amigos adicionados.')
  })

  it('separates confirmed creations from duplicate skips in the completion screen', async () => {
    const fetch = set_api_for_test()
    const { wrapper } = await get_completing_view_for_test()
    fetch.mockResolvedValueOnce(Response.json({ created: [{ index: 1, friend: { ...EXISTING_FRIEND, id: 'created-bia', name: 'Bia', phone: null } }], ignored: [{ index: 0, reason: 'existing_phone', friend_id: 'existing' }] }, { status: 201 }))

    await wrapper.get('.agenda-bulk-action').trigger('click')
    await wrapper.get(`${BULK_CONFIRMATION} .stamp-filled`).trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('1 amigo adicionado.')
    expect(wrapper.get('[aria-label="Amigos adicionados"]').text()).toBe('Bia')
    expect(wrapper.get('[aria-label="Amigos ignorados por telefone repetido"]').text()).toBe('Ana')
    expect(wrapper.get('[aria-label="Amigos ignorados por telefone repetido"] a').attributes('href')).toBe('/amigos/existing')
    expect(friends_state.friends.map((friend) => friend.id)).toEqual(['created-bia'])
  })

  it('keeps drafts and identifies the invalid card after a rejected batch', async () => {
    const fetch = set_api_for_test()
    const { wrapper } = await get_completing_view_for_test()
    await wrapper.get('[name="name"]').setValue('Ana guardada')
    fetch.mockResolvedValueOnce(Response.json({ type: 'validation_error', errors: [{ code: 'invalid', attr: 'friends.1.birthday', detail: 'Essa data não existe. Ex.: 12/03.' }] }, { status: 400 }))

    await wrapper.get('.agenda-bulk-action').trigger('click')
    await wrapper.get(`${BULK_CONFIRMATION} .stamp-filled`).trigger('click')
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toContain('Amigo 2 (Bia)')
    expect(wrapper.get('[role="alert"]').text()).toContain('Revise os cartões')
    expect(document.activeElement).toBe(wrapper.get('[role="alert"]').element)
    expect(wrapper.get<HTMLInputElement>('[name="name"]').element.value).toBe('Ana guardada')
    expect(agenda_import_state.saved_friends).toHaveLength(0)
    expect(wrapper.get(BULK_CONFIRMATION).attributes('open')).toBeUndefined()
  })

  it('does not retry an unconfirmed batch after a network failure', async () => {
    const fetch = set_api_for_test()
    const { wrapper } = await get_completing_view_for_test()
    fetch.mockRejectedValueOnce(new TypeError('Connection lost'))

    await wrapper.get('.agenda-bulk-action').trigger('click')
    await wrapper.get(`${BULK_CONFIRMATION} .stamp-filled`).trigger('click')
    await flushPromises()
    await flushPromises()

    expect(fetch.mock.calls.filter(([path]) => path === '/api/friends/bulk-import/')).toHaveLength(1)
    expect(wrapper.get('[role="alert"]').text()).toContain('Não foi possível confirmar a importação')
    expect(wrapper.get('[role="alert"]').text()).toContain('Confira a lista de amigos')
    expect(agenda_import_state.step).toBe(AgendaImportStep.COMPLETE)
    expect(agenda_import_state.is_busy).toBe(false)
  })

  it('offers a smaller selection after a body-size rejection', async () => {
    const fetch = set_api_for_test()
    const { wrapper } = await get_completing_view_for_test()
    fetch.mockResolvedValueOnce(new Response('Request Entity Too Large', { status: 413 }))

    await wrapper.get('.agenda-bulk-action').trigger('click')
    await wrapper.get(`${BULK_CONFIRMATION} .stamp-filled`).trigger('click')
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toContain('selecione menos amigos')
    expect(document.activeElement).toBe(wrapper.get('[role="alert"]').element)
    expect(agenda_import_state.saved_friends).toHaveLength(0)
  })

  it('does not turn an incomplete API response into a success count', async () => {
    const fetch = set_api_for_test()
    const { wrapper } = await get_completing_view_for_test()
    fetch.mockResolvedValueOnce(Response.json({ created: [], ignored: [] }, { status: 201 }))

    await wrapper.get('.agenda-bulk-action').trigger('click')
    await wrapper.get(`${BULK_CONFIRMATION} .stamp-filled`).trigger('click')
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toContain('Não foi possível confirmar a importação')
    expect(agenda_import_state.saved_friends).toHaveLength(0)
  })

  it('prevents double submission, cancellation and navigation while a batch is pending', async () => {
    const fetch = set_api_for_test()
    const { wrapper, router } = await get_completing_view_for_test()
    let complete_import!: (response: Response) => void
    fetch.mockImplementationOnce(() => new Promise<Response>((complete) => { complete_import = complete }))

    await wrapper.get('.agenda-bulk-action').trigger('click')
    await wrapper.get(`${BULK_CONFIRMATION} .stamp-filled`).trigger('click')
    await wrapper.get(`${BULK_CONFIRMATION} .stamp-filled`).trigger('click')
    await wrapper.get(BULK_CONFIRMATION).trigger('cancel')
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await router.push('/amigos')

    expect(fetch.mock.calls.filter(([path]) => path === '/api/friends/bulk-import/')).toHaveLength(1)
    expect(wrapper.get(BULK_CONFIRMATION).attributes('open')).toBeDefined()
    expect(router.currentRoute.value.path).toBe('/amigos/importar')
    complete_import(Response.json({ created: [0, 1].map((index) => ({ index, friend: { ...EXISTING_FRIEND, id: `created-${index}` } })), ignored: [] }, { status: 201 }))
    await flushPromises()
    expect(wrapper.text()).toContain('2 amigos adicionados.')
    expect(agenda_import_state.is_busy).toBe(false)
  })
})
