import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import BoardView from './BoardView.vue'

const FRIEND_WITH_GROUPS = {
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Bruno',
  column: 'overdue',
  cadence_amount: 3,
  cadence_unit: 'week',
  last_contact_at: null,
  last_note: 'Perguntar sobre a viagem',
  groups: [
    { id: '00000000-0000-4000-8000-000000000002', name: 'Escalada', color: 'neighborhood' },
    { id: '00000000-0000-4000-8000-000000000003', name: 'Faculdade', color: 'college' },
  ],
}

describe('Board', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('shows loading without claiming that the board is empty', () => {
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(() => {})))
    const wrapper = mount(BoardView)

    expect(wrapper.get('[role="status"]').text()).toContain('Carregando')
    expect(wrapper.findAll('.board-skeleton')).toHaveLength(8)
    expect(wrapper.text()).not.toContain('Seu quadro está em branco.')
  })

  it('invites the user to add a friend after receiving an empty list', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json([])))
    const wrapper = mount(BoardView, { global: { stubs: { RouterLink: RouterLinkStub } } })

    await flushPromises()

    expect(wrapper.find('[role="status"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('Seu quadro está em branco.')
    expect(wrapper.text()).not.toContain('Cada amigo vira um post-it aqui.')
    expect(wrapper.getComponent(RouterLinkStub).props('to')).toBe('/amigos/novo')
  })

  it('shows a friend note, cadence and named groups using the first group color', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json([FRIEND_WITH_GROUPS])))
    const wrapper = mount(BoardView, { global: { stubs: { RouterLink: RouterLinkStub } } })

    await flushPromises()

    const card = wrapper.get('li[aria-labelledby]')
    expect(card.text()).toContain('3 semanas')
    expect(card.text()).toContain('Perguntar sobre a viagem')
    expect(card.text()).toContain('Escalada')
    expect(card.text()).toContain('Faculdade')
    expect(card.classes()).toContain('group-neighborhood')
    expect(card.getComponent(RouterLinkStub).props('to')).toBe(`/amigos/${FRIEND_WITH_GROUPS.id}`)
  })

  it('emits the chosen friend when requesting the contact sheet without writing a contact', async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json([FRIEND_WITH_GROUPS]))
    vi.stubGlobal('fetch', fetch)
    const wrapper = mount(BoardView, { global: { stubs: { RouterLink: RouterLinkStub } } })
    await flushPromises()

    await wrapper.get('button[aria-label="Falei agora com Bruno"]').trigger('click')

    expect(wrapper.emitted('open-contact-sheet')).toEqual([[FRIEND_WITH_GROUPS]])
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(wrapper.get('section[aria-labelledby="column-overdue"]').text()).toContain('Bruno')
  })

  it('keeps overflowing group names available in an accessible count', async () => {
    const friend = {
      ...FRIEND_WITH_GROUPS,
      groups: [
        ...FRIEND_WITH_GROUPS.groups,
        { id: '00000000-0000-4000-8000-000000000004', name: 'Trabalho', color: 'work' },
      ],
    }
    // jsdom has no layout: simulate badges that only fit one per row.
    vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockImplementation(function (this: HTMLElement) {
      if (!this.classList.contains('friend-groups')) return 0
      return this.querySelectorAll('[data-group-id]:not([hidden])').length * 22
        + (this.querySelector('[role="img"]:not([hidden])') ? 18 : 0)
    })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json([friend])))
    const wrapper = mount(BoardView, { global: { stubs: { RouterLink: RouterLinkStub } } })

    await flushPromises()

    const overflow = wrapper.get('[role="img"]:not([hidden])')
    expect(overflow.text()).toBe('+2')
    expect(overflow.attributes('aria-label')).toContain('Faculdade, Trabalho')
  })

  it('offers a retry after a failed request and clears the error on success', async () => {
    const fetch = vi.fn()
      .mockRejectedValueOnce(new Error('Network unavailable'))
      .mockResolvedValueOnce(Response.json([]))
    vi.stubGlobal('fetch', fetch)
    const wrapper = mount(BoardView, { global: { stubs: { RouterLink: RouterLinkStub } } })

    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toContain('Não conseguimos abrir seu caderno agora.')
    await wrapper.get('button').trigger('click')
    await flushPromises()

    expect(fetch).toHaveBeenCalledTimes(2)
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('Seu quadro está em branco.')
  })

  it('shows an error when the response does not match the friend contract', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json([{ id: 'incomplete' }])))
    const wrapper = mount(BoardView)

    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toContain('Tentar de novo')
    expect(wrapper.text()).not.toContain('Seu quadro está em branco.')
  })

  it('groups friends by the API column and preserves their received order', async () => {
    const friends = [
      { name: 'Bruno', column: 'overdue' },
      { name: 'Ana', column: 'overdue' },
      { name: 'Teresa', column: 'this_week' },
      { name: 'Carlos', column: 'this_week' },
      { name: 'Marina', column: 'on_track' },
      { name: 'Daniel', column: 'on_track' },
      { name: 'Sofia', column: 'just_talked' },
      { name: 'Beatriz', column: 'just_talked' },
    ].map((friend, index) => ({
      ...friend,
      id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
      cadence_amount: 3,
      cadence_unit: 'week',
      last_contact_at: null,
      last_note: null,
      groups: [],
    }))
    const fetch = vi.fn().mockResolvedValue(Response.json(friends))
    vi.stubGlobal('fetch', fetch)
    const wrapper = mount(BoardView, { global: { stubs: { RouterLink: RouterLinkStub } } })

    await flushPromises()

    expect(fetch).toHaveBeenCalledWith('/api/friends/', expect.objectContaining({ credentials: 'include' }))
    const columns = wrapper.findAll('section[aria-labelledby]')
    expect(columns.map((column) => column.get('h2').text())).toEqual([
      'Faz um tempinho', 'Essa semana', 'Em dia', 'Falei agora',
    ])
    expect(columns.map((column) => column.findAll('h3').map((name) => name.text()))).toEqual([
      ['Bruno', 'Ana'], ['Teresa', 'Carlos'], ['Marina', 'Daniel'], ['Sofia', 'Beatriz'],
    ])
  })
})
