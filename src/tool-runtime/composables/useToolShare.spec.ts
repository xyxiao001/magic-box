import { afterEach, describe, expect, it } from 'vitest'
import { useToolShare } from './useToolShare'
import { useToolState } from './useToolState'
import { buildToolShareUrl } from '../services/tool-share-service'
import type { ToolModule } from '../protocols/tool-module'

interface ShareInput {
  text: string
}

describe('useToolShare', () => {
  afterEach(() => {
    window.history.replaceState({}, '', '/')
  })

  it('restores shared state from current url', () => {
    const toolModule: ToolModule<ShareInput, string> = {
      meta: {
        id: 'share-tool',
        title: 'Share Tool',
        category: '文本',
        group: 'tests',
        path: '/tools/share-tool',
        description: 'share test tool',
        keywords: ['share'],
        capabilities: ['share-url'],
      },
      createInitialInput: () => ({
        text: 'initial',
      }),
      page: {} as ToolModule<ShareInput, string>['page'],
    }

    const currentUrl = buildToolShareUrl(
      '/tools/share-tool',
      {
        text: 'shared value',
      },
      `${window.location.origin}/tools/share-tool`
    )
    window.history.replaceState({}, '', currentUrl)

    const state = useToolState(toolModule)
    const share = useToolShare(toolModule, state)

    expect(share.restoreSharedState()).toBe(true)
    expect(state.input.value).toEqual({
      text: 'shared value',
    })
  })
})
