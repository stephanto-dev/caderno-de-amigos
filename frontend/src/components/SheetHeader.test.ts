import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import SheetHeader from './SheetHeader.vue'

describe('Sheet header', () => {
  afterEach(() => { vi.useRealTimers() })

  it('uses the Sao Paulo date even when UTC is already on the next day', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-28T02:59:59Z'))
    const wrapper = mount(SheetHeader)

    expect(wrapper.findAll('li').map((day) => day.text())).toEqual(['D', 'S', 'T', 'Q', 'Q', 'S', 'S'])
    expect(wrapper.findAll('[aria-current="date"]')).toHaveLength(1)
    expect(wrapper.get('[aria-current="date"]').attributes('aria-label')).toBe('terça-feira')
    expect(wrapper.get('time').text()).toBe('27/10/2026')
    expect(wrapper.get('time').attributes('datetime')).toBe('2026-10-27')
    expect(wrapper.find('input, button, a').exists()).toBe(false)
    wrapper.unmount()
  })

  it('updates the date and weekday at midnight in Sao Paulo without remounting', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-28T02:59:59Z'))
    const wrapper = mount(SheetHeader)

    await vi.advanceTimersByTimeAsync(1_000)

    expect(wrapper.get('time').text()).toBe('28/10/2026')
    expect(wrapper.get('time').attributes('datetime')).toBe('2026-10-28')
    expect(wrapper.get('[aria-current="date"]').attributes('aria-label')).toBe('quarta-feira')
    wrapper.unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
})
