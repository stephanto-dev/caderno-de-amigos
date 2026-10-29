import { afterEach, describe, expect, it, vi } from 'vitest'
import { get_friend_for_board, get_groups_for_form, send_contact_deletion_for_friend, send_contact_for_friend, send_friend_creation_for_owner, send_friend_update_for_owner, send_group_creation_for_owner, send_group_update_for_owner } from './friends'

const RECORDED_CONTACT = {
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Bruno',
  cadence_amount: 3,
  cadence_unit: 'week',
  column: 'just_talked',
  birthday: null,
  is_birthday_today: false,
  last_contact_at: '2026-10-27T15:00:00Z',
  last_note: 'Conversamos sobre a viagem',
  groups: [],
  contact_id: '00000000-0000-4000-8000-000000000002',
}

describe('Contact registration API', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    document.cookie = 'csrftoken=; Max-Age=0'
  })

  it('sends the kind and note with CSRF and returns the updated friend and contact ID', async () => {
    document.cookie = 'csrftoken=contact-token'
    const fetch = vi.fn().mockResolvedValue(Response.json(RECORDED_CONTACT, { status: 201 }))
    vi.stubGlobal('fetch', fetch)

    const recorded_contact = await send_contact_for_friend(RECORDED_CONTACT.id, {
      kind: 'call', note: RECORDED_CONTACT.last_note,
    })

    expect(fetch).toHaveBeenCalledExactlyOnceWith(`/api/friends/${RECORDED_CONTACT.id}/contacts/`, {
      method: 'POST',
      body: JSON.stringify({ kind: 'call', note: RECORDED_CONTACT.last_note }),
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-CSRFToken': 'contact-token' },
    })
    expect(recorded_contact).toEqual(RECORDED_CONTACT)
  })

  it('rejects a response without the contact ID needed to undo registration', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({
      ...RECORDED_CONTACT, contact_id: null,
    }, { status: 201 })))

    await expect(send_contact_for_friend(RECORDED_CONTACT.id, { kind: 'message', note: '' }))
      .rejects.toThrow('Invalid recorded contact response')
  })

  it('preserves standardized validation errors for the form to display', async () => {
    const detail = 'Selecione um tipo de contato válido.'
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({
      type: 'validation_error', errors: [{ code: 'invalid_choice', detail, attr: 'kind' }],
    }, { status: 400 })))

    await expect(send_contact_for_friend(RECORDED_CONTACT.id, { kind: 'meeting', note: '' }))
      .rejects.toMatchObject({ status: 400, message: detail, field: 'kind' })
  })

  it('deletes the identified contact with CSRF and accepts an empty 204 response', async () => {
    document.cookie = 'csrftoken=undo-token'
    const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetch)

    await send_contact_deletion_for_friend(RECORDED_CONTACT.id, RECORDED_CONTACT.contact_id)

    expect(fetch).toHaveBeenCalledExactlyOnceWith(
      `/api/friends/${RECORDED_CONTACT.id}/contacts/${RECORDED_CONTACT.contact_id}/`,
      { method: 'DELETE', credentials: 'include', headers: { 'X-CSRFToken': 'undo-token' } },
    )
  })

  it('fetches and validates one current friend for the board', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(Response.json(RECORDED_CONTACT))
      .mockResolvedValueOnce(Response.json({ id: RECORDED_CONTACT.id }))
    vi.stubGlobal('fetch', fetch)

    expect(await get_friend_for_board(RECORDED_CONTACT.id)).toEqual(RECORDED_CONTACT)
    expect(fetch).toHaveBeenCalledWith(`/api/friends/${RECORDED_CONTACT.id}/`, expect.objectContaining({ credentials: 'include' }))
    await expect(get_friend_for_board(RECORDED_CONTACT.id)).rejects.toThrow('Invalid board friend response')
  })
})

describe('Friend writing API', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('sends and returns the birthday supplied by Django', async () => {
    const friend_data = {
      name: 'Bruno', cadence_amount: 1, cadence_unit: 'month' as const, birthday: '29/02',
    }
    const saved_friend = { ...RECORDED_CONTACT, ...friend_data, is_birthday_today: true }
    const fetch = vi.fn().mockResolvedValue(Response.json(saved_friend, { status: 201 }))
    vi.stubGlobal('fetch', fetch)

    expect(await send_friend_creation_for_owner(friend_data)).toEqual(saved_friend)
    expect(fetch).toHaveBeenCalledExactlyOnceWith('/api/friends/', expect.objectContaining({
      method: 'POST', body: JSON.stringify(friend_data),
    }))
  })

  it('sends null to clear a birthday when editing', async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json(RECORDED_CONTACT))
    vi.stubGlobal('fetch', fetch)

    const saved_friend = await send_friend_update_for_owner(RECORDED_CONTACT.id, { birthday: null })

    expect(saved_friend.birthday).toBeNull()
    expect(fetch).toHaveBeenCalledExactlyOnceWith(`/api/friends/${RECORDED_CONTACT.id}/`, expect.objectContaining({
      method: 'PATCH', body: JSON.stringify({ birthday: null }),
    }))
  })

  it.each([undefined, 1203])('rejects a response with a missing or invalid birthday: %s', async (birthday) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ ...RECORDED_CONTACT, birthday })))

    await expect(get_friend_for_board(RECORDED_CONTACT.id)).rejects.toThrow('Invalid board friend response')
  })

  it.each([undefined, 'false', null])('rejects a response with a missing or nonboolean birthday flag: %s', async (is_birthday_today) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ ...RECORDED_CONTACT, is_birthday_today })))

    await expect(get_friend_for_board(RECORDED_CONTACT.id)).rejects.toThrow('Invalid board friend response')
  })

  it('creates a friend with group IDs and returns the board fields supplied by Django', async () => {
    const friend_data = {
      name: 'Bruno', cadence_amount: 1, cadence_unit: 'month' as const,
      groups: ['00000000-0000-4000-8000-000000000003'],
    }
    const saved_friend = {
      ...RECORDED_CONTACT, ...friend_data, column: 'overdue',
      groups: [{ id: friend_data.groups[0], name: 'Faculdade', color: 'college' }],
    }
    const fetch = vi.fn().mockResolvedValue(Response.json(saved_friend, { status: 201 }))
    vi.stubGlobal('fetch', fetch)

    expect(await send_friend_creation_for_owner(friend_data)).toEqual(saved_friend)
    expect(fetch).toHaveBeenCalledExactlyOnceWith('/api/friends/', expect.objectContaining({
      method: 'POST', body: JSON.stringify(friend_data),
    }))
  })

  it('sends only supplied fields when editing a friend', async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json({ ...RECORDED_CONTACT, name: 'Bruno Silva' }))
    vi.stubGlobal('fetch', fetch)

    const saved_friend = await send_friend_update_for_owner(RECORDED_CONTACT.id, { name: 'Bruno Silva' })

    expect(saved_friend.name).toBe('Bruno Silva')
    expect(fetch).toHaveBeenCalledExactlyOnceWith(`/api/friends/${RECORDED_CONTACT.id}/`, expect.objectContaining({
      method: 'PATCH', body: JSON.stringify({ name: 'Bruno Silva' }),
    }))
  })

  it('preserves the validation field and message returned by Django', async () => {
    const detail = 'Certifique-se de que este valor seja maior ou igual a 1.'
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({
      type: 'validation_error', errors: [{ code: 'min_value', detail, attr: 'cadence_amount' }],
    }, { status: 400 })))

    await expect(send_friend_creation_for_owner({ name: 'Bruno', cadence_amount: 0, cadence_unit: 'month' }))
      .rejects.toMatchObject({ status: 400, message: detail, field: 'cadence_amount' })
  })

  it('rejects an incomplete creation response even when HTTP reports success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ id: RECORDED_CONTACT.id }, { status: 201 })))

    await expect(send_friend_creation_for_owner({ name: 'Bruno', cadence_amount: 1, cadence_unit: 'month' }))
      .rejects.toThrow('Invalid board friend response')
  })

  it('rejects an invalid cadence in the update response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ ...RECORDED_CONTACT, cadence_unit: 'invalid' })))

    await expect(send_friend_update_for_owner(RECORDED_CONTACT.id, { cadence_unit: 'month' }))
      .rejects.toThrow('Invalid board friend response')
  })
})

describe('Group management API', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('creates a group using its English color token and returns the saved group', async () => {
    const saved_group = { id: '00000000-0000-4000-8000-000000000003', name: 'Escalada', color: 'neighborhood', friends_count: 0 }
    const fetch = vi.fn().mockResolvedValue(Response.json(saved_group, { status: 201 }))
    vi.stubGlobal('fetch', fetch)

    expect(await send_group_creation_for_owner({ name: 'Escalada', color: 'neighborhood' })).toEqual(saved_group)
    expect(fetch).toHaveBeenCalledExactlyOnceWith('/api/groups/', expect.objectContaining({
      method: 'POST', body: JSON.stringify({ name: 'Escalada', color: 'neighborhood' }),
    }))
  })

  it('rejects a group response with an unsupported color', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ id: 'group-id', name: 'Escalada', color: 'purple' })))

    await expect(send_group_creation_for_owner({ name: 'Escalada', color: 'neutral' }))
      .rejects.toThrow('Invalid group response')
  })

  it('rejects a list without the friend counts required by deletion confirmation', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json([
      { id: 'group-id', name: 'Escalada', color: 'neutral' },
    ])))

    await expect(get_groups_for_form()).rejects.toThrow('Invalid group counts response')
  })

  it('rejects a negative friend count returned after editing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({
      id: 'group-id', name: 'Escalada', color: 'neutral', friends_count: -1,
    })))

    await expect(send_group_update_for_owner('group-id', { name: 'Escalada' }))
      .rejects.toThrow('Invalid group response')
  })
})
