import { afterEach, describe, expect, it } from 'vitest'
import { clearToolDraft, readToolDraft, writeToolDraft } from './tool-draft-service'

describe('tool draft service', () => {
  afterEach(() => {
    window.localStorage.clear()
  })

  it('writes, reads and clears tool draft data', () => {
    writeToolDraft('text-toolkit', {
      inputText: 'hello',
    })

    expect(readToolDraft<{ inputText: string }>('text-toolkit')).toEqual({
      inputText: 'hello',
    })

    clearToolDraft('text-toolkit')

    expect(readToolDraft('text-toolkit')).toBeNull()
  })
})
