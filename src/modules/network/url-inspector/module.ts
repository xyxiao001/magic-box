import {
  buildUrlInspectorQueryJson,
  parseUrlInspectorInput,
  type UrlInspectorQueryEntry,
  type UrlInspectorResult,
} from './logic'
import { urlInspectorMeta } from './meta'
import type { ToolSample } from '@/tool-runtime/protocols/tool-module'
import type { ToolModule } from '@/tool-runtime/protocols/tool-module'

export interface UrlTemplate {
  label: string
  summary: string
  value: string
}

export interface UrlInspectorInput {
  urlInput: string
}

export interface UrlInspectorOutput {
  parsed: UrlInspectorResult
  queryJson: string
  decodedHints: string[]
}

export const urlInspectorTemplates: UrlTemplate[] = [
  {
    label: 'HTTP 请求',
    summary: '适合和 HTTP Lab 联动，快速检查 query、hash 与路径。',
    value: 'https://api.magic-box.dev/users?tab=request&traceId=req-20260411#response',
  },
  {
    label: 'OAuth 回调',
    summary: '适合排查 redirect_uri、code、state 等常见登录回调参数。',
    value:
      'https://app.magic-box.dev/callback?code=auth-code-123&state=xyz&redirect_uri=https%3A%2F%2Fmagic-box.dev%2Fdone',
  },
  {
    label: '签名链接',
    summary: '适合查看 expires、token、signature 等鉴权参数。',
    value:
      'https://download.magic-box.dev/archive.zip?expires=1712534400&token=abc123&signature=sha256%3Adeadbeef',
  },
  {
    label: '埋点链接',
    summary: '适合检查 utm_source、utm_medium、utm_campaign 等营销参数。',
    value:
      'https://magic-box.dev/pricing?utm_source=newsletter&utm_medium=email&utm_campaign=spring-launch',
  },
]

export const urlInspectorSamples: ToolSample<UrlInspectorInput>[] = urlInspectorTemplates.map((template, index) => ({
  id: `url-sample-${index + 1}`,
  label: template.label,
  summary: template.summary,
  apply: (currentInput) => ({
    ...currentInput,
    urlInput: template.value,
  }),
}))

export function createUrlInspectorInitialInput(): UrlInspectorInput {
  return {
    urlInput: urlInspectorTemplates[0]?.value ?? '',
  }
}

function buildDecodedHints(parsed: UrlInspectorResult) {
  if (!parsed.ok) {
    return []
  }

  const hints: string[] = []

  if (parsed.pathname !== parsed.decodedPathname) {
    hints.push(`Path 解码后：${parsed.decodedPathname}`)
  }

  if (parsed.hash && parsed.hash !== parsed.decodedHash) {
    hints.push(`Hash 解码后：${parsed.decodedHash}`)
  }

  return hints
}

export function executeUrlInspector(input: UrlInspectorInput): UrlInspectorOutput {
  const parsed = parseUrlInspectorInput(input.urlInput)

  if (!parsed.ok) {
    throw new Error(parsed.error ?? '请输入合法 URL')
  }

  return {
    parsed,
    queryJson: buildUrlInspectorQueryJson(parsed.queryEntries),
    decodedHints: buildDecodedHints(parsed),
  }
}

export function buildUrlInspectorHistoryLabel(output: UrlInspectorOutput) {
  return `${output.parsed.hostname}${output.parsed.pathname}`
}

export function cloneUrlInspectorEntries(entries: UrlInspectorQueryEntry[]) {
  return entries.map((entry) => ({ ...entry }))
}

export const urlInspectorRuntimeModule: Omit<ToolModule<UrlInspectorInput, UrlInspectorOutput>, 'page'> = {
  meta: urlInspectorMeta,
  createInitialInput: createUrlInspectorInitialInput,
  execute: (input) => executeUrlInspector(input),
  samples: urlInspectorSamples,
}
