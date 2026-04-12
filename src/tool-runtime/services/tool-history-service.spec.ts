import { afterEach, describe, expect, it } from 'vitest'
import {
  clearToolHistory,
  createToolHistoryEntry,
  readToolHistory,
  writeToolHistory,
} from './tool-history-service'

describe('tool history service', () => {
  afterEach(() => {
    window.localStorage.clear()
  })

  it('stores and clears tool history entries', () => {
    const entry = createToolHistoryEntry(
      { source: 'hello' },
      { output: 'world' },
      {
        label: '文本处理',
        description: 'first entry',
      }
    )

    writeToolHistory('text-toolkit', [entry])

    expect(readToolHistory('text-toolkit')).toEqual([entry])

    clearToolHistory('text-toolkit')

    expect(readToolHistory('text-toolkit')).toEqual([])
  })
})
