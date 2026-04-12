import { afterEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { useToolDraft } from './useToolDraft'
import { useToolState } from './useToolState'
import { readToolDraft } from '../services/tool-draft-service'
import type { ToolModule } from '../protocols/tool-module'

interface DraftInput {
  text: string
}

describe('useToolDraft', () => {
  afterEach(() => {
    window.localStorage.clear()
  })

  it('restores saved drafts and persists edits', async () => {
    window.localStorage.setItem(
      'magic-box:v1:tool-runtime:draft-tool:draft',
      JSON.stringify({
        text: 'saved value',
      })
    )

    const toolModule: ToolModule<DraftInput, string> = {
      meta: {
        id: 'draft-tool',
        title: 'Draft Tool',
        category: '文本',
        group: 'tests',
        path: '/tools/draft-tool',
        description: 'draft test tool',
        keywords: ['draft'],
        capabilities: ['draft'],
      },
      createInitialInput: () => ({
        text: 'initial value',
      }),
      page: {} as ToolModule<DraftInput, string>['page'],
    }

    const state = useToolState(toolModule)
    useToolDraft(toolModule, state)

    expect(state.input.value.text).toBe('saved value')

    state.input.value.text = 'edited value'
    await nextTick()

    expect(readToolDraft<DraftInput>('draft-tool')).toEqual({
      text: 'edited value',
    })
  })
})
