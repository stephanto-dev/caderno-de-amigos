import { parsePhoneNumberFromString } from 'libphonenumber-js/max'

export const MAX_PHONE_INPUT_LENGTH = 64
export const INVALID_PHONE_MESSAGE = 'Esse telefone não é válido. Informe DDD e número, ou apague o campo. Para outro país, inclua o código com +.'
const DEFAULT_PHONE_COUNTRY = 'BR'
const PHONE_INPUT_PATTERN = /^\+?[0-9()\s.-]+$/

/** E.164 is the international +country-and-number format; Brazil is the default. */
export function get_normalized_phone_for_friend(value: string | null): string | null {
  const input = value?.trim() ?? ''
  if (!input) return null
  if (input.length > MAX_PHONE_INPUT_LENGTH || !PHONE_INPUT_PATTERN.test(input)) throw new Error(INVALID_PHONE_MESSAGE)
  const phone = parsePhoneNumberFromString(input, { defaultCountry: DEFAULT_PHONE_COUNTRY, extract: false })
  if (!phone?.isValid() || phone.ext) throw new Error(INVALID_PHONE_MESSAGE)
  return phone.number
}

/** Keep incomplete drafts readable; saved numbers use international spacing. */
export function format_phone_for_display(value: string): string {
  const phone = parsePhoneNumberFromString(value, { defaultCountry: DEFAULT_PHONE_COUNTRY, extract: false })
  return phone?.isValid() ? phone.formatInternational() : value.trim()
}
