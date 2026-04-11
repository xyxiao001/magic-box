export interface JsonToolState {
  ok: boolean
  value?: string
  error?: string
}

export interface JsonParseState {
  ok: boolean
  value?: unknown
  error?: string
}

function parseJson(raw: string): JsonParseState {
  try {
    return {
      ok: true,
      value: JSON.parse(raw) as unknown,
    }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'JSON 解析失败',
    }
  }
}

function escapeJsString(value: string) {
  return value
    .replaceAll('\\', '\\\\')
    .replaceAll("'", "\\'")
    .replaceAll('\n', '\\n')
    .replaceAll('\r', '\\r')
    .replaceAll('\t', '\\t')
}

function formatJsKey(key: string) {
  return /^[$A-Z_][0-9A-Z_$]*$/i.test(key) ? key : `'${escapeJsString(key)}'`
}

function stringifyJsValue(value: unknown, indent = '  ', level = 0): string {
  if (value === null) {
    return 'null'
  }

  if (typeof value === 'string') {
    return `'${escapeJsString(value)}'`
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  if (Array.isArray(value)) {
    if (!value.length) {
      return '[]'
    }

    const currentIndent = indent.repeat(level)
    const childIndent = indent.repeat(level + 1)

    return `[\n${value.map((item) => `${childIndent}${stringifyJsValue(item, indent, level + 1)}`).join(',\n')}\n${currentIndent}]`
  }

  const entries = Object.entries(value as Record<string, unknown>)

  if (!entries.length) {
    return '{}'
  }

  const currentIndent = indent.repeat(level)
  const childIndent = indent.repeat(level + 1)

  return `{\n${entries
    .map(([key, item]) => `${childIndent}${formatJsKey(key)}: ${stringifyJsValue(item, indent, level + 1)}`)
    .join(',\n')}\n${currentIndent}}`
}

export function formatJson(raw: string): JsonToolState {
  const parsed = parseJson(raw)

  if (!parsed.ok) {
    return {
      ok: false,
      error: parsed.error,
    }
  }

  return {
    ok: true,
    value: JSON.stringify(parsed.value, null, 2),
  }
}

export function minifyJson(raw: string): JsonToolState {
  const parsed = parseJson(raw)

  if (!parsed.ok) {
    return {
      ok: false,
      error: parsed.error,
    }
  }

  return {
    ok: true,
    value: JSON.stringify(parsed.value),
  }
}

export function validateJson(raw: string): JsonToolState {
  const parsed = parseJson(raw)

  if (!parsed.ok) {
    return {
      ok: false,
      error: parsed.error,
    }
  }

  return {
    ok: true,
    value: 'JSON 有效',
  }
}

export function convertJsonToJsObject(raw: string): JsonToolState {
  const parsed = parseJson(raw)

  if (!parsed.ok) {
    return {
      ok: false,
      error: parsed.error,
    }
  }

  return {
    ok: true,
    value: stringifyJsValue(parsed.value),
  }
}

export function parseJsonValue(raw: string): JsonParseState {
  return parseJson(raw)
}
