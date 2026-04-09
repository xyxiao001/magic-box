export interface RgbColor {
  r: number
  g: number
  b: number
}

export interface HslColor {
  h: number
  s: number
  l: number
}

export interface ParsedColorResult {
  ok: boolean
  error?: string
  rgb?: RgbColor
  hsl?: HslColor
  hex?: string
}

export interface ColorSchemeEntry {
  label: string
  hex: string
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function toHexChannel(value: number) {
  return clamp(Math.round(value), 0, 255).toString(16).padStart(2, '0').toUpperCase()
}

export function rgbToHex(rgb: RgbColor) {
  return `#${toHexChannel(rgb.r)}${toHexChannel(rgb.g)}${toHexChannel(rgb.b)}`
}

export function hexToRgb(input: string): RgbColor | null {
  const normalized = input.trim().replace(/^#/, '')

  if (!/^[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(normalized)) {
    return null
  }

  const full = normalized.length === 3 ? normalized.split('').map((char) => char + char).join('') : normalized

  return {
    r: Number.parseInt(full.slice(0, 2), 16),
    g: Number.parseInt(full.slice(2, 4), 16),
    b: Number.parseInt(full.slice(4, 6), 16),
  }
}

export function rgbToHsl(rgb: RgbColor): HslColor {
  const r = clamp(rgb.r, 0, 255) / 255
  const g = clamp(rgb.g, 0, 255) / 255
  const b = clamp(rgb.b, 0, 255) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min
  const l = (max + min) / 2

  if (delta === 0) {
    return { h: 0, s: 0, l: Math.round(l * 100) }
  }

  const s = delta / (1 - Math.abs(2 * l - 1))
  let h = 0

  if (max === r) {
    h = ((g - b) / delta) % 6
  } else if (max === g) {
    h = (b - r) / delta + 2
  } else {
    h = (r - g) / delta + 4
  }

  return {
    h: Math.round((h * 60 + 360) % 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  }
}

export function hslToRgb(hsl: HslColor): RgbColor {
  const h = ((hsl.h % 360) + 360) % 360
  const s = clamp(hsl.s, 0, 100) / 100
  const l = clamp(hsl.l, 0, 100) / 100

  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2

  let r = 0
  let g = 0
  let b = 0

  if (h < 60) {
    r = c
    g = x
  } else if (h < 120) {
    r = x
    g = c
  } else if (h < 180) {
    g = c
    b = x
  } else if (h < 240) {
    g = x
    b = c
  } else if (h < 300) {
    r = x
    b = c
  } else {
    r = c
    b = x
  }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  }
}

export function formatRgb(rgb: RgbColor) {
  return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`
}

export function formatHsl(hsl: HslColor) {
  return `hsl(${hsl.h} ${hsl.s}% ${hsl.l}%)`
}

function parseRgb(input: string): RgbColor | null {
  const match = /^rgb\(\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*\)$/i.exec(
    input.trim()
  )

  if (!match) {
    return null
  }

  const r = Number(match[1])
  const g = Number(match[2])
  const b = Number(match[3])

  if ([r, g, b].some((value) => value < 0 || value > 255)) {
    return null
  }

  return { r, g, b }
}

function parseHsl(input: string): HslColor | null {
  const match = /^hsl\(\s*(-?\d{1,3})(?:\s*,\s*|\s+)(\d{1,3})%(?:\s*,\s*|\s+)(\d{1,3})%\s*\)$/i.exec(
    input.trim()
  )

  if (!match) {
    return null
  }

  const h = Number(match[1])
  const s = Number(match[2])
  const l = Number(match[3])

  if ([s, l].some((value) => value < 0 || value > 100)) {
    return null
  }

  return { h, s, l }
}

export function parseColorInput(input: string): ParsedColorResult {
  const trimmed = input.trim()

  if (!trimmed) {
    return { ok: false, error: '请输入颜色值' }
  }

  const rgbFromHex = hexToRgb(trimmed)

  if (rgbFromHex) {
    const hsl = rgbToHsl(rgbFromHex)
    return { ok: true, rgb: rgbFromHex, hsl, hex: rgbToHex(rgbFromHex) }
  }

  const rgb = parseRgb(trimmed)

  if (rgb) {
    const hsl = rgbToHsl(rgb)
    return { ok: true, rgb, hsl, hex: rgbToHex(rgb) }
  }

  const hsl = parseHsl(trimmed)

  if (hsl) {
    const rgbFromHsl = hslToRgb(hsl)
    return { ok: true, rgb: rgbFromHsl, hsl: rgbToHsl(rgbFromHsl), hex: rgbToHex(rgbFromHsl) }
  }

  return { ok: false, error: '仅支持 HEX、rgb()、hsl() 三种输入格式' }
}

function shiftHue(hue: number, offset: number) {
  return (hue + offset + 360) % 360
}

function shiftLightness(hsl: HslColor, offset: number) {
  return {
    ...hsl,
    l: clamp(hsl.l + offset, 0, 100),
  }
}

export function buildColorSchemes(hex: string): ColorSchemeEntry[] {
  const parsed = parseColorInput(hex)

  if (!parsed.ok || !parsed.hsl) {
    return []
  }

  const base = parsed.hsl

  return [
    { label: '原色', hex: parsed.hex || hex },
    { label: '浅色', hex: rgbToHex(hslToRgb(shiftLightness(base, 18))) },
    { label: '深色', hex: rgbToHex(hslToRgb(shiftLightness(base, -18))) },
    { label: '互补色', hex: rgbToHex(hslToRgb({ ...base, h: shiftHue(base.h, 180) })) },
    { label: '类似色', hex: rgbToHex(hslToRgb({ ...base, h: shiftHue(base.h, 30) })) },
  ]
}

function srgbToLinear(value: number) {
  const channel = value / 255
  return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
}

export function getContrastRatio(foregroundHex: string, backgroundHex: string) {
  const foreground = hexToRgb(foregroundHex)
  const background = hexToRgb(backgroundHex)

  if (!foreground || !background) {
    return 1
  }

  const luminance = (rgb: RgbColor) =>
    0.2126 * srgbToLinear(rgb.r) + 0.7152 * srgbToLinear(rgb.g) + 0.0722 * srgbToLinear(rgb.b)

  const left = luminance(foreground)
  const right = luminance(background)
  const lighter = Math.max(left, right)
  const darker = Math.min(left, right)

  return Number(((lighter + 0.05) / (darker + 0.05)).toFixed(2))
}

export function getContrastLevel(ratio: number) {
  if (ratio >= 7) {
    return 'AAA'
  }

  if (ratio >= 4.5) {
    return 'AA'
  }

  if (ratio >= 3) {
    return 'AA Large'
  }

  return 'Fail'
}

export function buildLinearGradientCss(fromHex: string, toHex: string, angle: number) {
  return `linear-gradient(${Math.round(angle)}deg, ${fromHex}, ${toHex})`
}
