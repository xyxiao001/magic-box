import { describe, expect, it } from 'vitest'
import {
  TOOL_SHARE_QUERY_KEY,
  buildToolShareUrl,
  decodeToolShareState,
  encodeToolShareState,
  readToolShareStateFromUrl,
} from './tool-share-service'

describe('tool share service', () => {
  it('encodes and decodes share state', () => {
    const source = {
      text: '你好 magic-box',
      options: {
        enabled: true,
      },
    }

    const encoded = encodeToolShareState(source)
    const decoded = decodeToolShareState<typeof source>(encoded)

    expect(decoded).toEqual(source)
  })

  it('builds and reads share url payloads', () => {
    const shareUrl = buildToolShareUrl(
      '/tools/text-toolkit',
      {
        inputText: 'hello world',
      },
      'https://magic-box.dev/tools/json-toolkit?foo=bar#hash'
    )

    expect(shareUrl).toContain('/tools/text-toolkit')
    expect(shareUrl).toContain(`${TOOL_SHARE_QUERY_KEY}=`)
    expect(readToolShareStateFromUrl<{ inputText: string }>(shareUrl)).toEqual({
      inputText: 'hello world',
    })
  })
})
