import { afterEach, describe, expect, it, vi } from 'vitest'
import { downloadToolOutput } from './tool-download-service'

describe('tool download service', () => {
  const createObjectURL = vi.fn(() => 'blob:mock')
  const revokeObjectURL = vi.fn()

  afterEach(() => {
    createObjectURL.mockReset()
    revokeObjectURL.mockReset()
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('creates an object url and triggers anchor download', () => {
    vi.useFakeTimers()
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    vi.stubGlobal('URL', {
      createObjectURL,
      revokeObjectURL,
    })

    const result = downloadToolOutput({
      filename: 'output.txt',
      content: 'hello',
    })

    expect(result).toBe(true)
    expect(createObjectURL).toHaveBeenCalled()
    expect(click).toHaveBeenCalled()
    vi.runAllTimers()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock')

    click.mockRestore()
  })
})
