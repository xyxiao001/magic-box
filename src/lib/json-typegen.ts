export type TsStyle = 'interface' | 'type'

export interface JsonTypegenConfig {
  rootName: string
  tsStyle: TsStyle
  zodStrict: boolean
  nullAsOptional: boolean
}

interface InferredNode {
  kind: 'string' | 'number' | 'boolean' | 'null' | 'any' | 'array' | 'object' | 'union'
  items?: InferredNode
  properties?: Record<string, { node: InferredNode; optional: boolean }>
  variants?: InferredNode[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function mergeNodes(nodes: InferredNode[]): InferredNode {
  const normalized = nodes.filter(Boolean)

  if (!normalized.length) {
    return { kind: 'any' }
  }

  const uniqueByKind = new Map<string, InferredNode>()
  normalized.forEach((node) => {
    if (!uniqueByKind.has(node.kind)) {
      uniqueByKind.set(node.kind, node)
    }
  })

  if (uniqueByKind.size === 1) {
    return normalized[0]
  }

  return {
    kind: 'union',
    variants: Array.from(uniqueByKind.values()),
  }
}

function inferValue(value: unknown): InferredNode {
  if (value === null) {
    return { kind: 'null' }
  }

  if (typeof value === 'string') {
    return { kind: 'string' }
  }

  if (typeof value === 'number') {
    return { kind: 'number' }
  }

  if (typeof value === 'boolean') {
    return { kind: 'boolean' }
  }

  if (Array.isArray(value)) {
    if (!value.length) {
      return { kind: 'array', items: { kind: 'any' } }
    }

    const itemNodes = value.map((item) => inferValue(item))
    const merged = mergeNodes(itemNodes)
    return { kind: 'array', items: merged }
  }

  if (isRecord(value)) {
    const properties: Record<string, { node: InferredNode; optional: boolean }> = {}

    for (const [key, entry] of Object.entries(value)) {
      properties[key] = { node: inferValue(entry), optional: false }
    }

    return { kind: 'object', properties }
  }

  return { kind: 'any' }
}

function mergeObjectArray(nodes: InferredNode[], nullAsOptional: boolean): InferredNode {
  const objects = nodes.filter((node) => node.kind === 'object') as Array<Required<Pick<InferredNode, 'properties'>> & InferredNode>

  if (!objects.length) {
    return mergeNodes(nodes)
  }

  const allKeys = new Set<string>()
  objects.forEach((node) => {
    Object.keys(node.properties || {}).forEach((key) => allKeys.add(key))
  })

  const merged: Record<string, { node: InferredNode; optional: boolean }> = {}

  allKeys.forEach((key) => {
    const values = objects
      .map((obj) => obj.properties?.[key]?.node)
      .filter(Boolean) as InferredNode[]

    const optional = values.length !== objects.length
    const union = mergeNodes(values)

    if (nullAsOptional && union.kind === 'union' && union.variants?.some((v) => v.kind === 'null')) {
      merged[key] = { node: mergeNodes(union.variants.filter((v) => v.kind !== 'null')), optional: true }
    } else {
      merged[key] = { node: union, optional }
    }
  })

  return { kind: 'object', properties: merged }
}

function inferRoot(value: unknown, config: JsonTypegenConfig): InferredNode {
  if (Array.isArray(value)) {
    if (!value.length) {
      return { kind: 'array', items: { kind: 'any' } }
    }

    const itemNodes = value.map((item) => inferValue(item))

    if (itemNodes.every((node) => node.kind === 'object')) {
      return { kind: 'array', items: mergeObjectArray(itemNodes, config.nullAsOptional) }
    }

    return { kind: 'array', items: mergeNodes(itemNodes) }
  }

  return inferValue(value)
}

function sanitizeName(input: string) {
  const safe = input.replaceAll(/[^a-zA-Z0-9_]/g, '_')
  const normalized = safe.replaceAll(/^(\d)/g, '_$1')
  return normalized || 'Type'
}

function pascalCase(input: string) {
  return input
    .split(/[^a-zA-Z0-9]+/g)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join('')
}

function buildTypeName(path: string[]) {
  return sanitizeName(pascalCase(path.join(' ')))
}

function buildTsType(node: InferredNode, inlineName: (node: InferredNode, path: string[]) => string, path: string[]): string {
  if (node.kind === 'string' || node.kind === 'number' || node.kind === 'boolean' || node.kind === 'any') {
    return node.kind === 'any' ? 'any' : node.kind
  }

  if (node.kind === 'null') {
    return 'null'
  }

  if (node.kind === 'array' && node.items) {
    return `${buildTsType(node.items, inlineName, [...path, 'Item'])}[]`
  }

  if (node.kind === 'union' && node.variants?.length) {
    return node.variants.map((variant) => buildTsType(variant, inlineName, path)).join(' | ')
  }

  if (node.kind === 'object') {
    return inlineName(node, path)
  }

  return 'any'
}

function buildZodType(node: InferredNode, inlineName: (node: InferredNode, path: string[]) => string, path: string[]): string {
  if (node.kind === 'string') {
    return 'z.string()'
  }

  if (node.kind === 'number') {
    return 'z.number()'
  }

  if (node.kind === 'boolean') {
    return 'z.boolean()'
  }

  if (node.kind === 'null') {
    return 'z.null()'
  }

  if (node.kind === 'any') {
    return 'z.any()'
  }

  if (node.kind === 'array' && node.items) {
    return `z.array(${buildZodType(node.items, inlineName, [...path, 'Item'])})`
  }

  if (node.kind === 'union' && node.variants?.length) {
    return `z.union([${node.variants.map((variant) => buildZodType(variant, inlineName, path)).join(', ')}])`
  }

  if (node.kind === 'object') {
    return inlineName(node, path)
  }

  return 'z.any()'
}

export function parseJsonInput(input: string) {
  try {
    const value = JSON.parse(input)
    return { ok: true as const, value }
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : 'JSON 解析失败' }
  }
}

export function generateTypeScriptFromJson(json: unknown, config: JsonTypegenConfig) {
  const rootNode = inferRoot(json, config)
  const rootName = sanitizeName(config.rootName || 'Root')
  const declarations: string[] = []
  const visited = new WeakMap<object, string>()

  const ensureObjectDeclaration = (node: InferredNode, path: string[]) => {
    const name = buildTypeName(path)
    const properties = node.properties || {}
    const lines = Object.entries(properties).map(([key, entry]) => {
      const optional = entry.optional ? '?' : ''
      const safeKey = /^[a-zA-Z_]\w*$/.test(key) ? key : JSON.stringify(key)
      const typeValue = buildTsType(entry.node, inlineName, [...path, key])
      return `  ${safeKey}${optional}: ${typeValue}`
    })

    if (config.tsStyle === 'type') {
      declarations.push(`export type ${name} = {\n${lines.join('\n')}\n}`)
    } else {
      declarations.push(`export interface ${name} {\n${lines.join('\n')}\n}`)
    }

    return name
  }

  const inlineName = (node: InferredNode, path: string[]) => {
    const key = node as unknown as object
    const existing = visited.get(key)
    if (existing) {
      return existing
    }

    const name = ensureObjectDeclaration(node, path)
    visited.set(key, name)
    return name
  }

  const rootType = buildTsType(rootNode, (node, path) => inlineName(node, path), [rootName])

  if (rootNode.kind !== 'object') {
    declarations.push(`export type ${rootName} = ${rootType}`)
  } else if (buildTypeName([rootName]) !== rootName) {
    declarations.push(`export type ${rootName} = ${buildTypeName([rootName])}`)
  }

  return declarations.join('\n\n')
}

export function generateZodFromJson(json: unknown, config: JsonTypegenConfig) {
  const rootNode = inferRoot(json, config)
  const rootName = sanitizeName(config.rootName || 'Root')
  const declarations: string[] = [`import { z } from 'zod'`]
  const visited = new WeakMap<object, string>()

  const ensureObjectDeclaration = (node: InferredNode, path: string[]) => {
    const name = `${buildTypeName(path)}Schema`
    const properties = node.properties || {}
    const lines = Object.entries(properties).map(([key, entry]) => {
      const safeKey = /^[a-zA-Z_]\w*$/.test(key) ? key : JSON.stringify(key)
      let zodValue = buildZodType(entry.node, inlineName, [...path, key])
      if (entry.optional) {
        zodValue = `${zodValue}.optional()`
      }
      return `  ${safeKey}: ${zodValue}`
    })

    const strictSuffix = config.zodStrict ? '.strict()' : ''
    declarations.push(`export const ${name} = z.object({\n${lines.join(',\n')}\n})${strictSuffix}`)
    declarations.push(`export type ${buildTypeName(path)} = z.infer<typeof ${name}>`)

    return name
  }

  const inlineName = (node: InferredNode, path: string[]) => {
    const key = node as unknown as object
    const existing = visited.get(key)
    if (existing) {
      return existing
    }

    const name = ensureObjectDeclaration(node, path)
    visited.set(key, name)
    return name
  }

  const schemaExpression = buildZodType(rootNode, (node, path) => inlineName(node, path), [rootName])

  if (rootNode.kind !== 'object') {
    declarations.push(`export const ${rootName}Schema = ${schemaExpression}`)
    declarations.push(`export type ${rootName} = z.infer<typeof ${rootName}Schema>`)
  }

  return declarations.join('\n\n')
}
