import { buildLineDiff, type DiffResult } from './logic'
import { diffStudioMeta } from './meta'
import type { ToolSample } from '@/tool-runtime/protocols/tool-module'
import type { ToolDownloadPayload } from '@/tool-runtime/services/tool-download-service'
import type { ToolModule } from '@/tool-runtime/protocols/tool-module'

export interface DiffStudioInput {
  leftInput: string
  rightInput: string
}

export interface DiffStudioOutput {
  diff: DiffResult
}

export const diffStudioSamples: ToolSample<DiffStudioInput>[] = [
  {
    id: 'config-change',
    label: '配置变更',
    summary: '适合比较环境变量、Vite 配置和服务参数。',
    apply: () => ({
      leftInput: `APP_NAME=MagicBox\nAPI_BASE=https://api.example.com\nFEATURE_MARKDOWN=false\nLOG_LEVEL=info`,
      rightInput: `APP_NAME=MagicBox\nAPI_BASE=https://api.internal.example.com\nFEATURE_MARKDOWN=true\nLOG_LEVEL=warn\nTRACE_ENABLED=true`,
    }),
  },
  {
    id: 'api-response',
    label: '接口响应',
    summary: '适合对比联调前后响应结构和字段变化。',
    apply: () => ({
      leftInput: `{\n  "id": 1,\n  "name": "Magic Box",\n  "status": "draft"\n}`,
      rightInput: `{\n  "id": 1,\n  "name": "Magic Box",\n  "status": "published",\n  "updatedAt": "2026-04-09T12:00:00Z"\n}`,
    }),
  },
  {
    id: 'markdown-doc',
    label: 'Markdown 文档',
    summary: '适合确认文档标题、列表和说明段落的差异。',
    apply: () => ({
      leftInput: `# Release Notes\n\n- add markdown preview\n- improve search`,
      rightInput: `# Release Notes\n\n- add markdown preview\n- improve search\n- ship html export`,
    }),
  },
]

export function createDiffStudioInitialInput(): DiffStudioInput {
  return {
    leftInput: diffStudioSamples[0]?.apply({ leftInput: '', rightInput: '' }).leftInput ?? '',
    rightInput: diffStudioSamples[0]?.apply({ leftInput: '', rightInput: '' }).rightInput ?? '',
  }
}

export function executeDiffStudio(input: DiffStudioInput): DiffStudioOutput {
  return {
    diff: buildLineDiff(input.leftInput, input.rightInput),
  }
}

export function buildDiffStudioHistoryLabel(output: DiffStudioOutput) {
  return output.diff.identical ? '文本一致' : `差异 +${output.diff.stats.added} -${output.diff.stats.removed}`
}

export function buildDiffStudioDownloadPayload(output: DiffStudioOutput | null): ToolDownloadPayload | null {
  if (!output) {
    return null
  }

  const body = output.diff.rows
    .map((row) => `[${row.type}] ${row.leftLineNumber ?? '-'} | ${row.rightLineNumber ?? '-'} | ${row.leftText} || ${row.rightText}`)
    .join('\n')

  return {
    filename: 'diff-studio-output.txt',
    content: body,
    mimeType: 'text/plain;charset=utf-8',
  }
}

export const diffStudioRuntimeModule: Omit<ToolModule<DiffStudioInput, DiffStudioOutput>, 'page'> = {
  meta: diffStudioMeta,
  createInitialInput: createDiffStudioInitialInput,
  execute: (input) => executeDiffStudio(input),
  samples: diffStudioSamples,
}
