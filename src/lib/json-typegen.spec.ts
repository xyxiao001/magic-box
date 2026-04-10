import { describe, expect, it } from 'vitest'
import {
  generateTypeScriptFromJson,
  generateZodFromJson,
  parseJsonInput,
  type JsonTypegenConfig,
} from './json-typegen'

const config: JsonTypegenConfig = {
  rootName: 'Root',
  tsStyle: 'interface',
  zodStrict: false,
  nullAsOptional: false,
}

describe('json typegen helpers', () => {
  it('parses json input', () => {
    const parsed = parseJsonInput('{"a":1}')
    expect(parsed.ok).toBe(true)
  })

  it('generates TypeScript', () => {
    const output = generateTypeScriptFromJson({ a: 1, b: 'x' }, config)
    expect(output).toContain('export interface Root')
    expect(output).toContain('a: number')
    expect(output).toContain('b: string')
  })

  it('generates optional fields for object arrays', () => {
    const output = generateTypeScriptFromJson([{ a: 1 }, { b: 2 }], config)
    expect(output).toContain('a?: number')
    expect(output).toContain('b?: number')
  })

  it('generates Zod schema code', () => {
    const output = generateZodFromJson({ a: 1 }, config)
    expect(output).toContain("import { z } from 'zod'")
    expect(output).toContain('RootSchema')
  })
})

