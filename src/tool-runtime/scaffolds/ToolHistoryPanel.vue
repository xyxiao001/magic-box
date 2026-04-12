<script setup lang="ts">
interface ToolHistoryPanelEntry {
  id: string
  createdAt: string
  label: string
  description?: string
}

withDefaults(
  defineProps<{
    entries: ToolHistoryPanelEntry[]
    emptyText?: string
  }>(),
  {
    emptyText: '保存一次结果后，这里会出现历史记录。',
  }
)

const emit = defineEmits<{
  restore: [entry: unknown]
  remove: [entryId: string]
  clear: []
}>()
</script>

<template>
  <section class="http-panel">
    <div class="result-panel-header">
      <div>
        <span class="result-panel-title">历史记录</span>
        <span class="meta-hint">保存最近几次结果，便于恢复输入和快速复用。</span>
      </div>
      <button v-if="entries.length" type="button" class="ghost-button small-button" @click="emit('clear')">清空</button>
    </div>

    <div v-if="entries.length" class="timeline-list">
      <article v-for="(entry, index) in entries" :key="entry.id" class="timeline-row timeline-row-actions">
        <span class="timeline-index">{{ index + 1 }}</span>
        <div class="history-entry-body">
          <strong class="result-value">{{ entry.label }}</strong>
          <span v-if="entry.description" class="meta-hint">{{ entry.description }}</span>
          <span class="meta-hint">{{ new Date(entry.createdAt).toLocaleString() }}</span>
        </div>
        <div class="tool-history-actions">
          <button type="button" class="ghost-button small-button" @click="emit('restore', entry)">恢复</button>
          <button type="button" class="ghost-button small-button" @click="emit('remove', entry.id)">删除</button>
        </div>
      </article>
    </div>

    <div v-else class="empty-panel">
      <p>{{ emptyText }}</p>
    </div>
  </section>
</template>

<style scoped>
.timeline-row-actions {
  grid-template-columns: 34px minmax(0, 1fr) auto;
}

.tool-history-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

@media (max-width: 720px) {
  .timeline-row-actions {
    grid-template-columns: 34px minmax(0, 1fr);
  }

  .tool-history-actions {
    grid-column: 2;
    justify-content: flex-start;
    flex-wrap: wrap;
  }
}
</style>
