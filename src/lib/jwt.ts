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

export interface JwtSignVerifyResult {
  ok: boolean
  error?: string
  token: string
  signature: string
  verified: boolean
}

export function decodeBase64Url(input: string) {
  const normalized = input.replaceAll('-', '+').replaceAll('_', '/')
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')

  if (typeof atob === 'function') {
    const ascii = atob(padded)
    const bytes = Uint8Array.from(ascii, (char) => char.charCodeAt(0))
    return new TextDecoder().decode(bytes)
  }

  return Buffer.from(padded, 'base64').toString('utf8')
}

export function encodeBase64Url(input: string) {
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

async function computeHs256Signature(signingInput: string, secret: string) {
  const cryptoApi = globalThis.crypto

  if (!cryptoApi?.subtle) {
    throw new Error('当前环境不支持 Web Crypto')
  }

  const key = await cryptoApi.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    {
      name: 'HMAC',
      hash: 'SHA-256',
    },
    false,
    ['sign']
  )

  const signature = await cryptoApi.subtle.sign('HMAC', key, new TextEncoder().encode(signingInput))
  const bytes = new Uint8Array(signature)
  let binary = ''

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })

  if (typeof btoa === 'function') {
    return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll(/=+$/g, '')
  }

  return Buffer.from(bytes)
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

export function parseJwtJsonInput(input: string, fallback: Record<string, unknown>) {
  const trimmed = input.trim()

  if (!trimmed) {
    return {
      ok: true,
      value: fallback,
    }
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown
    const normalized = normalizeRecord(parsed)

    if (!normalized) {
      throw new Error('JSON 必须是对象')
    }

    return {
      ok: true,
      value: normalized,
    }
  } catch {
    return {
      ok: false,
      error: '请输入合法 JSON 对象',
      value: fallback,
    }
  }
}

export async function signJwtHs256(
  header: Record<string, unknown>,
  payload: Record<string, unknown>,
  secret: string
): Promise<JwtSignVerifyResult> {
  const normalizedSecret = secret.trim()

  if (!normalizedSecret) {
    return {
      ok: false,
      error: '请输入 secret',
      token: '',
      signature: '',
      verified: false,
    }
  }

  try {
    const encodedHeader = encodeBase64Url(JSON.stringify(header))
    const encodedPayload = encodeBase64Url(JSON.stringify(payload))
    const signingInput = `${encodedHeader}.${encodedPayload}`
    const signature = await computeHs256Signature(signingInput, normalizedSecret)

    return {
      ok: true,
      token: `${signingInput}.${signature}`,
      signature,
      verified: true,
    }
  } catch {
    return {
      ok: false,
      error: '签发失败，请确认当前环境支持 Web Crypto',
      token: '',
      signature: '',
      verified: false,
    }
  }
}

export async function verifyJwtHs256(token: string, secret: string): Promise<JwtSignVerifyResult> {
  const trimmed = token.trim()
  const normalizedSecret = secret.trim()

  if (!trimmed) {
    return {
      ok: false,
      error: '请输入 JWT',
      token: '',
      signature: '',
      verified: false,
    }
  }

  if (!normalizedSecret) {
    return {
      ok: false,
      error: '请输入 secret',
      token: trimmed,
      signature: '',
      verified: false,
    }
  }

  const parts = trimmed.split('.')

  if (parts.length !== 3) {
    return {
      ok: false,
      error: 'JWT 应该由 header.payload.signature 三段组成',
      token: trimmed,
      signature: '',
      verified: false,
    }
  }

  try {
    const expectedSignature = await computeHs256Signature(`${parts[0]}.${parts[1]}`, normalizedSecret)

    return {
      ok: true,
      token: trimmed,
      signature: expectedSignature,
      verified: expectedSignature === parts[2],
    }
  } catch {
    return {
      ok: false,
      error: '验签失败，请确认当前环境支持 Web Crypto',
      token: trimmed,
      signature: '',
      verified: false,
    }
  }
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
