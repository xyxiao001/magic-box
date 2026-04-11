import { describe, expect, it } from 'vitest'
import {
  buildTextToolkitStats,
  defaultTextToolkitOptions,
  processTextToolkit,
} from '@/lib/text-toolkit'

describe('text toolkit helpers', () => {
  it('applies trim, dedupe and sort to lines', () => {
    const result = processTextToolkit(' banana \napple\nbanana\n', {
      ...defaultTextToolkitOptions,
      trimLines: true,
      dedupeLines: true,
      sortLines: true,
    })

    expect(result).toBe('\napple\nbanana')
  })

  it('applies case conversion, prefix and suffix', () => {
    const result = processTextToolkit('magic box\ntext toolkit', {
      ...defaultTextToolkitOptions,
      caseMode: 'upper',
      prefix: '- ',
      suffix: ' !',
    })

    expect(result).toBe('- MAGIC BOX !\n- TEXT TOOLKIT !')
  })

  it('collapses spaces and removes blank lines', () => {
    const result = processTextToolkit('hello    world\n\nfoo\t\tbar', {
      ...defaultTextToolkitOptions,
      collapseSpaces: true,
      removeBlankLines: true,
    })

    expect(result).toBe('hello world\nfoo bar')
  })

  it('builds text stats', () => {
    expect(buildTextToolkitStats('magic box\nships fast')).toEqual({
      characters: 20,
      charactersNoSpaces: 17,
      words: 4,
      lines: 2,
    })
  })
})
