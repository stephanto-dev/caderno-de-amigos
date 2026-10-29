import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { routes } from '../router'
import { new_friend_draft } from '../new-friend-draft'
import FriendForm from './FriendForm.vue'

describe('New friend draft', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('reflects the form without extra requests and resets on route exit and reentry', async () => {
    const fetch = vi.fn().mockImplementation(() => Promise.resolve(Response.json([
      { id: 'z', name: 'Zumba', color: 'work', friends_count: 0 },
      { id: 'a', name: 'Ágata', color: 'family', friends_count: 0 },
    ])))
    vi.stubGlobal('fetch', fetch)
    const router = createRouter({ history: createMemoryHistory(), routes })
    await router.push('/amigos/novo')
    const wrapper = mount({ template: '<RouterView /><RouterView name="detail" />' }, { global: { plugins: [router] } })
    await flushPromises()
    const draft = wrapper.get('.new-friend-draft')
    expect(draft.attributes('aria-hidden')).toBe('true')
    expect(draft.get('h1').text()).toBe('Novo amigo')
    expect(draft.get('.group-badge').text()).toBe('sem grupo')
    expect(draft.get('.profile-cadence').text()).toBe('a cada 1 mês')
    expect(draft.find('.draft-birthday').exists()).toBe(false)
    await wrapper.get('[name="name"]').setValue('  Ana  ')
    await wrapper.get('[name="cadence_amount"]').setValue(2)
    await wrapper.get('[name="cadence_unit"][value="week"]').setValue(true)
    await wrapper.get('[name="birthday"]').setValue('1203')
    for (const chip of wrapper.findAll('.group-chip')) await chip.trigger('click')
    expect(draft.get('h1').text()).toBe('Ana')
    expect(draft.get('.profile-cadence').text()).toBe('a cada 2 semanas')
    expect(draft.get('.draft-birthday').text()).toBe('Aniversário: 12/03')
    expect(draft.findAll('.group-badge').map((badge) => badge.text())).toEqual(['Ágata', 'Zumba'])
    expect(draft.find('a, button, input, [tabindex]').exists()).toBe(false)
    expect(fetch).toHaveBeenCalledTimes(1)
    await wrapper.get('[name="birthday"]').setValue('')
    expect(draft.find('.draft-birthday').exists()).toBe(false)
    await router.push('/config')
    await flushPromises()
    expect(new_friend_draft.name).toBe('')
    expect(new_friend_draft.groups).toEqual([])
    await router.push('/amigos/novo')
    await flushPromises()
    expect(wrapper.get('.new-friend-draft h1').text()).toBe('Novo amigo')
    expect(wrapper.get('.new-friend-draft .profile-cadence').text()).toBe('a cada 1 mês')
    wrapper.unmount()
  })

  it('does not publish edits of an existing friend', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json([])))
    const wrapper = mount(FriendForm, { props: { friend: {
      id: 'friend', name: 'Ana', cadence_amount: 1, cadence_unit: 'month', birthday: null,
      is_birthday_today: false, groups: [], column: 'overdue', last_contact_at: null, last_note: null,
    } } })
    await wrapper.get('[name="name"]').setValue('Marina')
    expect(new_friend_draft.name).toBe('')
    wrapper.unmount()
  })
})
