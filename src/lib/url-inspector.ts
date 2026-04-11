export interface UrlInspectorQueryEntry {
  id: string
  key: string
  value: string
  encodedKey: boolean
  encodedValue: boolean
}

export interface UrlInspectorResult {
  ok: boolean
  error?: string
  original: string
  href: string
  protocol: string
  origin: string
  host: string
  hostname: string
  port: string
  pathname: string
  hash: string
  queryEntries: UrlInspectorQueryEntry[]
  decodedPathname: string
  decodedHash: string
  hasEncodedSegments: boolean
}

export interface UrlInspectorBuildInput {
  protocol: string
  hostname: string
  port?: string
  pathname: string
  hash?: string
  queryEntries: Array<Pick<UrlInspectorQueryEntry, 'key' | 'value'>>
}

function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`
}

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function isEncoded(value: string) {
  return value.includes('%') && safeDecode(value) !== value
}

export function createUrlInspectorQueryEntry(
  key = '',
  value = '',
  encodedKey = false,
  encodedValue = false
): UrlInspectorQueryEntry {
  return {
    id: createId('url-param'),
    key,
    value,
    encodedKey,
    encodedValue,
  }
}

export function parseUrlInspectorInput(input: string): UrlInspectorResult {
  const trimmed = input.trim()

  if (!trimmed) {
    return {
      ok: false,
      error: '请输入完整 URL',
      original: input,
      href: '',
      protocol: '',
      origin: '',
      host: '',
      hostname: '',
      port: '',
      pathname: '',
      hash: '',
      queryEntries: [],
      decodedPathname: '',
      decodedHash: '',
      hasEncodedSegments: false,
    }
  }

  try {
    const url = new URL(trimmed)
    const rawQuery = trimmed.includes('?')
      ? trimmed.slice(trimmed.indexOf('?') + 1, trimmed.includes('#') ? trimmed.indexOf('#') : undefined)
      : ''
    const rawQueryEntries = rawQuery
      ? rawQuery
          .split('&')
          .filter(Boolean)
          .map((segment) => {
            const separatorIndex = segment.indexOf('=')

            if (separatorIndex < 0) {
              return { rawKey: segment, rawValue: '' }
            }

            return {
              rawKey: segment.slice(0, separatorIndex),
              rawValue: segment.slice(separatorIndex + 1),
            }
          })
      : []
    const queryEntries = [...url.searchParams.entries()].map(([key, value], index) =>
      createUrlInspectorQueryEntry(
        key,
        value,
        isEncoded(rawQueryEntries[index]?.rawKey ?? key),
        isEncoded(rawQueryEntries[index]?.rawValue ?? value)
      )
    )
    const decodedPathname = safeDecode(url.pathname)
    const decodedHash = safeDecode(url.hash.replace(/^#/, ''))
    const hasEncodedSegments =
      isEncoded(url.pathname) ||
      isEncoded(url.hash.replace(/^#/, '')) ||
      queryEntries.some((entry) => entry.encodedKey || entry.encodedValue)

    return {
      ok: true,
      original: input,
      href: url.href,
      protocol: url.protocol.replace(/:$/, ''),
      origin: url.origin,
      host: url.host,
      hostname: url.hostname,
      port: url.port,
      pathname: url.pathname,
      hash: url.hash.replace(/^#/, ''),
      queryEntries,
      decodedPathname,
      decodedHash,
      hasEncodedSegments,
    }
  } catch {
    return {
      ok: false,
      error: '无法解析这个 URL，请确认包含合法协议和主机名',
      original: input,
      href: '',
      protocol: '',
      origin: '',
      host: '',
      hostname: '',
      port: '',
      pathname: '',
      hash: '',
      queryEntries: [],
      decodedPathname: '',
      decodedHash: '',
      hasEncodedSegments: false,
    }
  }
}

export function buildUrlFromInspectorState(input: UrlInspectorBuildInput) {
  const protocol = input.protocol.replace(/:$/, '')
  const pathname = input.pathname.startsWith('/') ? input.pathname : `/${input.pathname}`
  const url = new URL(`${protocol}://${input.hostname}${input.port ? `:${input.port}` : ''}${pathname}`)

  url.hash = input.hash ? `#${input.hash.replace(/^#/, '')}` : ''

  const searchParams = new URLSearchParams()
  for (const entry of input.queryEntries) {
    searchParams.append(entry.key, entry.value)
  }
  url.search = searchParams.toString()

  return url.toString()
}

export function buildUrlInspectorQueryJson(entries: Array<Pick<UrlInspectorQueryEntry, 'key' | 'value'>>) {
  const grouped = entries.reduce<Record<string, string | string[]>>((result, entry) => {
    const existing = result[entry.key]

    if (existing === undefined) {
      result[entry.key] = entry.value
      return result
    }

    if (Array.isArray(existing)) {
      existing.push(entry.value)
      return result
    }

    result[entry.key] = [existing, entry.value]
    return result
  }, {})

  return JSON.stringify(grouped, null, 2)
}
