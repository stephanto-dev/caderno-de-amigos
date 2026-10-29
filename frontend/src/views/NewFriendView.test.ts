import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import NewFriendView from './NewFriendView.vue'

const SAVED_FRIEND = {
  id: '00000000-0000-4000-8000-000000000001', name: 'Ana',
  cadence_amount: 1, cadence_unit: 'month', column: 'overdue',
  last_contact_at: null, last_note: null, groups: [],
}

async function get_new_friend_view() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/amigos/novo', component: NewFriendView },
      { path: '/amigos', component: { template: '<div>Amigos</div>' } },
      { path: '/amigos/:id', name: 'friend-detail', component: { template: '<div>Perfil</div>' } },
    ],
  })
  await router.push('/amigos/novo')
  const wrapper = mount(NewFriendView, { global: { plugins: [router] } })
  await flushPromises()
  return { wrapper, router }
}

describe('New friend form', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('creates a friend with a monthly default cadence and opens the saved profile', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(Response.json([])).mockResolvedValue(Response.json(SAVED_FRIEND, { status: 201 }))
    vi.stubGlobal('fetch', fetch)
    const { wrapper, router } = await get_new_friend_view()

    await wrapper.get('input[name="name"]').setValue('Ana')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(fetch).toHaveBeenLastCalledWith('/api/friends/', expect.objectContaining({
      method: 'POST', body: JSON.stringify({ name: 'Ana', cadence_amount: 1, cadence_unit: 'month', groups: [] }),
    }))
    expect(router.currentRoute.value.path).toBe(`/amigos/${SAVED_FRIEND.id}`)
    wrapper.unmount()
  })

  it('submits the cadence chosen in the form', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(Response.json([])).mockResolvedValue(Response.json({ ...SAVED_FRIEND, cadence_amount: 2, cadence_unit: 'week' }, { status: 201 }))
    vi.stubGlobal('fetch', fetch)
    const { wrapper } = await get_new_friend_view()

    await wrapper.get('input[name="name"]').setValue('Ana')
    await wrapper.get('input[name="cadence_amount"]').setValue(2)
    await wrapper.get('input[name="cadence_unit"][value="week"]').setValue(true)
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(fetch).toHaveBeenCalledWith('/api/friends/', expect.objectContaining({
      body: JSON.stringify({ name: 'Ana', cadence_amount: 2, cadence_unit: 'week', groups: [] }),
    }))
    wrapper.unmount()
  })

  it('links a validation error to its field and keeps the typed name', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(Response.json([])).mockResolvedValue(Response.json({
      type: 'validation_error', errors: [{ code: 'min_value', attr: 'cadence_amount', detail: 'Escolha uma quantidade maior ou igual a 1.' }],
    }, { status: 400 })))
    const { wrapper, router } = await get_new_friend_view()

    await wrapper.get('input[name="name"]').setValue('Ana')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.get<HTMLInputElement>('input[name="name"]').element.value).toBe('Ana')
    expect(wrapper.get('input[name="cadence_amount"]').attributes()).toMatchObject({
      min: '1', 'aria-invalid': 'true', 'aria-describedby': 'friend-cadence_amount-error',
    })
    expect(wrapper.get('#friend-cadence_amount-error').text()).toContain('Escolha uma quantidade maior ou igual a 1.')
    expect(router.currentRoute.value.path).toBe('/amigos/novo')
    wrapper.unmount()
  })

  it('keeps the form available after a connection failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(Response.json([])).mockRejectedValue(new TypeError('Failed to fetch')))
    const { wrapper } = await get_new_friend_view()

    await wrapper.get('input[name="name"]').setValue('Ana')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toContain('Tente novamente')
    expect(wrapper.get<HTMLInputElement>('input[name="name"]').element.value).toBe('Ana')
    expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeUndefined()
    wrapper.unmount()
  })

  it('shows the optional groups directly and submits the selected IDs', async () => {
    const group = { id: '00000000-0000-4000-8000-000000000003', name: 'Faculdade', color: 'college', friends_count: 0 }
    const fetch = vi.fn().mockResolvedValueOnce(Response.json([group]))
      .mockResolvedValueOnce(Response.json({ ...SAVED_FRIEND, groups: [group] }, { status: 201 }))
    vi.stubGlobal('fetch', fetch)
    const { wrapper } = await get_new_friend_view()

    expect(wrapper.find('details').exists()).toBe(false)
    await wrapper.get('button.group-chip[aria-pressed]').trigger('click')
    await wrapper.get('input[name="name"]').setValue('Ana')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(fetch).toHaveBeenLastCalledWith('/api/friends/', expect.objectContaining({
      body: JSON.stringify({ name: 'Ana', cadence_amount: 1, cadence_unit: 'month', groups: [group.id] }),
    }))
    wrapper.unmount()
  })

  it('blocks friend submission while a group is being created', async () => {
    const group = { id: '00000000-0000-4000-8000-000000000003', name: 'Escalada', color: 'neutral', friends_count: 0 }
    let finish_group_creation!: (response: Response) => void
    const pending_group = new Promise<Response>((complete) => { finish_group_creation = complete })
    const fetch = vi.fn().mockResolvedValueOnce(Response.json([])).mockReturnValueOnce(pending_group)
    vi.stubGlobal('fetch', fetch)
    const { wrapper } = await get_new_friend_view()

    await wrapper.get('button[name="new-group"]').trigger('click')
    await wrapper.get('input[name="group_name"]').setValue(group.name)
    await wrapper.get('button[name="save-group"]').trigger('click')
    await wrapper.get('form').trigger('submit')

    expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeDefined()
    expect(fetch).toHaveBeenCalledTimes(2)
    finish_group_creation(Response.json(group, { status: 201 }))
    await flushPromises()
    expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeUndefined()
    expect(wrapper.get('button.group-chip[aria-pressed="true"]').text()).toBe('Escalada')
    wrapper.unmount()
  })
})
