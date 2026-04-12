import { describe, expect, it, vi } from 'vitest'
import {
  buildPackageRadarHistoryLabel,
  createPackageRadarInitialInput,
  executePackageRadar,
  packageRadarSamples,
} from './module'

describe('package radar module', () => {
  it('searches package and loads detail', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          objects: [
            {
              package: {
                name: 'pinia',
                version: '3.0.4',
                description: 'store',
                date: '2024-01-03T00:00:00.000Z',
                links: { npm: 'https://www.npmjs.com/package/pinia' },
              },
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          name: 'pinia',
          description: 'store',
          license: 'MIT',
          maintainers: [{ name: 'posva' }],
          time: { created: '2024-01-01T00:00:00.000Z', modified: '2024-01-03T00:00:00.000Z', '3.0.4': '2024-01-03T00:00:00.000Z' },
          'dist-tags': { latest: '3.0.4' },
        }),
      })

    vi.stubGlobal('fetch', fetchMock)

    const input = createPackageRadarInitialInput()
    input.query = 'pinia'
    input.selectedPackageName = 'pinia'
    const output = await executePackageRadar(input)

    expect(output.results).toHaveLength(1)
    expect(output.selectedPackage?.name).toBe('pinia')
    expect(output.installCommands?.pnpm).toBe('pnpm add pinia')
  })

  it('builds history labels and exposes samples', () => {
    expect(buildPackageRadarHistoryLabel({ query: 'vue', selectedPackageName: '' }, { results: [], selectedPackage: null, installCommands: null })).toBe('vue')
    expect(packageRadarSamples).toHaveLength(3)
  })
})
