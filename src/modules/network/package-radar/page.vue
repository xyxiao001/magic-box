<script setup lang="ts">
import { computed } from 'vue'
import ToolActionBar from '@/components/toolkit/ToolActionBar.vue'
import ToolPaneShell from '@/components/toolkit/ToolPaneShell.vue'
import { copyToClipboard } from '@/lib/clipboard'
import { useMessage } from '@/shared/composables/useMessage'
import { useToolDraft } from '@/tool-runtime/composables/useToolDraft'
import { useToolExecution } from '@/tool-runtime/composables/useToolExecution'
import { useToolHistory } from '@/tool-runtime/composables/useToolHistory'
import { useToolSamples } from '@/tool-runtime/composables/useToolSamples'
import { useToolShare } from '@/tool-runtime/composables/useToolShare'
import { useToolState } from '@/tool-runtime/composables/useToolState'
import ToolHistoryPanel from '@/tool-runtime/scaffolds/ToolHistoryPanel.vue'
import ToolSamplePanel from '@/tool-runtime/scaffolds/ToolSamplePanel.vue'
import ToolScaffold from '@/tool-runtime/scaffolds/ToolScaffold.vue'
import type { ToolHistoryEntry } from '@/tool-runtime/services/tool-history-service'
import {
  buildPackageRadarHistoryLabel,
  packageRadarRuntimeModule,
  type PackageRadarInput,
  type PackageRadarOutput,
} from './module'

const searchQueryDomain = 'tool-history:package-radar:query'

const state = useToolState<PackageRadarInput, PackageRadarOutput>(packageRadarRuntimeModule)
useToolDraft(packageRadarRuntimeModule, state, {
  legacyKeys: [searchQueryDomain],
  parseLegacy: (raw) => ({
    ...state.input.value,
    query: raw,
  }),
})
const history = useToolHistory(packageRadarRuntimeModule, state, {
  buildEntryMeta: (input, output) => ({
    label: buildPackageRadarHistoryLabel(input, output ?? { results: [], selectedPackage: null, installCommands: null }),
    description: output?.selectedPackage?.latestVersion || '',
  }),
})
const { run } = useToolExecution(packageRadarRuntimeModule, state)
const samples = useToolSamples(packageRadarRuntimeModule, state)
const share = useToolShare(packageRadarRuntimeModule, state)
const { success: showSuccessMessage, error: showErrorMessage } = useMessage()

const quickPackages = ['vue', 'react', 'vite', 'pinia', '@vueuse/core', 'openai']
const output = computed(() => state.output.value)

async function searchPackages() {
  const outputValue = await run()
  if (!outputValue) {
    return
  }

  if (!outputValue.results.length) {
    showErrorMessage('没有找到相关包，换个关键词试试')
    return
  }

  showSuccessMessage(`已找到 ${outputValue.results.length} 个候选包`)
}

async function selectPackage(name: string) {
  state.input.value.selectedPackageName = name
  const outputValue = await run()
  if (outputValue?.selectedPackage) {
    showSuccessMessage(`${name} 详情加载完成`)
  }
}

function applyQuickPackage(name: string) {
  state.input.value.query = name
  state.input.value.selectedPackageName = name
  void searchPackages()
}

function applySampleById(sampleId: string) {
  const sample = samples.samples.value.find((item) => item.id === sampleId)
  if (!sample) return
  samples.applySample(sample)
}

async function copyCommand(command: string, label: string) {
  const success = await copyToClipboard(command)
  if (success) {
    showSuccessMessage(`${label} 已复制`)
    return
  }
  showErrorMessage('当前环境不支持复制')
}

function saveSnapshot() {
  if (!state.output.value) return
  history.recordHistory(state.input.value, state.output.value)
  showSuccessMessage('已保存到历史记录')
}
</script>

<template>
  <ToolScaffold :meta="packageRadarRuntimeModule.meta" :loading="state.loading.value" :error="state.error.value" wide>
    <template #actions>
      <ToolActionBar>
        <button type="button" class="solid-button" :disabled="state.loading.value" @click="searchPackages">
          {{ state.loading.value ? '搜索中...' : '搜索包' }}
        </button>
        <button type="button" class="ghost-button" :disabled="!share.canShare.value" @click="share.copyShareUrl">复制分享链接</button>
        <button type="button" class="ghost-button" :disabled="!state.output.value" @click="saveSnapshot">保存快照</button>
      </ToolActionBar>
    </template>

    <template #input>
      <ToolPaneShell title="搜索区" subtitle="用最短路径找到包，再在右侧确认是否值得引入。">
        <label class="field-row">
          <span class="field-label">包名</span>
          <input v-model="state.input.value.query" class="text-input" type="text" placeholder="例如 vue、pinia、@vueuse/core" />
        </label>

        <ToolSamplePanel
          v-if="samples.sampleEnabled && samples.samples.value.length"
          :samples="samples.samples.value"
          @apply="applySampleById"
        />

        <section class="package-panel">
          <div class="result-panel-header">
            <span class="result-panel-title">快捷入口</span>
            <span class="meta-hint">快速查看常用生态包。</span>
          </div>
          <div class="package-quick-list">
            <button v-for="item in quickPackages" :key="item" type="button" class="package-quick-chip" @click="applyQuickPackage(item)">
              {{ item }}
            </button>
          </div>
        </section>

        <section class="package-panel">
          <div class="result-panel-header">
            <span class="result-panel-title">候选结果</span>
            <span class="meta-hint">{{ output?.results.length ? `${output.results.length} 个结果` : '等待搜索结果' }}</span>
          </div>

          <div v-if="output?.results.length" class="package-result-list">
            <button
              v-for="item in output.results"
              :key="item.name"
              type="button"
              class="package-result-card"
              :class="{ 'package-result-card-active': state.input.value.selectedPackageName === item.name }"
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
      </ToolPaneShell>
    </template>

    <template #history>
      <ToolHistoryPanel
        v-if="history.historyEnabled"
        :entries="history.entries.value"
        empty-text="搜索并保存快照后，这里会记录最近查看的包。"
        @restore="(entry) => history.restoreEntry(entry as ToolHistoryEntry<PackageRadarInput, PackageRadarOutput>)"
        @remove="history.removeEntry"
        @clear="history.clearHistoryEntries"
      />
    </template>

    <template #output>
      <ToolPaneShell title="详情区" :subtitle="output?.selectedPackage?.description || '选择一个候选包后，这里会展示版本、安装命令和官方链接。'">
        <template v-if="output?.selectedPackage">
          <section class="package-panel package-detail-hero">
            <div class="package-detail-head">
              <div>
                <p class="eyebrow package-detail-kicker">Package</p>
                <h3 class="page-title">{{ output.selectedPackage.name }}</h3>
              </div>
              <span class="package-detail-version">v{{ output.selectedPackage.latestVersion }}</span>
            </div>

            <p class="page-intro">{{ output.selectedPackage.description }}</p>

            <div class="data-list">
              <div class="data-row">
                <div>
                  <span class="result-label">License</span>
                  <strong class="result-value">{{ output.selectedPackage.license }}</strong>
                </div>
                <div>
                  <span class="result-label">发布时间</span>
                  <strong class="result-value">{{ output.selectedPackage.publishedAt }}</strong>
                </div>
              </div>
              <div class="data-row">
                <div>
                  <span class="result-label">Maintainers</span>
                  <strong class="result-value">{{ output.selectedPackage.maintainers.join(', ') || '未知' }}</strong>
                </div>
                <div>
                  <span class="result-label">最近版本数</span>
                  <strong class="result-value">{{ output.selectedPackage.recentVersions.length }}</strong>
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
              <div v-for="(command, manager) in output.installCommands" :key="manager" class="package-command-row">
                <div>
                  <span class="result-label">{{ manager }}</span>
                  <code class="package-command-code">{{ command }}</code>
                </div>
                <button type="button" class="ghost-button small-button" @click="copyCommand(command, `${manager} 安装命令`)">复制</button>
              </div>
            </div>
          </section>

          <section class="package-panel">
            <div class="result-panel-header">
              <span class="result-panel-title">最近版本</span>
              <span class="meta-hint">按发布时间倒序排列。</span>
            </div>
            <div class="package-version-list">
              <article v-for="entry in output.selectedPackage.recentVersions" :key="entry.version" class="package-version-card">
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
                v-for="link in output.selectedPackage.links"
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
          <p>先搜索并选择一个包，这里会展示版本、安装命令和官方链接。</p>
        </div>
      </ToolPaneShell>
    </template>
  </ToolScaffold>
</template>
