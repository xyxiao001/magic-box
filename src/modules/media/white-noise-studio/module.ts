import { buildNoisePresets, formatTimerLabel } from './logic'
import { whiteNoiseStudioMeta } from './meta'
import type { ToolSample } from '@/tool-runtime/protocols/tool-module'
import type { ToolModule } from '@/tool-runtime/protocols/tool-module'

export interface WhiteNoiseStudioInput {
  activeIds: string[]
  volume: number
  timerMinutes: number
}

export interface WhiteNoiseStudioOutput {
  activeCount: number
  activeLabels: string[]
  timerLabel: string
}

export const whiteNoiseStudioPresets = buildNoisePresets()

export const whiteNoiseStudioSamples: ToolSample<WhiteNoiseStudioInput>[] = [
  {
    id: 'focus-mix',
    label: '专注混音',
    summary: '白噪音 + 雨声，适合日常写作和编码。',
    apply: () => ({
      activeIds: ['white', 'rain'],
      volume: 55,
      timerMinutes: 25,
    }),
  },
  {
    id: 'relax-mix',
    label: '放松混音',
    summary: '海浪 + 咖啡馆，适合阅读和长时间深度工作。',
    apply: () => ({
      activeIds: ['ocean', 'cafe'],
      volume: 45,
      timerMinutes: 40,
    }),
  },
]

export function createWhiteNoiseStudioInitialInput(): WhiteNoiseStudioInput {
  return {
    activeIds: [],
    volume: 60,
    timerMinutes: 0,
  }
}

export function executeWhiteNoiseStudio(input: WhiteNoiseStudioInput): WhiteNoiseStudioOutput {
  const activeLabels = whiteNoiseStudioPresets
    .filter((preset) => input.activeIds.includes(preset.id))
    .map((preset) => preset.label)

  return {
    activeCount: activeLabels.length,
    activeLabels,
    timerLabel: formatTimerLabel(Math.max(0, Math.floor(input.timerMinutes * 60))),
  }
}

export function buildWhiteNoiseStudioHistoryLabel(output: WhiteNoiseStudioOutput) {
  return `${output.activeCount} 个声音`
}

export const whiteNoiseStudioRuntimeModule: Omit<ToolModule<WhiteNoiseStudioInput, WhiteNoiseStudioOutput>, 'page'> = {
  meta: whiteNoiseStudioMeta,
  createInitialInput: createWhiteNoiseStudioInitialInput,
  execute: (input) => executeWhiteNoiseStudio(input),
  samples: whiteNoiseStudioSamples,
}
