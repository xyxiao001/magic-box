export interface JwtClaimRow {
  label: string
  value: string
}

export interface JwtTimeRow {
  label: string
  value: string
}

export interface ParsedJwtResult {
  ok: boolean
  error?: string
  status: 'invalid' | 'expired' | 'not-yet-valid' | 'active'
  headerText: string
  payloadText: string
  signatureText: string
  summary: string
  claimRows: JwtClaimRow[]
  timeRows: JwtTimeRow[]
}

function decodeBase64Url(input: string) {
  const normalized = input.replaceAll('-', '+').replaceAll('_', '/')
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')

  if (typeof atob === 'function') {
    const ascii = atob(padded)
    const bytes = Uint8Array.from(ascii, (char) => char.charCodeAt(0))
    return new TextDecoder().decode(bytes)
  }

  return Buffer.from(padded, 'base64').toString('utf8')
}

function encodeBase64Url(input: string) {
  if (typeof btoa === 'function') {
    const bytes = new TextEncoder().encode(input)
    let binary = ''
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte)
    })

    return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll(/=+$/g, '')
  }

  return Buffer.from(input, 'utf8')
    .toString('base64')
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll(/=+$/g, '')
}

function formatTimestamp(seconds: number | undefined) {
  if (!seconds || Number.isNaN(seconds)) {
    return '—'
  }

  return new Date(seconds * 1000).toLocaleString('zh-CN', { hour12: false })
}

function normalizeRecord(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }

  return value as Record<string, unknown>
}

function buildClaimRows(payload: Record<string, unknown>) {
  return Object.entries(payload)
    .slice(0, 8)
    .map(([key, value]) => ({
      label: key,
      value:
        typeof value === 'string'
          ? value
          : typeof value === 'number' || typeof value === 'boolean'
            ? String(value)
            : JSON.stringify(value),
    }))
}

export function buildUnsignedJwt(
  header: Record<string, unknown>,
  payload: Record<string, unknown>,
  signature = 'local-signature'
) {
  return [
    encodeBase64Url(JSON.stringify(header)),
    encodeBase64Url(JSON.stringify(payload)),
    signature,
  ].join('.')
}

export function parseJwt(token: string, nowMs = Date.now()): ParsedJwtResult {
  const trimmed = token.trim()

  if (!trimmed) {
    return {
      ok: false,
      error: '请输入 JWT',
      status: 'invalid',
      headerText: '',
      payloadText: '',
      signatureText: '',
      summary: '等待输入 token',
      claimRows: [],
      timeRows: [],
    }
  }

  const parts = trimmed.split('.')

  if (parts.length !== 3) {
    return {
      ok: false,
      error: 'JWT 应该由 header.payload.signature 三段组成',
      status: 'invalid',
      headerText: '',
      payloadText: '',
      signatureText: '',
      summary: 'Token 结构无效',
      claimRows: [],
      timeRows: [],
    }
  }

  try {
    const header = normalizeRecord(JSON.parse(decodeBase64Url(parts[0])))
    const payload = normalizeRecord(JSON.parse(decodeBase64Url(parts[1])))

    if (!header || !payload) {
      throw new Error('解析结果不是对象')
    }

    const nowSeconds = Math.floor(nowMs / 1000)
    const exp = typeof payload.exp === 'number' ? payload.exp : undefined
    const nbf = typeof payload.nbf === 'number' ? payload.nbf : undefined
    const iat = typeof payload.iat === 'number' ? payload.iat : undefined

    let status: ParsedJwtResult['status'] = 'active'
    let summary = 'Token 结构合法，当前处于可用状态'

    if (typeof nbf === 'number' && nowSeconds < nbf) {
      status = 'not-yet-valid'
      summary = 'Token 已解析，但当前还未到生效时间'
    } else if (typeof exp === 'number' && nowSeconds >= exp) {
      status = 'expired'
      summary = 'Token 已过期，请检查刷新逻辑或服务端时间'
    }

    const claimRows = buildClaimRows(payload)
    const timeRows = [
      { label: '签发时间 iat', value: formatTimestamp(iat) },
      { label: '生效时间 nbf', value: formatTimestamp(nbf) },
      { label: '过期时间 exp', value: formatTimestamp(exp) },
    ]

    return {
      ok: true,
      status,
      headerText: JSON.stringify(header, null, 2),
      payloadText: JSON.stringify(payload, null, 2),
      signatureText: parts[2],
      summary,
      claimRows,
      timeRows,
    }
  } catch {
    return {
      ok: false,
      error: '无法解析 JWT，请检查 Base64URL 或 JSON 内容',
      status: 'invalid',
      headerText: '',
      payloadText: '',
      signatureText: '',
      summary: 'Token 内容无效',
      claimRows: [],
      timeRows: [],
    }
  }
}
