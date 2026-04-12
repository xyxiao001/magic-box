import {
  buildColorSchemes,
  buildLinearGradientCss,
  formatHsl,
  formatRgb,
  getContrastLevel,
  getContrastRatio,
  parseColorInput,
} from './logic'
import { colorStudioMeta } from './meta'
import type { ToolSample } from '@/tool-runtime/protocols/tool-module'
import type { ToolDownloadPayload } from '@/tool-runtime/services/tool-download-service'
import type { ToolModule } from '@/tool-runtime/protocols/tool-module'

export interface ColorStudioInput {
  colorInput: string
  gradientTarget: string
  angle: number
}

export interface ColorStudioOutput {
  baseOk: boolean
  baseError: string
  gradientOk: boolean
  baseHex: string
  baseRgb: string
  baseHsl: string
  schemes: Array<{ label: string; hex: string }>
  gradientCss: string
  contrastWithWhite: number
  contrastWithDark: number
}

export const colorStudioSamples: ToolSample<ColorStudioInput>[] = [
  {
    id: 'brand-blue',
    label: '品牌蓝',
    summary: '适合 SaaS、控制台和产品主按钮。',
    apply: () => ({
      colorInput: '#3366FF',
      gradientTarget: '#FF7A59',
      angle: 135,
    }),
  },
  {
    id: 'mint-green',
    label: '薄荷绿',
    summary: '适合成功态、轻交互和清爽视觉主题。',
    apply: () => ({
      colorInput: '#42D6A4',
      gradientTarget: '#7FE7C2',
      angle: 120,
    }),
  },
  {
    id: 'coral-orange',
    label: '珊瑚橙',
    summary: '适合营销卡片、强调区与 CTA。',
    apply: () => ({
      colorInput: '#FF7A59',
      gradientTarget: '#FFD166',
      angle: 160,
    }),
  },
]

export function createColorStudioInitialInput(): ColorStudioInput {
  return {
    colorInput: '#3366FF',
    gradientTarget: '#FF7A59',
    angle: 135,
  }
}

export function executeColorStudio(input: ColorStudioInput): ColorStudioOutput {
  const parsedBase = parseColorInput(input.colorInput)
  const parsedGradient = parseColorInput(input.gradientTarget)
  const baseHex = parsedBase.hex || '#3366FF'

  return {
    baseOk: parsedBase.ok,
    baseError: parsedBase.error || '',
    gradientOk: parsedGradient.ok,
    baseHex,
    baseRgb: parsedBase.ok && parsedBase.rgb ? formatRgb(parsedBase.rgb) : '—',
    baseHsl: parsedBase.ok && parsedBase.hsl ? formatHsl(parsedBase.hsl) : '—',
    schemes: buildColorSchemes(baseHex),
    gradientCss: buildLinearGradientCss(baseHex, parsedGradient.hex || '#FF7A59', input.angle),
    contrastWithWhite: getContrastRatio(baseHex, '#FFFFFF'),
    contrastWithDark: getContrastRatio(baseHex, '#111827'),
  }
}

export function buildColorStudioHistoryLabel(output: ColorStudioOutput) {
  return output.baseHex
}

export function buildColorStudioDownloadPayload(output: ColorStudioOutput | null): ToolDownloadPayload | null {
  if (!output) {
    return null
  }

  const body = [
    `HEX: ${output.baseHex}`,
    `RGB: ${output.baseRgb}`,
    `HSL: ${output.baseHsl}`,
    `Gradient: ${output.gradientCss}`,
    `Contrast White: ${output.contrastWithWhite.toFixed(2)} ${getContrastLevel(output.contrastWithWhite)}`,
    `Contrast Dark: ${output.contrastWithDark.toFixed(2)} ${getContrastLevel(output.contrastWithDark)}`,
  ].join('\n')

  return {
    filename: 'color-studio-output.txt',
    content: body,
    mimeType: 'text/plain;charset=utf-8',
  }
}

export const colorStudioRuntimeModule: Omit<ToolModule<ColorStudioInput, ColorStudioOutput>, 'page'> = {
  meta: colorStudioMeta,
  createInitialInput: createColorStudioInitialInput,
  execute: (input) => executeColorStudio(input),
  samples: colorStudioSamples,
}
