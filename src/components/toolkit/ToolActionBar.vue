<script setup lang="ts">
withDefaults(
  defineProps<{
    wrap?: boolean
  }>(),
  {
    wrap: true,
  }
)
</script>

<template>
  <div class="input-toolbar" :class="{ 'tool-action-bar-nowrap': !wrap }">
    <slot />
  </div>
</template>

<style scoped>
.tool-action-bar-nowrap {
  flex-wrap: nowrap;
}
</style>
