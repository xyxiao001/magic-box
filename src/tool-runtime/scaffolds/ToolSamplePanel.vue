<script setup lang="ts">
interface ToolSamplePanelItem {
  id: string
  label: string
  summary?: string
}

defineProps<{
  samples: ToolSamplePanelItem[]
}>()

const emit = defineEmits<{
  apply: [sampleId: string]
}>()
</script>

<template>
  <section class="tool-sample-panel">
    <div class="result-panel-header">
      <div>
        <span class="result-panel-title">示例输入</span>
        <span class="meta-hint">优先提供可直接上手的真实场景样例，便于快速验证结果。</span>
      </div>
    </div>

    <div class="tool-sample-list">
      <button
        v-for="sample in samples"
        :key="sample.id"
        type="button"
        class="tool-sample-card"
        @click="emit('apply', sample.id)"
      >
        <div class="tool-sample-top">
          <strong>{{ sample.label }}</strong>
          <span class="tool-sample-action">应用示例</span>
        </div>
        <p v-if="sample.summary">{{ sample.summary }}</p>
      </button>
    </div>
  </section>
</template>

<style scoped>
.tool-sample-panel,
.tool-sample-list {
  display: grid;
  gap: 0.875rem;
}

.tool-sample-card {
  display: grid;
  gap: 0.5rem;
  padding: 1rem;
  border-radius: 16px;
  border: 1px solid var(--surface-card-border);
  background: var(--surface-card-bg);
  text-align: left;
  color: var(--text);
}

.tool-sample-card p {
  margin: 0;
  color: var(--muted);
}

.tool-sample-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.tool-sample-action {
  color: var(--accent);
  font-size: 0.875rem;
}
</style>
