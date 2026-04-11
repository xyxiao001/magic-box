<script setup lang="ts">
defineProps<{
  title: string
  subtitle?: string
  badge?: string
}>()
</script>

<template>
  <section class="http-panel">
    <div class="result-panel-header">
      <div>
        <span class="result-panel-title">{{ title }}</span>
        <span v-if="subtitle" class="meta-hint">{{ subtitle }}</span>
      </div>
      <div class="tool-panel-actions">
        <span v-if="badge" class="workspace-chip">{{ badge }}</span>
        <slot name="actions" />
      </div>
    </div>

    <slot />
  </section>
</template>

<style scoped>
.tool-panel-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
</style>
