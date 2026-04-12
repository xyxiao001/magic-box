import { buildConvertedResults, unitCategories } from './logic'
import { unitConverterMeta } from './meta'
import type { ToolSample } from '@/tool-runtime/protocols/tool-module'
import type { ToolDownloadPayload } from '@/tool-runtime/services/tool-download-service'
import type { ToolModule } from '@/tool-runtime/protocols/tool-module'

export interface UnitConverterInput {
  category: string
  value: number
  unit: string
}

export interface UnitConverterOutput {
  categoryLabel: string
  sourceLabel: string
  convertedResults: Array<{ unit: string; label: string; value: string }>
}

export const unitConverterSamples: ToolSample<UnitConverterInput>[] = [
  {
    id: 'length',
    label: '长度',
    summary: '适合处理 m、km、英寸和英尺之间的转换。',
    apply: () => ({
      category: 'length',
      value: 1,
      unit: 'm',
    }),
  },
  {
    id: 'temperature',
    label: '温度',
    summary: '适合摄氏、华氏和开尔文之间的换算。',
    apply: () => ({
      category: 'temperature',
      value: 32,
      unit: 'f',
    }),
  },
  {
    id: 'storage',
    label: '存储',
    summary: '适合 B、KB、MB、GB 之间的快速换算。',
    apply: () => ({
      category: 'storage',
      value: 1,
      unit: 'gb',
    }),
  },
]

export function createUnitConverterInitialInput(): UnitConverterInput {
  return {
    category: 'length',
    value: 1,
    unit: 'm',
  }
}

export function executeUnitConverter(input: UnitConverterInput): UnitConverterOutput {
  const category = unitCategories[input.category] || unitCategories.length

  return {
    categoryLabel: category.label,
    sourceLabel: category.units[input.unit]?.label || input.unit,
    convertedResults: buildConvertedResults(input.category, input.value, input.unit),
  }
}

export function buildUnitConverterHistoryLabel(input: UnitConverterInput, output: UnitConverterOutput) {
  return `${output.categoryLabel} ${input.value}${output.sourceLabel}`
}

export function buildUnitConverterDownloadPayload(output: UnitConverterOutput | null): ToolDownloadPayload | null {
  if (!output) {
    return null
  }

  const body = output.convertedResults.map((entry) => `${entry.label}: ${entry.value}`).join('\n')
  return {
    filename: 'unit-converter-output.txt',
    content: body,
    mimeType: 'text/plain;charset=utf-8',
  }
}

export const unitConverterRuntimeModule: Omit<ToolModule<UnitConverterInput, UnitConverterOutput>, 'page'> = {
  meta: unitConverterMeta,
  createInitialInput: createUnitConverterInitialInput,
  execute: (input) => executeUnitConverter(input),
  samples: unitConverterSamples,
}
