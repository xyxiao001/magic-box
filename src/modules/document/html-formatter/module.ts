import { buildHtmlStats, formatHtml, hasHtmlDoctype, type HtmlFormatterOptions, type HtmlStats } from './logic'
import { htmlFormatterMeta } from './meta'
import type { ToolSample } from '@/tool-runtime/protocols/tool-module'
import type { ToolDownloadPayload } from '@/tool-runtime/services/tool-download-service'
import type { ToolModule } from '@/tool-runtime/protocols/tool-module'

export interface HtmlFormatterInput {
  htmlInput: string
  options: HtmlFormatterOptions
}

export interface HtmlFormatterOutput {
  formattedText: string
  inputStats: HtmlStats
  outputStats: HtmlStats
  hasChanges: boolean
  compact: boolean
  addedDoctype: boolean
}

export interface HtmlTemplate {
  label: string
  summary: string
  input: string
}

export const htmlFormatterTemplates: HtmlTemplate[] = [
  {
    label: '页面骨架',
    summary: '适合整理完整 HTML 文档、模板页和邮件骨架。',
    input: `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><title>Magic Box</title></head><body><main class="page-shell"><h1>Magic Box</h1><p>Format HTML locally.</p></main></body></html>`,
  },
  {
    label: '卡片列表',
    summary: '适合整理组件片段、卡片流和营销模块。',
    input: `<section class="card-list"><article class="card"><h2>Starter</h2><p>适合快速试用。</p><button type="button">立即开始</button></article><article class="card featured"><h2>Pro</h2><p>适合团队协作。</p><button type="button">联系销售</button></article></section>`,
  },
]

export const htmlFormatterSamples: ToolSample<HtmlFormatterInput>[] = htmlFormatterTemplates.map((template, index) => ({
  id: `html-sample-${index + 1}`,
  label: template.label,
  summary: template.summary,
  apply: (currentInput) => ({
    ...currentInput,
    htmlInput: template.input,
  }),
}))

export function createHtmlFormatterInitialInput(): HtmlFormatterInput {
  return {
    htmlInput: htmlFormatterTemplates[0]?.input ?? '',
    options: {
      indentSize: 2,
      compact: false,
      addDoctype: false,
    },
  }
}

export async function executeHtmlFormatter(input: HtmlFormatterInput): Promise<HtmlFormatterOutput> {
  const hadDoctype = hasHtmlDoctype(input.htmlInput)
  const result = await formatHtml(input.htmlInput, input.options)

  if (!result.ok) {
    throw new Error(result.error ?? 'HTML 格式化失败')
  }

  const formattedText = result.value ?? ''
  const hasDoctypeNow = hasHtmlDoctype(formattedText)

  return {
    formattedText,
    inputStats: buildHtmlStats(input.htmlInput),
    outputStats: buildHtmlStats(formattedText),
    hasChanges: formattedText !== input.htmlInput,
    compact: input.options.compact,
    addedDoctype: !hadDoctype && hasDoctypeNow,
  }
}

export function buildHtmlFormatterHistoryLabel(input: HtmlFormatterInput) {
  return input.options.compact ? '压缩 HTML' : '格式化 HTML'
}

export function buildHtmlFormatterDownloadPayload(output: HtmlFormatterOutput | null): ToolDownloadPayload | null {
  if (!output) {
    return null
  }

  return {
    filename: output.compact ? 'html-formatter-compact.html' : 'html-formatter-formatted.html',
    content: output.formattedText,
    mimeType: 'text/html;charset=utf-8',
  }
}

export const htmlFormatterRuntimeModule: Omit<ToolModule<HtmlFormatterInput, HtmlFormatterOutput>, 'page'> = {
  meta: htmlFormatterMeta,
  createInitialInput: createHtmlFormatterInitialInput,
  execute: (input) => executeHtmlFormatter(input),
  samples: htmlFormatterSamples,
}
