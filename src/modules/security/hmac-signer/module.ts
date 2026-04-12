import {
  buildCanonicalString,
  compareSignature,
  computeHmacSha256,
  type CanonicalOptions,
  type CanonicalRequestInput,
  type HmacOutputFormat,
} from './logic'
import { hmacSignerMeta } from './meta'
import type { ToolSample } from '@/tool-runtime/protocols/tool-module'
import type { ToolDownloadPayload } from '@/tool-runtime/services/tool-download-service'
import type { ToolModule } from '@/tool-runtime/protocols/tool-module'

export type HmacSignerMode = 'basic' | 'request'

export interface HmacSignerInput {
  mode: HmacSignerMode
  message: string
  format: HmacOutputFormat
  target: string
  options: CanonicalOptions
  request: CanonicalRequestInput
}

export interface HmacSignerOutput {
  canonicalMessage: string
  effectiveMessage: string
  signatureHex: string
  signatureBase64: string
  compare: ReturnType<typeof compareSignature>
  statusMessage: string
}

export interface HmacSignerExecutionOptions {
  secret: string
}

export const hmacSignerSamples: ToolSample<HmacSignerInput>[] = [
  {
    id: 'basic-sign',
    label: '基础签名',
    summary: '适合对任意消息体快速计算 HMAC-SHA256。',
    apply: () => ({
      mode: 'basic',
      message: 'The quick brown fox jumps over the lazy dog',
      format: 'hex',
      target: '',
      options: { sortQuery: true, filterEmpty: true, delimiter: 'newline' },
      request: {
        method: 'POST',
        path: '/v1/hooks',
        query: 'b=2&a=1',
        timestamp: '1710000000',
        nonce: 'nonce-1',
        body: '{"id":1}',
      },
    }),
  },
  {
    id: 'request-sign',
    label: '请求签名',
    summary: '适合模拟 webhook 或网关 canonical string 签名。',
    apply: () => ({
      mode: 'request',
      message: '',
      format: 'hex',
      target: '',
      options: { sortQuery: true, filterEmpty: true, delimiter: 'newline' },
      request: {
        method: 'POST',
        path: '/v1/hooks',
        query: 'b=2&a=1',
        timestamp: '1710000000',
        nonce: 'nonce-1',
        body: '{"id":1}',
      },
    }),
  },
]

export function createHmacSignerInitialInput(): HmacSignerInput {
  return {
    mode: 'basic',
    message: 'The quick brown fox jumps over the lazy dog',
    format: 'hex',
    target: '',
    options: {
      sortQuery: true,
      filterEmpty: true,
      delimiter: 'newline',
    },
    request: {
      method: 'POST',
      path: '/v1/hooks',
      query: 'b=2&a=1',
      timestamp: String(Math.floor(Date.now() / 1000)),
      nonce: 'nonce-1',
      body: '{"id":1}',
    },
  }
}

export async function executeHmacSigner(
  input: HmacSignerInput,
  options: HmacSignerExecutionOptions
): Promise<HmacSignerOutput> {
  const canonicalMessage = buildCanonicalString(input.request, input.options)
  const effectiveMessage = input.mode === 'request' ? canonicalMessage : input.message

  if (!options.secret.trim()) {
    return {
      canonicalMessage,
      effectiveMessage,
      signatureHex: '',
      signatureBase64: '',
      compare: compareSignature(input.target, ''),
      statusMessage: '请输入 secret',
    }
  }

  if (!effectiveMessage) {
    return {
      canonicalMessage,
      effectiveMessage,
      signatureHex: '',
      signatureBase64: '',
      compare: compareSignature(input.target, ''),
      statusMessage: '请输入签名原文',
    }
  }

  const signatureHex = await computeHmacSha256(options.secret, effectiveMessage, 'hex')
  const signatureBase64 = await computeHmacSha256(options.secret, effectiveMessage, 'base64')

  return {
    canonicalMessage,
    effectiveMessage,
    signatureHex,
    signatureBase64,
    compare: compareSignature(input.target, input.format === 'hex' ? signatureHex : signatureBase64),
    statusMessage: '签名已更新',
  }
}

export function buildHmacSignerHistoryLabel(output: HmacSignerOutput) {
  return output.compare.matched ? 'HMAC 匹配' : 'HMAC 计算'
}

export function buildHmacSignerDownloadPayload(output: HmacSignerOutput | null): ToolDownloadPayload | null {
  if (!output) {
    return null
  }

  const body = [
    '[Canonical Message]',
    output.canonicalMessage,
    '',
    '[Effective Message]',
    output.effectiveMessage,
    '',
    `HEX: ${output.signatureHex}`,
    `BASE64: ${output.signatureBase64}`,
  ].join('\n')

  return {
    filename: 'hmac-signer-report.txt',
    content: body,
    mimeType: 'text/plain;charset=utf-8',
  }
}

export const hmacSignerRuntimeModule: Omit<ToolModule<HmacSignerInput, HmacSignerOutput>, 'page'> = {
  meta: hmacSignerMeta,
  createInitialInput: createHmacSignerInitialInput,
  execute: async () => {
    throw new Error('HMAC Signer 需要页面提供 secret 后再执行')
  },
  samples: hmacSignerSamples,
}
