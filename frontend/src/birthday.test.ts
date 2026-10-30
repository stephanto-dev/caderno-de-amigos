import { describe, expect, it } from 'vitest'
import { format_birthday_for_display } from './birthday'

describe('Birthday display', () => {
  it.each([
    ['12/03', '12/mar'],
    ['29/10', '29/out'],
    ['01/12', '01/dez'],
    ['12/', null],
    ['1', null],
    ['12/13', null],
    ['12/00', null],
    ['00/03', null],
    ['31/04', null],
    ['29/02', '29/fev'],
    [null, null],
  ])('formats %s as %s', (birthday, expected) => {
    expect(format_birthday_for_display(birthday)).toBe(expected)
  })
})
