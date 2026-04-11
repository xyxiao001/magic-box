export type CsvDelimiter = ',' | ';' | '\t'

export interface CsvToolkitOptions {
  delimiter: CsvDelimiter
  hasHeader: boolean
  trimCells: boolean
  removeBlankLines: boolean
}

export interface CsvToolkitState<T> {
  ok: boolean
  value?: T
  error?: string
}

export interface CsvPreviewData {
  headers: string[]
  rows: string[][]
  records: Array<Record<string, string>>
  columnCount: number
  rowCount: number
}

export const defaultCsvToolkitOptions: CsvToolkitOptions = {
  delimiter: ',',
  hasHeader: true,
  trimCells: true,
  removeBlankLines: true,
}

function normalizeCell(value: string, options: CsvToolkitOptions) {
  return options.trimCells ? value.trim() : value
}

function isBlankRow(row: string[]) {
  return row.every((cell) => !cell.trim())
}

function parseCsvRows(input: string, delimiter: CsvDelimiter): CsvToolkitState<string[][]> {
  if (!input.trim()) {
    return {
      ok: false,
      error: '请输入 CSV 内容',
    }
  }

  const rows: string[][] = []
  let currentRow: string[] = []
  let currentCell = ''
  let inQuotes = false

  const pushCell = () => {
    currentRow.push(currentCell)
    currentCell = ''
  }

  const pushRow = () => {
    rows.push(currentRow)
    currentRow = []
  }

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index] ?? ''
    const next = input[index + 1] ?? ''

    if (char === '"') {
      if (inQuotes && next === '"') {
        currentCell += '"'
        index += 1
        continue
      }

      inQuotes = !inQuotes
      continue
    }

    if (char === delimiter && !inQuotes) {
      pushCell()
      continue
    }

    if (char === '\r') {
      continue
    }

    if (char === '\n' && !inQuotes) {
      pushCell()
      pushRow()
      continue
    }

    currentCell += char
  }

  if (inQuotes) {
    return {
      ok: false,
      error: 'CSV 引号未闭合',
    }
  }

  pushCell()
  pushRow()

  return {
    ok: true,
    value: rows,
  }
}

function buildHeaders(rows: string[][], options: CsvToolkitOptions) {
  const maxColumns = rows.reduce((max, row) => Math.max(max, row.length), 0)

  if (options.hasHeader && rows[0]) {
    return Array.from({ length: maxColumns }, (_, index) => rows[0]?.[index] || `column_${index + 1}`)
  }

  return Array.from({ length: maxColumns }, (_, index) => `column_${index + 1}`)
}

function quoteCsvCell(value: string, delimiter: CsvDelimiter) {
  if (value.includes('"') || value.includes('\n') || value.includes('\r') || value.includes(delimiter)) {
    return `"${value.replaceAll('"', '""')}"`
  }

  return value
}

function primitiveToCell(value: unknown) {
  if (value === null || value === undefined) {
    return ''
  }

  if (typeof value === 'string') {
    return value
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  return JSON.stringify(value)
}

export function parseCsvInput(input: string, options: CsvToolkitOptions): CsvToolkitState<CsvPreviewData> {
  const parsedRows = parseCsvRows(input, options.delimiter)

  if (!parsedRows.ok || !parsedRows.value) {
    return {
      ok: false,
      error: parsedRows.error,
    }
  }

  const cleanedRows = parsedRows.value
    .map((row) => row.map((cell) => normalizeCell(cell, options)))
    .filter((row) => (options.removeBlankLines ? !isBlankRow(row) : true))

  if (!cleanedRows.length) {
    return {
      ok: false,
      error: '当前 CSV 没有可展示的行',
    }
  }

  const headers = buildHeaders(cleanedRows, options)
  const bodyRows = options.hasHeader ? cleanedRows.slice(1) : cleanedRows
  const normalizedRows = bodyRows.map((row) => headers.map((_, index) => row[index] ?? ''))
  const records = normalizedRows.map((row) =>
    headers.reduce<Record<string, string>>((acc, header, index) => {
      acc[header] = row[index] ?? ''
      return acc
    }, {})
  )

  return {
    ok: true,
    value: {
      headers,
      rows: normalizedRows,
      records,
      columnCount: headers.length,
      rowCount: normalizedRows.length,
    },
  }
}

export function convertCsvToJson(input: string, options: CsvToolkitOptions): CsvToolkitState<string> {
  const parsed = parseCsvInput(input, options)

  if (!parsed.ok || !parsed.value) {
    return {
      ok: false,
      error: parsed.error,
    }
  }

  return {
    ok: true,
    value: JSON.stringify(parsed.value.records, null, 2),
  }
}

export function convertJsonArrayToCsv(input: string, delimiter: CsvDelimiter): CsvToolkitState<string> {
  if (!input.trim()) {
    return {
      ok: false,
      error: '请输入 JSON 数组',
    }
  }

  let parsed: unknown

  try {
    parsed = JSON.parse(input) as unknown
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'JSON 解析失败',
    }
  }

  if (!Array.isArray(parsed)) {
    return {
      ok: false,
      error: '请输入 JSON 数组，例如 [{"name":"Magic Box"}]',
    }
  }

  if (!parsed.length) {
    return {
      ok: true,
      value: '',
    }
  }

  if (!parsed.every((item) => typeof item === 'object' && item !== null && !Array.isArray(item))) {
    return {
      ok: false,
      error: 'JSON 数组内的每一项都需为对象',
    }
  }

  const records = parsed as Array<Record<string, unknown>>
  const headers = [...new Set(records.flatMap((record) => Object.keys(record)))]
  const lines = [
    headers.map((header) => quoteCsvCell(header, delimiter)).join(delimiter),
    ...records.map((record) =>
      headers.map((header) => quoteCsvCell(primitiveToCell(record[header]), delimiter)).join(delimiter)
    ),
  ]

  return {
    ok: true,
    value: lines.join('\n'),
  }
}
