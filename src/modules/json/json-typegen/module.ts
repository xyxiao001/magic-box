import {
  generateTypeScriptFromJson,
  generateZodFromJson,
  parseJsonInput,
  type JsonTypegenConfig,
  type TsStyle,
} from './logic'
import { jsonTypegenMeta } from './meta'
import type { ToolSample } from '@/tool-runtime/protocols/tool-module'
import type { ToolDownloadPayload } from '@/tool-runtime/services/tool-download-service'
import type { ToolModule } from '@/tool-runtime/protocols/tool-module'

export type JsonTypegenOutputTab = 'typescript' | 'zod'

export interface JsonTypegenInput {
  jsonInput: string
  config: JsonTypegenConfig
}

export interface JsonTypegenOutput {
  typescriptOutput: string
  zodOutput: string
}

export interface JsonTypegenTemplate {
  label: string
  summary: string
  input: string
  config?: Partial<JsonTypegenConfig>
}

export const jsonTypegenTemplates: JsonTypegenTemplate[] = [
  {
    label: '基础对象',
    summary: '适合从简单接口返回值快速生成 Root 类型。',
    input: '{\n  "id": 1,\n  "name": "Magic Box"\n}',
  },
  {
    label: '对象数组',
    summary: '适合生成列表项类型，并验证可选字段推导。',
    input: '[\n  { "id": 1, "name": "Alice" },\n  { "id": 2, "role": "admin" }\n]',
  },
  {
    label: '空值兼容',
    summary: '适合验证 null 字段与可选字段的推导策略。',
    input: '{\n  "id": 1,\n  "nickname": null,\n  "profile": {\n    "bio": null\n  }\n}',
    config: {
      nullAsOptional: true,
    },
  },
]

export const jsonTypegenSamples: ToolSample<JsonTypegenInput>[] = jsonTypegenTemplates.map((template, index) => ({
  id: `json-typegen-sample-${index + 1}`,
  label: template.label,
  summary: template.summary,
  apply: (currentInput) => ({
    ...currentInput,
    jsonInput: template.input,
    config: {
      ...currentInput.config,
      ...template.config,
    },
  }),
}))

export function createJsonTypegenInitialInput(): JsonTypegenInput {
  return {
    jsonInput: jsonTypegenTemplates[0]?.input ?? '{\n  "id": 1,\n  "name": "Magic Box"\n}',
    config: {
      rootName: 'Root',
      tsStyle: 'interface',
      zodStrict: false,
      nullAsOptional: false,
    },
  }
}

export function executeJsonTypegen(input: JsonTypegenInput): JsonTypegenOutput {
  const parsed = parseJsonInput(input.jsonInput)

  if (!parsed.ok) {
    throw new Error(parsed.error ?? 'JSON 解析失败')
  }

  return {
    typescriptOutput: generateTypeScriptFromJson(parsed.value, input.config),
    zodOutput: generateZodFromJson(parsed.value, input.config),
  }
}

export function buildJsonTypegenHistoryLabel(input: JsonTypegenInput) {
  const preview = input.config.rootName.trim() || 'Root'
  return `JSON -> ${preview}`
}

export function buildJsonTypegenDownloadPayload(
  input: JsonTypegenInput,
  output: JsonTypegenOutput | null,
  activeTab: JsonTypegenOutputTab
): ToolDownloadPayload | null {
  if (!output) {
    return null
  }

  const baseName = input.config.rootName.trim() || 'Root'

  if (activeTab === 'typescript') {
    return {
      filename: `${baseName}.types.ts`,
      content: output.typescriptOutput,
      mimeType: 'application/typescript;charset=utf-8',
    }
  }

  return {
    filename: `${baseName}.schema.ts`,
    content: output.zodOutput,
    mimeType: 'application/typescript;charset=utf-8',
  }
}

export function updateJsonTypegenTsStyle(config: JsonTypegenConfig, tsStyle: TsStyle): JsonTypegenConfig {
  return {
    ...config,
    tsStyle,
  }
}

export const jsonTypegenRuntimeModule: Omit<ToolModule<JsonTypegenInput, JsonTypegenOutput>, 'page'> = {
  meta: jsonTypegenMeta,
  createInitialInput: createJsonTypegenInitialInput,
  execute: (input) => executeJsonTypegen(input),
  samples: jsonTypegenSamples,
}
