import { buildTimeLabResult, type TimeLabResult } from './logic'
import { timeLabMeta } from './meta'
import type { ToolSample } from '@/tool-runtime/protocols/tool-module'
import type { ToolDownloadPayload } from '@/tool-runtime/services/tool-download-service'
import type { ToolModule } from '@/tool-runtime/protocols/tool-module'

export interface TimeLabInput {
  input: string
}

export interface TimeLabOutput {
  ok: boolean
  error: string
  result: TimeLabResult | null
}

export const timeLabSamples: ToolSample<TimeLabInput>[] = [
  {
    id: 'unix-seconds',
    label: '秒级时间戳',
    summary: '适合处理后端常见的 10 位 Unix 秒级时间戳。',
    apply: () => ({
      input: '1712534400',
    }),
  },
  {
    id: 'unix-milliseconds',
    label: '毫秒级时间戳',
    summary: '适合处理前端埋点、日志和 JS Date.now() 输出。',
    apply: () => ({
      input: '1775664000000',
    }),
  },
  {
    id: 'iso-string',
    label: 'ISO 时间',
    summary: '适合验证接口返回的 ISO 日期字符串。',
    apply: () => ({
      input: '2026-04-08T16:00:00Z',
    }),
  },
]

export function createTimeLabInitialInput(): TimeLabInput {
  return {
    input: String(Date.now()),
  }
}

export function executeTimeLab(input: TimeLabInput): TimeLabOutput {
  const result = buildTimeLabResult(input.input)

  if (!input.input.trim()) {
    return {
      ok: false,
      error: '输入 10 位秒级、13 位毫秒级时间戳，或标准日期字符串。',
      result: null,
    }
  }

  if (!result) {
    return {
      ok: false,
      error: '无法识别这个时间输入。',
      result: null,
    }
  }

  return {
    ok: true,
    error: '',
    result,
  }
}

export function buildTimeLabHistoryLabel(output: TimeLabOutput) {
  return output.result?.unixSeconds ? `时间 ${output.result.unixSeconds}` : '时间快照'
}

export function buildTimeLabDownloadPayload(output: TimeLabOutput | null): ToolDownloadPayload | null {
  if (!output?.ok || !output.result) {
    return null
  }

  const body = [
    `ISO: ${output.result.iso}`,
    `Local: ${output.result.local}`,
    `UTC: ${output.result.utc}`,
    `Unix Seconds: ${output.result.unixSeconds}`,
    `Unix Milliseconds: ${output.result.unixMilliseconds}`,
  ].join('\n')

  return {
    filename: 'time-lab-output.txt',
    content: body,
    mimeType: 'text/plain;charset=utf-8',
  }
}

export const timeLabRuntimeModule: Omit<ToolModule<TimeLabInput, TimeLabOutput>, 'page'> = {
  meta: timeLabMeta,
  createInitialInput: createTimeLabInitialInput,
  execute: (input) => executeTimeLab(input),
  samples: timeLabSamples,
}
