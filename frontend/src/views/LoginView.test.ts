import login_source from './LoginView.vue?raw'
import { mount, flushPromises } from '@vue/test-utils'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { auth_state } from '../auth'
import { install_auth_guard_for_router, routes } from '../router'
import LoginView from './LoginView.vue'

describe('account cover', () => {
  beforeEach(() => {
    auth_state.current_user = null
    auth_state.current_email = null
    auth_state.is_initialized = false
    auth_state.error = null
    auth_state.error_field = null
    auth_state.is_loading = false
  })
  afterEach(() => vi.unstubAllGlobals())

  it('uses the accessible cover error color for messages and underline strokes', () => {
    expect(login_source).toContain('class="field-error"')
    expect(login_source).toContain('class="form-error"')
    expect(login_source).toMatch(/\.field-error, \.form-error \{[^}]*color: var\(--primary-800\)/)
    expect(login_source.match(/linear-gradient\(var\(--primary-800\), var\(--primary-800\)\)/g)).toHaveLength(2)
    expect(login_source).not.toContain('var(--error)')
  })

  it('logs in by email and opens the board', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(Response.json({ authenticated: false, user: null, email: null }))
      .mockResolvedValueOnce(Response.json({ authenticated: true, user: 'ana@example.com', email: 'ana@example.com' })))
    const router = createRouter({ history: createMemoryHistory(), routes })
    install_auth_guard_for_router(router)
    await router.push('/entrar')
    const wrapper = mount(LoginView, { global: { plugins: [router] } })

    await wrapper.get('input[name="email"]').setValue('ana@example.com')
    await wrapper.get('input[name="password"]').setValue('senha-segura')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(auth_state.current_email).toBe('ana@example.com')
    expect(router.currentRoute.value.path).toBe('/quadro')
  })

  it('creates an account and opens the board', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(Response.json({ authenticated: false, user: null, email: null }))
      .mockResolvedValueOnce(Response.json({ authenticated: true, user: 'ana@example.com', email: 'ana@example.com' }, { status: 201 })))
    const router = createRouter({ history: createMemoryHistory(), routes })
    install_auth_guard_for_router(router)
    await router.push('/entrar?modo=criar')
    const wrapper = mount(LoginView, { global: { plugins: [router] } })

    await wrapper.get('input[name="email"]').setValue('ana@example.com')
    await wrapper.get('input[name="password"]').setValue('senha-segura')
    await wrapper.get('input[name="password_confirm"]').setValue('senha-segura')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(auth_state.current_email).toBe('ana@example.com')
    expect(router.currentRoute.value.path).toBe('/quadro')
  })

  it('disables account fields and announces loading until login finishes', async () => {
    let finish_login!: (response: Response) => void
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise<Response>((complete) => { finish_login = complete })))
    const router = createRouter({ history: createMemoryHistory(), routes })
    await router.push('/entrar')
    const wrapper = mount(LoginView, { global: { plugins: [router] } })

    await wrapper.get('input[name="email"]').setValue('ana@example.com')
    await wrapper.get('input[name="password"]').setValue('senha-segura')
    await wrapper.get('form').trigger('submit')

    expect(wrapper.get('fieldset').attributes('disabled')).toBeDefined()
    expect(wrapper.get('button[type="submit"]').attributes('aria-busy')).toBe('true')
    expect(wrapper.get('button[type="submit"]').text()).toBe('Entrando…')

    finish_login(Response.json({ detail: 'E-mail ou senha incorretos.' }, { status: 401 }))
    await flushPromises()

    expect(wrapper.get('fieldset').attributes('disabled')).toBeUndefined()
    expect(wrapper.get('button[type="submit"]').attributes('aria-busy')).toBe('false')
    expect(wrapper.get<HTMLInputElement>('input[name="email"]').element.value).toBe('ana@example.com')
    wrapper.unmount()
  })

  it('links a register error to the affected field', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(Response.json({ authenticated: false, user: null, email: null }))
      .mockResolvedValueOnce(Response.json({
        type: 'validation_error',
        errors: [{ code: 'invalid', detail: 'Este e-mail já tem conta.', attr: 'email' }],
      }, { status: 400 })))
    const router = createRouter({ history: createMemoryHistory(), routes })
    install_auth_guard_for_router(router)
    await router.push('/entrar?modo=criar')
    const wrapper = mount(LoginView, { global: { plugins: [router] } })

    await wrapper.get('input[name="email"]').setValue('ana@example.com')
    await wrapper.get('input[name="password"]').setValue('senha-segura')
    await wrapper.get('input[name="password_confirm"]').setValue('senha-segura')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toBe('Este e-mail já tem conta.')
    expect(wrapper.get('input[name="email"]').attributes('aria-invalid')).toBe('true')
    expect(wrapper.get('input[name="email"]').attributes('aria-describedby')).toBe('email-error')
  })
})
