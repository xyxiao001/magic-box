import { formatByteSize } from './http'

export type HashAlgorithm = 'MD5' | 'SHA-1' | 'SHA-256' | 'SHA-512'

export interface HashResultRow {
  algorithm: HashAlgorithm
  value: string
  length: number
}

export interface HashComparisonResult {
  matchedAlgorithm: HashAlgorithm | null
  normalizedTarget: string
  matched: boolean
}

export interface FileHashMeta {
  name: string
  type: string
  size: string
}

function toHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function leftRotate(value: number, bits: number) {
  return (value << bits) | (value >>> (32 - bits))
}

function md5Bytes(input: Uint8Array) {
  const shifts = [
    7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20,
    5, 9, 14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
    6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
  ]

  const table = Array.from({ length: 64 }, (_, index) =>
    Math.floor(Math.abs(Math.sin(index + 1)) * 0x100000000)
  )

  const bitLength = input.length * 8
  const paddingLength = ((56 - ((input.length + 1) % 64)) + 64) % 64
  const buffer = new Uint8Array(input.length + 1 + paddingLength + 8)
  buffer.set(input)
  buffer[input.length] = 0x80

  let length = bitLength
  for (let index = 0; index < 8; index += 1) {
    buffer[buffer.length - 8 + index] = length & 0xff
    length = Math.floor(length / 256)
  }

  let a0 = 0x67452301
  let b0 = 0xefcdab89
  let c0 = 0x98badcfe
  let d0 = 0x10325476

  for (let offset = 0; offset < buffer.length; offset += 64) {
    const words = new Uint32Array(16)

    for (let index = 0; index < 16; index += 1) {
      const start = offset + index * 4
      words[index] =
        buffer[start] |
        (buffer[start + 1] << 8) |
        (buffer[start + 2] << 16) |
        (buffer[start + 3] << 24)
    }

    let a = a0
    let b = b0
    let c = c0
    let d = d0

    for (let index = 0; index < 64; index += 1) {
      let f = 0
      let g = 0

      if (index < 16) {
        f = (b & c) | (~b & d)
        g = index
      } else if (index < 32) {
        f = (d & b) | (~d & c)
        g = (5 * index + 1) % 16
      } else if (index < 48) {
        f = b ^ c ^ d
        g = (3 * index + 5) % 16
      } else {
        f = c ^ (b | ~d)
        g = (7 * index) % 16
      }

      const temp = d
      d = c
      c = b
      b = (b + leftRotate((a + f + table[index] + words[g]) >>> 0, shifts[index])) >>> 0
      a = temp
    }

    a0 = (a0 + a) >>> 0
    b0 = (b0 + b) >>> 0
    c0 = (c0 + c) >>> 0
    d0 = (d0 + d) >>> 0
  }

  const result = new Uint8Array(16)
  ;[a0, b0, c0, d0].forEach((word, wordIndex) => {
    result[wordIndex * 4] = word & 0xff
    result[wordIndex * 4 + 1] = (word >>> 8) & 0xff
    result[wordIndex * 4 + 2] = (word >>> 16) & 0xff
    result[wordIndex * 4 + 3] = (word >>> 24) & 0xff
  })

  return toHex(result)
}

async function subtleDigest(algorithm: Exclude<HashAlgorithm, 'MD5'>, bytes: Uint8Array) {
  const source = new Uint8Array(bytes.byteLength)
  source.set(bytes)
  const buffer = await crypto.subtle.digest(algorithm, source)
  return toHex(new Uint8Array(buffer))
}

export async function hashBytes(bytes: Uint8Array, algorithm: HashAlgorithm) {
  if (algorithm === 'MD5') {
    return md5Bytes(bytes)
  }

  return subtleDigest(algorithm, bytes)
}

export async function hashText(input: string) {
  const bytes = new TextEncoder().encode(input)
  return buildHashRows(bytes)
}

export async function hashFile(file: File) {
  const arrayBuffer = await file.arrayBuffer()
  const rows = await buildHashRows(new Uint8Array(arrayBuffer))
  const meta: FileHashMeta = {
    name: file.name,
    type: file.type || 'unknown',
    size: formatByteSize(file.size),
  }

  return { rows, meta }
}

export async function buildHashRows(bytes: Uint8Array) {
  const algorithms: HashAlgorithm[] = ['MD5', 'SHA-1', 'SHA-256', 'SHA-512']
  const rows = await Promise.all(
    algorithms.map(async (algorithm) => {
      const value = await hashBytes(bytes, algorithm)
      return {
        algorithm,
        value,
        length: value.length,
      }
    })
  )

  return rows
}

export function compareTargetHash(target: string, rows: HashResultRow[]): HashComparisonResult {
  const normalizedTarget = target.trim().toLowerCase()

  if (!normalizedTarget) {
    return { matchedAlgorithm: null, normalizedTarget: '', matched: false }
  }

  const match = rows.find((row) => row.value.toLowerCase() === normalizedTarget)

  return {
    matchedAlgorithm: match?.algorithm || null,
    normalizedTarget,
    matched: Boolean(match),
  }
}
