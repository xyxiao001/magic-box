export type SqlKeywordCase = 'upper' | 'lower'

export interface SqlFormatterOptions {
  keywordCase: SqlKeywordCase
  indentSize: number
  compact: boolean
}

export interface SqlFormatterState {
  ok: boolean
  value?: string
  error?: string
}

export interface SqlStats {
  characters: number
  lines: number
}

const defaultNewlineClauses = [
  'SELECT',
  'FROM',
  'WHERE',
  'GROUP BY',
  'ORDER BY',
  'HAVING',
  'LIMIT',
  'OFFSET',
  'INSERT INTO',
  'VALUES',
  'UPDATE',
  'SET',
  'DELETE FROM',
  'LEFT JOIN',
  'RIGHT JOIN',
  'INNER JOIN',
  'OUTER JOIN',
  'FULL JOIN',
  'JOIN',
  'ON',
  'UNION',
] as const

const inlineBreakKeywords = new Set(['AND', 'OR'])
const multiWordClauses = new Set<string>([
  'GROUP BY',
  'ORDER BY',
  'INSERT INTO',
  'DELETE FROM',
  'LEFT JOIN',
  'RIGHT JOIN',
  'INNER JOIN',
  'OUTER JOIN',
  'FULL JOIN',
])
const clauseSet = new Set<string>(defaultNewlineClauses)

function isWordToken(token: string) {
  return /^[A-Za-z_][A-Za-z0-9_$]*$/.test(token)
}

function isSqlKeyword(token: string) {
  return clauseSet.has(token.toUpperCase()) || inlineBreakKeywords.has(token.toUpperCase()) || ['AS', 'IN', 'IS', 'NOT', 'NULL', 'DISTINCT'].includes(token.toUpperCase())
}

function normalizeKeyword(token: string, keywordCase: SqlKeywordCase) {
  const normalized = token.toUpperCase()

  if (!isSqlKeyword(normalized)) {
    return token
  }

  return keywordCase === 'upper' ? normalized : normalized.toLowerCase()
}

function tokenizeSql(input: string) {
  const tokens: string[] = []
  let current = ''
  let index = 0

  const pushCurrent = () => {
    if (current) {
      tokens.push(current)
      current = ''
    }
  }

  while (index < input.length) {
    const char = input[index] ?? ''
    const next = input[index + 1] ?? ''

    if (char === "'" || char === '"' || char === '`') {
      pushCurrent()
      const quote = char
      let value = quote
      index += 1

      while (index < input.length) {
        const currentChar = input[index] ?? ''
        value += currentChar

        if (currentChar === quote) {
          if (quote === "'" && input[index + 1] === "'") {
            value += "'"
            index += 2
            continue
          }

          index += 1
          break
        }

        index += 1
      }

      tokens.push(value)
      continue
    }

    if (char === '-' && next === '-') {
      pushCurrent()
      let value = '--'
      index += 2

      while (index < input.length && input[index] !== '\n') {
        value += input[index] ?? ''
        index += 1
      }

      tokens.push(value)
      continue
    }

    if (char === '/' && next === '*') {
      pushCurrent()
      let value = '/*'
      index += 2

      while (index < input.length) {
        const currentChar = input[index] ?? ''
        const following = input[index + 1] ?? ''
        value += currentChar

        if (currentChar === '*' && following === '/') {
          value += '/'
          index += 2
          break
        }

        index += 1
      }

      tokens.push(value)
      continue
    }

    if (/\s/.test(char)) {
      pushCurrent()
      index += 1
      continue
    }

    if (',();'.includes(char)) {
      pushCurrent()
      tokens.push(char)
      index += 1
      continue
    }

    current += char
    index += 1
  }

  pushCurrent()
  return tokens
}

function combineClause(tokens: string[], index: number) {
  const token = tokens[index] ?? ''
  const next = tokens[index + 1] ?? ''
  const combined = `${token.toUpperCase()} ${next.toUpperCase()}`

  if (multiWordClauses.has(combined)) {
    return {
      token: combined,
      consumed: 2,
    }
  }

  return {
    token,
    consumed: 1,
  }
}

function collapseSqlWhitespace(input: string, keywordCase: SqlKeywordCase) {
  return tokenizeSql(input)
    .map((token) => (isWordToken(token) ? normalizeKeyword(token, keywordCase) : token))
    .join(' ')
    .replaceAll(/\s+,/g, ',')
    .replaceAll(/\(\s+/g, '(')
    .replaceAll(/\s+\)/g, ')')
    .replaceAll(/\s*;\s*/g, '; ')
    .trim()
}

export function formatSql(input: string, options: SqlFormatterOptions): SqlFormatterState {
  if (!input.trim()) {
    return {
      ok: false,
      error: '请输入 SQL',
    }
  }

  if (options.compact) {
    return {
      ok: true,
      value: collapseSqlWhitespace(input, options.keywordCase),
    }
  }

  const tokens = tokenizeSql(input)
  const lines: string[] = []
  let currentLine = ''
  let indentLevel = 0
  let index = 0
  let inSelectList = false
  let inSetList = false

  const flushLine = () => {
    if (currentLine.trim()) {
      lines.push(currentLine.trimEnd())
    }
  }

  const resetLine = (nextIndent = indentLevel) => {
    currentLine = `${' '.repeat(Math.max(0, nextIndent) * options.indentSize)}`
  }

  resetLine(0)

  while (index < tokens.length) {
    const { token, consumed } = combineClause(tokens, index)
    const upperToken = token.toUpperCase()
    const normalizedToken = upperToken === token && isSqlKeyword(token)
      ? normalizeKeyword(token, options.keywordCase)
      : isWordToken(token)
        ? normalizeKeyword(token, options.keywordCase)
        : token

    if (clauseSet.has(upperToken)) {
      flushLine()
      currentLine = `${' '.repeat(indentLevel * options.indentSize)}${normalizedToken}`
      lines.push(currentLine.trimEnd())
      inSelectList = upperToken === 'SELECT'
      inSetList = upperToken === 'SET' || upperToken === 'VALUES'
      resetLine(upperToken === 'ON' ? indentLevel + 1 : indentLevel + (inSelectList || inSetList ? 1 : 0))
      index += consumed
      continue
    }

    if (inlineBreakKeywords.has(upperToken)) {
      flushLine()
      currentLine = `${' '.repeat((indentLevel + 1) * options.indentSize)}${normalizedToken} `
      index += consumed
      continue
    }

    if (normalizedToken === '(') {
      currentLine += '('
      indentLevel += 1
      index += consumed
      continue
    }

    if (normalizedToken === ')') {
      indentLevel = Math.max(0, indentLevel - 1)
      currentLine = currentLine.trimEnd()
      currentLine += ') '
      index += consumed
      continue
    }

    if (normalizedToken === ',') {
      currentLine = currentLine.trimEnd()
      currentLine += ','
      flushLine()
      resetLine(inSelectList || inSetList ? indentLevel + 1 : indentLevel)
      index += consumed
      continue
    }

    if (normalizedToken === ';') {
      currentLine = currentLine.trimEnd()
      currentLine += ';'
      flushLine()
      inSelectList = false
      inSetList = false
      resetLine(indentLevel)
      index += consumed
      continue
    }

    currentLine += normalizedToken
    currentLine += ' '
    index += consumed
  }

  flushLine()

  return {
    ok: true,
    value: lines.join('\n').replaceAll(/\n{3,}/g, '\n\n').trim(),
  }
}

export function buildSqlStats(input: string): SqlStats {
  if (!input) {
    return {
      characters: 0,
      lines: 0,
    }
  }

  return {
    characters: input.length,
    lines: input.split('\n').length,
  }
}
