import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import FriendDetailView from './FriendDetailView.vue'
import FriendsView from './FriendsView.vue'
import { friends_state } from '../friends'

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
  afterEach(() => { vi.unstubAllGlobals(); friends_state.friends = [] })

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

  it('edits the prefilled friend and updates the profile and list without navigation', async () => {
    const saved_friend = { ...FRIEND, name: 'Ana Silva', cadence_amount: 2 }
    const fetch = vi.fn().mockResolvedValueOnce(Response.json(FRIEND))
      .mockResolvedValueOnce(Response.json(FRIEND.groups.map((group) => ({ ...group, friends_count: 1 }))))
      .mockResolvedValueOnce(Response.json(saved_friend))
    vi.stubGlobal('fetch', fetch)
    const { wrapper, router } = await get_profile_for_test()
    await flushPromises()
    friends_state.friends = [{ ...FRIEND, cadence_unit: 'week', column: 'on_track', groups: [] }]
    await wrapper.get('button[name="edit-friend"]').trigger('click')
    await flushPromises()

    expect(wrapper.get<HTMLInputElement>('input[name="name"]').element.value).toBe(FRIEND.name)
    expect(wrapper.get<HTMLInputElement>('input[name="cadence_unit"][value="week"]').element.checked).toBe(true)
    expect(wrapper.get('button.group-chip').attributes('aria-pressed')).toBe('true')
    await wrapper.get('input[name="name"]').setValue(saved_friend.name)
    await wrapper.get('input[name="cadence_amount"]').setValue(2)
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(fetch).toHaveBeenLastCalledWith(`/api/friends/${FRIEND.id}/`, expect.objectContaining({
      method: 'PATCH', body: JSON.stringify({ name: 'Ana Silva', cadence_amount: 2, cadence_unit: 'week', groups: [FRIEND.groups[0]!.id] }),
    }))
    expect(wrapper.get('h1').text()).toBe('Ana Silva')
    expect(wrapper.text()).toContain('a cada 2 semanas')
    expect(wrapper.find('form').exists()).toBe(false)
    expect(friends_state.friends[0]?.name).toBe('Ana Silva')
    expect(router.currentRoute.value.path).toBe(`/amigos/${FRIEND.id}`)
  })

  it('keeps the edited fields and links a rejected group to the group picker', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(Response.json(FRIEND))
      .mockResolvedValueOnce(Response.json(FRIEND.groups.map((group) => ({ ...group, friends_count: 1 }))))
      .mockResolvedValueOnce(Response.json({ type: 'validation_error', errors: [
        { code: 'does_not_exist', attr: 'groups', detail: 'Este grupo não está disponível.' },
      ] }, { status: 400 })))
    const { wrapper } = await get_profile_for_test()
    await flushPromises()
    await wrapper.get('button[name="edit-friend"]').trigger('click')
    await flushPromises()
    await wrapper.get('input[name="name"]').setValue('Ana Silva')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.get<HTMLInputElement>('input[name="name"]').element.value).toBe('Ana Silva')
    expect(wrapper.get('#friend-groups-error').text()).toContain('Este grupo não está disponível.')
    expect(wrapper.get('.friend-groups').attributes('aria-invalid')).toBe('true')
    expect(wrapper.get('h1').text()).toBe(FRIEND.name)
  })

  it('cancels a friend edit without sending a patch', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(Response.json(FRIEND)).mockResolvedValueOnce(Response.json([]))
    vi.stubGlobal('fetch', fetch)
    const { wrapper } = await get_profile_for_test()
    await flushPromises()
    await wrapper.get('button[name="edit-friend"]').trigger('click')
    await flushPromises()
    await wrapper.get('input[name="name"]').setValue('Outro nome')
    await wrapper.get('button[name="cancel-friend-edit"]').trigger('click')

    expect(wrapper.get('h1').text()).toBe(FRIEND.name)
    expect(wrapper.find('form').exists()).toBe(false)
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('deletes only after confirmation, removes the friend from the list and returns there', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(Response.json(FRIEND)).mockResolvedValueOnce(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetch)
    const { wrapper, router } = await get_profile_for_test()
    await flushPromises()
    friends_state.friends = [{ ...FRIEND, cadence_unit: 'week', column: 'on_track', groups: [] }]

    await wrapper.get('button[name="delete-friend"]').trigger('click')
    expect(wrapper.get('[role="alert"]').text()).toContain('contatos')
    expect(fetch).toHaveBeenCalledTimes(1)
    await wrapper.get('button[name="confirm-delete-friend"]').trigger('click')
    await flushPromises()

    expect(fetch).toHaveBeenLastCalledWith(`/api/friends/${FRIEND.id}/`, expect.objectContaining({ method: 'DELETE' }))
    expect(friends_state.friends).toEqual([])
    expect(router.currentRoute.value.path).toBe('/amigos')
  })

  it('cancels friend deletion without contacting the deletion endpoint', async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json(FRIEND))
    vi.stubGlobal('fetch', fetch)
    const { wrapper } = await get_profile_for_test()
    await flushPromises()
    await wrapper.get('button[name="delete-friend"]').trigger('click')
    await wrapper.get('button[name="cancel-delete-friend"]').trigger('click')

    expect(wrapper.find('button[name="confirm-delete-friend"]').exists()).toBe(false)
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('keeps the profile and permits retrying a failed deletion', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(Response.json(FRIEND))
      .mockRejectedValueOnce(new TypeError('Failed to fetch')))
    const { wrapper, router } = await get_profile_for_test()
    await flushPromises()
    await wrapper.get('button[name="delete-friend"]').trigger('click')
    await wrapper.get('button[name="confirm-delete-friend"]').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Não foi possível apagar o amigo.')
    expect(wrapper.get('button[name="confirm-delete-friend"]').attributes('disabled')).toBeUndefined()
    expect(router.currentRoute.value.path).toBe(`/amigos/${FRIEND.id}`)
  })

  it('keeps a saved group rename when the friend edit is cancelled', async () => {
    const group = { ...FRIEND.groups[0], name: 'Universidade', color: 'work', friends_count: 1 }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(Response.json(FRIEND))
      .mockResolvedValueOnce(Response.json(FRIEND.groups.map((group) => ({ ...group, friends_count: 1 }))))
      .mockResolvedValueOnce(Response.json(group)))
    const { wrapper } = await get_profile_for_test()
    await flushPromises()
    await wrapper.get('button[name="edit-friend"]').trigger('click')
    await flushPromises()
    await wrapper.get('input[name="name"]').setValue('Nome ainda não salvo')
    await wrapper.get('button[name="edit-groups"]').trigger('click')
    await wrapper.get('button.group-chip').trigger('click')
    await wrapper.get('input[name="group_name"]').setValue(group.name)
    await wrapper.get('input[name="group_color"][value="work"]').setValue(true)
    await wrapper.get('button[name="save-group"]').trigger('click')
    await flushPromises()
    expect(wrapper.get<HTMLInputElement>('input[name="name"]').element.value).toBe('Nome ainda não salvo')
    await wrapper.get('button[name="cancel-friend-edit"]').trigger('click')

    expect(wrapper.get('h1').text()).toBe(FRIEND.name)
    expect(wrapper.get('.profile-groups .group-work').text()).toBe(group.name)
  })

  it('does not leave a different profile when an earlier deletion finishes late', async () => {
    let finish_deletion: (response: Response) => void = () => { throw new Error('Deletion not started') }
    const pending_deletion = new Promise<Response>((complete) => { finish_deletion = complete })
    const fetch = vi.fn().mockResolvedValueOnce(Response.json(FRIEND))
      .mockReturnValueOnce(pending_deletion)
      .mockResolvedValueOnce(Response.json(OTHER_FRIEND))
    vi.stubGlobal('fetch', fetch)
    const { wrapper, router } = await get_profile_for_test()
    await flushPromises()
    await wrapper.get('button[name="delete-friend"]').trigger('click')
    await wrapper.get('button[name="confirm-delete-friend"]').trigger('click')
    await wrapper.get('button[name="confirm-delete-friend"]').trigger('click')
    expect(fetch).toHaveBeenCalledTimes(2)

    await router.push(`/amigos/${OTHER_FRIEND.id}`)
    await flushPromises()
    finish_deletion(new Response(null, { status: 204 }))
    await flushPromises()

    expect(wrapper.get('h1').text()).toBe(OTHER_FRIEND.name)
    expect(wrapper.find('button[name="confirm-delete-friend"]').exists()).toBe(false)
    expect(wrapper.get('button[name="delete-friend"]').attributes('disabled')).toBeUndefined()
    expect(router.currentRoute.value.path).toBe(`/amigos/${OTHER_FRIEND.id}`)
  })

  it('keeps a confirmed group deletion when the friend edit is cancelled', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(Response.json(FRIEND))
      .mockResolvedValueOnce(Response.json(FRIEND.groups.map((group) => ({ ...group, friends_count: 1 }))))
      .mockResolvedValueOnce(new Response(null, { status: 204 })))
    const { wrapper } = await get_profile_for_test()
    await flushPromises()
    await wrapper.get('button[name="edit-friend"]').trigger('click')
    await flushPromises()
    await wrapper.get('button[name="edit-groups"]').trigger('click')
    await wrapper.get('button.group-chip').trigger('click')
    await wrapper.get('button[name="delete-group"]').trigger('click')
    await wrapper.get('button[name="confirm-delete-group"]').trigger('click')
    await flushPromises()
    await wrapper.get('button[name="cancel-friend-edit"]').trigger('click')

    expect(wrapper.get('h1').text()).toBe(FRIEND.name)
    expect(wrapper.get('.profile-groups').text()).toBe('sem grupo')
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
