import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import FriendHistory from './FriendHistory.vue'
import type { BoardFriend, FriendContact } from '../api/friends'
import { send_contact_deletion_for_friend } from '../api/friends'

const FRIEND: BoardFriend = {
  id: 'friend-ana', name: 'Ana', cadence_amount: 3, cadence_unit: 'week',
  birthday: null, is_birthday_today: false, column: 'on_track',
  last_contact_at: null, last_note: null, groups: [],
}
const CONTACT: FriendContact = { id: 'contact-one', kind: 'meeting', date: '2026-10-29T15:00:00Z', note: 'Uma nota inteira\ncom outra linha.' }
const OLDER_CONTACT: FriendContact = { id: 'contact-two', kind: 'call', date: '2025-12-20T15:00:00Z', note: '' }
const NEW_CONTACT: FriendContact = { id: 'contact-new', kind: 'message', date: '2026-10-29T16:00:00Z', note: 'Nota salva pelo servidor' }

enableAutoUnmount(afterEach)
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers() })

function get_history_for_test() {
  return mount(FriendHistory, { props: { friend: FRIEND, newest_contact: null }, attachTo: document.body })
}

function get_pending_page_for_test() {
  let finish_request: (response: Response) => void = () => { throw new Error('Request not started') }
  const response = new Promise<Response>((complete) => { finish_request = complete })
  return { response, finish_request }
}

describe('Friend history', () => {
  it('shows four skeletons without blocking the profile and leaves initial focus unchanged', async () => {
    const pending = get_pending_page_for_test()
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(pending.response))
    const initial_focus = document.activeElement
    const wrapper = get_history_for_test()

    expect(wrapper.get('section').attributes('aria-busy')).toBe('true')
    expect(wrapper.findAll('.history-skeleton li')).toHaveLength(4)
    expect(wrapper.get('[role="status"]').text()).toBe('Carregando o histórico…')
    pending.finish_request(Response.json({ next: null, results: [CONTACT] }))
    await flushPromises()

    expect(document.activeElement).toBe(initial_focus)
    expect(wrapper.get('section').attributes('aria-busy')).toBe('false')
  })

  it('renders server order, full notes, all kinds and dates in São Paulo including another year', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2027-01-01T01:00:00Z')) // Still 2026 in São Paulo.
    const midnight_contact = { ...NEW_CONTACT, date: '2027-01-01T01:00:00Z' }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ next: null, results: [midnight_contact, CONTACT, OLDER_CONTACT] })))
    const wrapper = get_history_for_test()
    await flushPromises()

    expect(wrapper.findAll('li').map((item) => item.attributes('data-contact-id')))
      .toEqual([NEW_CONTACT.id, CONTACT.id, OLDER_CONTACT.id])
    expect(wrapper.findAll('time').map((time) => time.text())).toEqual(['31/dez', '29/out', '20/dez/2025'])
    expect(wrapper.get('time').attributes('title')).toContain('22:00')
    expect(wrapper.findAll('.history-kind').map((kind) => kind.text())).toEqual(['mensagem', 'encontro', 'ligação'])
    expect(wrapper.findAll('.history-note')[1].element.textContent).toBe(CONTACT.note)
    expect(wrapper.get('.history-no-note').text()).toBe('sem nota')
    expect(wrapper.find('.history-footer').exists()).toBe(false)
    expect(wrapper.find('.history-end').exists()).toBe(false)
  })

  it('appends older pages once, deduplicates ids, focuses the first new item and announces the end', async () => {
    const pending = get_pending_page_for_test()
    const fetch = vi.fn().mockResolvedValueOnce(Response.json({ next: 'next=20+', results: [CONTACT] }))
      .mockReturnValueOnce(pending.response)
    vi.stubGlobal('fetch', fetch)
    const wrapper = get_history_for_test()
    await flushPromises()
    await wrapper.get('button').trigger('click')
    await wrapper.get('button').trigger('click')

    expect(fetch).toHaveBeenCalledTimes(2)
    expect(wrapper.get('button').text()).toBe('carregando…')
    expect(wrapper.get('button').attributes('aria-disabled')).toBe('true')
    expect(wrapper.findAll('.history-item')).toHaveLength(1)
    pending.finish_request(Response.json({ next: null, results: [CONTACT, OLDER_CONTACT, OLDER_CONTACT] }))
    await flushPromises()

    expect(fetch).toHaveBeenLastCalledWith('/api/friends/friend-ana/contacts/?cursor=next%3D20%2B', expect.any(Object))
    expect(wrapper.findAll('.history-item')).toHaveLength(2)
    expect(document.activeElement).toBe(wrapper.findAll('.history-item')[1].element)
    expect(wrapper.get('[role="status"]').text()).toBe('Mais 1 contato carregado. Esse é o primeiro contato.')
    expect(wrapper.find('button').exists()).toBe(false)
    expect(wrapper.get('.history-end').text()).toBe('é isso, esse foi o primeiro contato.')
  })

  it('announces the number of new contacts while more pages remain', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(Response.json({ next: 'page-two', results: [NEW_CONTACT] }))
      .mockResolvedValueOnce(Response.json({ next: 'page-three', results: [CONTACT, OLDER_CONTACT] })))
    const wrapper = get_history_for_test()
    await flushPromises()
    await wrapper.get('button').trigger('click')
    await flushPromises()

    expect(wrapper.get('[role="status"]').text()).toBe('Mais 2 contatos carregados.')
    expect(wrapper.get('button').text()).toBe('ver mais antigos')
  })

  it('shows an empty history and turns it into a list using the saved contact without fetching again', async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json({ next: null, results: [] }))
    vi.stubGlobal('fetch', fetch)
    const wrapper = get_history_for_test()
    await flushPromises()
    expect(wrapper.get('.history-empty').text()).toBe('nenhum contato ainda. que tal registrar o primeiro?')
    expect(wrapper.get('.history-empty-hint').text()).toContain('aqui em cima')
    await wrapper.setProps({ newest_contact: NEW_CONTACT })

    expect(wrapper.find('.history-empty').exists()).toBe(false)
    expect(wrapper.get('.history-note').text()).toBe(NEW_CONTACT.note)
    expect(wrapper.get('.history-item').classes()).toContain('history-item--new')
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('preserves a registration during the first request and deduplicates it in the response', async () => {
    const pending = get_pending_page_for_test()
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(pending.response))
    const wrapper = get_history_for_test()
    await wrapper.setProps({ newest_contact: NEW_CONTACT })
    pending.finish_request(Response.json({ next: 'cursor', results: [NEW_CONTACT, CONTACT] }))
    await flushPromises()

    expect(wrapper.findAll('.history-item').map((item) => item.attributes('data-contact-id'))).toEqual([NEW_CONTACT.id, CONTACT.id])
  })

  it('prepends a registration without changing the cursor and deduplicates it on the next page', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(Response.json({ next: 'original-cursor', results: [CONTACT] }))
      .mockResolvedValueOnce(Response.json({ next: null, results: [NEW_CONTACT, OLDER_CONTACT] }))
    vi.stubGlobal('fetch', fetch)
    const wrapper = get_history_for_test()
    await flushPromises()
    await wrapper.setProps({ newest_contact: NEW_CONTACT })
    await wrapper.get('button').trigger('click')
    await flushPromises()

    expect(fetch).toHaveBeenLastCalledWith('/api/friends/friend-ana/contacts/?cursor=original-cursor', expect.any(Object))
    expect(wrapper.findAll('.history-item').map((item) => item.attributes('data-contact-id'))).toEqual([NEW_CONTACT.id, CONTACT.id, OLDER_CONTACT.id])
  })

  it('retries the first page after an error and keeps a locally saved contact', async () => {
    const fetch = vi.fn().mockRejectedValueOnce(new Error('Offline'))
      .mockResolvedValueOnce(Response.json({ next: null, results: [NEW_CONTACT, CONTACT] }))
    vi.stubGlobal('fetch', fetch)
    const wrapper = get_history_for_test()
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain('Não deu pra abrir o histórico agora.')
    await wrapper.setProps({ newest_contact: NEW_CONTACT })
    expect(wrapper.get('.history-note').text()).toBe(NEW_CONTACT.note)
    await wrapper.get('button').trigger('click')
    await flushPromises()

    expect(fetch).toHaveBeenLastCalledWith('/api/friends/friend-ana/contacts/', expect.any(Object))
    expect(wrapper.findAll('.history-item')).toHaveLength(2)
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })

  it('keeps loaded notes after an older-page failure and retries the same cursor with focus on retry', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(Response.json({ next: 'same-cursor', results: [CONTACT] }))
      .mockRejectedValueOnce(new Error('Offline'))
      .mockResolvedValueOnce(Response.json({ next: null, results: [OLDER_CONTACT] }))
    vi.stubGlobal('fetch', fetch)
    const wrapper = get_history_for_test()
    await flushPromises()
    await wrapper.get('button').trigger('click')
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toContain('Não deu pra trazer os mais antigos.')
    expect(wrapper.get('.history-note').element.textContent).toBe(CONTACT.note)
    expect(document.activeElement).toBe(wrapper.get('button').element)
    await wrapper.get('button').trigger('click')
    await flushPromises()

    expect(fetch.mock.calls[1][0]).toBe(fetch.mock.calls[2][0])
    expect(wrapper.findAll('.history-item')).toHaveLength(2)
  })

  it('reloads the history without a contact undone through the board deletion endpoint while away', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(Response.json({ next: null, results: [CONTACT] }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(Response.json({ next: null, results: [] }))
    vi.stubGlobal('fetch', fetch)
    const first_visit = get_history_for_test()
    await flushPromises()
    expect(first_visit.get('.history-item').attributes('data-contact-id')).toBe(CONTACT.id)
    first_visit.unmount()

    await send_contact_deletion_for_friend(FRIEND.id, CONTACT.id)
    const next_visit = get_history_for_test()
    await flushPromises()

    expect(next_visit.find('.history-item').exists()).toBe(false)
    expect(next_visit.find('.history-empty').exists()).toBe(true)
    expect(fetch).toHaveBeenCalledTimes(3)
  })

  it('ignores the old history response after switching the keyed friend profile', async () => {
    const pending = get_pending_page_for_test()
    vi.stubGlobal('fetch', vi.fn().mockReturnValueOnce(pending.response)
      .mockResolvedValueOnce(Response.json({ next: null, results: [OLDER_CONTACT] })))
    const wrapper = mount({
      components: { FriendHistory },
      data: () => ({ friend: FRIEND }),
      template: '<FriendHistory :key="friend.id" :friend="friend" :newest_contact="null" />',
    })
    await wrapper.setData({ friend: { ...FRIEND, id: 'other-friend', name: 'Bruno' } })
    await flushPromises()
    pending.finish_request(Response.json({ next: 'old-cursor', results: [CONTACT] }))
    await flushPromises()

    expect(wrapper.get('ol').attributes('aria-label')).toContain('Bruno')
    expect(wrapper.findAll('.history-item').map((item) => item.attributes('data-contact-id'))).toEqual([OLDER_CONTACT.id])
    expect(wrapper.find('button').exists()).toBe(false)
  })
})
