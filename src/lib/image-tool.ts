import { formatByteSize } from './http'

export type CropRatioPreset = 'original' | '1:1' | '4:3' | '16:9'
export type OutputImageFormat = 'image/jpeg' | 'image/png' | 'image/webp'
export type OutputBackgroundMode = 'transparent' | 'fill'

export interface ImageMeta {
  width: number
  height: number
  type: string
  size: string
}

export interface CropRect {
  sx: number
  sy: number
  sw: number
  sh: number
}

export interface ImageTransform {
  crop: CropRect
  outputWidth: number
  outputHeight: number
}

export interface CropLayoutSize {
  width: number
  height: number
}

const cropRatioMap: Record<Exclude<CropRatioPreset, 'original'>, number> = {
  '1:1': 1,
  '4:3': 4 / 3,
  '16:9': 16 / 9,
}

export function getCropAspectRatio(preset: CropRatioPreset) {
  if (preset === 'original') {
    return null
  }

  return cropRatioMap[preset]
}

export function getOutputFormatLabel(format: OutputImageFormat) {
  if (format === 'image/png') {
    return 'PNG'
  }

  if (format === 'image/jpeg') {
    return 'JPEG'
  }

  return 'WebP'
}

export function getCropRatioLabel(preset: CropRatioPreset) {
  return preset === 'original' ? '原始比例' : preset
}

export function toCropperOutputType(format: OutputImageFormat) {
  if (format === 'image/png') {
    return 'png'
  }

  if (format === 'image/jpeg') {
    return 'jpeg'
  }

  return 'webp'
}

export function normalizeOutputQuality(format: OutputImageFormat, quality: number) {
  if (format === 'image/png') {
    return 1
  }

  return Math.max(0.4, Math.min(quality, 100)) / 100
}

export function normalizeRotationDegrees(rotation: number) {
  const normalized = rotation % 360

  if (normalized < 0) {
    return normalized + 360
  }

  return normalized
}

export function calculateScaledDimensions(sourceWidth: number, sourceHeight: number, scalePercent: number) {
  const scale = Math.max(1, Math.min(scalePercent, 100)) / 100

  return {
    width: Math.max(1, Math.round(sourceWidth * scale)),
    height: Math.max(1, Math.round(sourceHeight * scale)),
  }
}

export function buildCropLayout(
  preset: CropRatioPreset,
  sourceSize?: { width: number; height: number } | null,
  maxSide = 360
): CropLayoutSize {
  const fallbackRatio = 1
  const aspectRatio =
    preset === 'original'
      ? sourceSize && sourceSize.width > 0 && sourceSize.height > 0
        ? sourceSize.width / sourceSize.height
        : fallbackRatio
      : getCropAspectRatio(preset) ?? fallbackRatio

  if (!Number.isFinite(aspectRatio) || aspectRatio <= 0) {
    return { width: maxSide, height: maxSide }
  }

  if (aspectRatio >= 1) {
    return {
      width: maxSide,
      height: Math.max(160, Math.round(maxSide / aspectRatio)),
    }
  }

  return {
    width: Math.max(160, Math.round(maxSide * aspectRatio)),
    height: maxSide,
  }
}

export function calculateImageTransform(
  sourceWidth: number,
  sourceHeight: number,
  scalePercent: number,
  cropRatio: CropRatioPreset
): ImageTransform {
  const scale = Math.max(1, Math.min(scalePercent, 100)) / 100
  const outputWidth = Math.max(1, Math.round(sourceWidth * scale))
  const outputHeight = Math.max(1, Math.round(sourceHeight * scale))
  const aspectRatio = getCropAspectRatio(cropRatio)

  if (!aspectRatio) {
    return {
      crop: { sx: 0, sy: 0, sw: sourceWidth, sh: sourceHeight },
      outputWidth,
      outputHeight,
    }
  }

  const sourceAspect = sourceWidth / sourceHeight

  if (sourceAspect > aspectRatio) {
    const sw = Math.round(sourceHeight * aspectRatio)
    const sx = Math.round((sourceWidth - sw) / 2)

    return {
      crop: { sx, sy: 0, sw, sh: sourceHeight },
      outputWidth: Math.max(1, Math.round(outputHeight * aspectRatio)),
      outputHeight,
    }
  }

  const sh = Math.round(sourceWidth / aspectRatio)
  const sy = Math.round((sourceHeight - sh) / 2)

  return {
    crop: { sx: 0, sy, sw: sourceWidth, sh },
    outputWidth,
    outputHeight: Math.max(1, Math.round(outputWidth / aspectRatio)),
  }
}

export function buildOutputFileName(originalName: string, format: OutputImageFormat) {
  const baseName = originalName.replace(/\.[^.]+$/, '') || 'image'

  if (format === 'image/png') {
    return `${baseName}.png`
  }

  if (format === 'image/webp') {
    return `${baseName}.webp`
  }

  return `${baseName}.jpg`
}

export function formatImageMeta(width: number, height: number, bytes: number, type: string): ImageMeta {
  return {
    width,
    height,
    type: type || 'unknown',
    size: formatByteSize(bytes),
  }
}
