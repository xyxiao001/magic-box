import {
  type CropRatioPreset,
  getCropRatioLabel,
  getOutputFormatLabel,
  normalizeRotationDegrees,
  type OutputBackgroundMode,
  type OutputImageFormat,
} from './logic'
import { imageStudioMeta } from './meta'
import type { ToolSample } from '@/tool-runtime/protocols/tool-module'
import type { ToolModule } from '@/tool-runtime/protocols/tool-module'

export interface ImageStudioInput {
  format: OutputImageFormat
  quality: number
  scale: number
  crop: CropRatioPreset
  rotation: number
  background: OutputBackgroundMode
  fillColor: string
}

export interface ImageStudioOutput {
  formatLabel: string
  qualityLabel: string
  scaleLabel: string
  cropLabel: string
  rotationLabel: string
  backgroundLabel: string
}

export const imageStudioSamples: ToolSample<ImageStudioInput>[] = [
  {
    id: 'general-compress',
    label: '通用压缩',
    summary: '保持原比例，适合网页上传与临时分享。',
    apply: () => ({
      format: 'image/webp',
      quality: 82,
      scale: 100,
      crop: 'original',
      rotation: 0,
      background: 'transparent',
      fillColor: '#ffffff',
    }),
  },
  {
    id: 'avatar-square',
    label: '头像方图',
    summary: '裁成 1:1，适合头像、卡片封面和缩略图。',
    apply: () => ({
      format: 'image/jpeg',
      quality: 88,
      scale: 80,
      crop: '1:1',
      rotation: 0,
      background: 'fill',
      fillColor: '#f5f5f5',
    }),
  },
  {
    id: 'hero-wide',
    label: '展示横图',
    summary: '裁成 16:9，适合文章头图和分享封面。',
    apply: () => ({
      format: 'image/webp',
      quality: 84,
      scale: 90,
      crop: '16:9',
      rotation: 0,
      background: 'fill',
      fillColor: '#101828',
    }),
  },
]

export function createImageStudioInitialInput(): ImageStudioInput {
  return {
    format: 'image/webp',
    quality: 86,
    scale: 100,
    crop: 'original',
    rotation: 0,
    background: 'transparent',
    fillColor: '#ffffff',
  }
}

export function normalizeImageStudioInput(input?: Partial<ImageStudioInput> | null): ImageStudioInput {
  const fallback = createImageStudioInitialInput()
  const nextInput = input ?? {}
  const format =
    nextInput.format === 'image/jpeg' || nextInput.format === 'image/png' || nextInput.format === 'image/webp'
      ? nextInput.format
      : fallback.format
  const crop =
    nextInput.crop === 'original' || nextInput.crop === '1:1' || nextInput.crop === '4:3' || nextInput.crop === '16:9'
      ? nextInput.crop
      : fallback.crop
  const background =
    nextInput.background === 'fill' || nextInput.background === 'transparent' ? nextInput.background : fallback.background
  const fillColor = typeof nextInput.fillColor === 'string' && nextInput.fillColor.trim() ? nextInput.fillColor : fallback.fillColor
  const quality =
    typeof nextInput.quality === 'number' && Number.isFinite(nextInput.quality)
      ? Math.max(40, Math.min(100, Math.round(nextInput.quality)))
      : fallback.quality
  const scale =
    typeof nextInput.scale === 'number' && Number.isFinite(nextInput.scale)
      ? Math.max(10, Math.min(100, Math.round(nextInput.scale)))
      : fallback.scale
  const rotation =
    typeof nextInput.rotation === 'number' && Number.isFinite(nextInput.rotation) ? nextInput.rotation : fallback.rotation

  return {
    format,
    quality,
    scale,
    crop,
    rotation,
    background,
    fillColor,
  }
}

export function executeImageStudio(input: ImageStudioInput): ImageStudioOutput {
  const normalizedInput = normalizeImageStudioInput(input)
  const normalizedRotation = normalizeRotationDegrees(normalizedInput.rotation)
  return {
    formatLabel: getOutputFormatLabel(normalizedInput.format),
    qualityLabel: normalizedInput.format === 'image/png' ? 'PNG 无质量参数' : `${normalizedInput.quality}%`,
    scaleLabel: `${normalizedInput.scale}%`,
    cropLabel: getCropRatioLabel(normalizedInput.crop),
    rotationLabel: normalizedRotation === 0 ? '0°' : `${normalizedRotation}°`,
    backgroundLabel:
      normalizedInput.format === 'image/jpeg' || normalizedInput.background === 'fill'
        ? normalizedInput.fillColor.toUpperCase()
        : '透明',
  }
}

export function buildImageStudioHistoryLabel(output: ImageStudioOutput) {
  return `${output.formatLabel} ${output.cropLabel}`
}

export const imageStudioRuntimeModule: Omit<ToolModule<ImageStudioInput, ImageStudioOutput>, 'page'> = {
  meta: imageStudioMeta,
  createInitialInput: createImageStudioInitialInput,
  execute: (input) => executeImageStudio(input),
  samples: imageStudioSamples,
}
