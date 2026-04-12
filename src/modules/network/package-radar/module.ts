import {
  buildInstallCommands,
  buildPackageDetailUrl,
  buildPackageSearchUrl,
  normalizePackageDetail,
  normalizePackageSearchResults,
  type PackageDetail,
  type PackageSearchItem,
} from './logic'
import { packageRadarMeta } from './meta'
import type { ToolSample } from '@/tool-runtime/protocols/tool-module'
import type { ToolModule } from '@/tool-runtime/protocols/tool-module'

export interface PackageRadarInput {
  query: string
  selectedPackageName: string
}

export interface PackageRadarOutput {
  results: PackageSearchItem[]
  selectedPackage: PackageDetail | null
  installCommands: Record<string, string> | null
}

export const packageRadarSamples: ToolSample<PackageRadarInput>[] = [
  {
    id: 'vue',
    label: 'Vue',
    summary: '查看主框架包，适合验证最近版本和安装命令。',
    apply: () => ({
      query: 'vue',
      selectedPackageName: 'vue',
    }),
  },
  {
    id: 'pinia',
    label: 'Pinia',
    summary: '查看状态管理包，适合确认版本与主页链接。',
    apply: () => ({
      query: 'pinia',
      selectedPackageName: 'pinia',
    }),
  },
  {
    id: 'vueuse',
    label: 'VueUse',
    summary: '查看带 scope 的包名搜索与详情拉取。',
    apply: () => ({
      query: '@vueuse/core',
      selectedPackageName: '@vueuse/core',
    }),
  },
]

export function createPackageRadarInitialInput(): PackageRadarInput {
  return {
    query: 'vue',
    selectedPackageName: '',
  }
}

export async function executePackageRadar(input: PackageRadarInput): Promise<PackageRadarOutput> {
  const trimmed = input.query.trim()
  if (!trimmed) {
    throw new Error('请输入包名，例如 vue、pinia 或 @vueuse/core')
  }

  const searchResponse = await fetch(buildPackageSearchUrl(trimmed))
  if (!searchResponse.ok) {
    throw new Error(`搜索失败：${searchResponse.status}`)
  }

  const searchPayload = await searchResponse.json()
  const results = normalizePackageSearchResults(searchPayload)
  if (!results.length) {
    return {
      results: [],
      selectedPackage: null,
      installCommands: null,
    }
  }

  const exactMatch = results.find((item) => item.name.toLowerCase() === trimmed.toLowerCase())
  const selectedName = input.selectedPackageName || exactMatch?.name || results[0]?.name || ''
  if (!selectedName) {
    return {
      results,
      selectedPackage: null,
      installCommands: null,
    }
  }

  const detailResponse = await fetch(buildPackageDetailUrl(selectedName))
  if (!detailResponse.ok) {
    throw new Error(`详情加载失败：${detailResponse.status}`)
  }

  const detailPayload = await detailResponse.json()
  const selectedPackage = normalizePackageDetail(detailPayload)

  return {
    results,
    selectedPackage,
    installCommands: buildInstallCommands(selectedPackage.name),
  }
}

export function buildPackageRadarHistoryLabel(input: PackageRadarInput, output: PackageRadarOutput) {
  return output.selectedPackage?.name || input.query
}

export const packageRadarRuntimeModule: Omit<ToolModule<PackageRadarInput, PackageRadarOutput>, 'page'> = {
  meta: packageRadarMeta,
  createInitialInput: createPackageRadarInitialInput,
  execute: async (input) => executePackageRadar(input),
  samples: packageRadarSamples,
}
