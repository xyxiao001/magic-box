export interface CronFieldDefinition {
  name: string
  min: number
  max: number
}

export interface ParsedCronExpression {
  ok: boolean
  error?: string
  expression: string
  description: string
  parts: string[]
}

export interface CronBuilderState {
  mode: 'hourly' | 'daily' | 'weekdays' | 'weekly'
  minute: number
  hour: number
  weekday: number
}

const fieldDefinitions: CronFieldDefinition[] = [
  { name: 'minute', min: 0, max: 59 },
  { name: 'hour', min: 0, max: 23 },
  { name: 'dayOfMonth', min: 1, max: 31 },
  { name: 'month', min: 1, max: 12 },
  { name: 'dayOfWeek', min: 0, max: 6 },
]

const weekdayLabels = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

function normalizeWeekday(value: number) {
  if (value === 7) {
    return 0
  }

  return value
}

function formatSegment(segment: string, field: CronFieldDefinition) {
  const trimmed = segment.trim()

  if (trimmed === '*') {
    return { ok: true as const }
  }

  const values = trimmed.split(',')

  for (const value of values) {
    if (value.startsWith('*/')) {
      const step = Number(value.slice(2))

      if (!Number.isInteger(step) || step <= 0) {
        return { ok: false as const, error: `${field.name} 的步长无效` }
      }

      continue
    }

    const rangeMatch = /^(\d+)-(\d+)$/.exec(value)

    if (rangeMatch) {
      const start = Number(rangeMatch[1])
      const end = Number(rangeMatch[2])
      const normalizedStart = field.name === 'dayOfWeek' ? normalizeWeekday(start) : start
      const normalizedEnd = field.name === 'dayOfWeek' ? normalizeWeekday(end) : end

      if (
        !Number.isInteger(start) ||
        !Number.isInteger(end) ||
        normalizedStart < field.min ||
        normalizedEnd > field.max ||
        normalizedStart > normalizedEnd
      ) {
        return { ok: false as const, error: `${field.name} 的范围无效` }
      }

      continue
    }

    const numeric = Number(value)
    const normalized = field.name === 'dayOfWeek' ? normalizeWeekday(numeric) : numeric

    if (!Number.isInteger(numeric) || normalized < field.min || normalized > field.max) {
      return { ok: false as const, error: `${field.name} 的值超出范围` }
    }
  }

  return { ok: true as const }
}

function parseFieldToSet(segment: string, field: CronFieldDefinition) {
  const values = new Set<number>()

  if (segment === '*') {
    for (let current = field.min; current <= field.max; current += 1) {
      values.add(current)
    }

    return values
  }

  for (const part of segment.split(',')) {
    if (part.startsWith('*/')) {
      const step = Number(part.slice(2))
      for (let current = field.min; current <= field.max; current += step) {
        values.add(current)
      }
      continue
    }

    const rangeMatch = /^(\d+)-(\d+)$/.exec(part)

    if (rangeMatch) {
      const start = field.name === 'dayOfWeek' ? normalizeWeekday(Number(rangeMatch[1])) : Number(rangeMatch[1])
      const end = field.name === 'dayOfWeek' ? normalizeWeekday(Number(rangeMatch[2])) : Number(rangeMatch[2])

      for (let current = start; current <= end; current += 1) {
        values.add(current)
      }
      continue
    }

    const numeric = Number(part)
    values.add(field.name === 'dayOfWeek' ? normalizeWeekday(numeric) : numeric)
  }

  return values
}

function describeField(segment: string, field: CronFieldDefinition) {
  if (segment === '*') {
    if (field.name === 'minute') {
      return '每分钟'
    }

    if (field.name === 'hour') {
      return '每小时'
    }

    if (field.name === 'dayOfMonth') {
      return '每月每天'
    }

    if (field.name === 'month') {
      return '每月'
    }

    return '每周每天'
  }

  if (segment.startsWith('*/')) {
    const step = Number(segment.slice(2))

    if (field.name === 'minute') {
      return `每 ${step} 分钟`
    }

    if (field.name === 'hour') {
      return `每 ${step} 小时`
    }
  }

  if (field.name === 'dayOfWeek') {
    return segment
      .split(',')
      .map((part) => {
        const rangeMatch = /^(\d+)-(\d+)$/.exec(part)
        if (rangeMatch) {
          return `${weekdayLabels[normalizeWeekday(Number(rangeMatch[1]))]} 到 ${weekdayLabels[normalizeWeekday(Number(rangeMatch[2]))]}`
        }

        return weekdayLabels[normalizeWeekday(Number(part))]
      })
      .join('、')
  }

  if (field.name === 'month') {
    return segment
      .split(',')
      .map((part) => `${Number(part)} 月`)
      .join('、')
  }

  if (field.name === 'dayOfMonth') {
    return segment
      .split(',')
      .map((part) => `${Number(part)} 日`)
      .join('、')
  }

  return segment
    .split(',')
    .map((part) => String(Number(part)))
    .join('、')
}

export function parseCronExpression(input: string): ParsedCronExpression {
  const expression = input.trim().replace(/\s+/g, ' ')

  if (!expression) {
    return {
      ok: false,
      error: '请输入标准 5 段 cron 表达式',
      expression: '',
      description: '等待输入 cron',
      parts: [],
    }
  }

  const parts = expression.split(' ')

  if (parts.length !== 5) {
    return {
      ok: false,
      error: '当前仅支持标准 5 段 cron：分钟 小时 日 月 星期',
      expression,
      description: '表达式格式无效',
      parts: [],
    }
  }

  for (let index = 0; index < parts.length; index += 1) {
    const validation = formatSegment(parts[index], fieldDefinitions[index])

    if (!validation.ok) {
      return {
        ok: false,
        error: validation.error,
        expression,
        description: '表达式解析失败',
        parts: [],
      }
    }
  }

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts
  const description = [
    `${describeField(minute, fieldDefinitions[0])}`,
    hour === '*' ? '的任意小时' : `${describeField(hour, fieldDefinitions[1])} 点`,
    dayOfMonth === '*' ? '' : `，在 ${describeField(dayOfMonth, fieldDefinitions[2])}`,
    month === '*' ? '' : `，限于 ${describeField(month, fieldDefinitions[3])}`,
    dayOfWeek === '*' ? '' : `，星期为 ${describeField(dayOfWeek, fieldDefinitions[4])}`,
  ]
    .join('')
    .replace('点，在', ' 点，在')
    .trim()

  return {
    ok: true,
    expression,
    description,
    parts,
  }
}

function matchesDate(date: Date, allowedValues: Set<number>[], originalParts: string[]) {
  const minute = date.getMinutes()
  const hour = date.getHours()
  const dayOfMonth = date.getDate()
  const month = date.getMonth() + 1
  const dayOfWeek = date.getDay()

  const domWildcard = originalParts[2] === '*'
  const dowWildcard = originalParts[4] === '*'
  const domMatch = allowedValues[2].has(dayOfMonth)
  const dowMatch = allowedValues[4].has(dayOfWeek)
  const dayMatch = domWildcard && dowWildcard ? true : domWildcard ? dowMatch : dowWildcard ? domMatch : domMatch || dowMatch

  return (
    allowedValues[0].has(minute) &&
    allowedValues[1].has(hour) &&
    allowedValues[3].has(month) &&
    dayMatch
  )
}

export function getNextRunTimes(expression: string, count = 6, now = new Date()) {
  const parsed = parseCronExpression(expression)

  if (!parsed.ok) {
    return []
  }

  const allowedValues = parsed.parts.map((part, index) => parseFieldToSet(part, fieldDefinitions[index]))
  const cursor = new Date(now)
  cursor.setSeconds(0, 0)
  cursor.setMinutes(cursor.getMinutes() + 1)

  const result: string[] = []
  const limit = 366 * 24 * 60

  for (let step = 0; step < limit && result.length < count; step += 1) {
    if (matchesDate(cursor, allowedValues, parsed.parts)) {
      result.push(cursor.toLocaleString('zh-CN', { hour12: false }))
    }

    cursor.setMinutes(cursor.getMinutes() + 1)
  }

  return result
}

export function buildCronFromBuilder(state: CronBuilderState) {
  const minute = Math.max(0, Math.min(59, Math.floor(state.minute)))
  const hour = Math.max(0, Math.min(23, Math.floor(state.hour)))
  const weekday = Math.max(0, Math.min(6, Math.floor(state.weekday)))

  if (state.mode === 'hourly') {
    return `${minute} * * * *`
  }

  if (state.mode === 'daily') {
    return `${minute} ${hour} * * *`
  }

  if (state.mode === 'weekdays') {
    return `${minute} ${hour} * * 1-5`
  }

  return `${minute} ${hour} * * ${weekday}`
}

export function buildCronTemplates() {
  return [
    {
      label: '每小时',
      summary: '适合心跳、轻量巡检与缓存刷新。',
      expression: '0 * * * *',
    },
    {
      label: '每天早上 9 点',
      summary: '适合日报、同步任务和常规批处理。',
      expression: '0 9 * * *',
    },
    {
      label: '工作日 10:30',
      summary: '适合上班时段的自动化流程。',
      expression: '30 10 * * 1-5',
    },
    {
      label: '每周一 08:00',
      summary: '适合周报、例行清理和周期开关。',
      expression: '0 8 * * 1',
    },
  ]
}
