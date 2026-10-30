const MONTH_LABELS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'] as const
const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const

export function format_birthday_for_display(birthday: string | null): string | null {
  if (!birthday || !/^\d{2}\/\d{2}$/.test(birthday)) return null
  const [day, month] = birthday.split('/')
  const month_index = Number(month) - 1
  const month_label = MONTH_LABELS[month_index]
  const days_in_month = DAYS_IN_MONTH[month_index]
  if (!month_label || !days_in_month || Number(day) < 1 || Number(day) > days_in_month) return null
  return `${day}/${month_label}`
}
