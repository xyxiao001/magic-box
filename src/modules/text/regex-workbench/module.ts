import { analyzeRegex, type RegexAnalysisResult, type RegexMatchEntry } from './logic'
import { regexWorkbenchMeta } from './meta'
import type { ToolSample } from '@/tool-runtime/protocols/tool-module'
import type { ToolDownloadPayload } from '@/tool-runtime/services/tool-download-service'
import type { ToolModule } from '@/tool-runtime/protocols/tool-module'

export interface RegexWorkbenchInput {
  pattern: string
  flags: string
  replacement: string
  testText: string
}

export interface RegexWorkbenchOutput {
  analysis: RegexAnalysisResult
}

export interface HighlightSegment {
  kind: 'plain' | 'match'
  value: string
  matchNumber?: number
  zeroWidth?: boolean
}

export const regexWorkbenchSamples: ToolSample<RegexWorkbenchInput>[] = [
  {
    id: 'key-value',
    label: '键值对',
    summary: '提取 env、query string 或日志字段里的 key=value 对。',
    apply: () => ({
      pattern: '(?<name>[a-z]+)=(\\d+)',
      flags: 'g',
      replacement: '$<name>: $2',
      testText: 'count=42\nuser=7\nlevel=3',
    }),
  },
  {
    id: 'date-reformat',
    label: '日期提取',
    summary: '把 YYYY-MM-DD 重排成更适合展示的格式。',
    apply: () => ({
      pattern: '(\\d{4})-(\\d{2})-(\\d{2})',
      flags: 'g',
      replacement: '$3/$2/$1',
      testText: '2026-04-08\n2025-12-01',
    }),
  },
  {
    id: 'url-extract',
    label: 'URL 提取',
    summary: '从文案、日志或 Markdown 中提取 HTTP 链接。',
    apply: () => ({
      pattern: 'https?:\\/\\/[^\\s)"]+',
      flags: 'g',
      replacement: '[link] $&',
      testText: '文档 https://developer.mozilla.org/docs/Web/JavaScript ，站点 https://magic-box.dev/tools/time-lab',
    }),
  },
  {
    id: 'phone-mask',
    label: '手机号脱敏',
    summary: '保留前三后四位，适合展示用户信息时做脱敏。',
    apply: () => ({
      pattern: '(1\\d{2})\\d{4}(\\d{4})',
      flags: 'g',
      replacement: '$1****$2',
      testText: '13812345678\n15600001234',
    }),
  },
  {
    id: 'markdown-title',
    label: 'Markdown 标题',
    summary: '批量定位不同级别标题，适合做文档结构预览。',
    apply: () => ({
      pattern: '^(#{1,6})\\s+(.+)$',
      flags: 'gm',
      replacement: '$1 [$2]',
      testText: '# Magic Box\n## Regex Workbench\n### 模板清单',
    }),
  },
]

export const regexQuickFlags = [
  { flag: 'g', meaning: '全局匹配，列出文本中的所有命中。' },
  { flag: 'i', meaning: '忽略大小写，适合 URL、标签和日志关键词。' },
  { flag: 'm', meaning: '多行模式，让 ^ 和 $ 作用于每一行。' },
  { flag: 's', meaning: '让 . 可以跨行匹配，处理大块文本时更常见。' },
  { flag: 'u', meaning: '启用 Unicode 感知，处理中英文混排更稳。' },
] as const

export const regexQuickRecipes = [
  { token: '(...)', meaning: '捕获组，替换时可用 $1、$2 引用。' },
  { token: '(?<name>...)', meaning: '命名分组，替换时可用 $<name>。' },
  { token: '\\b', meaning: '单词边界，常用于日志级别、关键词和 token。' },
  { token: '\\s / \\S', meaning: '空白与非空白字符，经常配合清洗文本。' },
  { token: '?= / ?!', meaning: '正向预查与负向预查，适合只校验上下文。' },
] as const

export function createRegexWorkbenchInitialInput(): RegexWorkbenchInput {
  return {
    pattern: '(?<name>[a-z]+)=(\\d+)',
    flags: 'g',
    replacement: '$<name>: $2',
    testText: 'count=42\nuser=7\nlevel=3',
  }
}

export function executeRegexWorkbench(input: RegexWorkbenchInput): RegexWorkbenchOutput {
  return {
    analysis: analyzeRegex(input.pattern, input.flags, input.testText, input.replacement),
  }
}

export function buildRegexWorkbenchHistoryLabel(output: RegexWorkbenchOutput) {
  return `Regex ${output.analysis.ok ? output.analysis.matchCount ?? 0 : '错误'}`
}

export function buildRegexWorkbenchDownloadPayload(output: RegexWorkbenchOutput | null): ToolDownloadPayload | null {
  if (!output?.analysis.ok) {
    return null
  }

  const body = [
    `Match Count: ${output.analysis.matchCount ?? 0}`,
    '',
    '[Replacement Preview]',
    output.analysis.replacementPreview ?? '',
    '',
    '[Matches]',
    JSON.stringify(output.analysis.matches ?? [], null, 2),
  ].join('\n')

  return {
    filename: 'regex-workbench-report.txt',
    content: body,
    mimeType: 'text/plain;charset=utf-8',
  }
}

export function buildHighlightSegments(text: string, matches: RegexMatchEntry[]) {
  if (!matches.length) {
    return [{ kind: 'plain', value: text }] satisfies HighlightSegment[]
  }

  const segments: HighlightSegment[] = []
  let cursor = 0

  matches.forEach((match, matchIndex) => {
    const start = Math.max(0, match.index)
    const end = start + match.value.length

    if (start > cursor) {
      segments.push({
        kind: 'plain',
        value: text.slice(cursor, start),
      })
    }

    if (match.value.length === 0) {
      segments.push({
        kind: 'match',
        value: '∅',
        matchNumber: matchIndex + 1,
        zeroWidth: true,
      })
      return
    }

    if (end > cursor) {
      segments.push({
        kind: 'match',
        value: text.slice(start, end),
        matchNumber: matchIndex + 1,
      })
      cursor = end
    }
  })

  if (cursor < text.length) {
    segments.push({
      kind: 'plain',
      value: text.slice(cursor),
    })
  }

  return segments.length ? segments : ([{ kind: 'plain', value: text }] satisfies HighlightSegment[])
}

export const regexWorkbenchRuntimeModule: Omit<ToolModule<RegexWorkbenchInput, RegexWorkbenchOutput>, 'page'> = {
  meta: regexWorkbenchMeta,
  createInitialInput: createRegexWorkbenchInitialInput,
  execute: (input) => executeRegexWorkbench(input),
  samples: regexWorkbenchSamples,
}
