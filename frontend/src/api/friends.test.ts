import { afterEach, describe, expect, it, vi } from 'vitest'
import { get_friend_for_board, send_contact_deletion_for_friend, send_contact_for_friend } from './friends'

const RECORDED_CONTACT = {
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Bruno',
  cadence_amount: 3,
  cadence_unit: 'week',
  column: 'just_talked',
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
