import {
  buildDiscountResult,
  buildSplitResult,
  buildTaxResult,
  evaluateExpression,
  type CalculatorQuickResult,
} from './logic'
import { calculatorProMeta } from './meta'
import type { ToolSample } from '@/tool-runtime/protocols/tool-module'
import type { ToolDownloadPayload } from '@/tool-runtime/services/tool-download-service'
import type { ToolModule } from '@/tool-runtime/protocols/tool-module'

export interface CalculatorProInput {
  expression: string
  discountPrice: number
  discountPercent: number
  taxAmount: number
  taxPercent: number
  splitTotal: number
  splitPeople: number
}

export interface CalculatorProOutput {
  expressionResult: string
  expressionError: string
  discountResults: CalculatorQuickResult[]
  taxResults: CalculatorQuickResult[]
  splitResults: CalculatorQuickResult[]
}

export const calculatorProSamples: ToolSample<CalculatorProInput>[] = [
  {
    id: 'expression',
    label: '表达式',
    summary: '适合临时算折扣、汇总金额和百分比。',
    apply: (currentInput) => ({
      ...currentInput,
      expression: '128 * 0.85 + 12',
    }),
  },
  {
    id: 'discount',
    label: '折扣',
    summary: '适合先把快捷区切到优惠场景。',
    apply: (currentInput) => ({
      ...currentInput,
      discountPrice: 299,
      discountPercent: 15,
    }),
  },
  {
    id: 'split-bill',
    label: '均摊',
    summary: '适合聚餐或团队采购后的平均分摊。',
    apply: (currentInput) => ({
      ...currentInput,
      splitTotal: 168,
      splitPeople: 4,
    }),
  },
]

export function createCalculatorProInitialInput(): CalculatorProInput {
  return {
    expression: '128 * 0.85 + 12',
    discountPrice: 299,
    discountPercent: 15,
    taxAmount: 100,
    taxPercent: 6,
    splitTotal: 168,
    splitPeople: 4,
  }
}

export function executeCalculatorPro(input: CalculatorProInput): CalculatorProOutput {
  let expressionResult = ''
  let expressionError = ''

  try {
    expressionResult = evaluateExpression(input.expression)
  } catch (error) {
    expressionError = error instanceof Error ? error.message : '计算失败'
  }

  return {
    expressionResult,
    expressionError,
    discountResults: buildDiscountResult(input.discountPrice, input.discountPercent),
    taxResults: buildTaxResult(input.taxAmount, input.taxPercent),
    splitResults: buildSplitResult(input.splitTotal, input.splitPeople),
  }
}

export function buildCalculatorProHistoryLabel(output: CalculatorProOutput) {
  return output.expressionError ? '计算失败' : `结果 ${output.expressionResult || '空'}`
}

export function buildCalculatorProDownloadPayload(output: CalculatorProOutput | null): ToolDownloadPayload | null {
  if (!output) {
    return null
  }

  const lines = [
    `[Expression] ${output.expressionError || output.expressionResult}`,
    '',
    '[Discount]',
    ...output.discountResults.map((item) => `${item.label}: ${item.value}`),
    '',
    '[Tax]',
    ...output.taxResults.map((item) => `${item.label}: ${item.value}`),
    '',
    '[Split]',
    ...output.splitResults.map((item) => `${item.label}: ${item.value}`),
  ]

  return {
    filename: 'calculator-pro-output.txt',
    content: lines.join('\n'),
    mimeType: 'text/plain;charset=utf-8',
  }
}

export const calculatorProRuntimeModule: Omit<ToolModule<CalculatorProInput, CalculatorProOutput>, 'page'> = {
  meta: calculatorProMeta,
  createInitialInput: createCalculatorProInitialInput,
  execute: (input) => executeCalculatorPro(input),
  samples: calculatorProSamples,
}
