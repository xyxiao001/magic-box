import { generateIdBatch, validateNanoId, validateUuidV4, type IdMode, type NanoAlphabetPreset } from './logic'
import { nanoAlphabetPresets } from './logic'
import { uuidStudioMeta } from './meta'
import type { ToolModule } from '@/tool-runtime/protocols/tool-module'

export interface UuidStudioInput {
  mode: IdMode
  batchCount: number
  nanoLength: number
  alphabetPreset: NanoAlphabetPreset
  customAlphabet: string
  validationInput: string
}

export interface UuidStudioOutput {
  results: string[]
}

export function createUuidStudioInitialInput(): UuidStudioInput {
  return {
    mode: 'uuid',
    batchCount: 5,
    nanoLength: 21,
    alphabetPreset: 'default',
    customAlphabet: nanoAlphabetPresets.default,
    validationInput: '',
  }
}

export function validateUuidStudioInput(input: UuidStudioInput) {
  if (input.batchCount < 1 || input.batchCount > 50) {
    return {
      ok: false,
      error: '批量数量需在 1 到 50 之间',
    }
  }

  if (input.mode === 'nanoid') {
    if (input.nanoLength < 4 || input.nanoLength > 64) {
      return {
        ok: false,
        error: 'NanoID 长度需在 4 到 64 之间',
      }
    }

    if (!input.customAlphabet.length) {
      return {
        ok: false,
        error: '字符集不能为空',
      }
    }
  }

  return {
    ok: true,
  }
}

export function executeUuidStudio(input: UuidStudioInput): UuidStudioOutput {
  const count = Math.min(50, Math.max(1, input.batchCount))
  const nanoLength = Math.min(64, Math.max(4, input.nanoLength))

  return {
    results: generateIdBatch(input.mode, count, nanoLength, input.customAlphabet),
  }
}

export function buildUuidValidationSummary(input: UuidStudioInput) {
  if (!input.validationInput.trim()) {
    return '输入一个 ID 后可立即校验格式'
  }

  return input.mode === 'uuid'
    ? validateUuidV4(input.validationInput)
      ? '这是合法的 UUID v4'
      : '不是合法的 UUID v4'
    : validateNanoId(input.validationInput, input.customAlphabet)
      ? '字符集匹配当前 NanoID 规则'
      : '不符合当前 NanoID 字符集规则'
}

export const uuidStudioRuntimeModule: Omit<ToolModule<UuidStudioInput, UuidStudioOutput>, 'page'> = {
  meta: uuidStudioMeta,
  createInitialInput: createUuidStudioInitialInput,
  execute: (input) => executeUuidStudio(input),
  validate: (input) => validateUuidStudioInput(input),
}
