import { describe, expect, it } from 'vitest'
import {
  buildCronPlannerDownloadPayload,
  buildCronPlannerHistoryLabel,
  createCronPlannerInitialInput,
  executeCronPlanner,
  cronPlannerSamples,
} from './module'

describe('cron planner module', () => {
  it('parses cron expression and builds download payload', () => {
    const input = createCronPlannerInitialInput()
    const output = executeCronPlanner(input)

    expect(output.parsed.expression).toBe('30 10 * * 1-5')
    expect(output.upcomingRuns.length).toBe(6)
    expect(buildCronPlannerDownloadPayload(output)?.filename).toBe('cron-planner-output.txt')
  })

  it('builds history labels and exposes samples', () => {
    const output = executeCronPlanner(createCronPlannerInitialInput())

    expect(buildCronPlannerHistoryLabel(output)).toContain('30 10')
    expect(cronPlannerSamples).toHaveLength(4)
  })
})
