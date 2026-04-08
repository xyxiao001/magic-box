export interface TimeLabResult {
  iso: string
  local: string
  utc: string
  unixSeconds: string
  unixMilliseconds: string
}

function formatLocal(date: Date) {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date)
}

export function resolveDateInput(raw: string) {
  const input = raw.trim()

  if (!input) {
    return null
  }

  if (/^-?\d+$/.test(input)) {
    const numeric = Number(input)

    if (!Number.isFinite(numeric)) {
      return null
    }

    const milliseconds = input.length <= 10 ? numeric * 1000 : numeric
    const date = new Date(milliseconds)
    return Number.isNaN(date.getTime()) ? null : date
  }

  const date = new Date(input)
  return Number.isNaN(date.getTime()) ? null : date
}

export function buildTimeLabResult(raw: string): TimeLabResult | null {
  const date = resolveDateInput(raw)

  if (!date) {
    return null
  }

  return {
    iso: date.toISOString(),
    local: formatLocal(date),
    utc: date.toUTCString(),
    unixSeconds: String(Math.floor(date.getTime() / 1000)),
    unixMilliseconds: String(date.getTime()),
  }
}
