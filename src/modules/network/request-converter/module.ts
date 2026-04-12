import {
  buildAxiosSnippet,
  buildFetchSnippet,
  buildNodeFetchSnippet,
  buildRequestConfigJson,
  parseCurlRequest,
  type ParsedRequestResult,
} from './logic'
import { requestConverterMeta } from './meta'
import type { ToolSample } from '@/tool-runtime/protocols/tool-module'
import type { ToolDownloadPayload } from '@/tool-runtime/services/tool-download-service'
import type { ToolModule } from '@/tool-runtime/protocols/tool-module'

export type RequestConverterOutputTab = 'structured' | 'fetch' | 'axios' | 'node-fetch'

export interface RequestConverterInput {
  curlInput: string
}

export interface RequestConverterOutput {
  parsed: ParsedRequestResult
  configJson: string
  fetchSnippet: string
  axiosSnippet: string
  nodeFetchSnippet: string
}

export const requestConverterSamples: ToolSample<RequestConverterInput>[] = [
  {
    id: 'basic-get',
    label: '简单 GET',
    summary: '适合验证 query、header 与 fetch 基础转换。',
    apply: (currentInput) => ({
      ...currentInput,
      curlInput: "curl 'https://api.example.com/v1/ping?lang=zh' -H 'Accept: application/json'",
    }),
  },
  {
    id: 'json-post',
    label: 'JSON POST',
    summary: '适合验证 JSON body、header 和 axios 片段。',
    apply: (currentInput) => ({
      ...currentInput,
      curlInput:
        "curl -X POST 'https://api.example.com/v1/users' -H 'Content-Type: application/json' -H 'Authorization: Bearer demo-token' -d '{\"name\":\"Alice\",\"role\":\"admin\"}'",
    }),
  },
  {
    id: 'form-submit',
    label: '表单提交',
    summary: '适合验证表单 body 和 node fetch 生成结果。',
    apply: (currentInput) => ({
      ...currentInput,
      curlInput:
        "curl -X POST 'https://api.example.com/v1/login' -H 'Content-Type: application/x-www-form-urlencoded' --data 'email=alice%40example.com&password=123456'",
    }),
  },
]

export function createRequestConverterInitialInput(): RequestConverterInput {
  return {
    curlInput: "curl 'https://api.example.com/v1/ping' -H 'Accept: application/json'",
  }
}

export function executeRequestConverter(input: RequestConverterInput): RequestConverterOutput {
  const parsed = parseCurlRequest(input.curlInput)

  if (!parsed.ok) {
    throw new Error(parsed.error ?? '请输入合法的 cURL 命令')
  }

  return {
    parsed,
    configJson: buildRequestConfigJson(parsed),
    fetchSnippet: buildFetchSnippet(parsed),
    axiosSnippet: buildAxiosSnippet(parsed),
    nodeFetchSnippet: buildNodeFetchSnippet(parsed),
  }
}

export function getRequestConverterActiveOutput(
  output: RequestConverterOutput | null,
  activeTab: RequestConverterOutputTab
) {
  if (!output) {
    return ''
  }

  if (activeTab === 'fetch') {
    return output.fetchSnippet
  }

  if (activeTab === 'axios') {
    return output.axiosSnippet
  }

  if (activeTab === 'node-fetch') {
    return output.nodeFetchSnippet
  }

  return output.configJson
}

export function buildRequestConverterHistoryLabel(output: RequestConverterOutput) {
  try {
    return `${output.parsed.method} ${new URL(output.parsed.url).hostname}`
  } catch {
    return `${output.parsed.method} ${output.parsed.url}`
  }
}

export function buildRequestConverterDownloadPayload(
  output: RequestConverterOutput | null,
  activeTab: RequestConverterOutputTab
): ToolDownloadPayload | null {
  if (!output) {
    return null
  }

  if (activeTab === 'structured') {
    return {
      filename: 'request-converter-config.json',
      content: output.configJson,
      mimeType: 'application/json;charset=utf-8',
    }
  }

  return {
    filename: `request-converter-${activeTab}.ts`,
    content: getRequestConverterActiveOutput(output, activeTab),
    mimeType: 'text/plain;charset=utf-8',
  }
}

export const requestConverterRuntimeModule: Omit<ToolModule<RequestConverterInput, RequestConverterOutput>, 'page'> = {
  meta: requestConverterMeta,
  createInitialInput: createRequestConverterInitialInput,
  execute: (input) => executeRequestConverter(input),
  samples: requestConverterSamples,
}
