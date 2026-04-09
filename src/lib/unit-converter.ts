export interface UnitDefinition {
  label: string
  toBase: (value: number) => number
  fromBase: (value: number) => number
}

export interface UnitCategory {
  label: string
  units: Record<string, UnitDefinition>
}

export const unitCategories: Record<string, UnitCategory> = {
  length: {
    label: '长度',
    units: {
      m: { label: '米', toBase: (v) => v, fromBase: (v) => v },
      km: { label: '千米', toBase: (v) => v * 1000, fromBase: (v) => v / 1000 },
      cm: { label: '厘米', toBase: (v) => v / 100, fromBase: (v) => v * 100 },
      in: { label: '英寸', toBase: (v) => v * 0.0254, fromBase: (v) => v / 0.0254 },
      ft: { label: '英尺', toBase: (v) => v * 0.3048, fromBase: (v) => v / 0.3048 },
    },
  },
  weight: {
    label: '重量',
    units: {
      g: { label: '克', toBase: (v) => v, fromBase: (v) => v },
      kg: { label: '千克', toBase: (v) => v * 1000, fromBase: (v) => v / 1000 },
      lb: { label: '磅', toBase: (v) => v * 453.59237, fromBase: (v) => v / 453.59237 },
    },
  },
  temperature: {
    label: '温度',
    units: {
      c: { label: '摄氏', toBase: (v) => v, fromBase: (v) => v },
      f: { label: '华氏', toBase: (v) => ((v - 32) * 5) / 9, fromBase: (v) => (v * 9) / 5 + 32 },
      k: { label: '开尔文', toBase: (v) => v - 273.15, fromBase: (v) => v + 273.15 },
    },
  },
  storage: {
    label: '存储',
    units: {
      b: { label: 'B', toBase: (v) => v, fromBase: (v) => v },
      kb: { label: 'KB', toBase: (v) => v * 1024, fromBase: (v) => v / 1024 },
      mb: { label: 'MB', toBase: (v) => v * 1024 * 1024, fromBase: (v) => v / (1024 * 1024) },
      gb: { label: 'GB', toBase: (v) => v * 1024 * 1024 * 1024, fromBase: (v) => v / (1024 * 1024 * 1024) },
    },
  },
  speed: {
    label: '速度',
    units: {
      ms: { label: 'm/s', toBase: (v) => v, fromBase: (v) => v },
      kmh: { label: 'km/h', toBase: (v) => v / 3.6, fromBase: (v) => v * 3.6 },
      mph: { label: 'mph', toBase: (v) => v * 0.44704, fromBase: (v) => v / 0.44704 },
    },
  },
}

export interface ConvertedUnitResult {
  unit: string
  label: string
  value: string
}

function formatConvertedValue(value: number) {
  const rounded = Number(value.toFixed(6))
  return Number.isInteger(rounded) ? String(rounded) : String(rounded)
}

export function convertUnit(categoryKey: string, value: number, sourceUnit: string, targetUnit: string) {
  const category = unitCategories[categoryKey]

  if (!category) {
    throw new Error('未知单位分类')
  }

  const source = category.units[sourceUnit]
  const target = category.units[targetUnit]

  if (!source || !target) {
    throw new Error('未知单位')
  }

  const baseValue = source.toBase(value)
  return target.fromBase(baseValue)
}

export function buildConvertedResults(categoryKey: string, value: number, sourceUnit: string) {
  const category = unitCategories[categoryKey]

  if (!category) {
    return []
  }

  return Object.entries(category.units).map(([unit, definition]) => ({
    unit,
    label: definition.label,
    value: formatConvertedValue(convertUnit(categoryKey, value, sourceUnit, unit)),
  }))
}
