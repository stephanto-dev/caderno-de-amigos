import { mount, flushPromises } from '@vue/test-utils'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import App from './App.vue'
import { routes } from './router'

describe('App navigation', () => {
  it('renders the view selected by the URL', async () => {
    const router = createRouter({ history: createMemoryHistory(), routes })
    await router.push('/')
    await router.isReady()
    const wrapper = mount(App, { global: { plugins: [router] } })

    expect(wrapper.get('h1').text()).toBe('Quadro')

    await router.push('/amigos')
    await flushPromises()
    expect(wrapper.get('h1').text()).toBe('Amigos')

    await router.push('/amigos/novo')
    await flushPromises()
    expect(wrapper.get('h1').text()).toBe('Novo amigo')

    await router.push('/amigos/123')
    await flushPromises()
    expect(wrapper.get('.page-left h1').text()).toBe('Amigos')
    expect(wrapper.get('.page-right h1').text()).toBe('Perfil do amigo')
    expect(wrapper.get('.page-right a').attributes('href')).toBe('/amigos')
    expect(wrapper.get('a[aria-current="page"]').text()).toBe('Amigos')

    await router.push('/login')
    await flushPromises()
    expect(wrapper.get('h1').text()).toBe('Entrar')
  })

  it('shows book pages and accessible navigation tabs', async () => {
    const router = createRouter({ history: createMemoryHistory(), routes })
    await router.push('/')
    await router.isReady()
    const wrapper = mount(App, { global: { plugins: [router] } })

    expect(wrapper.find('.desk .book .page-left .paper-lined').exists()).toBe(true)
    expect(wrapper.find('.page-right .paper-lined').exists()).toBe(true)
    expect(wrapper.get('nav[aria-label="Seções"]').text()).toContain('Quadro')
    expect(wrapper.get('nav[aria-label="Seções"]').text()).toContain('Amigos')
    expect(wrapper.get('a[aria-current="page"]').text()).toBe('Quadro')

    await wrapper.get('a[href="/amigos"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/amigos')
    expect(wrapper.get('a[aria-current="page"]').text()).toBe('Amigos')
  })

  it('keeps the notebook design tokens available', () => {
    const tokens = readFileSync('src/tokens.css', 'utf8')
    expect(tokens).toContain('--notebook-line:2rem')
    expect(tokens).toContain('.paper-lined')
    expect(tokens).toContain('.spiral-v')
  })
})
