import { afterEach, describe, expect, it, vi } from 'vitest'

describe('browser authentication', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('keeps the authenticated user after login', async () => {
    vi.resetModules()
    const { auth_state, login_user_for_browser } = await import('./auth')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ authenticated: true, user: 'ana' })))

    await login_user_for_browser('ana', 'senha')

    expect(auth_state.current_user).toBe('ana')
    expect(auth_state.error).toBeNull()
  })

  it('shows the API error and keeps the visitor signed out after failed login', async () => {
    vi.resetModules()
    const { auth_state, login_user_for_browser } = await import('./auth')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({
      type: 'validation_error',
      errors: [{ code: 'invalid', detail: 'Usuário ou senha inválidos.', attr: null }],
    }, { status: 400 })))

    await login_user_for_browser('ana', 'errada')

    expect(auth_state.current_user).toBeNull()
    expect(auth_state.error).toBe('Usuário ou senha inválidos.')
  })

  it('explains in Portuguese what to do after too many login attempts', async () => {
    vi.resetModules()
    const { auth_state, login_user_for_browser } = await import('./auth')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({
      type: 'client_error',
      errors: [{ code: 'throttled', detail: 'Request was throttled.', attr: null }],
    }, { status: 429 })))

    await login_user_for_browser('ana', 'senha')

    expect(auth_state.error).toBe('Muitas tentativas. Aguarde um minuto e tente novamente.')
  })

  it('clears the user after logout', async () => {
    vi.resetModules()
    const { auth_state, login_user_for_browser, logout_user_for_browser } = await import('./auth')
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(Response.json({ authenticated: true, user: 'ana' }))
      .mockResolvedValueOnce(new Response(null, { status: 204 })))
    await login_user_for_browser('ana', 'senha')

    await logout_user_for_browser()

    expect(auth_state.current_user).toBeNull()
  })
})
