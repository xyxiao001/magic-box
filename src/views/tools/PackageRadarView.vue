<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { copyToClipboard } from '@/lib/clipboard'
import {
  buildInstallCommands,
  buildPackageDetailUrl,
  buildPackageSearchUrl,
  normalizePackageDetail,
  normalizePackageSearchResults,
  type PackageDetail,
  type PackageSearchItem,
} from '@/lib/package-radar'

const searchQuery = ref('vue')
const searchResults = ref<PackageSearchItem[]>([])
const selectedPackage = ref<PackageDetail | null>(null)
const selectedPackageName = ref('')
const isSearching = ref(false)
const isLoadingDetail = ref(false)
const statusMessage = ref('输入包名后即可搜索 npm 包')
const statusTone = ref<'neutral' | 'success' | 'danger'>('neutral')

const quickPackages = ['vue', 'react', 'vite', 'pinia', '@vueuse/core', 'openai']

const installCommands = computed(() =>
  selectedPackage.value ? buildInstallCommands(selectedPackage.value.name) : null
)

function applyStatus(message: string, tone: 'neutral' | 'success' | 'danger') {
  statusMessage.value = message
  statusTone.value = tone
}

async function copyCommand(command: string, label: string) {
  const success = await copyToClipboard(command)
  applyStatus(success ? `${label} 已复制` : '当前环境不支持复制', success ? 'neutral' : 'danger')
}

async function searchPackages(query = searchQuery.value, preferExact = true) {
  const trimmed = query.trim()

  if (!trimmed) {
    searchResults.value = []
    selectedPackage.value = null
    selectedPackageName.value = ''
    applyStatus('请输入包名，例如 vue、pinia 或 @vueuse/core', 'danger')
    return
  }

  isSearching.value = true
  applyStatus(`正在搜索 ${trimmed}...`, 'neutral')

  try {
    const response = await fetch(buildPackageSearchUrl(trimmed))

    if (!response.ok) {
      throw new Error(`搜索失败：${response.status}`)
    }

    const payload = await response.json()
    const results = normalizePackageSearchResults(payload)
    searchResults.value = results

    if (!results.length) {
      selectedPackage.value = null
      selectedPackageName.value = ''
      applyStatus('没有找到相关包，换个关键词试试', 'danger')
      return
    }

    const exactMatch = results.find(
      (item) => item.name.toLowerCase() === trimmed.toLowerCase()
    )

    applyStatus(`已找到 ${results.length} 个候选包`, 'success')

    if (preferExact) {
      await selectPackage(exactMatch?.name ?? results[0]?.name ?? '')
    }
  } catch (error) {
    searchResults.value = []
    selectedPackage.value = null
    selectedPackageName.value = ''
    applyStatus(error instanceof Error ? error.message : '搜索失败', 'danger')
  } finally {
    isSearching.value = false
  }
}

async function selectPackage(name: string) {
  if (!name) {
    return
  }

  selectedPackageName.value = name
  isLoadingDetail.value = true
  applyStatus(`正在加载 ${name} 的包详情...`, 'neutral')

  try {
    const response = await fetch(buildPackageDetailUrl(name))

    if (!response.ok) {
      throw new Error(`详情加载失败：${response.status}`)
    }

    const payload = await response.json()
    selectedPackage.value = normalizePackageDetail(payload)
    applyStatus(`${name} 详情加载完成`, 'success')
  } catch (error) {
    selectedPackage.value = null
    applyStatus(error instanceof Error ? error.message : '详情加载失败', 'danger')
  } finally {
    isLoadingDetail.value = false
  }
}

function applyQuickPackage(name: string) {
  searchQuery.value = name
  void searchPackages(name)
}

onMounted(() => {
  void searchPackages(searchQuery.value)
})
</script>

<template>
  <section class="tool-page tool-page-package">
    <div class="tool-page-layout">
      <section class="editor-pane">
        <div class="pane-header">
          <div>
            <h2 class="pane-title">搜索区</h2>
            <p class="meta-hint">用最短路径找到包，再在右侧确认是否值得引入。</p>
          </div>
          <span class="workspace-chip">npm registry</span>
        </div>

        <form class="package-search-form" @submit.prevent="searchPackages()">
          <label class="field-row">
            <span class="field-label">包名</span>
            <input
              v-model="searchQuery"
              class="text-input"
              type="text"
              placeholder="例如 vue、pinia、@vueuse/core"
            />
          </label>

          <div class="input-toolbar">
            <button
              type="submit"
              class="solid-button"
              :disabled="isSearching"
            >
              {{ isSearching ? '搜索中...' : '搜索包' }}
            </button>
          </div>
        </form>

        <section class="package-panel">
          <div class="result-panel-header">
            <span class="result-panel-title">快捷入口</span>
            <span class="meta-hint">快速查看常用生态包。</span>
          </div>

          <div class="package-quick-list">
            <button
              v-for="item in quickPackages"
              :key="item"
              type="button"
              class="package-quick-chip"
              @click="applyQuickPackage(item)"
            >
              {{ item }}
            </button>
          </div>
        </section>

        <section class="package-panel">
          <div class="result-panel-header">
            <span class="result-panel-title">候选结果</span>
            <span class="meta-hint">
              {{ searchResults.length ? `${searchResults.length} 个结果` : '等待搜索结果' }}
            </span>
          </div>

          <div v-if="searchResults.length" class="package-result-list">
            <button
              v-for="item in searchResults"
              :key="item.name"
              type="button"
              class="package-result-card"
              :class="{ 'package-result-card-active': selectedPackageName === item.name }"
              @click="selectPackage(item.name)"
            >
              <div class="package-result-top">
                <strong class="package-result-title">{{ item.name }}</strong>
                <span class="package-result-version">v{{ item.version }}</span>
              </div>
              <p class="package-result-description">{{ item.description }}</p>
              <div class="package-result-meta">
                <span>{{ item.date }}</span>
                <span>npm</span>
              </div>
            </button>
          </div>

          <div v-else class="empty-panel">
            <p>输入包名后，这里会出现可选的候选包。</p>
          </div>
        </section>
      </section>

      <section class="viewer-pane">
        <div class="pane-header">
          <div>
            <h2 class="pane-title">详情区</h2>
            <p
              class="helper-text"
              :class="{
                'helper-text-success': statusTone === 'success',
                'helper-text-danger': statusTone === 'danger',
              }"
            >
              {{ statusMessage }}
            </p>
          </div>
          <span class="workspace-chip">
            {{ isLoadingDetail ? '加载中' : selectedPackage?.latestVersion || '待选择' }}
          </span>
        </div>

        <template v-if="selectedPackage">
          <section class="package-panel package-detail-hero">
            <div class="package-detail-head">
              <div>
                <p class="eyebrow package-detail-kicker">Package</p>
                <h3 class="page-title">{{ selectedPackage.name }}</h3>
              </div>
              <span class="package-detail-version">v{{ selectedPackage.latestVersion }}</span>
            </div>

            <p class="page-intro">{{ selectedPackage.description }}</p>

            <div class="data-list">
              <div class="data-row">
                <div>
                  <span class="result-label">License</span>
                  <strong class="result-value">{{ selectedPackage.license }}</strong>
                </div>
                <div>
                  <span class="result-label">发布时间</span>
                  <strong class="result-value">{{ selectedPackage.publishedAt }}</strong>
                </div>
              </div>

              <div class="data-row">
                <div>
                  <span class="result-label">Maintainers</span>
                  <strong class="result-value">
                    {{ selectedPackage.maintainers.join(', ') || '未知' }}
                  </strong>
                </div>
                <div>
                  <span class="result-label">最近版本数</span>
                  <strong class="result-value">{{ selectedPackage.recentVersions.length }}</strong>
                </div>
              </div>
            </div>
          </section>

          <section class="package-panel">
            <div class="result-panel-header">
              <span class="result-panel-title">安装命令</span>
              <span class="meta-hint">复制即用，不再来回切包管理器。</span>
            </div>

            <div class="package-command-list">
              <div
                v-for="(command, manager) in installCommands"
                :key="manager"
                class="package-command-row"
              >
                <div>
                  <span class="result-label">{{ manager }}</span>
                  <code class="package-command-code">{{ command }}</code>
                </div>
                <button
                  type="button"
                  class="ghost-button small-button"
                  @click="copyCommand(command, `${manager} 安装命令`)"
                >
                  复制
                </button>
              </div>
            </div>
          </section>

          <section class="package-panel">
            <div class="result-panel-header">
              <span class="result-panel-title">最近版本</span>
              <span class="meta-hint">按发布时间倒序排列。</span>
            </div>

            <div class="package-version-list">
              <article
                v-for="entry in selectedPackage.recentVersions"
                :key="entry.version"
                class="package-version-card"
              >
                <strong class="package-version-title">v{{ entry.version }}</strong>
                <span class="package-version-date">{{ entry.publishedAt }}</span>
              </article>
            </div>
          </section>

          <section class="package-panel">
            <div class="result-panel-header">
              <span class="result-panel-title">官方链接</span>
            </div>

            <div class="package-link-list">
              <a
                v-for="link in selectedPackage.links"
                :key="link.label"
                class="package-link-pill"
                :href="link.url"
                target="_blank"
                rel="noreferrer"
              >
                {{ link.label }}
              </a>
            </div>
          </section>
        </template>

        <div v-else class="empty-panel">
          <p>选择一个候选包后，这里会展示版本、安装命令和官方链接。</p>
        </div>
      </section>
    </div>
  </section>
</template>
