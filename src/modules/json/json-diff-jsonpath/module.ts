import {
  buildJsonStructuredDiff,
  buildLineDiff,
  executeJsonPathQuery,
  formatJson,
  formatJsonPathResultValue,
  parseJsonDocument,
  type DiffResult,
  type JsonPathMatch,
  type JsonStructuredDiffResult,
} from './logic'
import { jsonDiffJsonPathMeta } from './meta'
import type { ToolSample } from '@/tool-runtime/protocols/tool-module'
import type { ToolDownloadPayload } from '@/tool-runtime/services/tool-download-service'
import type { ToolModule } from '@/tool-runtime/protocols/tool-module'

export type JsonDiffOutputTab = 'structured' | 'text' | 'jsonpath'
export type JsonDiffQuerySource = 'left' | 'right'

export interface JsonDiffJsonPathInput {
  leftInput: string
  rightInput: string
  queryExpression: string
  querySource: JsonDiffQuerySource
}

export interface JsonPathQueryResult {
  ok: boolean
  value?: JsonPathMatch[]
  error?: string
}

export interface JsonDiffJsonPathOutput {
  canDiff: boolean
  leftParsedOk: boolean
  rightParsedOk: boolean
  leftError: string
  rightError: string
  formattedLeft: string
  formattedRight: string
  textDiff: DiffResult
  structuredDiff: JsonStructuredDiffResult | null
  jsonPathResult: JsonPathQueryResult
  queryMatchesText: string
}

export interface JsonDiffTemplate {
  label: string
  summary: string
  left: string
  right: string
  query: string
}

export const jsonDiffJsonPathTemplates: JsonDiffTemplate[] = [
  {
    label: '接口响应',
    summary: '适合联调前后响应结构变化对比。',
    left: `{
  "requestId": "req_1001",
  "user": {
    "id": 1,
    "name": "Alice"
  },
  "items": [
    {
      "id": "tool_1",
      "status": "draft"
    }
  ]
}`,
    right: `{
  "requestId": "req_1002",
  "user": {
    "id": 1,
    "name": "Alice",
    "role": "admin"
  },
  "items": [
    {
      "id": "tool_1",
      "status": "published"
    },
    {
      "id": "tool_2",
      "status": "draft"
    }
  ]
}`,
    query: '$.items[*].id',
  },
  {
    label: '功能开关',
    summary: '适合查看配置漂移和字段增删。',
    left: `{
  "theme": "dark",
  "features": {
    "jsonDiff": false,
    "markdown": true
  }
}`,
    right: `{
  "theme": "dark",
  "features": {
    "jsonDiff": true,
    "markdown": true,
    "sqlFormatter": true
  }
}`,
    query: '$.features.*',
  },
]

export const jsonDiffJsonPathSamples: ToolSample<JsonDiffJsonPathInput>[] = jsonDiffJsonPathTemplates.map((template, index) => ({
  id: `json-diff-sample-${index + 1}`,
  label: template.label,
  summary: template.summary,
  apply: (currentInput) => ({
    ...currentInput,
    leftInput: template.left,
    rightInput: template.right,
    queryExpression: template.query,
  }),
}))

export function createJsonDiffJsonPathInitialInput(): JsonDiffJsonPathInput {
  return {
    leftInput: jsonDiffJsonPathTemplates[0]?.left ?? '',
    rightInput: jsonDiffJsonPathTemplates[0]?.right ?? '',
    queryExpression: jsonDiffJsonPathTemplates[0]?.query ?? '$',
    querySource: 'right',
  }
}

export function executeJsonDiffJsonPath(input: JsonDiffJsonPathInput): JsonDiffJsonPathOutput {
  const leftParsed = parseJsonDocument(input.leftInput)
  const rightParsed = parseJsonDocument(input.rightInput)
  const canDiff = leftParsed.ok && rightParsed.ok
  const formattedLeftResult = formatJson(input.leftInput)
  const formattedRightResult = formatJson(input.rightInput)
  const formattedLeft = formattedLeftResult.ok && formattedLeftResult.value ? formattedLeftResult.value : input.leftInput
  const formattedRight = formattedRightResult.ok && formattedRightResult.value ? formattedRightResult.value : input.rightInput
  const textDiff = buildLineDiff(formattedLeft, formattedRight)
  const structuredDiff = canDiff ? buildJsonStructuredDiff(leftParsed.value, rightParsed.value) : null
  const activeQueryInput = input.querySource === 'left' ? leftParsed : rightParsed

  let jsonPathResult: JsonPathQueryResult

  if (!input.queryExpression.trim()) {
    jsonPathResult = {
      ok: false,
      error: '请输入 JSONPath 表达式',
    }
  } else if (!activeQueryInput.ok) {
    jsonPathResult = {
      ok: false,
      error: `当前${input.querySource === 'left' ? '左侧' : '右侧'} JSON 不合法，无法执行查询`,
    }
  } else {
    jsonPathResult = executeJsonPathQuery(activeQueryInput.value, input.queryExpression)
  }

  const queryMatchesText =
    jsonPathResult.ok && jsonPathResult.value
      ? jsonPathResult.value.map((item) => `${item.path}\n${formatJsonPathResultValue(item.value)}`).join('\n\n')
      : ''

  return {
    canDiff,
    leftParsedOk: leftParsed.ok,
    rightParsedOk: rightParsed.ok,
    leftError: leftParsed.error ?? '',
    rightError: rightParsed.error ?? '',
    formattedLeft,
    formattedRight,
    textDiff,
    structuredDiff,
    jsonPathResult,
    queryMatchesText,
  }
}

export function buildJsonDiffJsonPathHistoryLabel(output: JsonDiffJsonPathOutput) {
  if (!output.canDiff) {
    return 'JSON 差异'
  }

  return `JSON 差异 +${output.structuredDiff?.stats.added ?? 0} ~${output.structuredDiff?.stats.changed ?? 0}`
}

export function buildJsonDiffJsonPathDownloadPayload(
  output: JsonDiffJsonPathOutput | null,
  outputTab: JsonDiffOutputTab
): ToolDownloadPayload | null {
  if (!output) {
    return null
  }

  if (outputTab === 'structured') {
    return {
      filename: 'json-diff-structured.json',
      content: JSON.stringify(output.structuredDiff, null, 2),
      mimeType: 'application/json;charset=utf-8',
    }
  }

  if (outputTab === 'text') {
    const content = output.textDiff.rows
      .map((row) => `[${row.type}] ${row.leftLineNumber ?? '-'} | ${row.rightLineNumber ?? '-'} | ${row.leftText} || ${row.rightText}`)
      .join('\n')

    return {
      filename: 'json-diff-text.txt',
      content,
      mimeType: 'text/plain;charset=utf-8',
    }
  }

  return {
    filename: 'jsonpath-result.txt',
    content: output.queryMatchesText,
    mimeType: 'text/plain;charset=utf-8',
  }
}

export const jsonDiffJsonPathRuntimeModule: Omit<ToolModule<JsonDiffJsonPathInput, JsonDiffJsonPathOutput>, 'page'> = {
  meta: jsonDiffJsonPathMeta,
  createInitialInput: createJsonDiffJsonPathInitialInput,
  execute: (input) => executeJsonDiffJsonPath(input),
  samples: jsonDiffJsonPathSamples,
}
