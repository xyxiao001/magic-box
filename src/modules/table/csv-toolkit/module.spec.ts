import { describe, expect, it } from 'vitest'
import {
  buildCsvToolkitDownloadPayload,
  buildCsvToolkitHistoryLabel,
  createCsvToolkitInitialInput,
  executeCsvToolkit,
  updateCsvDelimiter,
} from './module'

describe('csv toolkit module', () => {
  it('converts csv input into preview and json output', () => {
    const input = createCsvToolkitInitialInput()
    input.inputMode = 'csv'
    input.inputText = 'name,age\nAlice,20'

    const output = executeCsvToolkit(input)

    expect(output.previewResult.ok).toBe(true)
    expect(output.previewResult.value?.rowCount).toBe(1)
    expect(output.jsonOutput.ok).toBe(true)
    expect(output.jsonOutput.value).toContain('"name": "Alice"')
    expect(buildCsvToolkitDownloadPayload(output, 'json')?.filename).toBe('csv-toolkit-output.json')
  })

  it('builds csv output from json input and updates delimiter', () => {
    const input = createCsvToolkitInitialInput()
    input.inputMode = 'json'
    input.inputText = '[{"name":"Alice","age":20}]'
    input.options = updateCsvDelimiter(input.options, ';')

    const output = executeCsvToolkit(input)

    expect(output.csvOutput.ok).toBe(true)
    expect(output.csvOutput.value).toBe('name;age\nAlice;20')
    expect(buildCsvToolkitHistoryLabel(input)).toBe('JSON -> CSV 快照')
  })
})
