import {
  buildCronFromBuilder,
  buildCronTemplates,
  getNextRunTimes,
  parseCronExpression,
  type CronBuilderState,
  type ParsedCronExpression,
} from './logic'
import { cronPlannerMeta } from './meta'
import type { ToolSample } from '@/tool-runtime/protocols/tool-module'
import type { ToolDownloadPayload } from '@/tool-runtime/services/tool-download-service'
import type { ToolModule } from '@/tool-runtime/protocols/tool-module'

export interface CronPlannerInput {
  expression: string
  builder: CronBuilderState
}

export interface CronPlannerOutput {
  parsed: ParsedCronExpression
  upcomingRuns: string[]
  builderExpression: string
}

const templates = buildCronTemplates()

export const cronPlannerSamples: ToolSample<CronPlannerInput>[] = templates.map((template, index) => ({
  id: `cron-template-${index + 1}`,
  label: template.label,
  summary: template.summary,
  apply: (currentInput) => ({
    ...currentInput,
    expression: template.expression,
  }),
}))

export function createCronPlannerInitialInput(): CronPlannerInput {
  return {
    expression: '30 10 * * 1-5',
    builder: {
      mode: 'weekdays',
      minute: 30,
      hour: 10,
      weekday: 1,
    },
  }
}

export function executeCronPlanner(input: CronPlannerInput): CronPlannerOutput {
  return {
    parsed: parseCronExpression(input.expression),
    upcomingRuns: getNextRunTimes(input.expression, 6, new Date()),
    builderExpression: buildCronFromBuilder(input.builder),
  }
}

export function buildCronPlannerHistoryLabel(output: CronPlannerOutput) {
  return output.parsed.ok ? output.parsed.expression : 'Cron 无效'
}

export function buildCronPlannerDownloadPayload(output: CronPlannerOutput | null): ToolDownloadPayload | null {
  if (!output) {
    return null
  }

  const body = [
    `Expression: ${output.parsed.expression || ''}`,
    `Description: ${output.parsed.description}`,
    '',
    '[Upcoming Runs]',
    ...output.upcomingRuns,
  ].join('\n')

  return {
    filename: 'cron-planner-output.txt',
    content: body,
    mimeType: 'text/plain;charset=utf-8',
  }
}

export const cronPlannerRuntimeModule: Omit<ToolModule<CronPlannerInput, CronPlannerOutput>, 'page'> = {
  meta: cronPlannerMeta,
  createInitialInput: createCronPlannerInitialInput,
  execute: (input) => executeCronPlanner(input),
  samples: cronPlannerSamples,
}
