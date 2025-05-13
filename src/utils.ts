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
  const tzLabel = timeZone === 'UTC' ? 'UTC' : 'Local'
  return `${parts.day}.${parts.month}.${parts.year} ${parts.hour}:${parts.minute} ${tzLabel}`
}