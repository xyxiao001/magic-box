import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { toolModules } from '@/data/tool-modules'
import { defaultFavoriteToolIds, readFavoriteToolIds, writeFavoriteToolIds } from '@/lib/favorites'
import {
  readRecentToolEntries,
  recordRecentToolVisit,
  type RecentToolEntry,
  writeRecentToolEntries,
} from '@/lib/recent-tools'
import { readStorage, writeStorage } from '@/lib/storage'

export type ThemeMode = 'dark' | 'mac-light'

const themeDomain = 'theme'
const searchDomain = 'search-query'
const legacyThemeStorageKey = 'magic-box.theme-mode'
const legacySearchStorageKey = 'magic-box.search-query'

function parseLegacyThemeMode(raw: string) {
  if (raw === 'dark' || raw === 'mac-light') {
    return raw
  }
}

function parseLegacySearchQuery(raw: string) {
  if (typeof raw === 'string') {
    return raw
  }
}

export const useWorkbenchStore = defineStore('workbench', () => {
  const validToolIds = toolModules.map((module) => module.id)
  const favoriteModuleIds = ref<string[]>(defaultFavoriteToolIds)
  const recentTools = ref<RecentToolEntry[]>([])
  const searchQuery = ref('')
  const themeMode = ref<ThemeMode>('mac-light')

  if (typeof window !== 'undefined') {
    favoriteModuleIds.value = readFavoriteToolIds(validToolIds)
    recentTools.value = readRecentToolEntries(validToolIds)
    searchQuery.value = readStorage(searchDomain, '', {
      legacyKeys: [legacySearchStorageKey],
      parseLegacy: (raw) => parseLegacySearchQuery(raw),
    })
    themeMode.value = readStorage<ThemeMode>(themeDomain, 'mac-light', {
      legacyKeys: [legacyThemeStorageKey],
      parseLegacy: (raw) => parseLegacyThemeMode(raw),
    })

    watch(
      favoriteModuleIds,
      (value) => {
        writeFavoriteToolIds(value)
      },
      { deep: true }
    )

    watch(
      recentTools,
      (value) => {
        writeRecentToolEntries(value)
      },
      { deep: true }
    )

    watch(searchQuery, (value) => {
      writeStorage(searchDomain, value)
    })

    watch(themeMode, (value) => {
      writeStorage(themeDomain, value)
    })
  }

  const favoriteCount = computed(() => favoriteModuleIds.value.length)
  const recentToolIds = computed(() => recentTools.value.map((item) => item.id))

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

  function markToolUsed(moduleId: string) {
    if (!validToolIds.includes(moduleId)) {
      return
    }

    recentTools.value = recordRecentToolVisit(recentTools.value, moduleId)
  }

  return {
    favoriteCount,
    favoriteModuleIds,
    recentToolIds,
    recentTools,
    searchQuery,
    themeMode,
    markToolUsed,
    setThemeMode,
    toggleFavoriteModule,
  }
})
