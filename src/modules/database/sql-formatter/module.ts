import { buildSqlStats, formatSql, type SqlFormatterOptions, type SqlKeywordCase, type SqlStats } from './logic'
import { sqlFormatterMeta } from './meta'
import type { ToolSample } from '@/tool-runtime/protocols/tool-module'
import type { ToolDownloadPayload } from '@/tool-runtime/services/tool-download-service'
import type { ToolModule } from '@/tool-runtime/protocols/tool-module'

export interface SqlFormatterInput {
  sqlInput: string
  options: SqlFormatterOptions
}

export interface SqlFormatterOutput {
  formattedText: string
  inputStats: SqlStats
  outputStats: SqlStats
  hasChanges: boolean
  compact: boolean
}

export interface SqlTemplate {
  label: string
  summary: string
  input: string
}

export const sqlFormatterTemplates: SqlTemplate[] = [
  {
    label: '简单查询',
    summary: '适合快速整理单表查询和条件语句。',
    input: "select id,name,email from users where active = 1 and role = 'admin' order by created_at desc",
  },
  {
    label: '联表查询',
    summary: '适合快速整理 join、group by 和聚合字段。',
    input:
      "select u.id,u.name,o.total from users u left join orders o on u.id = o.user_id where o.status = 'paid' group by u.id,u.name,o.total",
  },
  {
    label: '更新语句',
    summary: '适合清理 set 列表与 where 条件。',
    input: "update users set name = 'Alice', updated_at = now(), status = 'active' where id = 1",
  },
]

export const sqlFormatterSamples: ToolSample<SqlFormatterInput>[] = sqlFormatterTemplates.map((template, index) => ({
  id: `sql-sample-${index + 1}`,
  label: template.label,
  summary: template.summary,
  apply: (currentInput) => ({
    ...currentInput,
    sqlInput: template.input,
  }),
}))

export function createSqlFormatterInitialInput(): SqlFormatterInput {
  return {
    sqlInput: sqlFormatterTemplates[0]?.input ?? '',
    options: {
      keywordCase: 'upper',
      indentSize: 2,
      compact: false,
    },
  }
}

export function executeSqlFormatter(input: SqlFormatterInput): SqlFormatterOutput {
  const result = formatSql(input.sqlInput, input.options)

  if (!result.ok) {
    throw new Error(result.error ?? 'SQL 格式化失败')
  }

  const formattedText = result.value ?? ''

  return {
    formattedText,
    inputStats: buildSqlStats(input.sqlInput),
    outputStats: buildSqlStats(formattedText),
    hasChanges: formattedText !== input.sqlInput,
    compact: input.options.compact,
  }
}

export function buildSqlFormatterHistoryLabel(input: SqlFormatterInput) {
  return input.options.compact ? '压缩 SQL' : '格式化 SQL'
}

export function updateSqlKeywordCase(options: SqlFormatterOptions, keywordCase: SqlKeywordCase): SqlFormatterOptions {
  return {
    ...options,
    keywordCase,
  }
}

export function buildSqlFormatterDownloadPayload(output: SqlFormatterOutput | null): ToolDownloadPayload | null {
  if (!output) {
    return null
  }

  return {
    filename: output.compact ? 'sql-formatter-compact.sql' : 'sql-formatter-formatted.sql',
    content: output.formattedText,
    mimeType: 'application/sql;charset=utf-8',
  }
}

export const sqlFormatterRuntimeModule: Omit<ToolModule<SqlFormatterInput, SqlFormatterOutput>, 'page'> = {
  meta: sqlFormatterMeta,
  createInitialInput: createSqlFormatterInitialInput,
  execute: (input) => executeSqlFormatter(input),
  samples: sqlFormatterSamples,
}
