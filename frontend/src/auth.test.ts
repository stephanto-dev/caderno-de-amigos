import { afterEach, describe, expect, it, vi } from 'vitest'

describe('browser authentication', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('loads the email from the current session', async () => {
    vi.resetModules()
    const { auth_state, get_session_for_browser } = await import('./auth')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ authenticated: true, user: 'ana', email: 'ana@example.com' })))

    await get_session_for_browser()

    expect(auth_state.current_email).toBe('ana@example.com')
  })

  it('keeps the authenticated user after login', async () => {
    vi.resetModules()
    const { auth_state, login_user_for_browser } = await import('./auth')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ authenticated: true, user: 'ana', email: 'ana@example.com' })))

    await login_user_for_browser('ana@example.com', 'senha')

    expect(auth_state.current_user).toBe('ana')
    expect(auth_state.current_email).toBe('ana@example.com')
    expect(auth_state.error).toBeNull()
  })

  it('shows the API error and keeps the visitor signed out after failed login', async () => {
    vi.resetModules()
    const { auth_state, login_user_for_browser } = await import('./auth')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({
      type: 'validation_error',
        errors: [{ code: 'invalid', detail: 'E-mail ou senha incorretos.', attr: null }],
    }, { status: 400 })))

    await login_user_for_browser('ana@example.com', 'errada')

    expect(auth_state.current_user).toBeNull()
    expect(auth_state.error).toBe('E-mail ou senha incorretos.')
  })

  it('explains in Portuguese what to do after too many login attempts', async () => {
    vi.resetModules()
    const { auth_state, login_user_for_browser } = await import('./auth')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({
      type: 'client_error',
      errors: [{ code: 'throttled', detail: 'Request was throttled.', attr: null }],
    }, { status: 429 })))

    await login_user_for_browser('ana@example.com', 'senha')

    expect(auth_state.error).toBe('Muitas tentativas. Aguarde um minuto e tente novamente.')
  })

  it('clears the user after logout', async () => {
    vi.resetModules()
    const { auth_state, login_user_for_browser, logout_user_for_browser } = await import('./auth')
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(Response.json({ authenticated: true, user: 'ana', email: 'ana@example.com' }))
      .mockResolvedValueOnce(new Response(null, { status: 204 })))
    await login_user_for_browser('ana@example.com', 'senha')

    await logout_user_for_browser()

    expect(auth_state.current_user).toBeNull()
    expect(auth_state.current_email).toBeNull()
  })

  it('registers an account and keeps its session', async () => {
    vi.resetModules()
    const { auth_state, register_user_for_browser } = await import('./auth')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ authenticated: true, user: 'ana@example.com', email: 'ana@example.com' }, { status: 201 })))

    const registered = await register_user_for_browser('ana@example.com', 'senha-segura', 'senha-segura')

    expect(registered).toBe(true)
    expect(auth_state.current_email).toBe('ana@example.com')
    expect(fetch).toHaveBeenCalledWith('/api/register/', expect.objectContaining({
      body: JSON.stringify({ email: 'ana@example.com', password: 'senha-segura', password_confirm: 'senha-segura' }),
    }))
  })
})
