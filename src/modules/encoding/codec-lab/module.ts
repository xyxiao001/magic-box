import { transformCodec, type CodecAction, type CodecMode, type CodecResult } from './logic'
import { codecLabMeta } from './meta'
import type { ToolSample } from '@/tool-runtime/protocols/tool-module'
import type { ToolDownloadPayload } from '@/tool-runtime/services/tool-download-service'
import type { ToolModule } from '@/tool-runtime/protocols/tool-module'

export interface CodecLabInput {
  input: string
  mode: CodecMode
  action: CodecAction
}

export interface CodecLabOutput {
  result: CodecResult
}

export const codecLabSamples: ToolSample<CodecLabInput>[] = [
  {
    id: 'url-multi-decode',
    label: '多层 URL 解码',
    summary: '适合处理回调地址、跳转参数和多层 encode 的 query。',
    apply: () => ({
      input:
        'https%253A%252F%252Fmagic-box.dev%252Ftools%253Ftab%253Djson%2526keyword%253Dhello%252520world',
      mode: 'url',
      action: 'decode-all',
    }),
  },
  {
    id: 'url-encode',
    label: 'URL 编码',
    summary: '适合快速编码中文、空格和特殊字符。',
    apply: () => ({
      input: 'hello world?name=Magic Box&lang=zh-CN',
      mode: 'url',
      action: 'encode',
    }),
  },
  {
    id: 'base64-encode',
    label: 'Base64 编码',
    summary: '适合生成 Basic Auth 或临时传输文本内容。',
    apply: () => ({
      input: 'magic-box:hello',
      mode: 'base64',
      action: 'encode',
    }),
  },
]

export function createCodecLabInitialInput(): CodecLabInput {
  return {
    input: 'https%253A%252F%252Fmagic-box.dev%252Ftools%253Ftab%253Djson%2526keyword%253Dhello%252520world',
    mode: 'url',
    action: 'decode-all',
  }
}

export function executeCodecLab(input: CodecLabInput): CodecLabOutput {
  return {
    result: transformCodec(input.input, input.mode, input.action),
  }
}

export function buildCodecLabHistoryLabel(input: CodecLabInput, output: CodecLabOutput) {
  const mode = input.mode === 'url' ? 'URL' : 'Base64'
  return `${mode} ${output.result.ok ? '成功' : '失败'}`
}

export function buildCodecLabDownloadPayload(output: CodecLabOutput | null): ToolDownloadPayload | null {
  if (!output?.result.ok || !output.result.value) {
    return null
  }

  return {
    filename: 'codec-lab-output.txt',
    content: output.result.value,
    mimeType: 'text/plain;charset=utf-8',
  }
}

export const codecLabRuntimeModule: Omit<ToolModule<CodecLabInput, CodecLabOutput>, 'page'> = {
  meta: codecLabMeta,
  createInitialInput: createCodecLabInitialInput,
  execute: (input) => executeCodecLab(input),
  samples: codecLabSamples,
}
