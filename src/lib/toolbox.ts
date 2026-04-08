import type { ToolModule } from '@/data/tool-modules'

export function getToolCount(modules: ToolModule[]) {
  return modules.length
}

function filterModules(modules: ToolModule[], searchQuery: string) {
  const normalizedQuery = searchQuery.trim().toLowerCase()

  return modules.filter((module) => {
    if (!normalizedQuery) {
      return true
    }

    return [module.title, module.category, module.description, ...module.keywords]
      .join(' ')
      .toLowerCase()
      .includes(normalizedQuery)
  })
}

export function orderModulesByPreference(
  modules: ToolModule[],
  favoriteModuleIds: string[],
  searchQuery: string
) {
  const filteredModules = filterModules(modules, searchQuery)
  const favorites = new Set(favoriteModuleIds)

  return [...filteredModules].sort((left, right) => {
    const leftFavorite = favorites.has(left.id)
    const rightFavorite = favorites.has(right.id)

    if (leftFavorite !== rightFavorite) {
      return leftFavorite ? -1 : 1
    }

    return 0
  })
}

export function orderModulesByFavorite(modules: ToolModule[], favoriteModuleIds: string[]) {
  const favorites = new Set(favoriteModuleIds)

  return [...modules].sort((left, right) => {
    const leftFavorite = favorites.has(left.id)
    const rightFavorite = favorites.has(right.id)

    if (leftFavorite !== rightFavorite) {
      return leftFavorite ? -1 : 1
    }

    return left.title.localeCompare(right.title, 'en')
  })
}

export function filterModulesBySearch(modules: ToolModule[], searchQuery: string) {
  return filterModules(modules, searchQuery)
}
