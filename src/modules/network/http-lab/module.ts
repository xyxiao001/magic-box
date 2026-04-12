import {
  buildHttpRequestConfig,
  formatByteSize,
  formatHttpError,
  formatResponseBody,
  formatResponseHeaders,
  type HttpMethod,
} from './logic'
import { httpLabMeta } from './meta'
import type { ToolSample } from '@/tool-runtime/protocols/tool-module'
import type { ToolDownloadPayload } from '@/tool-runtime/services/tool-download-service'
import type { ToolModule } from '@/tool-runtime/protocols/tool-module'

export interface HttpLabInput {
  method: HttpMethod
  url: string
  headers: string
  body: string
}

export interface HttpLabOutput {
  statusText: string
  durationText: string
  contentType: string
  sizeText: string
  responseHeaders: string
  responseBody: string
  ok: boolean
}

export const httpLabSamples: ToolSample<HttpLabInput>[] = [
  {
    id: 'get-user',
    label: '获取用户',
    summary: '最常见的 GET 调试场景，适合验证 URL 和响应结构。',
    apply: () => ({
      method: 'GET',
      url: 'https://jsonplaceholder.typicode.com/users/1',
      headers: 'Accept: application/json',
      body: '',
    }),
  },
  {
    id: 'create-post',
    label: '创建文章',
    summary: '发送 JSON Body，适合验证 Content-Type 和响应回显。',
    apply: () => ({
      method: 'POST',
      url: 'https://jsonplaceholder.typicode.com/posts',
      headers: 'Accept: application/json\nContent-Type: application/json',
      body: `{
  "title": "ship http lab",
  "body": "Keep building Magic Box.",
  "userId": 1
}`,
    }),
  },
  {
    id: 'update-todo',
    label: '更新待办',
    summary: '模拟 PUT 更新，检查接口是否正确接收请求体。',
    apply: () => ({
      method: 'PUT',
      url: 'https://jsonplaceholder.typicode.com/todos/1',
      headers: 'Accept: application/json\nContent-Type: application/json',
      body: `{
  "id": 1,
  "title": "Polish HTTP Lab",
  "completed": true,
  "userId": 1
}`,
    }),
  },
  {
    id: 'delete-resource',
    label: '删除资源',
    summary: '快速验证 DELETE 请求是否联通以及状态码展示。',
    apply: () => ({
      method: 'DELETE',
      url: 'https://jsonplaceholder.typicode.com/posts/1',
      headers: 'Accept: application/json',
      body: '',
    }),
  },
]

export function createHttpLabInitialInput(): HttpLabInput {
  return {
    method: 'GET',
    url: 'https://jsonplaceholder.typicode.com/users/1',
    headers: 'Accept: application/json',
    body: '',
  }
}

export async function executeHttpLab(input: HttpLabInput): Promise<HttpLabOutput> {
  const url = input.url.trim()
  if (!url) {
    throw new Error('请输入请求 URL')
  }

  const config = buildHttpRequestConfig(input.method, input.headers, input.body)
  if (!config.ok) {
    throw new Error(config.error)
  }

  const startedAt = performance.now()

  try {
    const response = await fetch(url, config.value.init)
    const rawBody = await response.text()
    const duration = Math.round(performance.now() - startedAt)
    const contentType = response.headers.get('content-type')

    return {
      statusText: `${response.status} ${response.statusText}`.trim(),
      durationText: `${duration} ms`,
      contentType: contentType ?? '未知',
      sizeText: formatByteSize(new TextEncoder().encode(rawBody).length),
      responseHeaders: formatResponseHeaders(response.headers),
      responseBody: formatResponseBody(rawBody, contentType),
      ok: response.ok,
    }
  } catch (error) {
    throw new Error(formatHttpError(error))
  }
}

export function buildHttpLabHistoryLabel(output: HttpLabOutput) {
  return output.statusText || 'HTTP 响应'
}

export function buildHttpLabDownloadPayload(output: HttpLabOutput | null): ToolDownloadPayload | null {
  if (!output) {
    return null
  }

  const body = [
    `Status: ${output.statusText}`,
    `Duration: ${output.durationText}`,
    `Content-Type: ${output.contentType}`,
    `Size: ${output.sizeText}`,
    '',
    '[Headers]',
    output.responseHeaders,
    '',
    '[Body]',
    output.responseBody,
  ].join('\n')

  return {
    filename: 'http-lab-response.txt',
    content: body,
    mimeType: 'text/plain;charset=utf-8',
  }
}

export const httpLabRuntimeModule: Omit<ToolModule<HttpLabInput, HttpLabOutput>, 'page'> = {
  meta: httpLabMeta,
  createInitialInput: createHttpLabInitialInput,
  execute: async (input) => executeHttpLab(input),
  samples: httpLabSamples,
}
