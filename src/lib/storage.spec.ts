import { beforeEach, describe, expect, it } from 'vitest'
import { createScopedKey, readStorage, removeStorage, writeStorage } from '@/lib/storage'

describe('storage helpers', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('creates scoped keys with namespace and version', () => {
    expect(createScopedKey('theme')).toBe('magic-box:v1:theme')
  })

  it('writes and reads typed values', () => {
    writeStorage('recent-tools', [{ id: 'time-lab', usedAt: 1, count: 2 }])

    expect(readStorage('recent-tools', [])).toEqual([{ id: 'time-lab', usedAt: 1, count: 2 }])
  })

  it('falls back safely when stored value is invalid json', () => {
    window.localStorage.setItem(createScopedKey('theme'), 'not-json')

    expect(readStorage('theme', 'mac-light')).toBe('mac-light')
  })

  it('migrates legacy values to the new scoped key', () => {
    window.localStorage.setItem('magic-box.theme-mode', 'dark')

    const theme = readStorage<'dark' | 'mac-light'>('theme', 'mac-light', {
      legacyKeys: ['magic-box.theme-mode'],
      parseLegacy: (raw) => (raw === 'dark' || raw === 'mac-light' ? raw : undefined),
    })

    expect(theme).toBe('dark')
    expect(window.localStorage.getItem('magic-box.theme-mode')).toBeNull()
    expect(window.localStorage.getItem(createScopedKey('theme'))).toBe(JSON.stringify('dark'))
  })

  it('removes stored values', () => {
    writeStorage('search-query', 'json')
    removeStorage('search-query')

    expect(readStorage('search-query', '')).toBe('')
  })
})
