import { describe, expect, it } from 'vitest'
import { useToolSamples } from './useToolSamples'
import { useToolState } from './useToolState'
import type { ToolModule } from '../protocols/tool-module'

interface SampleInput {
  text: string
}

describe('useToolSamples', () => {
  it('exposes runtime samples and applies them to input state', () => {
    const toolModule: ToolModule<SampleInput, string> = {
      meta: {
        id: 'sample-tool',
        title: 'Sample Tool',
        category: '文本',
        group: 'tests',
        path: '/tools/sample-tool',
        description: 'sample test tool',
        keywords: ['sample'],
        capabilities: ['sample-data'],
      },
      createInitialInput: () => ({
        text: 'initial',
      }),
      samples: [
        {
          id: 'sample-1',
          label: '示例一',
          apply: () => ({
            text: 'applied sample',
          }),
        },
      ],
      page: {} as ToolModule<SampleInput, string>['page'],
    }

    const state = useToolState(toolModule)
    const samples = useToolSamples(toolModule, state)

    expect(samples.samples.value).toHaveLength(1)

    samples.applySample(samples.samples.value[0]!)

    expect(state.input.value).toEqual({
      text: 'applied sample',
    })
  })
})
