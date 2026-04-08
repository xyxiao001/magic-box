import type { ToolModule } from '@/data/tool-modules'

export function getToolCount(modules: ToolModule[]) {
  return modules.length
}

export function orderModulesByFavorite(
  modules: ToolModule[],
  favoriteModuleIds: string[],
  searchQuery: string
) {
  const favorites = new Set(favoriteModuleIds)
  const normalizedQuery = searchQuery.trim().toLowerCase()

  return [...modules]
    .filter((module) => {
      if (!normalizedQuery) {
        return true
      }

      return [module.title, module.category, module.description, ...module.keywords]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery)
    })
    .sort((left, right) => {
      const leftFavorite = favorites.has(left.id)
      const rightFavorite = favorites.has(right.id)

      if (leftFavorite !== rightFavorite) {
        return leftFavorite ? -1 : 1
      }

      return left.title.localeCompare(right.title, 'en')
    })
}
