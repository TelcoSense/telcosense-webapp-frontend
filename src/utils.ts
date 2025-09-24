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

export const coordsCzechia = {
  xMin: 12.0905,
  xMax: 18.8591,
  yMin: 48.5525,
  yMax: 51.0557,
}

export const coordsBrno = {
  xMin: 16.4486,
  xMax: 16.7706,
  yMin: 49.0849,
  yMax: 49.3014,
}

export const coordsPraha = {
  xMin: 14.1785,
  xMax: 14.7498,
  yMin: 49.8946,
  yMax: 50.2433,
}