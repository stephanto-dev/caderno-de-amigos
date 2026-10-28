import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import FriendDetailView from './FriendDetailView.vue'
import FriendsView from './FriendsView.vue'

const FRIEND = {
  id: '00000000-0000-4000-8000-000000000001', name: 'Ana Lima',
  cadence_amount: 3, cadence_unit: 'week', column: 'on_track',
  last_contact_at: '2026-10-25T15:00:00Z', last_note: 'Perguntar sobre a viagem',
  groups: [{ id: '00000000-0000-4000-8000-000000000002', name: 'Faculdade', color: 'college' }],
}
const OTHER_FRIEND = { ...FRIEND, id: '00000000-0000-4000-8000-000000000003', name: 'Bruno' }
const NOT_FOUND_RESPONSE = { errors: [{ code: 'not_found', detail: 'Not found.', attr: null }] }

async function get_profile_for_test() {
  const router = createRouter({ history: createMemoryHistory(), routes: [
    { path: '/amigos', component: { template: '<p>Amigos</p>' } },
    { path: '/amigos/:id', component: FriendDetailView },
  ] })
  await router.push(`/amigos/${FRIEND.id}`)
  const wrapper = mount({ template: '<RouterView />' }, { global: { plugins: [router] } })
  return { wrapper, router }
}

enableAutoUnmount(afterEach)

// jsdom has no modal dialog implementation; browser checks cover native focus behavior.
beforeAll(() => {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value(this: HTMLDialogElement) { this.open = true },
  })
})
afterAll(() => { Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal') })

describe('Friend profile', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('shows the owned friend fields returned by Django', async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json(FRIEND))
    vi.stubGlobal('fetch', fetch)
    const { wrapper } = await get_profile_for_test()
    await flushPromises()

    expect(wrapper.get('h1').text()).toBe(FRIEND.name)
    expect(wrapper.text()).toContain('a cada 3 semanas')
    expect(wrapper.text()).toContain('Faculdade')
    expect(wrapper.text()).toContain('25/10/2026')
    expect(wrapper.text()).toContain(FRIEND.last_note)
    expect(wrapper.text()).toContain('Em dia')
    expect(fetch).toHaveBeenCalledWith(`/api/friends/${FRIEND.id}/`, expect.any(Object))
  })

  it('shows loading while the profile request is pending', async () => {
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise<Response>(() => {})))
    const { wrapper } = await get_profile_for_test()

    expect(wrapper.get('[role="status"]').text()).toContain('Carregando')
    expect(wrapper.text()).not.toContain('não encontrado')
  })

  it('explains that editing and deletion are not available yet', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(FRIEND)))
    const { wrapper } = await get_profile_for_test()
    await flushPromises()

    expect(wrapper.get('button[name="edit-friend"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('button[name="delete-friend"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('#friend-actions-help').text()).toContain('ainda não estão disponíveis')
  })

  it('explains missing contact, note and groups without blank placeholders', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({
      ...FRIEND, cadence_amount: 1, cadence_unit: 'month', groups: [], last_contact_at: null, last_note: null,
    })))
    const { wrapper } = await get_profile_for_test()
    await flushPromises()

    expect(wrapper.text()).toContain('a cada 1 mês')
    expect(wrapper.text()).toContain('sem grupo')
    expect(wrapper.text()).toContain('Nenhum contato registrado ainda.')
    expect(wrapper.text()).toContain('Nenhuma nota registrada ainda.')
  })

  it('shows the same not-found state for unavailable friends', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(NOT_FOUND_RESPONSE, { status: 404 })))
    const { wrapper } = await get_profile_for_test()
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toContain('Amigo não encontrado')
    expect(wrapper.get('[role="alert"]').text()).toContain('Volte à lista')
    expect(wrapper.get('a').attributes('href')).toBe('/amigos')
    expect(wrapper.find('dl').exists()).toBe(false)
  })

  it('allows retry after a network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new Error('Offline'))
      .mockResolvedValueOnce(Response.json(FRIEND)))
    const { wrapper } = await get_profile_for_test()
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toContain('Verifique sua conexão')
    await wrapper.get('button').trigger('click')
    await flushPromises()

    expect(wrapper.get('h1').text()).toBe(FRIEND.name)
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })

  it('fetches the next profile when the URL changes without remounting', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(Response.json(FRIEND))
      .mockResolvedValueOnce(Response.json(OTHER_FRIEND)))
    const { wrapper, router } = await get_profile_for_test()
    await flushPromises()
    await router.push(`/amigos/${OTHER_FRIEND.id}`)
    await flushPromises()

    expect(wrapper.get('h1').text()).toBe(OTHER_FRIEND.name)
  })

  it('ignores a slow response from a previously opened profile', async () => {
    let finish_first_request: (response: Response) => void = () => { throw new Error('Request not started') }
    const first_request = new Promise<Response>((complete) => { finish_first_request = complete })
    vi.stubGlobal('fetch', vi.fn().mockReturnValueOnce(first_request)
      .mockResolvedValueOnce(Response.json(OTHER_FRIEND)))
    const { wrapper, router } = await get_profile_for_test()
    await router.push(`/amigos/${OTHER_FRIEND.id}`)
    await flushPromises()
    finish_first_request(Response.json(FRIEND))
    await flushPromises()

    expect(wrapper.get('h1').text()).toBe(OTHER_FRIEND.name)
  })

  it('opens the existing contact form and applies the friend returned after saving', async () => {
    const recorded_contact = { ...FRIEND, column: 'just_talked', last_contact_at: '2026-10-28T15:00:00Z', last_note: 'Conversamos sobre a viagem', contact_id: OTHER_FRIEND.id }
    const fetch = vi.fn().mockResolvedValueOnce(Response.json(FRIEND))
      .mockResolvedValueOnce(Response.json(recorded_contact, { status: 201 }))
    vi.stubGlobal('fetch', fetch)
    const { wrapper } = await get_profile_for_test()
    await flushPromises()

    await wrapper.get('button[name="record-contact"]').trigger('click')
    expect(fetch).toHaveBeenCalledTimes(1)
    await wrapper.get('textarea').setValue(recorded_contact.last_note)
    await wrapper.get('dialog form').trigger('submit')
    await flushPromises()

    expect(wrapper.find('dialog').exists()).toBe(false)
    expect(wrapper.get('dl').text()).toContain(recorded_contact.last_note)
    expect(wrapper.get('dl').text()).toContain('28/10/2026')
    expect(wrapper.get('dl').text()).toContain('Falei agora')
    expect(wrapper.get('[role="status"]').text()).toContain('Contato registrado')
  })

  it('preserves the draft after a failed registration without announcing success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(Response.json(FRIEND))
      .mockRejectedValueOnce(new Error('Offline')))
    const { wrapper } = await get_profile_for_test()
    await flushPromises()
    await wrapper.get('button[name="record-contact"]').trigger('click')
    await wrapper.get('textarea').setValue('Não perder a nota')
    await wrapper.get('dialog form').trigger('submit')
    await flushPromises()

    expect(wrapper.get('dialog [role="alert"]').text()).toContain('Sua nota continua aqui')
    expect(wrapper.get<HTMLTextAreaElement>('textarea').element.value).toBe('Não perder a nota')
    expect(wrapper.text()).not.toContain('Contato registrado')
  })

  it('updates the last contact on the list beside the saved profile', async () => {
    const recorded_contact = { ...FRIEND, column: 'just_talked', last_contact_at: '2026-10-28T15:00:00Z', contact_id: OTHER_FRIEND.id }
    vi.stubGlobal('fetch', vi.fn((path: string, options?: RequestInit) => Promise.resolve(Response.json(
      options?.method === 'POST' ? recorded_contact : path === '/api/friends/' ? [FRIEND] : FRIEND,
    ))))
    const router = createRouter({ history: createMemoryHistory(), routes: [
      { path: '/amigos', component: FriendsView },
      { path: '/amigos/novo', component: { template: '<p>Novo amigo</p>' } },
      { path: '/amigos/:id', components: { default: FriendsView, detail: FriendDetailView } },
    ] })
    await router.push(`/amigos/${FRIEND.id}`)
    const wrapper = mount({ template: '<RouterView /><RouterView name="detail" />' }, { global: { plugins: [router] } })
    await flushPromises()
    expect(wrapper.get('li').text()).toContain('25/10/2026')

    await wrapper.get('button[name="record-contact"]').trigger('click')
    await wrapper.get('dialog form').trigger('submit')
    await flushPromises()

    expect(wrapper.get('li').text()).toContain('28/10/2026')
  })
})
