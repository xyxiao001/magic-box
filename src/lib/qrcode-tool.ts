export function buildQrDownloadName(raw: string) {
  const normalized = raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32)

  return `${normalized || 'magic-box-qr'}.png`
}

export function detectQrContentType(raw: string) {
  const value = raw.trim()

  if (!value) {
    return '未输入'
  }

  if (/^WIFI:/i.test(value)) {
    return 'Wi-Fi'
  }

  if (/^mailto:/i.test(value)) {
    return 'Email'
  }

  if (/^https?:\/\//i.test(value)) {
    return 'URL'
  }

  return 'Text'
}
