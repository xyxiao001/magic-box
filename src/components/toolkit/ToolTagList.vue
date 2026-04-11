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

const userFacingTagLabels: Partial<Record<ToolCapabilityTag, string>> = {
  'offline-ready': 'Offline Ready',
  'network-required': 'Network Required',
  'local-processing': 'Local Processing',
  beta: 'Beta',
}

const visibleTags = computed(() =>
  props.tags.flatMap((tag) => {
    const label = userFacingTagLabels[tag]

    return label
      ? [
          {
            id: tag,
            label,
          },
        ]
      : []
  })
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
