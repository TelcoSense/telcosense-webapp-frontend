export function datetimeFormat(datetimeStr: string, timeZone: 'UTC' | 'Europe/Prague'): string {
  const date = new Date(datetimeStr)
  const formatter = new Intl.DateTimeFormat('cs-CZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone,
  })
  const parts = Object.fromEntries(
    formatter.formatToParts(date).map((p) => [p.type, p.value])
  )
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`
}

export function toUtcDate(dateLike: Date | string): Date {
  const localDate = typeof dateLike === 'string' ? new Date(dateLike) : dateLike
  return new Date(
    Date.UTC(
      localDate.getFullYear(),
      localDate.getMonth(),
      localDate.getDate(),
      localDate.getHours(),
      localDate.getMinutes(),
      localDate.getSeconds(),
    ),
  )
}
