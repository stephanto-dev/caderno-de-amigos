import { enableAutoUnmount, flushPromises, mount, RouterLinkStub } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import FriendsView from './FriendsView.vue'

const FRIENDS = [
  { id: '00000000-0000-4000-8000-000000000001', name: 'Ana Lima', cadence_amount: 1, cadence_unit: 'month', column: 'on_track', birthday: null, is_birthday_today: false, last_contact_at: '2026-10-25T15:00:00Z', last_note: null, groups: [] },
  { id: '00000000-0000-4000-8000-000000000002', name: 'Bruno', cadence_amount: 2, cadence_unit: 'week', column: 'overdue', birthday: null, is_birthday_today: false, last_contact_at: null, last_note: null, groups: [] },
]
const MOUNT_OPTIONS = { global: { stubs: { RouterLink: RouterLinkStub } } }

enableAutoUnmount(afterEach)

describe('Friends list', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('filters names without case sensitivity or extra requests and links to the profile', async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json(FRIENDS))
    vi.stubGlobal('fetch', fetch)
    const wrapper = mount(FriendsView, MOUNT_OPTIONS)
    await flushPromises()

    expect(wrapper.get('h1').classes()).toContain('view-title')
    expect(wrapper.get('h1').classes()).not.toContain('sr-only')
    expect(wrapper.findAll('li')).toHaveLength(2)
    expect(wrapper.text()).toContain('último contato: 25/10/2026')
    expect(wrapper.text()).toContain('ainda não registrado')
    await wrapper.get('input[type="search"]').setValue('  aNA  ')

    expect(wrapper.findAll('li')).toHaveLength(1)
    expect(wrapper.get('li').text()).toContain('Ana Lima')
    expect(wrapper.get('li').getComponent(RouterLinkStub).props('to')).toBe(`/amigos/${FRIENDS[0].id}`)
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('shows loading before the request finishes', () => {
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise<Response>(() => {})))
    const wrapper = mount(FriendsView, MOUNT_OPTIONS)

    expect(wrapper.get('[role="status"]').text()).toContain('Carregando')
    expect(wrapper.text()).not.toContain('Seu caderno ainda não tem amigos.')
  })

  it('offers adding a friend when the list is empty', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json([])))
    const wrapper = mount(FriendsView, MOUNT_OPTIONS)
    await flushPromises()

    expect(wrapper.text()).toContain('Seu caderno ainda não tem amigos.')
    expect(wrapper.getComponent(RouterLinkStub).props('to')).toBe('/amigos/novo')
  })

  it('explains when no name matches the search', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(FRIENDS)))
    const wrapper = mount(FriendsView, MOUNT_OPTIONS)
    await flushPromises()
    await wrapper.get('input[type="search"]').setValue('Teresa')

    expect(wrapper.findAll('li')).toHaveLength(0)
    expect(wrapper.get('[role="status"]').text()).toContain('ninguém com “Teresa” por aqui.')
    expect(wrapper.text()).toContain('adicionar Teresa')
  })

  it('offers retry after a failed request', async () => {
    const fetch = vi.fn().mockRejectedValueOnce(new Error('Offline'))
      .mockResolvedValueOnce(Response.json(FRIENDS))
    vi.stubGlobal('fetch', fetch)
    const wrapper = mount(FriendsView, MOUNT_OPTIONS)
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toContain('Verifique sua conexão')
    await wrapper.get('button').trigger('click')
    await flushPromises()

    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(wrapper.findAll('li')).toHaveLength(2)
  })
})
