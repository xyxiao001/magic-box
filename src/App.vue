<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useRegisterSW } from 'virtual:pwa-register/vue'
import { toolModules } from '@/data/tool-modules'
import { orderModulesByPreference } from '@/lib/toolbox'
import { useWorkbenchStore } from '@/stores/workbench'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

const route = useRoute()
const router = useRouter()
const workbenchStore = useWorkbenchStore()

const searchOpen = ref(false)
const searchInput = ref<HTMLInputElement | null>(null)
const deferredInstallPrompt = ref<BeforeInstallPromptEvent | null>(null)
const showInstallButton = ref(false)

const {
  needRefresh: pwaNeedRefresh,
  offlineReady: pwaOfflineReady,
  updateServiceWorker,
} = useRegisterSW()

const currentModule = computed(() =>
  toolModules.find((module) => module.path === route.path)
)

const isCurrentModuleFavorite = computed(() => {
  if (!currentModule.value) {
    return false
  }

  return workbenchStore.favoriteModuleIds.includes(currentModule.value.id)
})

const navigationModules = computed(() =>
  orderModulesByPreference(toolModules, workbenchStore.favoriteModuleIds, '')
)

const searchResults = computed(() =>
  orderModulesByPreference(toolModules, workbenchStore.favoriteModuleIds, workbenchStore.searchQuery)
)

const pageTitle = computed(() => {
  if (searchOpen.value) {
    return workbenchStore.searchQuery
      ? `${workbenchStore.searchQuery} - Search - Magic Box`
      : 'Search - Magic Box'
  }

  if (currentModule.value) {
    return `${currentModule.value.title} - Magic Box`
  }

  if (route.path === '/docs') {
    return 'Docs - Magic Box'
  }

  return 'Magic Box'
})

function applyTheme(mode: 'dark' | 'mac-light') {
  document.documentElement.dataset.theme = mode
  document.documentElement.style.colorScheme = mode === 'mac-light' ? 'light' : 'dark'
}

function applyPageTitle(title: string) {
  document.title = title
}

function openSearchPanel() {
  searchOpen.value = true

  nextTick(() => {
    searchInput.value?.focus()
  })
}

function closeSearchPanel(clearQuery = false) {
  searchOpen.value = false

  if (clearQuery) {
    workbenchStore.searchQuery = ''
  }
}

async function goToModule(path: string) {
  await router.push(path)
  closeSearchPanel(true)
}

function openFirstMatch() {
  const firstMatch = searchResults.value[0]

  if (firstMatch) {
    void goToModule(firstMatch.path)
  }
}

function toggleCurrentModuleFavorite() {
  if (!currentModule.value) {
    return
  }

  workbenchStore.toggleFavoriteModule(currentModule.value.id)
}

async function installPwa() {
  if (!deferredInstallPrompt.value) {
    return
  }

  await deferredInstallPrompt.value.prompt()
  const choice = await deferredInstallPrompt.value.userChoice

  if (choice.outcome === 'accepted') {
    showInstallButton.value = false
  }

  deferredInstallPrompt.value = null
}

function dismissPwaNotice(type: 'offline' | 'refresh') {
  if (type === 'offline') {
    pwaOfflineReady.value = false
    return
  }

  pwaNeedRefresh.value = false
}

function handleBeforeInstallPrompt(event: Event) {
  event.preventDefault()
  deferredInstallPrompt.value = event as BeforeInstallPromptEvent
  showInstallButton.value = true
}

function handleAppInstalled() {
  deferredInstallPrompt.value = null
  showInstallButton.value = false
}

function handleGlobalKeydown(event: KeyboardEvent) {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault()
    openSearchPanel()
    return
  }

  if (event.key === 'Escape' && searchOpen.value) {
    closeSearchPanel(true)
  }
}

watch(
  () => route.fullPath,
  () => {
    searchOpen.value = false
  }
)

watch(
  () => workbenchStore.themeMode,
  (mode) => {
    applyTheme(mode)
  }
)

watch(pageTitle, (title) => {
  applyPageTitle(title)
})

onMounted(() => {
  applyTheme(workbenchStore.themeMode)
  applyPageTitle(pageTitle.value)
  window.addEventListener('keydown', handleGlobalKeydown)
  window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
  window.addEventListener('appinstalled', handleAppInstalled)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleGlobalKeydown)
  window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
  window.removeEventListener('appinstalled', handleAppInstalled)
})
</script>

<template>
  <div class="app-shell">
    <aside class="sidebar">
      <div class="brand-block">
        <p class="eyebrow">Developer Toolbox</p>
        <h1>Magic Box</h1>
      </div>

      <div class="sidebar-toolbar">
        <button
          type="button"
          class="icon-button"
          aria-label="搜索工具"
          title="搜索工具"
          @click="openSearchPanel"
        >
          <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" class="toolbar-icon">
            <circle cx="8.5" cy="8.5" r="4.75" stroke="currentColor" stroke-width="1.6" />
            <path
              d="M12.2 12.2L16.2 16.2"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linecap="round"
            />
          </svg>
        </button>

        <div class="theme-switcher" aria-label="主题切换">
          <button
            type="button"
            class="theme-option"
            :class="{ 'theme-option-active': workbenchStore.themeMode === 'dark' }"
            @click="workbenchStore.setThemeMode('dark')"
          >
            深色
          </button>
          <button
            type="button"
            class="theme-option"
            :class="{ 'theme-option-active': workbenchStore.themeMode === 'mac-light' }"
            @click="workbenchStore.setThemeMode('mac-light')"
          >
            浅色
          </button>
        </div>

        <span class="shortcut-key shortcut-key-inline">⌘K</span>
      </div>

      <nav class="sidebar-nav" aria-label="工具导航">
        <div
          v-for="module in navigationModules"
          :key="module.id"
          class="nav-entry"
          :class="{
            'nav-entry-active': currentModule?.id === module.id,
            'nav-entry-favorite': workbenchStore.favoriteModuleIds.includes(module.id),
          }"
        >
          <RouterLink :to="module.path" class="nav-link">
            <div class="nav-link-copy">
              <span class="nav-link-kicker">{{ module.category }}</span>
              <strong>{{ module.title }}</strong>
              <span class="nav-link-description">{{ module.description }}</span>
            </div>
            <div class="nav-link-badges">
              <span
                v-if="workbenchStore.favoriteModuleIds.includes(module.id)"
                class="nav-badge nav-badge-favorite"
              >
                Saved
              </span>
            </div>
          </RouterLink>

          <div class="nav-actions">
            <button
              type="button"
              class="nav-action-button"
              :aria-label="
                workbenchStore.favoriteModuleIds.includes(module.id)
                  ? `取消收藏 ${module.title}`
                  : `收藏 ${module.title}`
              "
              @click.stop="workbenchStore.toggleFavoriteModule(module.id)"
            >
              {{ workbenchStore.favoriteModuleIds.includes(module.id) ? '★' : '☆' }}
            </button>
          </div>
        </div>
      </nav>

      <a
        class="sidebar-linkout"
        href="https://github.com/xyxiao001/magic-box"
        target="_blank"
        rel="noreferrer"
      >
        GitHub
        <span>github.com/xyxiao001/magic-box</span>
      </a>
    </aside>

    <div class="workspace-shell">
      <header class="workspace-header">
        <div class="workspace-header-main">
          <div class="traffic-lights" aria-hidden="true">
            <span class="traffic-light traffic-light-close"></span>
            <span class="traffic-light traffic-light-minimize"></span>
            <span class="traffic-light traffic-light-expand"></span>
          </div>

          <div>
            <p class="eyebrow">{{ currentModule?.category || 'Workspace' }}</p>
            <h2 class="workspace-title">{{ currentModule?.title || 'Magic Box' }}</h2>
            <p class="workspace-subtitle">
              {{ currentModule?.description || '程序员日常工具集合。' }}
            </p>
          </div>
        </div>

        <div class="workspace-header-actions">
          <div class="workspace-chip">Local-first</div>
          <button
            v-if="showInstallButton"
            type="button"
            class="ghost-button workspace-install-button"
            @click="installPwa"
          >
            安装应用
          </button>
          <button
            v-if="currentModule"
            type="button"
            class="nav-action-button workspace-favorite-button"
            :aria-label="isCurrentModuleFavorite ? `取消收藏 ${currentModule.title}` : `收藏 ${currentModule.title}`"
            @click="toggleCurrentModuleFavorite"
          >
            {{ isCurrentModuleFavorite ? '★' : '☆' }}
          </button>
          <button
            type="button"
            class="search-launch search-launch-inline"
            @click="openSearchPanel"
          >
            搜索工具
            <span class="shortcut-key">⌘K</span>
          </button>
        </div>
      </header>

      <main class="content-panel">
        <RouterView />
      </main>

      <section v-if="pwaOfflineReady || pwaNeedRefresh" class="pwa-toast-stack">
        <article v-if="pwaOfflineReady" class="pwa-toast-card">
          <div>
            <strong>已支持离线访问</strong>
            <p>应用资源已缓存，下次打开会更快。</p>
          </div>
          <button type="button" class="ghost-button small-button" @click="dismissPwaNotice('offline')">
            知道了
          </button>
        </article>

        <article v-if="pwaNeedRefresh" class="pwa-toast-card">
          <div>
            <strong>发现新版本</strong>
            <p>刷新后即可使用最新内容和缓存。</p>
          </div>
          <div class="input-toolbar">
            <button type="button" class="solid-button small-button" @click="updateServiceWorker(true)">
              立即更新
            </button>
            <button type="button" class="ghost-button small-button" @click="dismissPwaNotice('refresh')">
              稍后
            </button>
          </div>
        </article>
      </section>
    </div>

    <div v-if="searchOpen" class="palette-backdrop" @click="closeSearchPanel(true)">
      <section class="palette-panel" @click.stop>
        <div class="palette-head">
          <input
            ref="searchInput"
            v-model="workbenchStore.searchQuery"
            class="palette-input"
            type="text"
            placeholder="搜索 time / json / base64 / url"
            @keydown.enter.prevent="openFirstMatch"
          />
        </div>

        <div v-if="searchResults.length" class="palette-results">
          <button
            v-for="module in searchResults"
            :key="module.id"
            type="button"
            class="palette-item"
            @click="goToModule(module.path)"
          >
            <div class="palette-item-copy">
              <strong class="palette-item-title">{{ module.title }}</strong>
              <span class="palette-item-meta">{{ module.category }} · {{ module.description }}</span>
            </div>
            <span class="palette-item-tag">
              {{
                workbenchStore.favoriteModuleIds.includes(module.id) ? '收藏' : '打开'
              }}
            </span>
          </button>
        </div>

        <p v-else class="palette-empty">没有匹配工具，试试 `json`、`time` 或 `base64`。</p>
      </section>
    </div>
  </div>
</template>
