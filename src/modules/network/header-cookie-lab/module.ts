import {
  dedupeHeaders,
  mergeHeaders,
  parseCookieHeader,
  parseHeadersText,
  parseSetCookieText,
  stringifyCookieHeader,
  stringifyHeaders,
  type CookieEntry,
  type HeaderEntry,
  type SetCookieEntry,
} from './logic'
import { headerCookieLabMeta } from './meta'
import type { ToolSample } from '@/tool-runtime/protocols/tool-module'
import type { ToolDownloadPayload } from '@/tool-runtime/services/tool-download-service'
import type { ToolModule } from '@/tool-runtime/protocols/tool-module'

export type HeaderCookieLabMode = 'headers' | 'cookie' | 'set-cookie'
export type HeaderCookieDedupeMode = 'keep-last' | 'keep-first'

export interface HeaderCookieLabInput {
  mode: HeaderCookieLabMode
  primaryText: string
  secondaryText: string
  dedupeMode: HeaderCookieDedupeMode
}

export interface HeaderCookieLabOutput {
  mergedHeaders: HeaderEntry[]
  dedupedHeaders: HeaderEntry[]
  cookieEntries: CookieEntry[]
  setCookieEntries: SetCookieEntry[]
  exportText: string
}

export interface HeaderCookieTemplate {
  label: string
  summary: string
  input: HeaderCookieLabInput
}

export const headerCookieLabTemplates: HeaderCookieTemplate[] = [
  {
    label: '请求头合并',
    summary: '适合合并两段 Header，并用去重策略保留目标值。',
    input: {
      mode: 'headers',
      primaryText: 'Authorization: Bearer token-a\nContent-Type: application/json',
      secondaryText: 'Content-Type: text/plain\nX-Trace-Id: trace-123',
      dedupeMode: 'keep-last',
    },
  },
  {
    label: 'Cookie 拆分',
    summary: '适合把浏览器请求头里的 Cookie 拆成键值列表。',
    input: {
      mode: 'cookie',
      primaryText: 'session_id=abc123; theme=dark; locale=zh-CN',
      secondaryText: '',
      dedupeMode: 'keep-last',
    },
  },
  {
    label: 'Set-Cookie 解析',
    summary: '适合把登录返回头中的 Set-Cookie 转成结构化 JSON。',
    input: {
      mode: 'set-cookie',
      primaryText: 'Set-Cookie: sid=abc; Path=/; HttpOnly\nSet-Cookie: locale=zh-CN; Path=/; SameSite=Lax',
      secondaryText: '',
      dedupeMode: 'keep-last',
    },
  },
]

export const headerCookieLabSamples: ToolSample<HeaderCookieLabInput>[] = headerCookieLabTemplates.map((template, index) => ({
  id: `header-cookie-sample-${index + 1}`,
  label: template.label,
  summary: template.summary,
  apply: () => ({
    ...template.input,
  }),
}))

export function createHeaderCookieLabInitialInput(): HeaderCookieLabInput {
  return {
    mode: 'headers',
    primaryText: 'Authorization: Bearer ...\nContent-Type: application/json',
    secondaryText: '',
    dedupeMode: 'keep-last',
  }
}

export function executeHeaderCookieLab(input: HeaderCookieLabInput): HeaderCookieLabOutput {
  const cookieEntries = parseCookieHeader(input.primaryText)
  const setCookieEntries = parseSetCookieText(input.primaryText)
  const mergedHeaders = mergeHeaders(parseHeadersText(input.primaryText), parseHeadersText(input.secondaryText))
  const dedupedHeaders = dedupeHeaders(mergedHeaders, input.dedupeMode)

  const exportText =
    input.mode === 'headers'
      ? stringifyHeaders(dedupedHeaders)
      : input.mode === 'cookie'
        ? stringifyCookieHeader(cookieEntries)
        : JSON.stringify(setCookieEntries, null, 2)

  return {
    mergedHeaders,
    dedupedHeaders,
    cookieEntries,
    setCookieEntries,
    exportText,
  }
}

export function buildHeaderCookieLabHistoryLabel(input: HeaderCookieLabInput, output: HeaderCookieLabOutput | null) {
  if (input.mode === 'headers') {
    return `Headers ${output?.dedupedHeaders.length ?? 0}`
  }

  if (input.mode === 'cookie') {
    return `Cookie ${output?.cookieEntries.length ?? 0}`
  }

  return `Set-Cookie ${output?.setCookieEntries.length ?? 0}`
}

export function buildHeaderCookieLabDownloadPayload(
  input: HeaderCookieLabInput,
  output: HeaderCookieLabOutput | null
): ToolDownloadPayload | null {
  if (!output) {
    return null
  }

  if (input.mode === 'set-cookie') {
    return {
      filename: 'header-cookie-lab-set-cookie.json',
      content: output.exportText,
      mimeType: 'application/json;charset=utf-8',
    }
  }

  return {
    filename: input.mode === 'headers' ? 'header-cookie-lab-headers.txt' : 'header-cookie-lab-cookie.txt',
    content: output.exportText,
    mimeType: 'text/plain;charset=utf-8',
  }
}

export const headerCookieLabRuntimeModule: Omit<ToolModule<HeaderCookieLabInput, HeaderCookieLabOutput>, 'page'> = {
  meta: headerCookieLabMeta,
  createInitialInput: createHeaderCookieLabInitialInput,
  execute: (input) => executeHeaderCookieLab(input),
  samples: headerCookieLabSamples,
}
