import {
  convertCsvToJson,
  convertJsonArrayToCsv,
  defaultCsvToolkitOptions,
  parseCsvInput,
  type CsvDelimiter,
  type CsvPreviewData,
  type CsvToolkitOptions,
  type CsvToolkitState,
} from './logic'
import { csvToolkitMeta } from './meta'
import type { ToolSample } from '@/tool-runtime/protocols/tool-module'
import type { ToolDownloadPayload } from '@/tool-runtime/services/tool-download-service'
import type { ToolModule } from '@/tool-runtime/protocols/tool-module'

export type CsvToolkitInputMode = 'csv' | 'json'
export type CsvToolkitOutputTab = 'preview' | 'json' | 'csv'

export interface CsvToolkitInput {
  inputMode: CsvToolkitInputMode
  inputText: string
  options: CsvToolkitOptions
}

export interface CsvToolkitOutput {
  previewResult: CsvToolkitState<CsvPreviewData>
  jsonOutput: CsvToolkitState<string>
  csvOutput: CsvToolkitState<string>
}

export interface CsvTemplate {
  label: string
  summary: string
  inputMode: CsvToolkitInputMode
  input: string
}

export const csvToolkitTemplates: CsvTemplate[] = [
  {
    label: '用户列表',
    summary: '适合把简单表格快速转成 JSON 数组。',
    inputMode: 'csv',
    input: `name,email,role
Alice,alice@example.com,admin
Bob,bob@example.com,editor`,
  },
  {
    label: '商品列表',
    summary: '适合运营或测试整理价格、库存、状态列。',
    inputMode: 'csv',
    input: `sku;title;price;stock
SKU-001;Magic Box Pro;199;42
SKU-002;Magic Box Lite;99;18`,
  },
  {
    label: 'JSON 数组',
    summary: '适合把接口结构快速导出成 CSV。',
    inputMode: 'json',
    input: `[
  {
    "id": "user_1",
    "name": "Alice",
    "role": "admin"
  },
  {
    "id": "user_2",
    "name": "Bob",
    "role": "editor"
  }
]`,
  },
]

export const csvToolkitSamples: ToolSample<CsvToolkitInput>[] = csvToolkitTemplates.map((template) => ({
  id: `csv-sample-${template.label}`,
  label: template.label,
  summary: template.summary,
  apply: (currentInput) => ({
    ...currentInput,
    inputMode: template.inputMode,
    inputText: template.input,
    options: {
      ...currentInput.options,
      delimiter: template.label === '商品列表' ? ';' : ',',
    },
  }),
}))

export function createCsvToolkitInitialInput(): CsvToolkitInput {
  return {
    inputMode: 'csv',
    inputText: csvToolkitTemplates[0]?.input ?? '',
    options: {
      ...defaultCsvToolkitOptions,
    },
  }
}

export function executeCsvToolkit(input: CsvToolkitInput): CsvToolkitOutput {
  const jsonOutput =
    input.inputMode === 'csv'
      ? convertCsvToJson(input.inputText, input.options)
      : {
          ok: true as const,
          value: input.inputText,
        }

  const csvOutput =
    input.inputMode === 'json'
      ? convertJsonArrayToCsv(input.inputText, input.options.delimiter)
      : {
          ok: true as const,
          value: input.inputText,
        }

  const previewResult =
    input.inputMode === 'csv'
      ? parseCsvInput(input.inputText, input.options)
      : (() => {
          if (!csvOutput.ok || csvOutput.value === undefined) {
            return {
              ok: false as const,
              error: csvOutput.error,
            }
          }

          return parseCsvInput(csvOutput.value, input.options)
        })()

  return {
    previewResult,
    jsonOutput,
    csvOutput,
  }
}

export function buildCsvToolkitHistoryLabel(input: CsvToolkitInput) {
  return input.inputMode === 'csv' ? 'CSV -> JSON 快照' : 'JSON -> CSV 快照'
}

export function updateCsvDelimiter(options: CsvToolkitOptions, delimiter: CsvDelimiter): CsvToolkitOptions {
  return {
    ...options,
    delimiter,
  }
}

export function buildCsvToolkitDownloadPayload(
  output: CsvToolkitOutput | null,
  outputTab: CsvToolkitOutputTab
): ToolDownloadPayload | null {
  if (!output) {
    return null
  }

  if (outputTab === 'json' && output.jsonOutput.ok && output.jsonOutput.value) {
    return {
      filename: 'csv-toolkit-output.json',
      content: output.jsonOutput.value,
      mimeType: 'application/json;charset=utf-8',
    }
  }

  if (output.csvOutput.ok && output.csvOutput.value) {
    return {
      filename: 'csv-toolkit-output.csv',
      content: output.csvOutput.value,
      mimeType: 'text/csv;charset=utf-8',
    }
  }

  return null
}

export const csvToolkitRuntimeModule: Omit<ToolModule<CsvToolkitInput, CsvToolkitOutput>, 'page'> = {
  meta: csvToolkitMeta,
  createInitialInput: createCsvToolkitInitialInput,
  execute: (input) => executeCsvToolkit(input),
  samples: csvToolkitSamples,
}
