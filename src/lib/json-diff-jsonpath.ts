export interface JsonDocumentState<T> {
  ok: boolean
  value?: T
  error?: string
}

export interface JsonDiffEntry {
  path: string
  kind: 'added' | 'removed' | 'changed' | 'unchanged'
  leftValue: string
  rightValue: string
}

export interface JsonDiffStats {
  added: number
  removed: number
  changed: number
  unchanged: number
}

export interface JsonStructuredDiffResult {
  entries: JsonDiffEntry[]
  stats: JsonDiffStats
}

export interface JsonPathMatch {
  path: string
  value: unknown
}

type JsonPathToken =
  | { type: 'property'; key: string }
  | { type: 'index'; index: number }
  | { type: 'wildcard' }

function isObjectLike(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isJsonPrimitive(value: unknown) {
  return value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
}

function formatPathSegment(basePath: string, segment: string | number) {
  if (typeof segment === 'number') {
    return `${basePath}[${segment}]`
  }

  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(segment)
    ? `${basePath}.${segment}`
    : `${basePath}[${JSON.stringify(segment)}]`
}

function stringifyPreview(value: unknown) {
  if (value === undefined) {
    return '—'
  }

  if (typeof value === 'string') {
    return JSON.stringify(value)
  }

  const json = JSON.stringify(value)

  if (!json) {
    return String(value)
  }

  return json.length > 120 ? `${json.slice(0, 117)}...` : json
}

function deepEqual(left: unknown, right: unknown): boolean {
  if (left === right) {
    return true
  }

  if (Array.isArray(left) && Array.isArray(right)) {
    if (left.length !== right.length) {
      return false
    }

    return left.every((item, index) => deepEqual(item, right[index]))
  }

  if (isObjectLike(left) && isObjectLike(right)) {
    const leftKeys = Object.keys(left)
    const rightKeys = Object.keys(right)

    if (leftKeys.length !== rightKeys.length) {
      return false
    }

    return leftKeys.every((key) => deepEqual(left[key], right[key]))
  }

  return false
}

function pushEntry(entries: JsonDiffEntry[], stats: JsonDiffStats, entry: JsonDiffEntry) {
  entries.push(entry)
  stats[entry.kind] += 1
}

function diffValues(
  left: unknown,
  right: unknown,
  path: string,
  entries: JsonDiffEntry[],
  stats: JsonDiffStats
) {
  if (left === undefined && right !== undefined) {
    pushEntry(entries, stats, {
      path,
      kind: 'added',
      leftValue: '—',
      rightValue: stringifyPreview(right),
    })
    return
  }

  if (left !== undefined && right === undefined) {
    pushEntry(entries, stats, {
      path,
      kind: 'removed',
      leftValue: stringifyPreview(left),
      rightValue: '—',
    })
    return
  }

  if (deepEqual(left, right)) {
    pushEntry(entries, stats, {
      path,
      kind: 'unchanged',
      leftValue: stringifyPreview(left),
      rightValue: stringifyPreview(right),
    })
    return
  }

  if (Array.isArray(left) && Array.isArray(right)) {
    const maxLength = Math.max(left.length, right.length)

    for (let index = 0; index < maxLength; index += 1) {
      diffValues(left[index], right[index], formatPathSegment(path, index), entries, stats)
    }

    return
  }

  if (isObjectLike(left) && isObjectLike(right)) {
    const keys = [...new Set([...Object.keys(left), ...Object.keys(right)])].sort((a, b) =>
      a.localeCompare(b, 'en')
    )

    for (const key of keys) {
      diffValues(left[key], right[key], formatPathSegment(path, key), entries, stats)
    }

    return
  }

  pushEntry(entries, stats, {
    path,
    kind: 'changed',
    leftValue: stringifyPreview(left),
    rightValue: stringifyPreview(right),
  })
}

function parseBracketToken(content: string): JsonDocumentState<JsonPathToken> {
  const trimmed = content.trim()

  if (!trimmed) {
    return {
      ok: false,
      error: 'JSONPath 方括号不能为空',
    }
  }

  if (trimmed === '*') {
    return {
      ok: true,
      value: { type: 'wildcard' },
    }
  }

  if (/^\d+$/.test(trimmed)) {
    return {
      ok: true,
      value: { type: 'index', index: Number(trimmed) },
    }
  }

  if (
    (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
  ) {
    try {
      const normalized =
        trimmed.startsWith("'")
          ? `"${trimmed.slice(1, -1).replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`
          : trimmed

      return {
        ok: true,
        value: {
          type: 'property',
          key: JSON.parse(normalized) as string,
        },
      }
    } catch {
      return {
        ok: false,
        error: `JSONPath 方括号属性解析失败：${trimmed}`,
      }
    }
  }

  return {
    ok: false,
    error: `暂不支持的 JSONPath 片段：${trimmed}`,
  }
}

function parseJsonPathTokens(expression: string): JsonDocumentState<JsonPathToken[]> {
  const trimmed = expression.trim()

  if (!trimmed) {
    return {
      ok: false,
      error: '请输入 JSONPath 表达式',
    }
  }

  if (trimmed[0] !== '$') {
    return {
      ok: false,
      error: 'JSONPath 需以 $ 开头',
    }
  }

  const tokens: JsonPathToken[] = []
  let index = 1

  while (index < trimmed.length) {
    const char = trimmed[index] ?? ''

    if (char === '.') {
      const next = trimmed[index + 1] ?? ''

      if (next === '*') {
        tokens.push({ type: 'wildcard' })
        index += 2
        continue
      }

      index += 1
      let key = ''

      while (index < trimmed.length) {
        const current = trimmed[index] ?? ''

        if (current === '.' || current === '[') {
          break
        }

        key += current
        index += 1
      }

      if (!key) {
        return {
          ok: false,
          error: 'JSONPath 点语法后缺少属性名',
        }
      }

      tokens.push({ type: 'property', key })
      continue
    }

    if (char === '[') {
      let depth = 1
      let end = index + 1

      while (end < trimmed.length && depth > 0) {
        const current = trimmed[end] ?? ''

        if (current === '[') {
          depth += 1
        } else if (current === ']') {
          depth -= 1
        }

        if (depth === 0) {
          break
        }

        end += 1
      }

      if (depth !== 0) {
        return {
          ok: false,
          error: 'JSONPath 方括号未闭合',
        }
      }

      const parsedToken = parseBracketToken(trimmed.slice(index + 1, end))

      if (!parsedToken.ok || !parsedToken.value) {
        return {
          ok: false,
          error: parsedToken.error ?? 'JSONPath 解析失败',
        }
      }

      tokens.push(parsedToken.value)
      index = end + 1
      continue
    }

    return {
      ok: false,
      error: `JSONPath 在位置 ${index + 1} 存在非法字符：${char}`,
    }
  }

  return {
    ok: true,
    value: tokens,
  }
}

export function parseJsonDocument(raw: string): JsonDocumentState<unknown> {
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

export function buildJsonStructuredDiff(left: unknown, right: unknown): JsonStructuredDiffResult {
  const entries: JsonDiffEntry[] = []
  const stats: JsonDiffStats = {
    added: 0,
    removed: 0,
    changed: 0,
    unchanged: 0,
  }

  diffValues(left, right, '$', entries, stats)

  return {
    entries,
    stats,
  }
}

export function executeJsonPathQuery(input: unknown, expression: string): JsonDocumentState<JsonPathMatch[]> {
  const parsedTokens = parseJsonPathTokens(expression)

  if (!parsedTokens.ok || !parsedTokens.value) {
    return {
      ok: false,
      error: parsedTokens.error ?? 'JSONPath 解析失败',
    }
  }

  let currentMatches: JsonPathMatch[] = [{ path: '$', value: input }]

  for (const token of parsedTokens.value) {
    const nextMatches: JsonPathMatch[] = []

    for (const match of currentMatches) {
      if (token.type === 'property') {
        if (isObjectLike(match.value) && token.key in match.value) {
          nextMatches.push({
            path: formatPathSegment(match.path, token.key),
            value: match.value[token.key],
          })
        }
        continue
      }

      if (token.type === 'index') {
        if (Array.isArray(match.value) && token.index >= 0 && token.index < match.value.length) {
          nextMatches.push({
            path: formatPathSegment(match.path, token.index),
            value: match.value[token.index],
          })
        }
        continue
      }

      if (Array.isArray(match.value)) {
        match.value.forEach((item, index) => {
          nextMatches.push({
            path: formatPathSegment(match.path, index),
            value: item,
          })
        })
        continue
      }

      if (isObjectLike(match.value)) {
        Object.entries(match.value).forEach(([key, value]) => {
          nextMatches.push({
            path: formatPathSegment(match.path, key),
            value,
          })
        })
      }
    }

    currentMatches = nextMatches
  }

  return {
    ok: true,
    value: currentMatches,
  }
}

export function formatJsonPathResultValue(value: unknown) {
  if (isJsonPrimitive(value)) {
    return stringifyPreview(value)
  }

  return JSON.stringify(value, null, 2)
}
