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
  }
}

function parseStructuredOutput(source: string) {
  const parsed = parseJsonValue(source)

  if (!parsed.ok) {
    throw new Error(parsed.error ?? 'JSON 解析失败')
  }

  return parsed.value ?? null
}

export function executeJsonToolkit(input: JsonToolkitInput): JsonToolkitOutput {
  const structuredOutput = parseStructuredOutput(input.source)

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

  const result = convertJsonToJsObject(input.source)

  if (!result.ok) {
    throw new Error(result.error ?? 'JSON 解析失败')
  }

  return {
    text: result.value ?? '',
    outputType: 'js-object',
    structuredOutput,
    statusMessage: '已转换为 JS 对象字面量',
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
}
