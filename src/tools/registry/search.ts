import type { ToolDefinition } from './types'

const aliasGroups = [
  ['时间戳', 'timestamp', 'unix'],
  ['二维码', 'qr', 'qr-code', 'qrcode'],
  ['请求头', 'header'],
  ['编解码', 'encode', 'decode'],
] as const

export interface ToolSearchContext {
  favoriteToolIds?: string[]
  recentTools?: Array<{ id: string; count: number }>
}

function normalizeText(value: string) {
  return value.trim().toLowerCase()
}

export function buildToolSearchableText(
  tool: Pick<ToolDefinition, 'title' | 'description' | 'category' | 'keywords' | 'searchableText'>
) {
  if (tool.searchableText) {
    return tool.searchableText.toLowerCase()
  }

  return [tool.title, tool.description, tool.category, ...tool.keywords].join(' ').toLowerCase()
}

function getExpandedSearchTerms(query: string) {
  const normalizedQuery = normalizeText(query)

  if (!normalizedQuery) {
    return []
  }

  const terms = new Set([normalizedQuery])

  for (const group of aliasGroups) {
    if ((group as readonly string[]).includes(normalizedQuery)) {
      for (const item of group) {
        terms.add(item)
      }
    }
  }

  return [...terms]
}

function scoreTextMatch(value: string, searchTerms: string[], exact: number, prefix: number, includes: number) {
  const normalizedValue = normalizeText(value)
  let bestScore = 0

  for (const term of searchTerms) {
    if (normalizedValue === term) {
      bestScore = Math.max(bestScore, exact)
      continue
    }

    if (normalizedValue.startsWith(term)) {
      bestScore = Math.max(bestScore, prefix)
      continue
    }

    if (normalizedValue.includes(term)) {
      bestScore = Math.max(bestScore, includes)
    }
  }

  return bestScore
}

export function scoreToolDefinition(
  tool: ToolDefinition,
  query: string,
  context: ToolSearchContext = {}
) {
  const searchTerms = getExpandedSearchTerms(query)
  const favoriteToolIds = new Set(context.favoriteToolIds ?? [])
  const recentTools = context.recentTools ?? []
  const recentEntry = recentTools.find((entry) => entry.id === tool.id)
  const usageScore = Math.min(15, (recentEntry?.count ?? 0) * 3)

  if (!searchTerms.length) {
    return (
      (favoriteToolIds.has(tool.id) ? 1000 : 0) +
      (recentEntry ? 500 : 0) +
      usageScore +
      (100 - (tool.order ?? 100))
    )
  }

  let score = 0

  score += scoreTextMatch(tool.title, searchTerms, 100, 80, 60)
  score += Math.max(...tool.keywords.map((keyword) => scoreTextMatch(keyword, searchTerms, 50, 35, 35)), 0)
  score += scoreTextMatch(tool.category, searchTerms, 20, 20, 20)
  score += scoreTextMatch(tool.description, searchTerms, 15, 15, 15)

  if (!score) {
    const searchableText = buildToolSearchableText(tool)
    if (!searchTerms.some((term) => searchableText.includes(term))) {
      return 0
    }
  }

  if (favoriteToolIds.has(tool.id)) {
    score += 10
  }

  if (recentEntry) {
    score += 15
    score += usageScore
  }

  return score
}

export function searchToolDefinitions(
  definitions: ToolDefinition[],
  query: string,
  context: ToolSearchContext = {}
) {
  const normalizedQuery = normalizeText(query)

  return [...definitions]
    .filter((tool) => !normalizedQuery || scoreToolDefinition(tool, normalizedQuery, context) > 0)
    .sort((left, right) => {
      const scoreDelta =
        scoreToolDefinition(right, normalizedQuery, context) - scoreToolDefinition(left, normalizedQuery, context)

      if (scoreDelta !== 0) {
        return scoreDelta
      }

      const categoryDelta = left.category.localeCompare(right.category, 'zh-Hans-CN')
      if (categoryDelta !== 0) {
        return categoryDelta
      }

      const orderDelta = (left.order ?? Number.MAX_SAFE_INTEGER) - (right.order ?? Number.MAX_SAFE_INTEGER)
      if (orderDelta !== 0) {
        return orderDelta
      }

      return left.title.localeCompare(right.title, 'en')
    })
}
