import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildToolShareUrl } from '../services/tool-share-service'
import type { ToolModule } from '../protocols/tool-module'
import { useToolCapabilityRuntime } from './useToolCapabilityRuntime'
import { useToolState } from './useToolState'

interface RuntimeInput {
  text: string
}

interface RuntimeOutput {
  result: string
}

describe('useToolCapabilityRuntime', () => {
  afterEach(() => {
    window.localStorage.clear()
    window.history.replaceState({}, '', '/')
  })

  it('builds scaffold panels and manual action items from capability config', async () => {
    const reset = vi.fn()
    const toolModule: ToolModule<RuntimeInput, RuntimeOutput> = {
      meta: {
        id: 'runtime-tool',
        title: 'Runtime Tool',
        category: '文本',
        group: 'tests',
        path: '/tools/runtime-tool',
        description: 'runtime test tool',
        keywords: ['runtime'],
        capabilities: ['history', 'draft', 'sample-data', 'download-output', 'share-url'],
      },
      createInitialInput: () => ({
        text: 'initial',
      }),
      samples: [
        {
          id: 'sample-1',
          label: '示例一',
          apply: () => ({
            text: 'sampled',
          }),
        },
      ],
      runtime: {
        history: {
          mode: 'manual',
          emptyText: 'manual history',
          buildEntryMeta: (input) => ({
            label: input.text,
          }),
        },
        draft: {
          resetLabel: '清空',
        },
        download: {
          buildPayload: (_, output) =>
            output
              ? {
                  filename: 'output.txt',
                  content: output.result,
                  mimeType: 'text/plain',
                }
              : null,
        },
        share: {
          buildShareState: (input) => input,
        },
      },
      page: {} as ToolModule<RuntimeInput, RuntimeOutput>['page'],
    }

    const state = useToolState<RuntimeInput, RuntimeOutput>(toolModule)
    state.output.value = {
      result: 'ready',
    }

    const runtime = useToolCapabilityRuntime(toolModule, state, {
      reset,
      run: async () => state.output.value,
    })

    expect(runtime.samplePanel.value?.samples).toHaveLength(1)
    expect(runtime.historyPanel.value?.emptyText).toBe('manual history')
    expect(runtime.actionItems.value.map((item) => item.id)).toEqual([
      'download-output',
      'share-url',
      'save-history',
      'reset',
    ])

    runtime.samplePanel.value?.onApply('sample-1')
    expect(state.input.value.text).toBe('sampled')

    const saveHistoryAction = runtime.actionItems.value.find((item) => item.id === 'save-history')
    await saveHistoryAction?.onClick()

    expect(runtime.history.entries.value).toHaveLength(1)

    const resetAction = runtime.actionItems.value.find((item) => item.id === 'reset')
    await resetAction?.onClick()

    expect(reset).toHaveBeenCalledTimes(1)
  })

  it('records success history and re-runs after restoring shared state when configured', async () => {
    const run = vi.fn(async () => ({
      result: 'rerun',
    }))
    const toolModule: ToolModule<RuntimeInput, RuntimeOutput> = {
      meta: {
        id: 'runtime-share-tool',
        title: 'Runtime Share Tool',
        category: '文本',
        group: 'tests',
        path: '/tools/runtime-share-tool',
        description: 'runtime share test tool',
        keywords: ['runtime', 'share'],
        capabilities: ['history', 'share-url'],
      },
      createInitialInput: () => ({
        text: 'initial',
      }),
      runtime: {
        history: {
          mode: 'on-success',
          buildEntryMeta: (input) => ({
            label: input.text,
          }),
        },
        share: {
          autoRunOnRestore: true,
          buildShareState: (input) => input,
          applySharedState: (sharedState) => sharedState as RuntimeInput,
        },
      },
      page: {} as ToolModule<RuntimeInput, RuntimeOutput>['page'],
    }

    const shareUrl = buildToolShareUrl(
      toolModule.meta.path,
      {
        text: 'shared',
      },
      `${window.location.origin}${toolModule.meta.path}`
    )
    window.history.replaceState({}, '', shareUrl)

    const state = useToolState<RuntimeInput, RuntimeOutput>(toolModule)
    const runtime = useToolCapabilityRuntime(toolModule, state, {
      reset: vi.fn(),
      run,
    })

    runtime.handleExecutionSuccess(
      {
        text: 'saved input',
      },
      {
        result: 'saved output',
      }
    )
    expect(runtime.history.entries.value).toHaveLength(1)

    await runtime.restoreSharedState()

    expect(state.input.value).toEqual({
      text: 'shared',
    })
    expect(run).toHaveBeenCalledTimes(1)
  })
})
