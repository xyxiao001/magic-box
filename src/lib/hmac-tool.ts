export type HmacOutputFormat = 'hex' | 'base64'

export interface CanonicalOptions {
  sortQuery: boolean
  filterEmpty: boolean
  delimiter: 'newline' | 'ampersand'
}

export interface CanonicalRequestInput {
  method: string
  path: string
  query: string
  timestamp: string
  nonce: string
  body: string
}

function toHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function toBase64(bytes: Uint8Array) {
  if (typeof btoa === 'function') {
    let binary = ''
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte)
    })
    return btoa(binary)
  }

  return Buffer.from(bytes).toString('base64')
}

export async function computeHmacSha256(secret: string, message: string, format: HmacOutputFormat) {
  const keyData = new TextEncoder().encode(secret)
  const messageData = new TextEncoder().encode(message)
  const key = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const signature = await crypto.subtle.sign('HMAC', key, messageData)
  const bytes = new Uint8Array(signature)

  return format === 'hex' ? toHex(bytes) : toBase64(bytes)
}

function parseQueryPairs(query: string) {
  const trimmed = query.trim().replace(/^\?/, '')
  if (!trimmed) {
    return []
  }

  return trimmed.split('&').map((part) => {
    const [key, value = ''] = part.split('=')
    return { key: decodeURIComponent(key), value: decodeURIComponent(value) }
  })
}

function stringifyQueryPairs(pairs: Array<{ key: string; value: string }>) {
  return pairs
    .map((pair) => `${encodeURIComponent(pair.key)}=${encodeURIComponent(pair.value)}`)
    .join('&')
}

export function buildCanonicalString(input: CanonicalRequestInput, options: CanonicalOptions) {
  const method = input.method.trim().toUpperCase() || 'GET'
  const path = input.path.trim() || '/'
  const timestamp = input.timestamp.trim()
  const nonce = input.nonce.trim()
  const body = input.body

  let queryPairs = parseQueryPairs(input.query)

  if (options.filterEmpty) {
    queryPairs = queryPairs.filter((pair) => pair.key && pair.value !== '')
  }

  if (options.sortQuery) {
    queryPairs.sort((left, right) => left.key.localeCompare(right.key, 'en'))
  }

  const queryString = queryPairs.length ? stringifyQueryPairs(queryPairs) : ''
  const parts = [
    method,
    path,
    queryString,
    timestamp,
    nonce,
    body,
  ].filter((part) => (options.filterEmpty ? part !== '' : true))

  const delimiter = options.delimiter === 'ampersand' ? '&' : '\n'
  return parts.join(delimiter)
}

export function compareSignature(target: string, actual: string) {
  const normalizedTarget = target.trim()
  const normalizedActual = actual.trim()

  if (!normalizedTarget || !normalizedActual) {
    return { matched: false, normalizedTarget, normalizedActual }
  }

  return {
    matched: normalizedTarget.toLowerCase() === normalizedActual.toLowerCase(),
    normalizedTarget,
    normalizedActual,
  }
}

