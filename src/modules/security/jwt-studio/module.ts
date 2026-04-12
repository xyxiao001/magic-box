import { buildUnsignedJwt, parseJwt, type ParsedJwtResult } from './logic'
import { jwtStudioMeta } from './meta'
import type { ToolSample } from '@/tool-runtime/protocols/tool-module'
import type { ToolDownloadPayload } from '@/tool-runtime/services/tool-download-service'
import type { ToolModule } from '@/tool-runtime/protocols/tool-module'

export interface JwtStudioInput {
  tokenInput: string
}

export interface JwtStudioOutput {
  parsed: ParsedJwtResult
}

export interface JwtTemplate {
  label: string
  summary: string
  token: string
}

const nowSeconds = Math.floor(Date.now() / 1000)

export const jwtStudioTemplates: JwtTemplate[] = [
  {
    label: '有效 Access Token',
    summary: '适合联调成功场景，包含常见身份与时间字段。',
    token: buildUnsignedJwt(
      { alg: 'HS256', typ: 'JWT', kid: 'dev-key-1' },
      {
        sub: 'user_1024',
        aud: 'magic-box-web',
        iss: 'https://auth.magic-box.dev',
        scope: 'tool:read tool:write',
        iat: nowSeconds - 180,
        nbf: nowSeconds - 120,
        exp: nowSeconds + 3600,
      }
    ),
  },
  {
    label: '已过期 Token',
    summary: '适合验证刷新逻辑和过期状态展示。',
    token: buildUnsignedJwt(
      { alg: 'HS256', typ: 'JWT' },
      {
        sub: 'user_expired',
        role: 'editor',
        iat: nowSeconds - 7200,
        exp: nowSeconds - 60,
      }
    ),
  },
  {
    label: '未生效 Token',
    summary: '适合排查 nbf 配置和服务端时间偏差。',
    token: buildUnsignedJwt(
      { alg: 'HS256', typ: 'JWT' },
      {
        sub: 'user_pending',
        tenant: 'staging',
        iat: nowSeconds,
        nbf: nowSeconds + 600,
        exp: nowSeconds + 7200,
      }
    ),
  },
]

export const jwtStudioSamples: ToolSample<JwtStudioInput>[] = jwtStudioTemplates.map((template, index) => ({
  id: `jwt-sample-${index + 1}`,
  label: template.label,
  summary: template.summary,
  apply: () => ({
    tokenInput: template.token,
  }),
}))

export function createJwtStudioInitialInput(): JwtStudioInput {
  return {
    tokenInput: jwtStudioTemplates[0]?.token ?? '',
  }
}

export function executeJwtStudio(input: JwtStudioInput): JwtStudioOutput {
  return {
    parsed: parseJwt(input.tokenInput),
  }
}

export function buildJwtStudioHistoryLabel(output: JwtStudioOutput) {
  const subject = output.parsed.claimRows.find((row) => row.label === 'sub')?.value

  if (subject) {
    return `JWT ${subject}`
  }

  return `JWT ${output.parsed.status}`
}

export function buildJwtStudioDownloadPayload(output: JwtStudioOutput | null): ToolDownloadPayload | null {
  if (!output) {
    return null
  }

  const content = [
    `Status: ${output.parsed.status}`,
    `Summary: ${output.parsed.summary}`,
    '',
    '[Header]',
    output.parsed.headerText || '{}',
    '',
    '[Payload]',
    output.parsed.payloadText || '{}',
    '',
    '[Signature]',
    output.parsed.signatureText || '',
  ].join('\n')

  return {
    filename: 'jwt-studio-report.txt',
    content,
    mimeType: 'text/plain;charset=utf-8',
  }
}

export const jwtStudioRuntimeModule: Omit<ToolModule<JwtStudioInput, JwtStudioOutput>, 'page'> = {
  meta: jwtStudioMeta,
  createInitialInput: createJwtStudioInitialInput,
  execute: (input) => executeJwtStudio(input),
  samples: jwtStudioSamples,
}
