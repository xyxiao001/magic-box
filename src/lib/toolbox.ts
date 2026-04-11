import type { ToolModule } from '@/data/tool-modules'
import { searchToolDefinitions } from '@/tools/registry'
import type { RecentToolEntry } from '@/lib/recent-tools'

export function getToolCount(modules: ToolModule[]) {
  return modules.length
}

function buildSearchContext(favoriteModuleIds: string[], recentTools: RecentToolEntry[] = []) {
  return {
    favoriteToolIds: favoriteModuleIds,
    recentTools,
  }
}

export function orderModulesByPreference(
  modules: ToolModule[],
  favoriteModuleIds: string[],
  searchQuery: string,
  recentTools: RecentToolEntry[] = []
) {
  return searchToolDefinitions(modules, searchQuery, buildSearchContext(favoriteModuleIds, recentTools))
}

export function orderModulesByFavorite(
  modules: ToolModule[],
  favoriteModuleIds: string[],
  recentTools: RecentToolEntry[] = []
) {
  return searchToolDefinitions(modules, '', buildSearchContext(favoriteModuleIds, recentTools))
}

export function filterModulesBySearch(modules: ToolModule[], searchQuery: string) {
  return searchToolDefinitions(modules, searchQuery)
}
