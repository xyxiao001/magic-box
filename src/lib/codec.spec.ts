import { describe, expect, it } from 'vitest'
import { transformCodec } from '@/lib/codec'

describe('codec helpers', () => {
  it('encodes base64', () => {
    const result = transformCodec('hello', 'base64', 'encode')

    expect(result).toEqual({
      ok: true,
      value: 'aGVsbG8=',
    })
  })

  it('decodes url encoded text', () => {
    const result = transformCodec('%E4%BD%A0%E5%A5%BD', 'url', 'decode')

    expect(result).toEqual({
      ok: true,
      value: '你好',
    })
  })
})
