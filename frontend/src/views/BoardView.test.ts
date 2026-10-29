import { enableAutoUnmount, flushPromises, mount, RouterLinkStub } from '@vue/test-utils'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import BoardView from './BoardView.vue'

enableAutoUnmount(afterEach)

// jsdom has no modal dialog implementation; browser checks cover native focus behavior.
beforeAll(() => {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value(this: HTMLDialogElement) { this.open = true },
  })
})
afterAll(() => {
  Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal')
})

const FRIEND_WITH_GROUPS = {
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Bruno',
  column: 'overdue',
  cadence_amount: 3,
  cadence_unit: 'week',
  birthday: null,
  is_birthday_today: false,
  last_contact_at: null,
  last_note: 'Perguntar sobre a viagem',
  groups: [
    { id: '00000000-0000-4000-8000-000000000002', name: 'Escalada', color: 'neighborhood' },
    { id: '00000000-0000-4000-8000-000000000003', name: 'Faculdade', color: 'college' },
  ],
}

const RECORDED_CONTACT = {
  ...FRIEND_WITH_GROUPS,
  column: 'just_talked',
  last_contact_at: '2026-10-27T15:00:00Z',
  last_note: 'Falamos da viagem',
  contact_id: '00000000-0000-4000-8000-000000000004',
  contact: { id: '00000000-0000-4000-8000-000000000004', kind: 'call', date: '2026-10-27T15:00:00Z', note: 'Falamos da viagem' },
}

function set_fetch_for_board_test(friend_fetch: (path: string, options?: RequestInit) => unknown, groups: unknown[] = []): void {
  vi.stubGlobal('fetch', (path: string, options?: RequestInit) => path === '/api/groups/'
    ? Promise.resolve(Response.json(groups))
    : friend_fetch(path, options))
}

describe('Board', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('shows the birthday stamp only for the API flag and keeps contact registration available', async () => {
    const friends = [
      { ...FRIEND_WITH_GROUPS, birthday: '29/02', is_birthday_today: true },
      { ...FRIEND_WITH_GROUPS, id: '00000000-0000-4000-8000-000000000009', name: 'Ana', birthday: '29/10' },
    ]
    set_fetch_for_board_test(vi.fn().mockResolvedValue(Response.json(friends)))
    const wrapper = mount(BoardView, { global: { stubs: { RouterLink: RouterLinkStub } } })
    await flushPromises()

    const cards = wrapper.findAll('.friend-postit')
    expect(wrapper.findAll('.birthday-stamp')).toHaveLength(1)
    expect(cards[0]!.get('.birthday-stamp').text()).toBe('Aniversário hoje')
    expect(cards[0]!.attributes('aria-labelledby')).toBe(`friend-${friends[0]!.id} birthday-${friends[0]!.id}`)
    expect(cards[0]!.get('.birthday-stamp svg').attributes('aria-hidden')).toBe('true')
    expect(cards[1]!.find('.birthday-stamp').exists()).toBe(false)
    expect(cards[1]!.attributes('aria-labelledby')).toBe(`friend-${friends[1]!.id}`)

    await cards[0]!.get('button').trigger('click')
    expect(wrapper.get('dialog[open]').text()).toContain('Falei com Bruno')
  })

  it('expands a collapsed mobile section through an accessible button', async () => {
    const friends = ['Bruno', 'Ana', 'Teresa'].map((name, index) => ({
      ...FRIEND_WITH_GROUPS,
      id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
      name,
      column: 'on_track',
    }))
    set_fetch_for_board_test(vi.fn().mockResolvedValue(Response.json(friends)))
    const wrapper = mount(BoardView, { global: { stubs: { RouterLink: RouterLinkStub } } })
    await flushPromises()

    const button = wrapper.get('button[aria-controls="friends-on_track"]')
    expect(button.attributes('aria-expanded')).toBe('false')
    expect(button.text()).toContain('Bruno, Ana e mais 1')
    await button.trigger('click')

    expect(button.attributes('aria-expanded')).toBe('true')
    expect(wrapper.get('#friends-on_track').classes()).not.toContain('mobile-collapsed')
    await button.trigger('click')
    expect(button.attributes('aria-expanded')).toBe('false')
    expect(wrapper.get('#friends-on_track').classes()).toContain('mobile-collapsed')
  })

  it('shows loading without claiming that the board is empty', () => {
    set_fetch_for_board_test(vi.fn().mockReturnValue(new Promise(() => {})))
    const wrapper = mount(BoardView)

    expect(wrapper.get('[role="status"]').text()).toContain('Carregando')
    expect(wrapper.findAll('.board-skeleton')).toHaveLength(8)
    expect(wrapper.text()).not.toContain('Seu quadro está em branco.')
  })

  it('invites the user to add a friend after receiving an empty list', async () => {
    set_fetch_for_board_test(vi.fn().mockResolvedValue(Response.json([])))
    const wrapper = mount(BoardView, { global: { stubs: { RouterLink: RouterLinkStub } } })

    await flushPromises()

    expect(wrapper.find('[role="status"][aria-busy="true"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('Seu quadro está em branco.')
    expect(wrapper.text()).not.toContain('Cada amigo vira um post-it aqui.')
    expect(wrapper.getComponent(RouterLinkStub).props('to')).toBe('/amigos/novo')
  })

  it('shows a friend note, cadence and named groups using the first group color', async () => {
    set_fetch_for_board_test(vi.fn().mockResolvedValue(Response.json([FRIEND_WITH_GROUPS])))
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

  it('opens the chosen friend contact sheet without writing a contact', async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json([FRIEND_WITH_GROUPS]))
    set_fetch_for_board_test(fetch)
    const wrapper = mount(BoardView, { global: { stubs: { RouterLink: RouterLinkStub } } })
    await flushPromises()

    await wrapper.get('button[aria-label="Falei agora com Bruno"]').trigger('click')

    expect(wrapper.get('dialog[open]').text()).toContain('Falei com Bruno')
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(wrapper.get('section[aria-labelledby="column-overdue"]').text()).toContain('Bruno')
  })

  it('submits the contact and updates the friend in the column returned by Django', async () => {
    const updated_friend = {
      ...FRIEND_WITH_GROUPS, column: 'just_talked', last_note: 'Falamos da viagem',
      last_contact_at: '2026-10-27T15:00:00Z',
      contact_id: '00000000-0000-4000-8000-000000000004',
      contact: { id: '00000000-0000-4000-8000-000000000004', kind: 'call', date: '2026-10-27T15:00:00Z', note: 'Falamos da viagem' },
    }
    const fetch = vi.fn()
      .mockResolvedValueOnce(Response.json([FRIEND_WITH_GROUPS]))
      .mockResolvedValueOnce(Response.json(updated_friend, { status: 201 }))
    set_fetch_for_board_test(fetch)
    const wrapper = mount(BoardView, { global: { stubs: { RouterLink: RouterLinkStub } } })
    await flushPromises()

    await wrapper.get('button[aria-label="Falei agora com Bruno"]').trigger('click')
    await wrapper.get('input[value="call"]').setValue()
    await wrapper.get('textarea').setValue(updated_friend.last_note)
    await wrapper.get('dialog form').trigger('submit')
    await flushPromises()

    expect(fetch).toHaveBeenLastCalledWith(`/api/friends/${FRIEND_WITH_GROUPS.id}/contacts/`, expect.objectContaining({
      method: 'POST', body: JSON.stringify({ kind: 'call', note: updated_friend.last_note }),
    }))
    expect(wrapper.find('dialog').exists()).toBe(false)
    expect(wrapper.get('[data-column="overdue"]').text()).not.toContain('Bruno')
    expect(wrapper.get('[data-column="just_talked"]').text()).toContain(updated_friend.last_note)
    expect(wrapper.get('[role="status"]').text()).toContain('Contato registrado')
  })

  it('keeps the note and sheet open after a standardized validation error', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(Response.json([FRIEND_WITH_GROUPS]))
      .mockResolvedValueOnce(Response.json({
        type: 'validation_error',
        errors: [{ code: 'invalid_choice', detail: 'Selecione um tipo válido.', attr: 'kind' }],
      }, { status: 400 }))
    set_fetch_for_board_test(fetch)
    const wrapper = mount(BoardView, { global: { stubs: { RouterLink: RouterLinkStub } } })
    await flushPromises()

    await wrapper.get('button[aria-label="Falei agora com Bruno"]').trigger('click')
    await wrapper.get('textarea').setValue('Não perder esta nota')
    await wrapper.get('dialog form').trigger('submit')
    await flushPromises()

    expect(wrapper.get('dialog[open] [role="alert"]').text()).toContain('Selecione um tipo válido.')
    expect(wrapper.get('[role="alert"]').text()).toContain('Tente novamente')
    expect(wrapper.get<HTMLTextAreaElement>('textarea').element.value).toBe('Não perder esta nota')
    expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeUndefined()
    expect(wrapper.get('[data-column="overdue"]').text()).toContain('Bruno')
  })

  it('sends only one POST while a contact registration is pending', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(Response.json([FRIEND_WITH_GROUPS]))
      .mockReturnValue(new Promise<Response>(() => {}))
    set_fetch_for_board_test(fetch)
    const wrapper = mount(BoardView, { global: { stubs: { RouterLink: RouterLinkStub } } })
    await flushPromises()

    await wrapper.get('button[aria-label="Falei agora com Bruno"]').trigger('click')
    await wrapper.get('dialog form').trigger('submit')
    await wrapper.get('dialog form').trigger('submit')

    expect(fetch).toHaveBeenCalledTimes(2)
    expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('button[type="submit"]').attributes('aria-busy')).toBe('true')
  })

  it('explains what to do when the friend no longer exists', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(Response.json([FRIEND_WITH_GROUPS]))
      .mockResolvedValueOnce(Response.json({
        type: 'client_error', errors: [{ code: 'not_found', detail: 'Not found.', attr: null }],
      }, { status: 404 }))
    set_fetch_for_board_test(fetch)
    const wrapper = mount(BoardView, { global: { stubs: { RouterLink: RouterLinkStub } } })
    await flushPromises()

    await wrapper.get('button[aria-label="Falei agora com Bruno"]').trigger('click')
    await wrapper.get('dialog form').trigger('submit')
    await flushPromises()

    expect(wrapper.get('dialog[open] [role="alert"]').text()).toContain('Este amigo não está mais disponível')
    expect(wrapper.get('[role="alert"]').text()).toContain('Atualize os dados deste amigo')
  })

  it('preserves the draft without claiming failure or success when the POST response is lost', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(Response.json([FRIEND_WITH_GROUPS]))
      .mockRejectedValueOnce(new Error('Network unavailable'))
    set_fetch_for_board_test(fetch)
    const wrapper = mount(BoardView, { global: { stubs: { RouterLink: RouterLinkStub } } })
    await flushPromises()
    await wrapper.get('button[aria-label="Falei agora com Bruno"]').trigger('click')
    await wrapper.get('textarea').setValue('Minha nota')

    await wrapper.get('dialog form').trigger('submit')
    await flushPromises()

    expect(wrapper.get('dialog[open] [role="alert"]').text()).toContain('Não conseguimos confirmar o registro')
    expect(wrapper.get<HTMLTextAreaElement>('textarea').element.value).toBe('Minha nota')
    expect(wrapper.get('[role="status"]').text()).not.toContain('Contato registrado')
  })

  it('asks before discarding a note and cancels without creating a contact', async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json([FRIEND_WITH_GROUPS]))
    set_fetch_for_board_test(fetch)
    const wrapper = mount(BoardView, { global: { stubs: { RouterLink: RouterLinkStub } } })
    await flushPromises()

    await wrapper.get('button[aria-label="Falei agora com Bruno"]').trigger('click')
    await wrapper.get('textarea').setValue('Minha nota')
    await wrapper.get('button[aria-label="Fechar"]').trigger('click')

    expect(wrapper.get('dialog').text()).toContain('Descartar nota?')
    await wrapper.get('button[name="keep-note"]').trigger('click')
    expect(wrapper.get<HTMLTextAreaElement>('textarea').element.value).toBe('Minha nota')
    await wrapper.get('button[aria-label="Fechar"]').trigger('click')
    await wrapper.get('button[name="discard-note"]').trigger('click')

    expect(wrapper.find('dialog').exists()).toBe(false)
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('undoes the returned contact ID and applies a fresh friend instead of the old snapshot', async () => {
    const fresh_friend = { ...FRIEND_WITH_GROUPS, column: 'on_track', last_note: 'Nota mais recente de outra aba' }
    const fetch = vi.fn()
      .mockResolvedValueOnce(Response.json([FRIEND_WITH_GROUPS]))
      .mockResolvedValueOnce(Response.json(RECORDED_CONTACT, { status: 201 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(Response.json(fresh_friend))
    set_fetch_for_board_test(fetch)
    const wrapper = mount(BoardView, { global: { stubs: { RouterLink: RouterLinkStub } } })
    await flushPromises()
    await wrapper.get('button[aria-label="Falei agora com Bruno"]').trigger('click')
    await wrapper.get('dialog form').trigger('submit')
    await flushPromises()

    await wrapper.get('button[name="undo-contact"]').trigger('click')
    await flushPromises()

    expect(fetch).toHaveBeenNthCalledWith(3,
      `/api/friends/${FRIEND_WITH_GROUPS.id}/contacts/${RECORDED_CONTACT.contact_id}/`,
      expect.objectContaining({ method: 'DELETE' }),
    )
    expect(fetch).toHaveBeenLastCalledWith(`/api/friends/${FRIEND_WITH_GROUPS.id}/`, expect.anything())
    expect(wrapper.get('[data-column="on_track"]').text()).toContain(fresh_friend.last_note)
    expect(wrapper.get('[data-column="just_talked"]').text()).not.toContain('Bruno')
    expect(wrapper.get('[role="status"]').text()).toContain('Contato desfeito')
  })

  it('retries only the GET if deletion succeeded but refreshing the friend failed', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(Response.json([FRIEND_WITH_GROUPS]))
      .mockResolvedValueOnce(Response.json(RECORDED_CONTACT, { status: 201 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockRejectedValueOnce(new Error('Network unavailable'))
      .mockResolvedValueOnce(Response.json(FRIEND_WITH_GROUPS))
    set_fetch_for_board_test(fetch)
    const wrapper = mount(BoardView, { global: { stubs: { RouterLink: RouterLinkStub } } })
    await flushPromises()
    await wrapper.get('button[aria-label="Falei agora com Bruno"]').trigger('click')
    await wrapper.get('dialog form').trigger('submit')
    await flushPromises()

    await wrapper.get('button[name="undo-contact"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('[role="status"]').text()).toContain('O contato foi apagado')
    expect(wrapper.get('[role="status"]').text()).toContain('Tentar novamente')
    await wrapper.get('button[name="undo-contact"]').trigger('click')
    await flushPromises()

    expect(fetch.mock.calls.filter(([, options]) => options.method === 'DELETE')).toHaveLength(1)
    expect(wrapper.get('[data-column="overdue"]').text()).toContain('Bruno')
  })

  it('keeps undo available after a failed DELETE and does not announce success', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(Response.json([FRIEND_WITH_GROUPS]))
      .mockResolvedValueOnce(Response.json(RECORDED_CONTACT, { status: 201 }))
      .mockRejectedValueOnce(new Error('Network unavailable'))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(Response.json(FRIEND_WITH_GROUPS))
    set_fetch_for_board_test(fetch)
    const wrapper = mount(BoardView, { global: { stubs: { RouterLink: RouterLinkStub } } })
    await flushPromises()
    await wrapper.get('button[aria-label="Falei agora com Bruno"]').trigger('click')
    await wrapper.get('dialog form').trigger('submit')
    await flushPromises()
    await wrapper.get('button[name="undo-contact"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('[role="status"]').text()).toContain('Não conseguimos confirmar a exclusão')
    expect(wrapper.get('[role="status"]').text()).not.toContain('Contato desfeito')
    expect(wrapper.get('[data-column="just_talked"]').text()).toContain('Bruno')
    await wrapper.get('button[name="undo-contact"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('[role="status"]').text()).toContain('Contato desfeito')
  })

  it('expires undo after the short toast duration and pauses while it has focus', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    const fetch = vi.fn()
      .mockResolvedValueOnce(Response.json([FRIEND_WITH_GROUPS]))
      .mockResolvedValueOnce(Response.json(RECORDED_CONTACT, { status: 201 }))
    set_fetch_for_board_test(fetch)
    const wrapper = mount(BoardView, { global: { stubs: { RouterLink: RouterLinkStub } } })
    await flushPromises()
    await wrapper.get('button[aria-label="Falei agora com Bruno"]').trigger('click')
    await wrapper.get('dialog form').trigger('submit')
    await flushPromises()

    await wrapper.get('button[name="undo-contact"]').trigger('focusin')
    await vi.advanceTimersByTimeAsync(2400)
    expect(wrapper.find('button[name="undo-contact"]').exists()).toBe(true)
    await wrapper.get('button[name="undo-contact"]').trigger('focusout')
    await vi.advanceTimersByTimeAsync(2400)

    expect(wrapper.find('button[name="undo-contact"]').exists()).toBe(false)
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('sends only one DELETE and blocks a new sheet while undo is pending', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(Response.json([FRIEND_WITH_GROUPS]))
      .mockResolvedValueOnce(Response.json(RECORDED_CONTACT, { status: 201 }))
      .mockReturnValue(new Promise<Response>(() => {}))
    set_fetch_for_board_test(fetch)
    const wrapper = mount(BoardView, { global: { stubs: { RouterLink: RouterLinkStub } } })
    await flushPromises()
    await wrapper.get('button[aria-label="Falei agora com Bruno"]').trigger('click')
    await wrapper.get('dialog form').trigger('submit')
    await flushPromises()

    await wrapper.get('button[name="undo-contact"]').trigger('click')
    await wrapper.get('button[name="undo-contact"]').trigger('click')
    await wrapper.get('button[aria-label="Falei agora com Bruno"]').trigger('click')

    expect(fetch).toHaveBeenCalledTimes(3)
    expect(wrapper.find('dialog').exists()).toBe(false)
    expect(wrapper.get('button[name="undo-contact"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('button[aria-label="Falei agora com Bruno"]').attributes('disabled')).toBeDefined()
  })

  it('refreshes the friend if the contact was already removed without claiming to have deleted it', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(Response.json([FRIEND_WITH_GROUPS]))
      .mockResolvedValueOnce(Response.json(RECORDED_CONTACT, { status: 201 }))
      .mockResolvedValueOnce(Response.json({ errors: [{ code: 'not_found', detail: 'Not found.' }] }, { status: 404 }))
      .mockResolvedValueOnce(Response.json(FRIEND_WITH_GROUPS))
    set_fetch_for_board_test(fetch)
    const wrapper = mount(BoardView, { global: { stubs: { RouterLink: RouterLinkStub } } })
    await flushPromises()
    await wrapper.get('button[aria-label="Falei agora com Bruno"]').trigger('click')
    await wrapper.get('dialog form').trigger('submit')
    await flushPromises()

    await wrapper.get('button[name="undo-contact"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-column="overdue"]').text()).toContain('Bruno')
    expect(wrapper.get('[role="status"]').text()).toContain('O contato já não está disponível')
    expect(wrapper.get('[role="status"]').text()).not.toContain('Contato desfeito')
  })

  it('removes a friend from the board if it disappeared before the undo refresh', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(Response.json([FRIEND_WITH_GROUPS]))
      .mockResolvedValueOnce(Response.json(RECORDED_CONTACT, { status: 201 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(Response.json({ errors: [{ code: 'not_found', detail: 'Not found.' }] }, { status: 404 }))
    set_fetch_for_board_test(fetch)
    const wrapper = mount(BoardView, { global: { stubs: { RouterLink: RouterLinkStub } } })
    await flushPromises()
    await wrapper.get('button[aria-label="Falei agora com Bruno"]').trigger('click')
    await wrapper.get('dialog form').trigger('submit')
    await flushPromises()

    await wrapper.get('button[name="undo-contact"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('.friend-postit').exists()).toBe(false)
    expect(wrapper.get('[role="status"]').text()).toContain('Este amigo não está mais disponível')
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
    set_fetch_for_board_test(vi.fn().mockResolvedValue(Response.json([friend])))
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
    set_fetch_for_board_test(fetch)
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
    set_fetch_for_board_test(vi.fn().mockResolvedValue(Response.json([{ id: 'incomplete' }])))
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
      birthday: null,
      is_birthday_today: false,
      last_contact_at: null,
      last_note: null,
      groups: [],
    }))
    const fetch = vi.fn().mockResolvedValue(Response.json(friends))
    set_fetch_for_board_test(fetch)
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
