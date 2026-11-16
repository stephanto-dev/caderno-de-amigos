import { describe, expect, it } from 'vitest'
import { format_phone_for_display, get_normalized_phone_for_friend, INVALID_PHONE_MESSAGE } from './phone'

describe('Friend phone input', () => {
  it.each(['(11) 99999-9999', '11999999999', '+55 11 99999-9999', '5511999999999'])('normalizes the Brazilian number %s', (phone) => {
    expect(get_normalized_phone_for_friend(phone)).toBe('+5511999999999')
  })

  it('preserves an international country code', () => {
    expect(get_normalized_phone_for_friend('+351 912 345 678')).toBe('+351912345678')
  })

  it.each([null, '', '   '])('treats %s as no phone', (phone) => {
    expect(get_normalized_phone_for_friend(phone)).toBeNull()
  })

  it.each(['123', 'Ana +5511999999999', '+55 11 99999-9999 ramal 4', '1'.repeat(65)])('rejects %s without silently extracting part of it', (phone) => {
    expect(() => get_normalized_phone_for_friend(phone)).toThrow(INVALID_PHONE_MESSAGE)
  })

  it('formats a saved phone and keeps an incomplete draft visible', () => {
    expect(format_phone_for_display('+5511999999999')).toBe('+55 11 99999 9999')
    expect(format_phone_for_display('(11) 9')).toBe('(11) 9')
  })
})
