import { describe, expect, it } from 'vitest'
import { useToolExecution } from './useToolExecution'
import { useToolState } from './useToolState'
import type { ToolModule } from '../protocols/tool-module'

interface CounterInput {
  count: number
}

describe('useToolExecution', () => {
  it('runs tool execution and stores output', async () => {
    const toolModule: ToolModule<CounterInput, number> = {
      meta: {
        id: 'counter-tool',
        title: 'Counter Tool',
        category: '计算',
        group: 'tests',
        path: '/tools/counter-tool',
        description: 'test module',
        keywords: ['counter'],
      },
      createInitialInput: () => ({
        count: 2,
      }),
      execute: async (input) => input.count * 2,
      page: {} as ToolModule<CounterInput, number>['page'],
    }

    const state = useToolState(toolModule)
    const { run } = useToolExecution(toolModule, state)

    await run()

    expect(state.output.value).toBe(4)
    expect(state.error.value).toBeNull()
    expect(state.loading.value).toBe(false)
    expect(state.lastExecutedAt.value).not.toBeNull()
  })

  it('calls success hooks after execution', async () => {
    const calls: number[] = []
    const toolModule: ToolModule<CounterInput, number> = {
      meta: {
        id: 'counter-tool',
        title: 'Counter Tool',
        category: '计算',
        group: 'tests',
        path: '/tools/counter-tool',
        description: 'test module',
        keywords: ['counter'],
      },
      createInitialInput: () => ({
        count: 3,
      }),
      execute: async (input) => input.count * 2,
      page: {} as ToolModule<CounterInput, number>['page'],
    }

    const state = useToolState<CounterInput, number>(toolModule)
    const { run } = useToolExecution<CounterInput, number>(toolModule, state, {
      onSuccess: ({ output }) => {
        calls.push(output)
      },
    })

    await run()

    expect(calls).toEqual([6])
  })

  it('stops execution when validation fails', async () => {
    const toolModule: ToolModule<CounterInput, number> = {
      meta: {
        id: 'counter-tool',
        title: 'Counter Tool',
        category: '计算',
        group: 'tests',
        path: '/tools/counter-tool',
        description: 'test module',
        keywords: ['counter'],
      },
      createInitialInput: () => ({
        count: 0,
      }),
      validate: (input) => ({
        ok: input.count > 0,
        error: 'count must be positive',
      }),
      execute: async (input) => input.count * 2,
      page: {} as ToolModule<CounterInput, number>['page'],
    }

    const state = useToolState(toolModule)
    const { run } = useToolExecution(toolModule, state)

    await run()

    expect(state.output.value).toBeNull()
    expect(state.error.value).toBe('count must be positive')
  })
})
