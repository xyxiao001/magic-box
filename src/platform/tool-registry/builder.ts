import type { ToolRegistryModule } from './schema'
import type { ToolDefinition, ToolCapabilityTag } from './types'

const capabilityTagMap: Partial<Record<string, ToolCapabilityTag>> = {
  favorite: 'favorite-supported',
  history: 'history-supported',
  'network-access': 'network-required',
}

const supportedTags: ToolCapabilityTag[] = [
  'offline-ready',
  'network-required',
  'local-processing',
  'beta',
  'favorite-supported',
  'history-supported',
]

function isSupportedTag(value: string): value is ToolCapabilityTag {
  return supportedTags.includes(value as ToolCapabilityTag)
}

function normalizeTags(toolModule: ToolRegistryModule): ToolCapabilityTag[] {
  const tags = new Set<ToolCapabilityTag>()

  for (const tag of toolModule.meta.tags ?? []) {
    if (isSupportedTag(tag)) {
      tags.add(tag)
    }
  }

  for (const capability of toolModule.meta.capabilities ?? []) {
    const mappedTag = capabilityTagMap[capability]

    if (mappedTag) {
      tags.add(mappedTag)
    }
  }

  if (!tags.has('network-required')) {
    tags.add('offline-ready')
    tags.add('local-processing')
  }

  if (toolModule.meta.status === 'beta') {
    tags.add('beta')
  }

  return [...tags]
}

export function buildToolDefinitionFromModule(toolModule: ToolRegistryModule): ToolDefinition {
  return {
    id: toolModule.meta.id,
    title: toolModule.meta.title,
    description: toolModule.meta.description,
    category: toolModule.meta.category,
    path: toolModule.meta.path,
    keywords: toolModule.meta.keywords,
    tags: normalizeTags(toolModule),
    order: toolModule.meta.order,
    searchableText: toolModule.meta.search?.searchableText,
    loader: toolModule.loader ?? (() => Promise.resolve(toolModule.page)),
  }
}

export function buildToolDefinitionsFromModules(toolModules: ToolRegistryModule[]) {
  return toolModules.map(buildToolDefinitionFromModule)
}
