export interface ParsedRequestHeader {
  key: string
  value: string
}

export interface ParsedRequestResult {
  ok: boolean
  error?: string
  method: string
  url: string
  headers: ParsedRequestHeader[]
  body?: string
  auth?: { type: 'basic'; username: string; password: string }
}

function isWhitespace(char: string) {
  return char === ' ' || char === '\n' || char === '\t' || char === '\r'
}

export function tokenizeCurl(input: string) {
  const tokens: string[] = []
  let current = ''
  let mode: 'none' | 'single' | 'double' = 'none'

  const pushCurrent = () => {
    if (current.length > 0) {
      tokens.push(current)
      current = ''
    }
  }

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index] ?? ''

    if (mode === 'none') {
      if (isWhitespace(char)) {
        pushCurrent()
        continue
      }

      if (char === "'") {
        mode = 'single'
        continue
      }

      if (char === '"') {
        mode = 'double'
        continue
      }

      if (char === '\\') {
        const next = input[index + 1]
        if (next) {
          current += next
          index += 1
          continue
        }
      }

      current += char
      continue
    }

    if (mode === 'single') {
      if (char === "'") {
        mode = 'none'
        continue
      }

      current += char
      continue
    }

    if (char === '"') {
      mode = 'none'
      continue
    }

    if (char === '\\') {
      const next = input[index + 1]
      if (next) {
        current += next
        index += 1
        continue
      }
    }

    current += char
  }

  pushCurrent()
  return tokens
}

function parseHeaderLine(raw: string): ParsedRequestHeader | null {
  const index = raw.indexOf(':')
  if (index <= 0) {
    return null
  }

  return {
    key: raw.slice(0, index).trim(),
    value: raw.slice(index + 1).trim(),
  }
}

function buildBasicAuth(username: string, password: string) {
  if (typeof btoa === 'function') {
    return btoa(`${username}:${password}`)
  }

  return Buffer.from(`${username}:${password}`, 'utf8').toString('base64')
}

function normalizeMethod(method: string | undefined, hasBody: boolean) {
  if (method) {
    return method.toUpperCase()
  }

  return hasBody ? 'POST' : 'GET'
}

export function parseCurlRequest(input: string): ParsedRequestResult {
  const tokens = tokenizeCurl(input.trim())

  if (!tokens.length) {
    return {
      ok: false,
      error: '请输入 cURL 命令',
      method: 'GET',
      url: '',
      headers: [],
    }
  }

  const filtered = tokens[0] === 'curl' ? tokens.slice(1) : tokens
  let method: string | undefined
  const headers: ParsedRequestHeader[] = []
  const bodyParts: string[] = []
  let url = ''
  let auth: ParsedRequestResult['auth']

  for (let index = 0; index < filtered.length; index += 1) {
    const token = filtered[index] ?? ''

    if (token === '-X' || token === '--request') {
      method = filtered[index + 1]
      index += 1
      continue
    }

    if (token === '-H' || token === '--header') {
      const headerText = filtered[index + 1]
      if (headerText) {
        const parsed = parseHeaderLine(headerText)
        if (parsed) {
          headers.push(parsed)
        }
      }
      index += 1
      continue
    }

    if (
      token === '-d' ||
      token === '--data' ||
      token === '--data-raw' ||
      token === '--data-binary' ||
      token === '--data-ascii'
    ) {
      const data = filtered[index + 1] ?? ''
      bodyParts.push(data)
      index += 1
      continue
    }

    if (token === '-u' || token === '--user') {
      const raw = filtered[index + 1] ?? ''
      const [username, password = ''] = raw.split(':')
      auth = { type: 'basic', username, password }
      headers.push({
        key: 'Authorization',
        value: `Basic ${buildBasicAuth(username, password)}`,
      })
      index += 1
      continue
    }

    if (token === '--cookie') {
      const cookie = filtered[index + 1] ?? ''
      headers.push({ key: 'Cookie', value: cookie })
      index += 1
      continue
    }

    if (token === '--url') {
      url = filtered[index + 1] ?? ''
      index += 1
      continue
    }

    if (token.startsWith('-')) {
      continue
    }

    if (!url) {
      url = token
    }
  }

  const body = bodyParts.length ? bodyParts.join('&') : undefined
  const normalizedMethod = normalizeMethod(method, Boolean(body))

  if (!url) {
    return {
      ok: false,
      error: '未找到 URL，请确认 cURL 中包含请求地址',
      method: normalizedMethod,
      url: '',
      headers,
      body,
      auth,
    }
  }

  return {
    ok: true,
    method: normalizedMethod,
    url,
    headers,
    body,
    auth,
  }
}

function tryParseJson(body: string | undefined) {
  if (!body) {
    return { ok: false as const }
  }

  const trimmed = body.trim()

  if (!trimmed) {
    return { ok: false as const }
  }

  try {
    return { ok: true as const, value: JSON.parse(trimmed) as unknown }
  } catch {
    return { ok: false as const }
  }
}

function hasHeader(headers: ParsedRequestHeader[], key: string) {
  return headers.some((header) => header.key.toLowerCase() === key.toLowerCase())
}

function formatObjectLiteral(value: unknown, indent = 2) {
  const json = JSON.stringify(value, null, indent) || 'null'
  return json.replaceAll('"', "'")
}

export function buildFetchSnippet(parsed: ParsedRequestResult) {
  const jsonBody = tryParseJson(parsed.body)
  const headers = [...parsed.headers]

  if (jsonBody.ok && !hasHeader(headers, 'Content-Type')) {
    headers.push({ key: 'Content-Type', value: 'application/json' })
  }

  const headerObject = headers.length
    ? `const headers = ${formatObjectLiteral(
        headers.reduce<Record<string, string>>((acc, item) => {
          acc[item.key] = item.value
          return acc
        }, {})
      )}`
    : 'const headers = {}'

  const bodyLine = parsed.body
    ? jsonBody.ok
      ? `const body = JSON.stringify(${JSON.stringify(jsonBody.value, null, 2)})`
      : `const body = ${JSON.stringify(parsed.body)}`
    : ''

  const optionsObject: Record<string, string> = {
    method: JSON.stringify(parsed.method),
    headers: 'headers',
  }

  if (parsed.body) {
    optionsObject.body = 'body'
  }

  const options = `const response = await fetch(${JSON.stringify(parsed.url)}, {\n  ${Object.entries(
    optionsObject
  )
    .map(([k, v]) => `${k}: ${v}`)
    .join(',\n  ')}\n})`

  return `// fetch (browser)\n${headerObject}\n${bodyLine ? `${bodyLine}\n` : ''}\nasync function run() {\n  ${options}\n  const text = await response.text()\n  console.log(response.status, text)\n}\n\nrun()`
}

export function buildAxiosSnippet(parsed: ParsedRequestResult) {
  const jsonBody = tryParseJson(parsed.body)
  const headers = [...parsed.headers]

  if (jsonBody.ok && !hasHeader(headers, 'Content-Type')) {
    headers.push({ key: 'Content-Type', value: 'application/json' })
  }

  const headerRecord = headers.reduce<Record<string, string>>((acc, item) => {
    acc[item.key] = item.value
    return acc
  }, {})

  const configLines = [
    `method: ${JSON.stringify(parsed.method)}`,
    `url: ${JSON.stringify(parsed.url)}`,
    headers.length ? `headers: ${JSON.stringify(headerRecord, null, 2)}` : undefined,
    parsed.body
      ? jsonBody.ok
        ? `data: ${JSON.stringify(jsonBody.value, null, 2)}`
        : `data: ${JSON.stringify(parsed.body)}`
      : undefined,
  ].filter(Boolean)

  return `// axios (TypeScript)\nimport axios from 'axios'\n\nasync function run() {\n  const response = await axios.request({\n    ${configLines.join(',\n    ')}\n  })\n\n  console.log(response.status, response.data)\n}\n\nrun()`
}

export function buildNodeFetchSnippet(parsed: ParsedRequestResult) {
  const fetchSnippet = buildFetchSnippet(parsed)
  return fetchSnippet.replace('// fetch (browser)', '// fetch (Node 18+)')
}

export function buildRequestConfigJson(parsed: ParsedRequestResult) {
  const jsonBody = tryParseJson(parsed.body)
  const headerRecord = parsed.headers.reduce<Record<string, string>>((acc, item) => {
    acc[item.key] = item.value
    return acc
  }, {})

  return JSON.stringify(
    {
      method: parsed.method,
      url: parsed.url,
      headers: headerRecord,
      body: parsed.body ? (jsonBody.ok ? jsonBody.value : parsed.body) : undefined,
    },
    null,
    2
  )
}

