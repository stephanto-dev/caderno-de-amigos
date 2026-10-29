import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import NewFriendView from './NewFriendView.vue'

const SAVED_FRIEND = {
  id: '00000000-0000-4000-8000-000000000001', name: 'Ana',
  cadence_amount: 1, cadence_unit: 'month', column: 'overdue',
  birthday: null, is_birthday_today: false,
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

  it('adds the slash after the day and removes it when deleting', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json([])))
    const { wrapper } = await get_new_friend_view()
    const input = wrapper.get<HTMLInputElement>('input[name="birthday"]')

    expect(wrapper.find('.clear-birthday').exists()).toBe(false)
    expect(input.attributes()).toMatchObject({ inputmode: 'numeric', maxlength: '5', placeholder: 'dd/mm' })
    await input.setValue('12')
    expect(input.element.value).toBe('12/')

    input.element.value = '12'
    input.element.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'deleteContentBackward' }))
    await flushPromises()
    expect(input.element.value).toBe('12')
    wrapper.unmount()
  })

  it('formats pasted digits and submits the birthday without the readonly flag', async () => {
    const saved_friend = { ...SAVED_FRIEND, birthday: '12/03' }
    const fetch = vi.fn().mockResolvedValueOnce(Response.json([]))
      .mockResolvedValueOnce(Response.json(saved_friend, { status: 201 }))
    vi.stubGlobal('fetch', fetch)
    const { wrapper } = await get_new_friend_view()

    await wrapper.get('input[name="name"]').setValue('Ana')
    const input = wrapper.get<HTMLInputElement>('input[name="birthday"]')
    await input.setValue('a120345')
    expect(input.element.value).toBe('12/03')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(fetch).toHaveBeenLastCalledWith('/api/friends/', expect.objectContaining({
      body: JSON.stringify({ name: 'Ana', cadence_amount: 1, cadence_unit: 'month', groups: [], birthday: '12/03' }),
    }))
    wrapper.unmount()
  })

  it.each(['31/04', '12/3'])('submits %s for the API to validate and displays its field error without a suffix', async (birthday) => {
    const detail = 'Essa data não existe. Ex.: 12/03.'
    const fetch = vi.fn().mockResolvedValueOnce(Response.json([]))
      .mockResolvedValue(Response.json({
        type: 'validation_error', errors: [{ code: 'invalid', attr: 'birthday', detail }],
      }, { status: 400 }))
    vi.stubGlobal('fetch', fetch)
    const { wrapper, router } = await get_new_friend_view()

    await wrapper.get('input[name="name"]').setValue('Ana')
    const input = wrapper.get<HTMLInputElement>('input[name="birthday"]')
    await input.setValue(birthday)
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(JSON.parse(fetch.mock.calls[1]![1].body).birthday).toBe(birthday)
    expect(input.attributes()).toMatchObject({ 'aria-invalid': 'true', 'aria-describedby': 'friend-birthday-error' })
    expect(wrapper.get('#friend-birthday-error').text()).toBe(detail)
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
    expect(input.element.value).toBe(birthday)
    expect(router.currentRoute.value.path).toBe('/amigos/novo')

    await input.setValue('')
    expect(wrapper.find('#friend-birthday-error').exists()).toBe(false)
    expect(input.attributes('aria-invalid')).toBeUndefined()
    expect(input.attributes('aria-describedby')).toBeUndefined()
    expect(wrapper.find('.clear-birthday').exists()).toBe(false)
    wrapper.unmount()
  })

  it('creates a friend with a monthly default cadence and opens the saved profile', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(Response.json([])).mockResolvedValue(Response.json(SAVED_FRIEND, { status: 201 }))
    vi.stubGlobal('fetch', fetch)
    const { wrapper, router } = await get_new_friend_view()

    await wrapper.get('input[name="name"]').setValue('Ana')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(fetch).toHaveBeenLastCalledWith('/api/friends/', expect.objectContaining({
      method: 'POST', body: JSON.stringify({ name: 'Ana', cadence_amount: 1, cadence_unit: 'month', groups: [], birthday: null }),
    }))
    expect(router.currentRoute.value.path).toBe(`/amigos/${SAVED_FRIEND.id}`)
    wrapper.unmount()
  })

  it('disables the form and announces saving until the request finishes', async () => {
    let finish_creation!: (response: Response) => void
    const pending_creation = new Promise<Response>((complete) => { finish_creation = complete })
    const fetch = vi.fn().mockResolvedValueOnce(Response.json([])).mockReturnValueOnce(pending_creation)
    vi.stubGlobal('fetch', fetch)
    const { wrapper } = await get_new_friend_view()

    await wrapper.get('input[name="name"]').setValue('Ana')
    await wrapper.get('form').trigger('submit')

    expect(wrapper.get('.friend-fields').attributes('disabled')).toBeDefined()
    expect(wrapper.get('button[type="submit"]').attributes()).toMatchObject({ 'aria-busy': 'true', disabled: '' })
    expect(wrapper.get('button[type="submit"]').text()).toBe('Salvando…')

    finish_creation(Response.json({
      type: 'validation_error', errors: [{ code: 'invalid', attr: 'name', detail: 'Revise o nome.' }],
    }, { status: 400 }))
    await flushPromises()

    expect(wrapper.get('.friend-fields').attributes('disabled')).toBeUndefined()
    expect(wrapper.get('button[type="submit"]').attributes('aria-busy')).toBe('false')
    expect(wrapper.get('button[type="submit"]').text()).toBe('Salvar amigo')
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
      body: JSON.stringify({ name: 'Ana', cadence_amount: 2, cadence_unit: 'week', groups: [], birthday: null }),
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
      body: JSON.stringify({ name: 'Ana', cadence_amount: 1, cadence_unit: 'month', groups: [group.id], birthday: null }),
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
