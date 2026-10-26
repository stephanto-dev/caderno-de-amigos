import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { auth_state } from './auth'
import { install_auth_guard_for_router, routes } from './router'

describe('authentication guard', () => {
  beforeEach(() => {
    auth_state.current_user = null
    auth_state.current_email = null
    auth_state.is_initialized = false
    auth_state.error = null
  })
  afterEach(() => vi.unstubAllGlobals())

  it('sends a visitor to login and remembers the requested route', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ authenticated: false, user: null, email: null })))
    const router = createRouter({ history: createMemoryHistory(), routes })
    install_auth_guard_for_router(router)

    await router.push('/config')

    expect(router.currentRoute.value.path).toBe('/entrar')
    expect(router.currentRoute.value.query.redirect).toBe('/config')
  })

  it('allows a protected route when the session is authenticated', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ authenticated: true, user: 'ana', email: 'ana@example.com' })))
    const router = createRouter({ history: createMemoryHistory(), routes })
    install_auth_guard_for_router(router)

    await router.push('/amigos')

    expect(router.currentRoute.value.path).toBe('/amigos')
    expect(auth_state.current_user).toBe('ana')
  })

  it('clears a stale session when me returns forbidden', async () => {
    auth_state.current_user = 'ana'
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ detail: 'Forbidden' }, { status: 403 })))
    const router = createRouter({ history: createMemoryHistory(), routes })
    install_auth_guard_for_router(router)

    await router.push('/')

    expect(auth_state.current_user).toBeNull()
    expect(router.currentRoute.value.path).toBe('/entrar')
  })

  it('sends an authenticated user away from the cover', async () => {
    auth_state.current_user = 'ana@example.com'
    auth_state.is_initialized = true
    const router = createRouter({ history: createMemoryHistory(), routes })
    install_auth_guard_for_router(router)

    await router.push('/entrar?modo=criar')

    expect(router.currentRoute.value.path).toBe('/quadro')
  })

  it('redirects the old home URL to the board', async () => {
    auth_state.current_user = 'ana@example.com'
    auth_state.is_initialized = true
    const router = createRouter({ history: createMemoryHistory(), routes })

    await router.push('/')

    expect(router.currentRoute.value.path).toBe('/quadro')
  })
})
