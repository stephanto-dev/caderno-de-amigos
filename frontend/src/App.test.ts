import { enableAutoUnmount, mount, flushPromises } from '@vue/test-utils'
import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import App from './App.vue'
import { auth_state } from './auth'
import { install_auth_guard_for_router, routes } from './router'

enableAutoUnmount(afterEach)

describe('App navigation', () => {
  afterEach(() => {
    auth_state.current_user = null
    auth_state.current_email = null
    auth_state.is_initialized = false
    auth_state.error = null
    vi.unstubAllGlobals()
  })

  it('shows the date header on every authenticated sheet and omits it on the login cover', async () => {
    auth_state.current_user = 'ana'
    auth_state.is_initialized = true
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json([])))
    const router = createRouter({ history: createMemoryHistory(), routes })
    install_auth_guard_for_router(router)
    await router.push('/')
    const wrapper = mount(App, { global: { plugins: [router] } })

    for (const path of ['/', '/quadro', '/amigos', '/amigos/123', '/amigos/novo', '/config']) {
      await router.push(path)
      await flushPromises()

      const sheets = wrapper.findAll('.page-content')
      expect(wrapper.findAll('.cabecalho-folha')).toHaveLength(sheets.length)
      for (const sheet of sheets) {
        expect(sheet.element.firstElementChild?.classList.contains('cabecalho-folha')).toBe(true)
      }
      expect(wrapper.find('.board-date').exists()).toBe(false)
    }

    auth_state.current_user = null
    await router.push('/entrar')
    await flushPromises()

    expect(wrapper.get('h1').text()).toBe('Caderno de amigos')
    expect(wrapper.find('.cabecalho-folha').exists()).toBe(false)
  })

  it('renders the view selected by the URL', async () => {
    const router = createRouter({ history: createMemoryHistory(), routes })
    await router.push('/quadro')
    await router.isReady()
    const wrapper = mount(App, { global: { plugins: [router] } })

    expect(wrapper.get('h1').text()).toBe('Quadro')

    await router.push('/amigos')
    await flushPromises()
    expect(wrapper.get('h1').text()).toBe('Amigos')

    await router.push('/amigos/novo')
    await flushPromises()
    expect(wrapper.get('h1').text()).toBe('Novo amigo')
    expect(wrapper.get('section.page-right').attributes('aria-label')).toBe('Rascunho do novo amigo')
    expect(wrapper.get('a[aria-current="page"]').text()).toBe('amigos')

    await router.push('/amigos/123')
    await flushPromises()
    expect(wrapper.get('.page-left h1').text()).toBe('Amigos')
    expect(wrapper.get('.page-right h1').text()).toBe('Perfil do amigo')
    expect(wrapper.get('section.page-right').attributes('aria-label')).toBe('Perfil')
    expect(wrapper.get('.page-right a').attributes('href')).toBe('/amigos')
    expect(wrapper.get('a[aria-current="page"]').text()).toBe('amigos')

    await router.push('/entrar')
    await flushPromises()
    expect(wrapper.get('h1').text()).toBe('Caderno de amigos')
  })

  it('shows book pages and accessible navigation tabs', async () => {
    const router = createRouter({ history: createMemoryHistory(), routes })
    await router.push('/quadro')
    await router.isReady()
    const wrapper = mount(App, { global: { plugins: [router] } })

    expect(wrapper.find('.desk .book .page-left .paper-lined').exists()).toBe(true)
    expect(wrapper.find('.page-right').exists()).toBe(false)
    expect(wrapper.get('nav[aria-label="Seções"]').text()).toContain('quadro')
    expect(wrapper.get('nav[aria-label="Seções"]').text()).toContain('amigos')
    expect(Array.from(wrapper.findAll('nav[aria-label="Seções"] a')).map((tab) => tab.text())).toEqual([
      'quadro', 'amigos', 'config',
    ])
    expect(wrapper.get('a[aria-current="page"]').text()).toBe('quadro')

    await wrapper.get('a[href="/amigos"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/amigos')
    expect(wrapper.find('.page-right .paper-lined').exists()).toBe(true)
    expect(wrapper.get('a[aria-current="page"]').text()).toBe('amigos')
  })

  it('keeps the notebook design tokens available', () => {
    const tokens = readFileSync('src/tokens.css', 'utf8')
    expect(tokens).toContain('--notebook-line:2rem')
    expect(tokens).toContain('.paper-lined')
    expect(tokens).toContain('.spiral-v')
  })

  it('lets an authenticated user log out', async () => {
    auth_state.current_user = 'ana'
    auth_state.current_email = 'ana@example.com'
    auth_state.is_initialized = true
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })))
    const router = createRouter({ history: createMemoryHistory(), routes })
    install_auth_guard_for_router(router)
    await router.push('/config')
    const wrapper = mount(App, { global: { plugins: [router] } })

    expect(wrapper.get('h1').text()).toBe('Configurações')
    expect(wrapper.get('h1').classes()).toContain('view-title')
    expect(wrapper.get('h1').classes()).not.toContain('sr-only')
    expect(wrapper.text()).toContain('ana@example.com')
    await wrapper.get('button[name="logout"]').trigger('click')
    await flushPromises()

    expect(auth_state.current_user).toBeNull()
    expect(auth_state.current_email).toBeNull()
    expect(router.currentRoute.value.path).toBe('/entrar')
  })

  it('omits the email row when the account has no email', async () => {
    auth_state.current_user = 'ana'
    auth_state.current_email = ''
    auth_state.is_initialized = true
    const router = createRouter({ history: createMemoryHistory(), routes })
    await router.push('/config')
    const wrapper = mount(App, { global: { plugins: [router] } })

    expect(wrapper.get('h1').text()).toBe('Configurações')
    expect(wrapper.get('h1').classes()).toContain('view-title')
    expect(wrapper.get('h1').classes()).not.toContain('sr-only')
    expect(wrapper.text()).not.toContain('E-mail')
  })

  it('keeps the session visible when logout fails', async () => {
    auth_state.current_user = 'ana'
    auth_state.current_email = 'ana@example.com'
    auth_state.is_initialized = true
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network unavailable')))
    const router = createRouter({ history: createMemoryHistory(), routes })
    install_auth_guard_for_router(router)
    await router.push('/config')
    const wrapper = mount(App, { global: { plugins: [router] } })

    await wrapper.get('button[name="logout"]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/config')
    expect(wrapper.text()).toContain('ana@example.com')
    expect(wrapper.get('[role="alert"]').text()).toContain('Verifique sua conexão')
  })
})
