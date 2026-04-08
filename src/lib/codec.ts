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

export function transformCodec(
  value: string,
  mode: 'base64' | 'url',
  action: 'encode' | 'decode'
) {
  try {
    if (mode === 'base64') {
      return {
        ok: true,
        value: action === 'encode' ? safeEncodeBase64(value) : safeDecodeBase64(value),
      }
    }

    return {
      ok: true,
      value: action === 'encode' ? encodeURIComponent(value) : decodeURIComponent(value),
    }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : '转换失败',
    }
  }
}
