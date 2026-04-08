import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { toolModules } from '@/data/tool-modules'

export type ThemeMode = 'dark' | 'mac-light'

const defaultFavoriteModuleIds = ['time-lab', 'json-toolkit']
const favoritesStorageKey = 'magic-box.favorite-modules'
const searchStorageKey = 'magic-box.search-query'
const themeStorageKey = 'magic-box.theme-mode'

function parseStoredModuleIds(raw: string | null) {
  if (!raw) {
    return null
  }

  try {
    const parsed = JSON.parse(raw) as string[]
    if (!Array.isArray(parsed) || !parsed.every((item) => typeof item === 'string')) {
      return null
    }

    return parsed
  } catch {
    return null
  }
}

export const useWorkbenchStore = defineStore('workbench', () => {
  const favoriteModuleIds = ref<string[]>(defaultFavoriteModuleIds)
  const searchQuery = ref('')
  const themeMode = ref<ThemeMode>('mac-light')

  if (typeof window !== 'undefined') {
    const cachedFavorites = parseStoredModuleIds(window.localStorage.getItem(favoritesStorageKey))
    const cachedSearch = window.localStorage.getItem(searchStorageKey)
    const cachedThemeMode = window.localStorage.getItem(themeStorageKey)

    if (cachedFavorites) {
      favoriteModuleIds.value = cachedFavorites.filter((id) =>
        toolModules.some((module) => module.id === id)
      )
    }

    if (cachedSearch) {
      searchQuery.value = cachedSearch
    }

    if (cachedThemeMode === 'dark' || cachedThemeMode === 'mac-light') {
      themeMode.value = cachedThemeMode
    }

    watch(
      favoriteModuleIds,
      (value) => {
        window.localStorage.setItem(favoritesStorageKey, JSON.stringify(value))
      },
      { deep: true }
    )

    watch(searchQuery, (value) => {
      window.localStorage.setItem(searchStorageKey, value)
    })

    watch(themeMode, (value) => {
      window.localStorage.setItem(themeStorageKey, value)
    })
  }

  const favoriteCount = computed(() => favoriteModuleIds.value.length)

  function toggleFavoriteModule(moduleId: string) {
    if (favoriteModuleIds.value.includes(moduleId)) {
      favoriteModuleIds.value = favoriteModuleIds.value.filter((id) => id !== moduleId)
      return
    }

    favoriteModuleIds.value = [...favoriteModuleIds.value, moduleId]
  }

  function setThemeMode(mode: ThemeMode) {
    themeMode.value = mode
  }

  return {
    favoriteCount,
    favoriteModuleIds,
    searchQuery,
    themeMode,
    setThemeMode,
    toggleFavoriteModule,
  }
})
