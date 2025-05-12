export function datetimeFormat(datetimeStr: string, timeZone: 'UTC' | 'Europe/Prague'): string {
  const date = new Date(datetimeStr)
  const dateFormatter = new Intl.DateTimeFormat('cs-CZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone,
  })
  const parts = dateFormatter.formatToParts(date)
  const get = (type: string) => parts.find((p) => p.type === type)!.value
  const tzString = timeZone == 'UTC' ? 'UTC' : 'Local'
  return `${get('day')}.${get('month')}.${get('year')} ${get('hour')}:${get('minute')} ${tzString}`
}