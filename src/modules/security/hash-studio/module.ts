import { compareTargetHash, hashFile, hashText, type FileHashMeta, type HashResultRow } from './logic'
import { hashStudioMeta } from './meta'
import type { ToolSample } from '@/tool-runtime/protocols/tool-module'
import type { ToolDownloadPayload } from '@/tool-runtime/services/tool-download-service'
import type { ToolModule } from '@/tool-runtime/protocols/tool-module'

export type HashStudioSourceMode = 'text' | 'file'

export interface HashStudioInput {
  textInput: string
  targetHash: string
}

export interface HashStudioOutput {
  rows: HashResultRow[]
  fileMeta: FileHashMeta | null
  sourceType: HashStudioSourceMode
  sourceLabel: string
}

export interface HashStudioExecutionOptions {
  sourceMode?: HashStudioSourceMode
  selectedFile?: File | null
}

export const hashStudioSamples: ToolSample<HashStudioInput>[] = [
  {
    id: 'build-artifact',
    label: '构建产物',
    summary: '适合验证构建后的 bundle、压缩包或发布产物签名。',
    apply: (currentInput) => ({
      ...currentInput,
      textInput: 'magic-box-web@2.9.0\nbuild: 2026-04-12T10:00:00Z\ncommit: abcdef123456',
      targetHash: '',
    }),
  },
  {
    id: 'api-signature',
    label: '接口签名串',
    summary: '适合对比 webhook、签名字符串和鉴权串的散列值。',
    apply: (currentInput) => ({
      ...currentInput,
      textInput: 'POST\n/api/v1/webhooks\nx-request-id:req-20260412\nbody={"event":"deploy"}',
      targetHash: '',
    }),
  },
  {
    id: 'config-snippet',
    label: '配置片段',
    summary: '适合快速验证配置文本、环境变量模板和证书片段是否一致。',
    apply: (currentInput) => ({
      ...currentInput,
      textInput: 'APP_ENV=production\nAPP_REGION=cn-north-1\nFEATURE_HASH_STUDIO=true',
      targetHash: '',
    }),
  },
]

export function createHashStudioInitialInput(): HashStudioInput {
  return {
    textInput: 'magic-box',
    targetHash: '',
  }
}

export async function executeHashStudio(
  input: HashStudioInput,
  options: HashStudioExecutionOptions = {}
): Promise<HashStudioOutput> {
  const sourceMode = options.sourceMode ?? 'text'

  if (sourceMode === 'file') {
    if (!options.selectedFile) {
      throw new Error('请先选择文件')
    }

    const result = await hashFile(options.selectedFile)

    return {
      rows: result.rows,
      fileMeta: result.meta,
      sourceType: 'file',
      sourceLabel: result.meta.name,
    }
  }

  const rows = await hashText(input.textInput)

  return {
    rows,
    fileMeta: null,
    sourceType: 'text',
    sourceLabel: '文本输入',
  }
}

export function buildHashStudioHistoryLabel(input: HashStudioInput) {
  const preview = input.textInput.trim().split('\n')[0] || '文本哈希'
  return preview.length > 24 ? `${preview.slice(0, 24)}...` : preview
}

export function buildHashStudioDownloadPayload(
  input: HashStudioInput,
  output: HashStudioOutput | null
): ToolDownloadPayload | null {
  if (!output) {
    return null
  }

  const compareResult = compareTargetHash(input.targetHash, output.rows)
  const body = [
    `Source: ${output.sourceLabel}`,
    `Mode: ${output.sourceType}`,
    `Target: ${compareResult.normalizedTarget || '-'}`,
    `Matched: ${compareResult.matched ? compareResult.matchedAlgorithm : 'NO'}`,
    '',
    ...output.rows.map((row) => `${row.algorithm}: ${row.value}`),
  ].join('\n')

  return {
    filename: output.sourceType === 'file' ? 'hash-studio-file.txt' : 'hash-studio-text.txt',
    content: body,
    mimeType: 'text/plain;charset=utf-8',
  }
}

export const hashStudioRuntimeModule: Omit<ToolModule<HashStudioInput, HashStudioOutput>, 'page'> = {
  meta: hashStudioMeta,
  createInitialInput: createHashStudioInitialInput,
  execute: (input) => executeHashStudio(input),
  samples: hashStudioSamples,
}
