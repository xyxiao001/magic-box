import {
  parseJwt,
  parseJwtJsonInput,
  signJwtHs256,
  verifyJwtHs256,
  type JwtSignVerifyResult,
  type ParsedJwtResult,
} from './logic'
import { jwtSignVerifyMeta } from './meta'
import type { ToolSample } from '@/tool-runtime/protocols/tool-module'
import type { ToolDownloadPayload } from '@/tool-runtime/services/tool-download-service'
import type { ToolModule } from '@/tool-runtime/protocols/tool-module'

export type JwtSignVerifyMode = 'sign' | 'verify'

export interface JwtSignVerifyInput {
  mode: JwtSignVerifyMode
  headerInput: string
  payloadInput: string
  tokenInput: string
}

export interface JwtSignVerifyOutput {
  mode: JwtSignVerifyMode
  signResult: JwtSignVerifyResult | null
  verifyResult: JwtSignVerifyResult | null
  parsedToken: ParsedJwtResult
}

export interface JwtSignVerifyExecutionOptions {
  secret: string
}

const nowSeconds = Math.floor(Date.now() / 1000)

export const jwtSignVerifySamples: ToolSample<JwtSignVerifyInput>[] = [
  {
    id: 'sign-template',
    label: '签发模板',
    summary: '适合生成一个包含 iat / exp 的标准 HS256 JWT。',
    apply: () => ({
      mode: 'sign',
      headerInput: JSON.stringify({ alg: 'HS256', typ: 'JWT' }, null, 2),
      payloadInput: JSON.stringify(
        {
          sub: 'demo-user',
          scope: ['read', 'write'],
          iat: nowSeconds,
          exp: nowSeconds + 1800,
        },
        null,
        2
      ),
      tokenInput: '',
    }),
  },
  {
    id: 'verify-template',
    label: '验签模板',
    summary: '适合粘贴已有 token 并配合 secret 手动验签。',
    apply: () => ({
      mode: 'verify',
      headerInput: JSON.stringify({ alg: 'HS256', typ: 'JWT' }, null, 2),
      payloadInput: JSON.stringify({ sub: 'demo-user' }, null, 2),
      tokenInput:
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkZW1vLXVzZXIiLCJyb2xlIjoiYWRtaW4ifQ.local-signature',
    }),
  },
]

export function createJwtSignVerifyInitialInput(): JwtSignVerifyInput {
  return {
    mode: 'sign',
    headerInput: JSON.stringify({ alg: 'HS256', typ: 'JWT' }, null, 2),
    payloadInput: JSON.stringify(
      {
        sub: 'user-1',
        role: 'admin',
        iat: nowSeconds,
        exp: nowSeconds + 3600,
      },
      null,
      2
    ),
    tokenInput: '',
  }
}

export async function executeJwtSignVerify(
  input: JwtSignVerifyInput,
  options: JwtSignVerifyExecutionOptions
): Promise<JwtSignVerifyOutput> {
  if (input.mode === 'sign') {
    const headerParsed = parseJwtJsonInput(input.headerInput, { alg: 'HS256', typ: 'JWT' })
    if (!headerParsed.ok) {
      throw new Error(headerParsed.error || 'Header JSON 不合法')
    }

    const payloadParsed = parseJwtJsonInput(input.payloadInput, {})
    if (!payloadParsed.ok) {
      throw new Error(payloadParsed.error || 'Payload JSON 不合法')
    }

    const signResult = await signJwtHs256(headerParsed.value, payloadParsed.value, options.secret)

    if (!signResult.ok) {
      throw new Error(signResult.error || '签发失败')
    }

    return {
      mode: 'sign',
      signResult,
      verifyResult: null,
      parsedToken: parseJwt(signResult.token),
    }
  }

  const verifyResult = await verifyJwtHs256(input.tokenInput, options.secret)

  if (!verifyResult.ok) {
    throw new Error(verifyResult.error || '验签失败')
  }

  return {
    mode: 'verify',
    signResult: null,
    verifyResult,
    parsedToken: parseJwt(input.tokenInput),
  }
}

export function buildJwtSignVerifyHistoryLabel(output: JwtSignVerifyOutput) {
  if (output.mode === 'sign') {
    return output.signResult?.token ? 'JWT 已签发' : 'JWT 签发'
  }

  return output.verifyResult?.verified ? 'JWT 验签通过' : 'JWT 验签失败'
}

export function buildJwtSignVerifyDownloadPayload(output: JwtSignVerifyOutput | null): ToolDownloadPayload | null {
  if (!output) {
    return null
  }

  if (output.mode === 'sign' && output.signResult?.token) {
    return {
      filename: 'jwt-sign-verify-token.txt',
      content: output.signResult.token,
      mimeType: 'text/plain;charset=utf-8',
    }
  }

  if (output.mode === 'verify' && output.verifyResult) {
    const body = [
      `Verified: ${output.verifyResult.verified ? 'YES' : 'NO'}`,
      `Expected Signature: ${output.verifyResult.signature}`,
      '',
      '[Header]',
      output.parsedToken.headerText,
      '',
      '[Payload]',
      output.parsedToken.payloadText,
    ].join('\n')

    return {
      filename: 'jwt-sign-verify-report.txt',
      content: body,
      mimeType: 'text/plain;charset=utf-8',
    }
  }

  return null
}

export const jwtSignVerifyRuntimeModule: Omit<ToolModule<JwtSignVerifyInput, JwtSignVerifyOutput>, 'page'> = {
  meta: jwtSignVerifyMeta,
  createInitialInput: createJwtSignVerifyInitialInput,
  execute: async () => {
    throw new Error('JWT Sign / Verify 需要页面提供 secret 后再执行')
  },
  samples: jwtSignVerifySamples,
}
