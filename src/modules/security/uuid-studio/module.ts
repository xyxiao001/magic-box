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
  runtime: {
    history: {
      mode: 'on-success',
      emptyText: '生成一次结果后，这里会保存最近的 ID 快照。',
      buildEntryMeta: (input, output) => ({
        label: `${input.mode === 'uuid' ? 'UUID v4' : 'NanoID'} · ${output?.results.length ?? 0} 条`,
        description:
          output?.results[0] ??
          (input.mode === 'uuid' ? '最近一次 UUID 生成结果' : '最近一次 NanoID 生成结果'),
      }),
    },
    draft: {
      legacyKeys: ['magic-box:v1:tool-history:uuid-studio:state'],
      parseLegacy: (raw) => {
        try {
          return JSON.parse(raw) as UuidStudioInput
        } catch {
          return undefined
        }
      },
    },
    copyOutput: {
      label: '复制全部',
      buildText: (_, output) => {
        if (!output?.results.length) {
          return null
        }

        return output.results.join('\n')
      },
      buildSuccessMessage: () => '全部结果已复制',
    },
  },
}
