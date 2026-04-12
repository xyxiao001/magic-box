<script setup lang="ts">
import type { ToolActionBarItem } from './tool-action-bar'

withDefaults(
  defineProps<{
    items?: ToolActionBarItem[]
    wrap?: boolean
  }>(),
  {
    items: () => [],
    wrap: true,
  }
)
</script>

<template>
  <div class="input-toolbar" :class="{ 'tool-action-bar-nowrap': !wrap }">
    <slot />
    <button
      v-for="item in items"
      :key="item.id"
      type="button"
      :class="item.tone === 'primary' ? 'solid-button' : 'ghost-button'"
      :disabled="item.disabled"
      @click="item.onClick"
    >
      {{ item.label }}
    </button>
  </div>
</template>

<style scoped>
.tool-action-bar-nowrap {
  flex-wrap: nowrap;
}
</style>
