<script setup lang="ts">
defineProps<{
  title: string
  message: string
  hint?: string
}>()
</script>

<template>
  <article class="error-banner" role="alert">
    <strong>{{ title }}</strong>
    <p>{{ message }}</p>
    <p v-if="hint" class="meta-hint">{{ hint }}</p>
  </article>
</template>

<style scoped>
.error-banner {
  display: grid;
  gap: 0.375rem;
  padding: 0.875rem 1rem;
  border: 1px solid rgba(255, 120, 120, 0.24);
  border-radius: 14px;
  background: rgba(127, 29, 29, 0.18);
  color: #ffd9d9;
}

.error-banner p {
  margin: 0;
}
</style>
