import { describe, expect, it, vi } from 'vitest'
import {
  buildHttpLabDownloadPayload,
  buildHttpLabHistoryLabel,
  createHttpLabInitialInput,
  executeHttpLab,
  httpLabSamples,
} from './module'

describe('http lab module', () => {
  it('builds response output from fetch', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers({ 'content-type': 'application/json' }),
      text: async () => '{"ok":true}',
    })

    vi.stubGlobal('fetch', fetchMock)

    const output = await executeHttpLab(createHttpLabInitialInput())

    expect(output.statusText).toBe('200 OK')
    expect(output.responseBody).toContain('"ok": true')
    expect(buildHttpLabDownloadPayload(output)?.filename).toBe('http-lab-response.txt')
  })

  it('builds history labels and exposes samples', () => {
    expect(buildHttpLabHistoryLabel({
      statusText: '204 No Content',
      durationText: '12 ms',
      contentType: 'text/plain',
      sizeText: '0 B',
      responseHeaders: '',
      responseBody: '',
      ok: true,
    })).toBe('204 No Content')
    expect(httpLabSamples).toHaveLength(4)
  })
})
