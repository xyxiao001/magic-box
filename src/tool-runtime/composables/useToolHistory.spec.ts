import { afterEach, describe, expect, it } from 'vitest'
import { useToolHistory } from './useToolHistory'
import { useToolState } from './useToolState'
import type { ToolModule } from '../protocols/tool-module'

interface HistoryInput {
  text: string
}

interface HistoryOutput {
  result: string
}

describe('useToolHistory', () => {
  afterEach(() => {
    window.localStorage.clear()
  })

  it('records and restores history entries', () => {
    const toolModule: ToolModule<HistoryInput, HistoryOutput> = {
      meta: {
        id: 'history-tool',
        title: 'History Tool',
        category: '文本',
        group: 'tests',
        path: '/tools/history-tool',
        description: 'history test tool',
        keywords: ['history'],
        capabilities: ['history'],
      },
      createInitialInput: () => ({
        text: 'initial',
      }),
      page: {} as ToolModule<HistoryInput, HistoryOutput>['page'],
    }

    const state = useToolState<HistoryInput, HistoryOutput>(toolModule)
    const history = useToolHistory<HistoryInput, HistoryOutput>(toolModule, state, {
      buildEntryMeta: (input, output) => ({
        label: output?.result ?? input.text,
      }),
    })

    history.recordHistory(
      { text: 'saved input' },
      {
        result: 'saved output',
      }
    )

    expect(history.entries.value).toHaveLength(1)

    state.input.value.text = 'changed'
    state.output.value = {
      result: 'changed result',
    }

    history.restoreEntry(history.entries.value[0]!)

    expect(state.input.value.text).toBe('saved input')
    expect(state.output.value).toEqual({
      result: 'saved output',
    })
  })
})
