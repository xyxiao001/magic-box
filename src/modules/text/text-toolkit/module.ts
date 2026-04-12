import {
  buildTextToolkitStats,
  defaultTextToolkitOptions,
  processTextToolkit,
  type TextToolkitOptions,
  type TextToolkitStats,
} from './logic'
import { textToolkitMeta } from './meta'
import type { ToolSample } from '@/tool-runtime/protocols/tool-module'
import type { ToolDownloadPayload } from '@/tool-runtime/services/tool-download-service'
import type { ToolModule } from '@/tool-runtime/protocols/tool-module'

export interface TextToolkitInput {
  inputText: string
  options: TextToolkitOptions
}

export interface TextToolkitOutput {
  outputText: string
  inputStats: TextToolkitStats
  outputStats: TextToolkitStats
  hasChanges: boolean
}

export const textToolkitSamples: ToolSample<TextToolkitInput>[] = [
  {
    id: 'dedupe-sort',
    label: '去重排序',
    summary: '适合处理 tag、名单、模块名、域名等按行列表。',
    apply: (currentInput) => ({
      ...currentInput,
      inputText: 'request-converter\njson-toolkit\nrequest-converter\nhash-studio',
      options: {
        ...defaultTextToolkitOptions,
        trimLines: true,
        dedupeLines: true,
        sortLines: true,
      },
    }),
  },
  {
    id: 'cleanup-spaces',
    label: '清理空白',
    summary: '适合清洗日志、文案、配置片段中的空白字符。',
    apply: (currentInput) => ({
      ...currentInput,
      inputText: 'hello    world\n\nmagic-box    ships\t\tfaster',
      options: {
        ...defaultTextToolkitOptions,
        collapseSpaces: true,
        removeBlankLines: true,
      },
    }),
  },
  {
    id: 'batch-prefix',
    label: '批量前缀',
    summary: '适合快速为多行内容补 `- `、`> `、`export ` 等前缀。',
    apply: (currentInput) => ({
      ...currentInput,
      inputText: 'json-toolkit\nrequest-converter\nurl-inspector',
      options: {
        ...defaultTextToolkitOptions,
        prefix: '- ',
      },
    }),
  },
]

export function createTextToolkitInitialInput(): TextToolkitInput {
  return {
    inputText: 'magic box\nships faster\n\nrequest-converter\nrequest-converter',
    options: {
      ...defaultTextToolkitOptions,
    },
  }
}

export function executeTextToolkit(input: TextToolkitInput): TextToolkitOutput {
  const outputText = processTextToolkit(input.inputText, input.options)

  return {
    outputText,
    inputStats: buildTextToolkitStats(input.inputText),
    outputStats: buildTextToolkitStats(outputText),
    hasChanges: outputText !== input.inputText,
  }
}

export function buildTextToolkitDownloadPayload(output: TextToolkitOutput | null): ToolDownloadPayload | null {
  if (!output) {
    return null
  }

  return {
    filename: 'text-toolkit-output.txt',
    content: output.outputText,
    mimeType: 'text/plain;charset=utf-8',
  }
}

export const textToolkitRuntimeModule: Omit<ToolModule<TextToolkitInput, TextToolkitOutput>, 'page'> = {
  meta: textToolkitMeta,
  createInitialInput: createTextToolkitInitialInput,
  execute: (input) => executeTextToolkit(input),
  samples: textToolkitSamples,
}
