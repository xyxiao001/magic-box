import { describe, expect, it } from 'vitest'
import { buildQrDownloadName, detectQrContentType } from '@/lib/qrcode-tool'

describe('qrcode helpers', () => {
  it('builds a readable download file name', () => {
    expect(buildQrDownloadName('https://magic-box-lyart.vercel.app/tools/time-lab')).toBe(
      'magic-box-lyart-vercel-app-tools.png'
    )
  })

  it('falls back when content is empty', () => {
    expect(buildQrDownloadName('   ')).toBe('magic-box-qr.png')
  })

  it('detects common qr content types', () => {
    expect(detectQrContentType('https://example.com')).toBe('URL')
    expect(detectQrContentType('WIFI:T:WPA;S:Magic;P:12345678;;')).toBe('Wi-Fi')
    expect(detectQrContentType('mailto:hello@example.com')).toBe('Email')
    expect(detectQrContentType('hello world')).toBe('Text')
  })
})
