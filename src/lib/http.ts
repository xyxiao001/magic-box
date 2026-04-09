export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'

interface SuccessResult<T> {
  ok: true
  value: T
}

interface ErrorResult {
  ok: false
  error: string
}

export type HeaderParseResult = SuccessResult<Record<string, string>> | ErrorResult

export interface BuiltHttpRequestConfig {
  headers: Record<string, string>
  init: RequestInit
}

export type BuildHttpRequestResult = SuccessResult<BuiltHttpRequestConfig> | ErrorResult

function looksLikeJson(value: string) {
  const input = value.trim()
  return input.startsWith('{') || input.startsWith('[')
}

function canSendBody(method: HttpMethod) {
  return method === 'POST' || method === 'PUT'
}

export function parseHttpHeaders(raw: string): HeaderParseResult {
  const headers: Record<string, string> = {}
  const lines = raw.split(/\r?\n/)

  for (const [index, line] of lines.entries()) {
    const trimmed = line.trim()

    if (!trimmed) {
      continue
    }

    const separatorIndex = trimmed.indexOf(':')

    if (separatorIndex <= 0) {
      return {
        ok: false,
        error: `第 ${index + 1} 行请求头格式无效，应为 Key: Value`,
      }
    }

    const key = trimmed.slice(0, separatorIndex).trim()
    const value = trimmed.slice(separatorIndex + 1).trim()

    if (!key) {
      return {
        ok: false,
        error: `第 ${index + 1} 行请求头缺少名称`,
      }
    }

    headers[key] = value
  }

  return {
    ok: true,
    value: headers,
  }
}

export function buildHttpRequestConfig(
  method: HttpMethod,
  rawHeaders: string,
  rawBody: string
): BuildHttpRequestResult {
  const parsedHeaders = parseHttpHeaders(rawHeaders)

  if (!parsedHeaders.ok) {
    return parsedHeaders
  }

  const headers = { ...parsedHeaders.value }
  const body = rawBody.trim()
  const shouldSendBody = canSendBody(method) && body.length > 0
  const hasContentType = Object.keys(headers).some(
    (key) => key.toLowerCase() === 'content-type'
  )

  if (shouldSendBody && !hasContentType && looksLikeJson(body)) {
    headers['Content-Type'] = 'application/json'
  }

  return {
    ok: true,
    value: {
      headers,
      init: {
        method,
        headers,
        body: shouldSendBody ? rawBody : undefined,
      },
    },
  }
}

export function formatResponseHeaders(headers: Headers) {
  return Array.from(headers.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n')
}

export function formatResponseBody(raw: string, contentType: string | null) {
  if (!raw) {
    return ''
  }

  if (contentType && contentType.toLowerCase().includes('json')) {
    try {
      return JSON.stringify(JSON.parse(raw), null, 2)
    } catch {
      return raw
    }
  }

  return raw
}

export function formatByteSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export function formatHttpError(error: unknown) {
  if (error instanceof Error) {
    if (error.message === 'Failed to fetch') {
      return '请求失败，可能被网络错误或 CORS 限制拦截'
    }

    return error.message
  }

  return '请求失败'
}
