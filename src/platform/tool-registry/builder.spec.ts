import { describe, expect, it } from 'vitest'
import { buildToolDefinitionsFromModules } from './builder'
import { platformToolModules } from './definitions'

describe('tool registry builder', () => {
  it('builds tool definitions from platform modules', () => {
    const definitions = buildToolDefinitionsFromModules(platformToolModules)
    const uuidStudio = definitions.find((tool) => tool.id === 'uuid-studio')

    expect(definitions.map((tool) => tool.id)).toEqual([
      'qrcode-studio',
      'clipboard-history',
      'codec-lab',
      'markdown-studio',
      'html-formatter',
      'http-lab',
      'json-toolkit',
      'json-diff-jsonpath',
      'json-typegen',
      'text-toolkit',
      'diff-studio',
      'regex-workbench',
      'csv-toolkit',
      'sql-formatter',
      'request-converter',
      'header-cookie-lab',
      'jwt-studio',
      'websocket-lab',
      'package-radar',
      'jwt-sign-verify',
      'hash-studio',
      'hmac-signer',
      'url-inspector',
      'uuid-studio',
      'time-lab',
      'image-studio',
      'color-studio',
      'cron-planner',
      'calculator-pro',
      'unit-converter',
      'white-noise-studio',
      'weather-desk',
    ])
    expect(uuidStudio).toMatchObject({
      path: '/tools/uuid-studio',
      title: 'UUID / NanoID Studio',
    })
    expect(uuidStudio?.tags).toContain('favorite-supported')
    expect(uuidStudio?.tags).toContain('history-supported')
    expect(uuidStudio?.tags).toContain('offline-ready')
    expect(typeof uuidStudio?.loader).toBe('function')
  })
})
