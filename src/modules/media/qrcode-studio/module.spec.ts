import { describe, expect, it } from 'vitest'
import {
  buildQrcodeStudioHistoryLabel,
  createQrcodeStudioInitialInput,
  executeQrcodeStudio,
  qrcodeStudioSamples,
} from './module'

describe('qrcode studio module', () => {
  it('generates qr code output', async () => {
    const input = createQrcodeStudioInitialInput()
    const output = await executeQrcodeStudio(input)

    expect(output.type).toBe('URL')
    expect(output.downloadName).toContain('.png')
    expect(output.dataUrl.startsWith('data:image/png')).toBe(true)
  })

  it('builds history labels and exposes samples', async () => {
    const output = await executeQrcodeStudio(createQrcodeStudioInitialInput())

    expect(buildQrcodeStudioHistoryLabel(output)).toContain('二维码')
    expect(qrcodeStudioSamples).toHaveLength(4)
  })
})
