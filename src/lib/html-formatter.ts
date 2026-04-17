import { format as prettierFormat } from 'prettier/standalone'
import babelPlugin from 'prettier/plugins/babel'
import estreePlugin from 'prettier/plugins/estree'
import htmlPlugin from 'prettier/plugins/html'
import postcssPlugin from 'prettier/plugins/postcss'

export interface HtmlFormatterOptions {
  indentSize: number
  compact: boolean
  addDoctype: boolean
}

export interface HtmlFormatterState {
  ok: boolean
  value?: string
  error?: string
}

export interface HtmlStats {
  characters: number
  lines: number
}

const doctypePattern = /^\s*<!doctype html>/i

function clampIndentSize(indentSize: number) {
  return Math.min(8, Math.max(2, Math.trunc(indentSize || 2)))
}

function looksLikeDocument(input: string) {
  return /<html[\s>]/i.test(input) || /<(head|body|title|meta|link|main)[\s>]/i.test(input)
}

function normalizeHtmlInput(input: string, options: HtmlFormatterOptions) {
  const trimmed = input.trim()

  if (!options.addDoctype || doctypePattern.test(trimmed) || !looksLikeDocument(trimmed)) {
    return trimmed
  }

  return `<!doctype html>\n${trimmed}`
}

function compactFormattedHtml(input: string) {
  return input.replaceAll(/>\s+</g, '><').trim()
}

function normalizeFormatterError(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return `HTML 格式化失败：${error.message.trim()}`
  }

  return 'HTML 格式化失败'
}

export async function formatHtml(input: string, options: HtmlFormatterOptions): Promise<HtmlFormatterState> {
  if (!input.trim()) {
    return {
      ok: false,
      error: '请输入 HTML',
    }
  }

  try {
    const formatted = await prettierFormat(normalizeHtmlInput(input, options), {
      parser: 'html',
      plugins: [htmlPlugin, babelPlugin, estreePlugin, postcssPlugin],
      tabWidth: clampIndentSize(options.indentSize),
      htmlWhitespaceSensitivity: 'css',
      singleAttributePerLine: false,
    })

    return {
      ok: true,
      value: options.compact ? compactFormattedHtml(formatted) : formatted.trim(),
    }
  } catch (error) {
    return {
      ok: false,
      error: normalizeFormatterError(error),
    }
  }
}

export function buildHtmlStats(input: string): HtmlStats {
  if (!input) {
    return {
      characters: 0,
      lines: 0,
    }
  }

  return {
    characters: input.length,
    lines: input.split('\n').length,
  }
}

export function hasHtmlDoctype(input: string) {
  return doctypePattern.test(input.trim())
}
