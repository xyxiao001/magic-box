<script setup lang="ts">
import { computed } from 'vue'
import ErrorBanner from '@/components/toolkit/ErrorBanner.vue'
import ToolPageLayout from '@/components/toolkit/ToolPageLayout.vue'
import ToolTagList from '@/components/toolkit/ToolTagList.vue'
import type { ToolCapabilityTag } from '@/platform/tool-registry/types'
import type { ToolModuleMeta } from '../protocols/tool-module'
import ToolHistoryPanel from './ToolHistoryPanel.vue'
import ToolSamplePanel from './ToolSamplePanel.vue'
import type { ToolScaffoldHistoryPanel, ToolScaffoldSamplePanel } from './types'

const props = withDefaults(
  defineProps<{
    meta: ToolModuleMeta
    loading?: boolean
    error?: string | null
    wide?: boolean
    singleColumn?: boolean
    showHeader?: boolean
    historyPanel?: ToolScaffoldHistoryPanel | null
    samplePanel?: ToolScaffoldSamplePanel | null
  }>(),
  {
    loading: false,
    error: null,
    wide: false,
    singleColumn: false,
    showHeader: false,
    historyPanel: null,
    samplePanel: null,
  }
)

const visibleTags = computed(() => (props.meta.tags ?? []).filter((tag): tag is ToolCapabilityTag => typeof tag === 'string'))
</script>

<template>
  <section class="tool-scaffold">
    <header v-if="props.showHeader" class="tool-scaffold-header">
      <div class="tool-scaffold-copy">
        <p class="eyebrow">Tool Module</p>
        <h1 class="hero-title">{{ props.meta.title }}</h1>
        <p class="hero-copy">{{ props.meta.description }}</p>
      </div>
      <ToolTagList v-if="visibleTags.length" :tags="visibleTags" compact />
    </header>

    <slot name="header" />

    <ToolPageLayout :wide="props.wide" :single-column="props.singleColumn">
      <template #editor>
        <section class="tool-scaffold-pane">
          <slot name="actions" />
          <slot name="input" />
          <ToolSamplePanel
            v-if="props.samplePanel?.samples.length"
            :samples="props.samplePanel.samples"
            @apply="props.samplePanel.onApply"
          />
          <ToolHistoryPanel
            v-if="props.historyPanel"
            :entries="props.historyPanel.entries"
            :empty-text="props.historyPanel.emptyText"
            @restore="props.historyPanel.onRestore"
            @remove="props.historyPanel.onRemove"
            @clear="props.historyPanel.onClear"
          />
          <slot name="history" />
        </section>
      </template>

      <template #viewer>
        <section class="tool-scaffold-pane">
          <p v-if="props.loading" class="meta-hint">处理中...</p>
          <ErrorBanner v-if="props.error" title="执行失败" :message="props.error" />
          <slot name="output" />
          <slot name="footer" />
        </section>
      </template>
    </ToolPageLayout>
  </section>
</template>

<style scoped>
.tool-scaffold {
  display: grid;
  gap: 1rem;
}

.tool-scaffold-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.tool-scaffold-copy {
  display: grid;
  gap: 0.375rem;
}

.tool-scaffold-pane {
  display: grid;
  gap: 1rem;
  min-width: 0;
}
</style>
