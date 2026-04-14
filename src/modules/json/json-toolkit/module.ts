import {
  convertJsonToJsObject,
  formatJson,
  minifyJson,
  parseJsonValue,
  validateJson,
} from './logic'
import { jsonToolkitMeta } from './meta'
import type { ToolDownloadPayload } from '@/tool-runtime/services/tool-download-service'
import type { ToolModule } from '@/tool-runtime/protocols/tool-module'

export type JsonToolkitAction = 'format' | 'minify' | 'validate' | 'convert-js-object'
export type JsonToolkitOutputType = 'json' | 'js-object' | 'message'
export type JsonToolkitStatusTone = 'neutral' | 'success'
export type JsonToolkitOutputTab = 'text' | 'tree'

export interface JsonToolkitInput {
  source: string
  action: JsonToolkitAction
  /** When converting to JS object literal, recursively parse nested JSON strings (object/array only). */
  deepConvert?: boolean
}

export interface JsonToolkitOutput {
  text: string
  outputType: JsonToolkitOutputType
  structuredOutput: unknown | null
  statusMessage: string
  statusTone: JsonToolkitStatusTone
  preferredTab: JsonToolkitOutputTab
}

export function createJsonToolkitInitialInput(): JsonToolkitInput {
  return {
    source: `{
  "requestId": "req_01HV7Y9K2X8MABCD",
  "success": true,
  "timestamp": "2026-04-11T13:20:00.000Z",
  "app": {
    "name": "Magic Box",
    "version": "1.3.0",
    "env": "prod",
    "maintainer": {
      "name": "frontend-team",
      "slack": "#magic-box"
    }
  },
  "user": {
    "id": 1024,
    "name": "Alice",
    "roles": ["admin", "developer"],
    "profile": {
      "email": "alice@example.com",
      "lastLoginAt": "2026-04-11T09:32:18.000Z",
      "preferences": {
        "theme": "dark",
        "language": "zh-CN",
        "favorites": ["json-toolkit", "diff-studio", "request-converter"]
      }
    }
  },
  "metrics": {
    "loadTimeMs": 128.6,
    "memoryMb": 84.2,
    "errorCount": 0
  },
  "experiments": [
    {
      "key": "json-tree-v2",
      "enabled": true,
      "ratio": 0.5
    },
    {
      "key": "smart-default-input",
      "enabled": false,
      "ratio": 0
    }
  ],
  "items": [
    {
      "id": "tool_001",
      "title": "JSON Toolkit",
      "tags": ["json", "format", "validate"],
      "stats": {
        "views": 1823,
        "likes": 231
      }
    },
    {
      "id": "tool_002",
      "title": "Request Converter",
      "tags": ["curl", "fetch", "axios"],
      "stats": {
        "views": 964,
        "likes": 121
      }
    }
  ],
  "feature-flags": {
    "allowCopy": true,
    "allowShare": false,
    "fallback": null
  }
}`,
    action: 'format',
    deepConvert: false,
  }
}

function parseStructuredOutput(source: string): unknown | null {
  const parsed = parseJsonValue(source)

  if (!parsed.ok) {
    throw new Error(parsed.error ?? 'JSON 解析失败')
  }

  return parsed.value ?? null
}

function looksLikeJsonContainer(raw: string) {
  const trimmed = raw.trim()
  if (!trimmed) {
    return false
  }
  const first = trimmed[0]
  const last = trimmed[trimmed.length - 1]
  return (first === '{' && last === '}') || (first === '[' && last === ']')
}

function deepParseNestedJsonStrings(
  value: unknown,
  options: {
    depth: number
    maxDepth: number
    maxStringLength: number
  }
): unknown {
  if (options.depth >= options.maxDepth) {
    return value
  }

  if (value === null) {
    return value
  }

  if (Array.isArray(value)) {
    return value.map((item) =>
      deepParseNestedJsonStrings(item, {
        ...options,
        depth: options.depth + 1,
      })
    )
  }

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>
    const next: Record<string, unknown> = {}
    for (const [key, item] of Object.entries(record)) {
      next[key] = deepParseNestedJsonStrings(item, {
        ...options,
        depth: options.depth + 1,
      })
    }
    return next
  }

  if (typeof value !== 'string') {
    return value
  }

  if (value.length > options.maxStringLength) {
    return value
  }

  if (!looksLikeJsonContainer(value)) {
    return value
  }

  const parsed = parseJsonValue(value)
  if (!parsed.ok) {
    return value
  }

  // Only upgrade strings to object/array; keep primitive parses as original string to avoid surprising changes.
  if (parsed.value === null || typeof parsed.value !== 'object') {
    return value
  }

  return deepParseNestedJsonStrings(parsed.value, {
    ...options,
    depth: options.depth + 1,
  })
}

export function executeJsonToolkit(input: JsonToolkitInput): JsonToolkitOutput {
  let structuredOutput: unknown | null = parseStructuredOutput(input.source)

  if (input.action === 'format') {
    const result = formatJson(input.source)

    if (!result.ok) {
      throw new Error(result.error ?? 'JSON 解析失败')
    }

    return {
      text: result.value ?? '',
      outputType: 'json',
      structuredOutput,
      statusMessage: '格式化完成，可切换到结构预览折叠浏览',
      statusTone: 'success',
      preferredTab: 'tree',
    }
  }

  if (input.action === 'minify') {
    const result = minifyJson(input.source)

    if (!result.ok) {
      throw new Error(result.error ?? 'JSON 解析失败')
    }

    return {
      text: result.value ?? '',
      outputType: 'json',
      structuredOutput,
      statusMessage: '压缩完成',
      statusTone: 'success',
      preferredTab: 'text',
    }
  }

  if (input.action === 'validate') {
    const result = validateJson(input.source)

    if (!result.ok) {
      throw new Error(result.error ?? 'JSON 解析失败')
    }

    return {
      text: result.value ?? 'JSON 有效',
      outputType: 'message',
      structuredOutput,
      statusMessage: 'JSON 有效，可直接查看结构预览',
      statusTone: 'success',
      preferredTab: 'tree',
    }
  }

  if (input.deepConvert) {
    structuredOutput = deepParseNestedJsonStrings(structuredOutput, {
      depth: 0,
      maxDepth: 12,
      maxStringLength: 100_000,
    })
  }

  const rawForConversion = JSON.stringify(structuredOutput)
  const result = convertJsonToJsObject(rawForConversion)

  if (!result.ok) {
    throw new Error(result.error ?? 'JSON 解析失败')
  }

  return {
    text: result.value ?? '',
    outputType: 'js-object',
    structuredOutput,
    statusMessage: input.deepConvert ? '已深度转换为 JS 对象字面量' : '已转换为 JS 对象字面量',
    statusTone: 'success',
    preferredTab: 'text',
  }
}

export function buildJsonToolkitDownloadPayload(
  input: JsonToolkitInput,
  output: JsonToolkitOutput | null
): ToolDownloadPayload | null {
  if (!output?.text) {
    return null
  }

  if (output.outputType === 'js-object') {
    return {
      filename: `json-toolkit-${input.action}.js`,
      content: output.text,
      mimeType: 'application/javascript;charset=utf-8',
    }
  }

  if (output.outputType === 'json') {
    return {
      filename: `json-toolkit-${input.action}.json`,
      content: output.text,
      mimeType: 'application/json;charset=utf-8',
    }
  }

  return {
    filename: `json-toolkit-${input.action}.txt`,
    content: output.text,
    mimeType: 'text/plain;charset=utf-8',
  }
}

export const jsonToolkitRuntimeModule: Omit<ToolModule<JsonToolkitInput, JsonToolkitOutput>, 'page'> = {
  meta: jsonToolkitMeta,
  createInitialInput: createJsonToolkitInitialInput,
  execute: (input) => executeJsonToolkit(input),
  runtime: {
    history: {
      mode: 'on-success',
      emptyText: '成功执行一次 JSON 处理后，这里会记录最近的结果。',
      buildEntryMeta: (input, output) => ({
        label:
          input.action === 'format'
            ? 'JSON 格式化'
            : input.action === 'minify'
              ? 'JSON 压缩'
              : input.action === 'validate'
                ? 'JSON 校验'
                : '转 JS 对象',
        description: output?.statusMessage ?? '最近一次 JSON 处理结果',
      }),
    },
    draft: {
      legacyKeys: ['magic-box:v1:tool-history:json-toolkit:state'],
      parseLegacy: (raw) => {
        try {
          const parsed = JSON.parse(raw) as Partial<{
            source: string
          }>

          if (!parsed.source) {
            return undefined
          }

          return {
            source: parsed.source,
            action: 'format',
            deepConvert: false,
          }
        } catch {
          return undefined
        }
      },
    },
    download: {
      label: '下载输出',
      buildPayload: (input, output) => buildJsonToolkitDownloadPayload(input, output),
      buildSuccessMessage: (payload) => `已开始下载 ${payload.filename}`,
    },
    share: {
      label: '复制分享链接',
      autoRunOnRestore: true,
      buildShareState: (input) => input,
      applySharedState: (sharedState) => sharedState as JsonToolkitInput,
    },
    copyOutput: {
      label: '复制输出',
      buildText: (_, output) => output?.text || null,
      buildSuccessMessage: () => '输出已复制',
    },
  },
}
