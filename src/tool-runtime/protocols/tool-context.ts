export interface ToolExecutionContext {
  toolId: string
  now: Date
}

export interface ToolValidationResult {
  ok: boolean
  error?: string
}
