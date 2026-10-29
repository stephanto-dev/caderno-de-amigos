import group_picker_source from './GroupPicker.vue?raw'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { friends_state } from '../friends'
import GroupPicker from './GroupPicker.vue'

const EXISTING_GROUP = { id: '00000000-0000-4000-8000-000000000003', name: 'Faculdade', color: 'college', friends_count: 2 }
const CREATED_GROUP = { id: '00000000-0000-4000-8000-000000000004', name: 'Escalada', color: 'neighborhood', friends_count: 0 }

describe('Group selection and creation', () => {
  afterEach(() => { vi.unstubAllGlobals(); friends_state.friends = [] })

  it('renders labeled native radios in 44px pills with visible focus', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json([])))
    const wrapper = mount(GroupPicker, { props: { modelValue: [] } })
    await flushPromises()
    await wrapper.get('[name="new-group"]').trigger('click')
    const choices = wrapper.findAll('label.group-color-choice')
    expect(choices.map((choice) => choice.text())).toEqual(['Pêssego', 'Amarelo', 'Azul', 'Verde', 'Creme'])
    for (const choice of choices) expect(choice.get('input').attributes('type')).toBe('radio')
    expect(group_picker_source).toMatch(/\.group-color-choice\{[^}]*height:2\.75rem;[^}]*border-radius:var\(--radius-pill\)/)
    expect(group_picker_source).toMatch(/\.group-color-choice input\{width:1\.125rem;height:1\.125rem;margin:0;accent-color:var\(--primary\)/)
    expect(group_picker_source).toContain('.group-color-choice:has(input:focus-visible){box-shadow:var(--focus-ring)}')
    expect(group_picker_source).not.toContain('.group-color-choice:has(input:checked)::before')
    wrapper.unmount()
  })

  it('loads existing groups without selecting any and emits the selected IDs', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json([EXISTING_GROUP])))
    const wrapper = mount(GroupPicker, { props: { modelValue: [] } })
    await flushPromises()

    const chip = wrapper.get('button.group-chip[aria-pressed]')
    expect(chip.attributes('aria-pressed')).toBe('false')
    await chip.trigger('click')

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([[EXISTING_GROUP.id]])
    await wrapper.setProps({ modelValue: [EXISTING_GROUP.id] })
    await chip.trigger('click')
    expect(wrapper.emitted('update:modelValue')?.[1]).toEqual([[]])
    wrapper.unmount()
  })

  it('hides the selection check while editing groups and restores it when returning to selection', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json([EXISTING_GROUP])))
    const wrapper = mount(GroupPicker, { props: { modelValue: [EXISTING_GROUP.id] } })
    await flushPromises()
    expect(wrapper.find('.selected-check').exists()).toBe(true)

    await wrapper.get('button[name="edit-groups"]').trigger('click')

    expect(wrapper.find('.selected-check').exists()).toBe(false)
    expect(wrapper.get('button.group-chip').attributes('aria-label')).toBe('Editar grupo Faculdade')
    await wrapper.get('button[name="edit-groups"]').trigger('click')

    expect(wrapper.find('.selected-check').exists()).toBe(true)
    expect(wrapper.get('button.group-chip').attributes('aria-pressed')).toBe('true')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    wrapper.unmount()
  })

  it('creates a group with its chosen color and selects it after the server saves it', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(Response.json([EXISTING_GROUP]))
      .mockResolvedValueOnce(Response.json(CREATED_GROUP, { status: 201 }))
    vi.stubGlobal('fetch', fetch)
    const wrapper = mount(GroupPicker, { props: { modelValue: [EXISTING_GROUP.id] } })
    await flushPromises()

    await wrapper.get('button[name="new-group"]').trigger('click')
    await wrapper.get('input[name="group_name"]').setValue('Escalada')
    await wrapper.get('input[name="group_color"][value="neighborhood"]').setValue(true)
    await wrapper.get('button[name="save-group"]').trigger('click')
    await flushPromises()

    expect(fetch).toHaveBeenLastCalledWith('/api/groups/', expect.objectContaining({
      method: 'POST', body: JSON.stringify({ name: 'Escalada', color: 'neighborhood' }),
    }))
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([[EXISTING_GROUP.id, CREATED_GROUP.id]])
    expect(wrapper.findAll('button.group-chip[aria-pressed]').map((chip) => chip.text())).toEqual(['Escalada', 'Faculdade'])
    expect(wrapper.find('input[name="group_name"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('keeps a duplicate name in the editor with an error linked to that field', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(Response.json([]))
      .mockResolvedValueOnce(Response.json({ type: 'validation_error', errors: [
        { code: 'invalid', attr: 'name', detail: 'Você já tem um grupo com esse nome.' },
      ] }, { status: 400 })))
    const wrapper = mount(GroupPicker, { props: { modelValue: [] }, attachTo: document.body })
    await flushPromises()

    await wrapper.get('button[name="new-group"]').trigger('click')
    await wrapper.get('input[name="group_name"]').setValue('Escalada')
    await wrapper.get('button[name="save-group"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('input[name="group_name"]').attributes()).toMatchObject({
      'aria-invalid': 'true', 'aria-describedby': 'group-name-error',
    })
    expect(wrapper.get('#group-name-error').text()).toContain('Você já tem um grupo com esse nome.')
    expect(document.activeElement).toBe(wrapper.get('input[name="group_name"]').element)
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    wrapper.unmount()
  })

  it('offers a retry when the group list fails to load', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(Response.json([EXISTING_GROUP])))
    const wrapper = mount(GroupPicker, { props: { modelValue: [] } })
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toContain('Tente novamente')
    expect(wrapper.get('button[name="retry-groups"]').classes()).toEqual(['stamp'])
    await wrapper.get('button[name="retry-groups"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('button.group-chip[aria-pressed]').text()).toBe('Faculdade')
    wrapper.unmount()
  })

  it('edits name and color without changing the selection and updates friends already on screen', async () => {
    const saved_group = { ...EXISTING_GROUP, name: 'Universidade', color: 'work' }
    friends_state.friends = [{
      id: 'friend-id', name: 'Ana', cadence_amount: 1, cadence_unit: 'month', column: 'overdue',
      birthday: null, is_birthday_today: false,
      last_contact_at: null, last_note: null, groups: [{ ...EXISTING_GROUP, color: 'college' }],
    }]
    const fetch = vi.fn().mockResolvedValueOnce(Response.json([EXISTING_GROUP]))
      .mockResolvedValueOnce(Response.json(saved_group))
    vi.stubGlobal('fetch', fetch)
    const wrapper = mount(GroupPicker, { props: { modelValue: [EXISTING_GROUP.id] } })
    await flushPromises()

    await wrapper.get('button[name="edit-groups"]').trigger('click')
    await wrapper.get('button.group-chip').trigger('click')
    expect(wrapper.get<HTMLInputElement>('input[name="group_name"]').element.value).toBe(EXISTING_GROUP.name)
    await wrapper.get('input[name="group_name"]').setValue('Universidade')
    await wrapper.get('input[name="group_color"][value="work"]').setValue(true)
    await wrapper.get('button[name="save-group"]').trigger('click')
    await flushPromises()

    expect(fetch).toHaveBeenLastCalledWith(`/api/groups/${EXISTING_GROUP.id}/`, expect.objectContaining({
      method: 'PATCH', body: JSON.stringify({ name: 'Universidade', color: 'work' }),
    }))
    expect(wrapper.get('button.group-chip').text()).toBe('Universidade')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect(friends_state.friends[0]?.groups[0]).toEqual(saved_group)
    wrapper.unmount()
  })

  it('deletes a group only after confirmation, clears its selection and keeps its friends', async () => {
    friends_state.friends = [{
      id: 'friend-id', name: 'Ana', cadence_amount: 1, cadence_unit: 'month', column: 'overdue',
      birthday: null, is_birthday_today: false,
      last_contact_at: null, last_note: null, groups: [{ ...EXISTING_GROUP, color: 'college' }],
    }]
    const fetch = vi.fn().mockResolvedValueOnce(Response.json([EXISTING_GROUP]))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetch)
    const wrapper = mount(GroupPicker, { props: { modelValue: [EXISTING_GROUP.id] } })
    await flushPromises()

    await wrapper.get('button[name="edit-groups"]').trigger('click')
    await wrapper.get('button.group-chip').trigger('click')
    await wrapper.get('button[name="delete-group"]').trigger('click')

    expect(wrapper.get('[role="alert"]').text()).toContain('2 amigos saem desse grupo, mas continuam no seu caderno.')
    expect(fetch).toHaveBeenCalledTimes(1)
    await wrapper.get('button[name="confirm-delete-group"]').trigger('click')
    await flushPromises()

    expect(fetch).toHaveBeenLastCalledWith(`/api/groups/${EXISTING_GROUP.id}/`, expect.objectContaining({ method: 'DELETE' }))
    expect(wrapper.find('button.group-chip').exists()).toBe(false)
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([[]])
    expect(friends_state.friends).toHaveLength(1)
    expect(friends_state.friends[0]?.groups).toEqual([])
    wrapper.unmount()
  })

  it('can cancel deletion and leave edit mode without changing the selected groups', async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json([CREATED_GROUP]))
    vi.stubGlobal('fetch', fetch)
    const wrapper = mount(GroupPicker, { props: { modelValue: [CREATED_GROUP.id] } })
    await flushPromises()

    await wrapper.get('button[name="edit-groups"]').trigger('click')
    await wrapper.get('button.group-chip').trigger('click')
    await wrapper.get('button[name="delete-group"]').trigger('click')
    expect(wrapper.get('[role="alert"]').text()).toContain('Nenhum amigo está nesse grupo.')
    await wrapper.get('button[name="cancel-delete-group"]').trigger('click')
    expect(wrapper.find('input[name="group_name"]').exists()).toBe(true)
    await wrapper.get('button[name="edit-groups"]').trigger('click')

    expect(wrapper.find('input[name="group_name"]').exists()).toBe(false)
    expect(wrapper.get('button.group-chip[aria-pressed="true"]').text()).toBe(CREATED_GROUP.name)
    expect(fetch).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })

  it('keeps the group and selection when deletion fails and allows retrying', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(Response.json([EXISTING_GROUP]))
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetch)
    const wrapper = mount(GroupPicker, { props: { modelValue: [EXISTING_GROUP.id] } })
    await flushPromises()
    await wrapper.get('button[name="edit-groups"]').trigger('click')
    await wrapper.get('button.group-chip').trigger('click')
    await wrapper.get('button[name="delete-group"]').trigger('click')
    await wrapper.get('button[name="confirm-delete-group"]').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Não foi possível apagar o grupo.')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect(wrapper.get('button.group-chip').text()).toBe(EXISTING_GROUP.name)
    await wrapper.get('button[name="confirm-delete-group"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('button.group-chip').exists()).toBe(false)
    wrapper.unmount()
  })

  it('preserves the original chip when a group rename is rejected as duplicate', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(Response.json([EXISTING_GROUP]))
      .mockResolvedValueOnce(Response.json({ type: 'validation_error', errors: [
        { code: 'invalid', attr: 'name', detail: 'Você já tem um grupo com esse nome.' },
      ] }, { status: 400 })))
    const wrapper = mount(GroupPicker, { props: { modelValue: [EXISTING_GROUP.id] } })
    await flushPromises()
    await wrapper.get('button[name="edit-groups"]').trigger('click')
    await wrapper.get('button.group-chip').trigger('click')
    await wrapper.get('input[name="group_name"]').setValue('Outro grupo')
    await wrapper.get('button[name="save-group"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('#group-name-error').text()).toContain('Você já tem um grupo com esse nome.')
    expect(wrapper.get('button.group-chip').text()).toBe(EXISTING_GROUP.name)
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    wrapper.unmount()
  })
})
