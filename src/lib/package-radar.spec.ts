import { describe, expect, it } from 'vitest'
import {
  buildInstallCommands,
  buildPackageLinks,
  extractRecentVersions,
  normalizePackageDetail,
  normalizeRepositoryUrl,
} from '@/lib/package-radar'

describe('package radar helpers', () => {
  it('builds install commands for common package managers', () => {
    expect(buildInstallCommands('pinia')).toEqual({
      npm: 'npm install pinia',
      pnpm: 'pnpm add pinia',
      yarn: 'yarn add pinia',
    })
  })

  it('normalizes repository urls', () => {
    expect(normalizeRepositoryUrl('git+https://github.com/vuejs/pinia.git')).toBe(
      'https://github.com/vuejs/pinia'
    )
    expect(normalizeRepositoryUrl({ url: 'git@github.com:vuejs/core.git' })).toBe(
      'https://github.com/vuejs/core'
    )
  })

  it('extracts recent versions ordered by publish time', () => {
    expect(
      extractRecentVersions({
        created: '2024-01-01T00:00:00.000Z',
        modified: '2024-01-03T00:00:00.000Z',
        '1.0.0': '2024-01-01T00:00:00.000Z',
        '1.1.0': '2024-01-03T00:00:00.000Z',
        '1.0.5': '2024-01-02T00:00:00.000Z',
      })
    ).toEqual([
      { version: '1.1.0', publishedAt: '2024-01-03T00:00:00.000Z' },
      { version: '1.0.5', publishedAt: '2024-01-02T00:00:00.000Z' },
      { version: '1.0.0', publishedAt: '2024-01-01T00:00:00.000Z' },
    ])
  })

  it('builds package links and detail summary', () => {
    const detail = normalizePackageDetail({
      name: 'pinia',
      description: 'The intuitive store for Vue',
      license: 'MIT',
      homepage: 'https://pinia.vuejs.org',
      repository: { url: 'git+https://github.com/vuejs/pinia.git' },
      maintainers: [{ name: 'posva' }],
      time: {
        created: '2024-01-01T00:00:00.000Z',
        modified: '2024-01-03T00:00:00.000Z',
        '3.0.4': '2024-01-03T00:00:00.000Z',
      },
      'dist-tags': {
        latest: '3.0.4',
      },
    })

    expect(detail.name).toBe('pinia')
    expect(detail.latestVersion).toBe('3.0.4')
    expect(detail.maintainers).toEqual(['posva'])
    expect(detail.links).toEqual(
      buildPackageLinks(
        'pinia',
        'https://pinia.vuejs.org',
        'git+https://github.com/vuejs/pinia.git'
      )
    )
  })
})
