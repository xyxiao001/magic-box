import { readStorage, removeStorage, writeStorage, type ReadStorageOptions } from '@/lib/storage'

function createToolDraftDomain(toolId: string) {
  return `tool-runtime:${toolId}:draft`
}

export function readToolDraft<Input>(
  toolId: string,
  options: Omit<ReadStorageOptions<Input | null>, 'adapter'> = {}
) {
  return readStorage<Input | null>(createToolDraftDomain(toolId), null, options)
}

export function writeToolDraft<Input>(toolId: string, input: Input) {
  writeStorage(createToolDraftDomain(toolId), input)
}

export function clearToolDraft(toolId: string) {
  removeStorage(createToolDraftDomain(toolId))
}
