<script setup lang="ts">
defineProps<{
  title?: string
  subtitle?: string
  badge?: string
}>()
</script>

<template>
  <section class="tool-pane-shell">
    <div v-if="title || subtitle || badge || $slots.actions" class="result-panel-header">
      <div v-if="title || subtitle">
        <span v-if="title" class="result-panel-title">{{ title }}</span>
        <span v-if="subtitle" class="meta-hint">{{ subtitle }}</span>
      </div>
      <div class="tool-pane-shell-actions">
        <span v-if="badge" class="workspace-chip">{{ badge }}</span>
        <slot name="actions" />
      </div>
    </div>

    <slot />
  </section>
</template>

<style scoped>
.tool-pane-shell {
  display: grid;
  gap: 1rem;
  min-width: 0;
  align-content: start;
}

.tool-pane-shell-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
</style>
