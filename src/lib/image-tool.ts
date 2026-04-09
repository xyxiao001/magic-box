import { formatByteSize } from './http'

export type CropRatioPreset = 'original' | '1:1' | '4:3' | '16:9'
export type OutputImageFormat = 'image/jpeg' | 'image/png' | 'image/webp'

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
