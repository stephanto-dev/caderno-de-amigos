import { afterEach, describe, expect, it, vi } from 'vitest'
import { send_api_request } from './http'

describe('HTTP client', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    document.cookie = 'csrftoken=; Max-Age=0'
  })

  it('sends the session cookie and CSRF token on writes', async () => {
    document.cookie = 'csrftoken=token%20value'
    const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetch)

    await send_api_request('/api/logout/', { method: 'POST' })

    expect(fetch).toHaveBeenCalledWith('/api/logout/', {
      method: 'POST',
      credentials: 'include',
      headers: { 'X-CSRFToken': 'token value' },
    })
  })

  it('does not send a CSRF header on reads', async () => {
    document.cookie = 'csrftoken=token'
    const fetch = vi.fn().mockResolvedValue(Response.json({ authenticated: false, user: null, email: null }))
    vi.stubGlobal('fetch', fetch)

    await send_api_request('/api/me/')

    expect(fetch).toHaveBeenCalledWith('/api/me/', {
      credentials: 'include',
      headers: {},
    })
  })

  it('sends JSON credentials with CSRF on login', async () => {
    document.cookie = 'csrftoken=token'
    const fetch = vi.fn().mockResolvedValue(Response.json({ authenticated: true, user: 'ana', email: 'ana@example.com' }))
    vi.stubGlobal('fetch', fetch)

    await send_api_request('/api/login/', {
      method: 'POST',
      body: { username: 'ana', password: 'senha' },
    })

    expect(fetch).toHaveBeenCalledWith('/api/login/', {
      method: 'POST',
      body: JSON.stringify({ username: 'ana', password: 'senha' }),
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-CSRFToken': 'token' },
    })
  })
})
