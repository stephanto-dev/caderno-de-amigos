import { mount, flushPromises } from '@vue/test-utils'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { auth_state } from '../auth'
import { install_auth_guard_for_router, routes } from '../router'
import LoginView from './LoginView.vue'

describe('login view', () => {
  beforeEach(() => {
    auth_state.current_user = null
    auth_state.current_email = null
    auth_state.is_initialized = false
    auth_state.error = null
  })
  afterEach(() => vi.unstubAllGlobals())

  it('returns to the requested route after a successful login', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(Response.json({ authenticated: false, user: null, email: null }))
      .mockResolvedValueOnce(Response.json({ authenticated: true, user: 'ana', email: 'ana@example.com' })))
    const router = createRouter({ history: createMemoryHistory(), routes })
    install_auth_guard_for_router(router)
    await router.push('/login?redirect=/amigos')
    const wrapper = mount(LoginView, { global: { plugins: [router] } })

    await wrapper.get('input[name="username"]').setValue('ana')
    await wrapper.get('input[name="password"]').setValue('senha')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(auth_state.current_user).toBe('ana')
    expect(router.currentRoute.value.path).toBe('/amigos')
  })

  it('shows the error and stays on login after invalid credentials', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(Response.json({ authenticated: false, user: null, email: null }))
      .mockResolvedValueOnce(Response.json({
        type: 'validation_error',
        errors: [{ code: 'invalid', detail: 'Usuário ou senha inválidos.', attr: null }],
      }, { status: 400 })))
    const router = createRouter({ history: createMemoryHistory(), routes })
    install_auth_guard_for_router(router)
    await router.push('/login')
    const wrapper = mount(LoginView, { global: { plugins: [router] } })

    await wrapper.get('input[name="username"]').setValue('ana')
    await wrapper.get('input[name="password"]').setValue('errada')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('Usuário ou senha inválidos.')
    expect(router.currentRoute.value.path).toBe('/login')
  })
})
