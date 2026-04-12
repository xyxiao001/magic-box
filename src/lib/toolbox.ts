import type { ToolDefinition } from '@/platform/tool-registry'
import { searchToolDefinitions } from '@/platform/tool-registry'
import type { RecentToolEntry } from '@/lib/recent-tools'

export function getToolCount(modules: ToolDefinition[]) {
  return modules.length
}

function buildSearchContext(favoriteModuleIds: string[], recentTools: RecentToolEntry[] = []) {
  return {
    favoriteToolIds: favoriteModuleIds,
    recentTools,
  }
}

export function orderModulesByPreference(
  modules: ToolDefinition[],
  favoriteModuleIds: string[],
  searchQuery: string,
  recentTools: RecentToolEntry[] = []
) {
  return searchToolDefinitions(modules, searchQuery, buildSearchContext(favoriteModuleIds, recentTools))
}

export function orderModulesByFavorite(modules: ToolDefinition[], favoriteModuleIds: string[]) {
  const favoriteIds = new Set(favoriteModuleIds)

  return [...modules].sort((left, right) => {
    const favoriteDelta = Number(favoriteIds.has(right.id)) - Number(favoriteIds.has(left.id))

    if (favoriteDelta !== 0) {
      return favoriteDelta
    }

    const orderDelta = (left.order ?? Number.MAX_SAFE_INTEGER) - (right.order ?? Number.MAX_SAFE_INTEGER)
    if (orderDelta !== 0) {
      return orderDelta
    }

    return left.title.localeCompare(right.title, 'en')
  })
}

export function filterModulesBySearch(modules: ToolDefinition[], searchQuery: string) {
  return searchToolDefinitions(modules, searchQuery)
}
