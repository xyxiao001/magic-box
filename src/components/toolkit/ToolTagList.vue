<script setup lang="ts">
import { computed } from 'vue'
import type { ToolCapabilityTag } from '@/tools/registry'

const props = withDefaults(
  defineProps<{
    tags: ToolCapabilityTag[]
    compact?: boolean
  }>(),
  {
    compact: false,
  }
)

const tagLabels: Record<ToolCapabilityTag, string> = {
  'offline-ready': 'Offline Ready',
  'network-required': 'Network Required',
  'local-processing': 'Local Processing',
  beta: 'Beta',
  'favorite-supported': 'Favorite Supported',
  'history-supported': 'History Supported',
}

const visibleTags = computed(() =>
  props.tags.map((tag) => ({
    id: tag,
    label: tagLabels[tag],
  }))
)
</script>

<template>
  <div class="tool-tag-list" :class="{ 'tool-tag-list-compact': compact }">
    <span v-for="tag in visibleTags" :key="tag.id" class="workspace-chip tool-tag-chip">
      {{ tag.label }}
    </span>
  </div>
</template>

<style scoped>
.tool-tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.tool-tag-list-compact {
  justify-content: flex-end;
}

.tool-tag-chip {
  white-space: nowrap;
}
</style>
