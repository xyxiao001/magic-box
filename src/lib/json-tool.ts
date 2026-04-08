export interface JsonToolState {
  ok: boolean
  value?: string
  error?: string
}

export function formatJson(raw: string): JsonToolState {
  try {
    return {
      ok: true,
      value: JSON.stringify(JSON.parse(raw), null, 2),
    }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'JSON 解析失败',
    }
  }
}

export function minifyJson(raw: string): JsonToolState {
  try {
    return {
      ok: true,
      value: JSON.stringify(JSON.parse(raw)),
    }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'JSON 解析失败',
    }
  }
}

export function validateJson(raw: string): JsonToolState {
  try {
    JSON.parse(raw)
    return {
      ok: true,
      value: 'JSON 有效',
    }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'JSON 解析失败',
    }
  }
}
