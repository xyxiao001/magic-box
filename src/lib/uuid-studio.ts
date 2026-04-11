export type IdMode = 'uuid' | 'nanoid'
export type NanoAlphabetPreset = 'default' | 'lowercase' | 'numbers' | 'hex'

export const nanoAlphabetPresets: Record<NanoAlphabetPreset, string> = {
  default: '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_',
  lowercase: '0123456789abcdefghijklmnopqrstuvwxyz',
  numbers: '0123456789',
  hex: '0123456789abcdef',
}

function getCryptoApi() {
  return globalThis.crypto
}

function createRandomBytes(size: number) {
  const cryptoApi = getCryptoApi()

  if (!cryptoApi?.getRandomValues) {
    throw new Error('当前环境不支持 Web Crypto')
  }

  return cryptoApi.getRandomValues(new Uint8Array(size))
}

export function generateUuidV4() {
  const cryptoApi = getCryptoApi()

  if (cryptoApi?.randomUUID) {
    return cryptoApi.randomUUID()
  }

  const bytes = createRandomBytes(16)
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80

  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

export function generateNanoId(length: number, alphabet: string) {
  if (!alphabet.length) {
    throw new Error('字符集不能为空')
  }

  const randomBytes = createRandomBytes(length)
  let output = ''

  for (let index = 0; index < length; index += 1) {
    output += alphabet[randomBytes[index] % alphabet.length]
  }

  return output
}

export function generateIdBatch(mode: IdMode, count: number, nanoLength: number, alphabet: string) {
  return Array.from({ length: count }, () =>
    mode === 'uuid' ? generateUuidV4() : generateNanoId(nanoLength, alphabet)
  )
}

export function validateUuidV4(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.trim())
}

export function validateNanoId(value: string, alphabet: string) {
  const trimmed = value.trim()

  if (!trimmed || !alphabet.length) {
    return false
  }

  return [...trimmed].every((char) => alphabet.includes(char))
}
