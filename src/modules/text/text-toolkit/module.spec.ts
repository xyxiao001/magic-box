import { describe, expect, it } from 'vitest'
import { buildTextToolkitDownloadPayload, createTextToolkitInitialInput, executeTextToolkit } from './module'

describe('text toolkit module', () => {
  it('builds output and stats from input options', () => {
    const input = createTextToolkitInitialInput()
    input.inputText = ' banana \napple\nbanana\n'
    input.options.trimLines = true
    input.options.dedupeLines = true
    input.options.sortLines = true

    const output = executeTextToolkit(input)

    expect(output.outputText).toBe('\napple\nbanana')
    expect(output.hasChanges).toBe(true)
    expect(output.outputStats.lines).toBe(3)
    expect(buildTextToolkitDownloadPayload(output)?.filename).toBe('text-toolkit-output.txt')
  })
})
