export interface HeaderEntry {
  id: string
  key: string
  value: string
}

export interface CookieEntry {
  id: string
  name: string
  value: string
}

export interface SetCookieEntry {
  id: string
  name: string
  value: string
  attributes: Record<string, string | boolean>
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function parseHeadersText(input: string) {
  const entries: HeaderEntry[] = []
  const lines = input.split(/\r?\n/).map((line) => line.trim())

  for (const line of lines) {
    if (!line) {
      continue
    }

    const index = line.indexOf(':')
    if (index <= 0) {
      continue
    }

    entries.push({
      id: createId('h'),
      key: line.slice(0, index).trim(),
      value: line.slice(index + 1).trim(),
    })
  }

  return entries
}

export function stringifyHeaders(entries: HeaderEntry[]) {
  return entries.map((entry) => `${entry.key}: ${entry.value}`).join('\n')
}

export function mergeHeaders(primary: HeaderEntry[], secondary: HeaderEntry[]) {
  return [...primary, ...secondary].map((entry) => ({ ...entry, id: createId('h') }))
}

export function dedupeHeaders(entries: HeaderEntry[], strategy: 'keep-last' | 'keep-first' = 'keep-last') {
  const map = new Map<string, HeaderEntry>()

  for (const entry of entries) {
    const key = entry.key.toLowerCase()
    const existing = map.get(key)

    if (!existing) {
      map.set(key, entry)
      continue
    }

    if (strategy === 'keep-last') {
      map.set(key, entry)
    }
  }

  return Array.from(map.values()).map((entry) => ({ ...entry, id: createId('h') }))
}

export function parseCookieHeader(input: string) {
  const normalized = input.trim().replace(/^cookie:\s*/i, '')
  const parts = normalized.split(';').map((part) => part.trim()).filter(Boolean)
  const entries: CookieEntry[] = []

  for (const part of parts) {
    const index = part.indexOf('=')
    if (index <= 0) {
      continue
    }

    entries.push({
      id: createId('c'),
      name: part.slice(0, index).trim(),
      value: part.slice(index + 1).trim(),
    })
  }

  return entries
}

export function stringifyCookieHeader(entries: CookieEntry[]) {
  return entries.map((entry) => `${entry.name}=${entry.value}`).join('; ')
}

export function parseSetCookieText(input: string) {
  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  const entries: SetCookieEntry[] = []

  for (const rawLine of lines) {
    const normalized = rawLine.replace(/^set-cookie:\s*/i, '')
    const segments = normalized.split(';').map((segment) => segment.trim()).filter(Boolean)

    if (!segments.length) {
      continue
    }

    const [nameValue, ...attributes] = segments
    const eqIndex = nameValue.indexOf('=')

    if (eqIndex <= 0) {
      continue
    }

    const name = nameValue.slice(0, eqIndex).trim()
    const value = nameValue.slice(eqIndex + 1).trim()
    const attrs: Record<string, string | boolean> = {}

    for (const attribute of attributes) {
      const attrIndex = attribute.indexOf('=')
      if (attrIndex > 0) {
        const key = attribute.slice(0, attrIndex).trim().toLowerCase()
        const attrValue = attribute.slice(attrIndex + 1).trim()
        attrs[key] = attrValue
      } else {
        attrs[attribute.trim().toLowerCase()] = true
      }
    }

    entries.push({
      id: createId('sc'),
      name,
      value,
      attributes: attrs,
    })
  }

  return entries
}

