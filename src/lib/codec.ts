export type CodecMode = 'base64' | 'url'
export type CodecAction = 'encode' | 'decode' | 'decode-all'

export interface CodecResult {
  ok: boolean
  value?: string
  error?: string
  iterations?: number
}

function safeEncodeBase64(value: string) {
  const bytes = new TextEncoder().encode(value)
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('')

  return btoa(binary)
}

function safeDecodeBase64(value: string) {
  const binary = atob(value)
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))

  return new TextDecoder().decode(bytes)
}

function decodeUrlRepeatedly(value: string, maxIterations = 10) {
  let current = value
  let iterations = 0

  while (iterations < maxIterations) {
    const decoded = decodeURIComponent(current)

    if (decoded === current) {
      break
    }

    current = decoded
    iterations += 1
  }

  return {
    value: current,
    iterations,
  }
}

export function transformCodec(
  value: string,
  mode: CodecMode,
  action: CodecAction
): CodecResult {
  try {
    if (mode === 'base64') {
      return {
        ok: true,
        value: action === 'encode' ? safeEncodeBase64(value) : safeDecodeBase64(value),
      }
    }

    if (action === 'encode') {
      return {
        ok: true,
        value: encodeURIComponent(value),
        iterations: 1,
      }
    }

    if (action === 'decode') {
      return {
        ok: true,
        value: decodeURIComponent(value),
        iterations: 1,
      }
    }

    const result = decodeUrlRepeatedly(value)

    return {
      ok: true,
      value: result.value,
      iterations: result.iterations,
    }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : '转换失败',
    }
  }
}
