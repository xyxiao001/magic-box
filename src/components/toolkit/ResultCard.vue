<script setup lang="ts">
import { copyToClipboard } from '@/lib/clipboard'
import { useMessage } from '@/shared/composables/useMessage'

const props = withDefaults(
  defineProps<{
    title: string
    subtitle?: string
    copyValue?: string
    copyLabel?: string
    tone?: 'neutral' | 'success' | 'danger'
  }>(),
  {
    subtitle: '',
    copyValue: '',
    copyLabel: '复制',
    tone: 'neutral',
  }
)

const emit = defineEmits<{
  copied: [success: boolean]
}>()

const { success: showSuccessMessage, error: showErrorMessage } = useMessage()

async function handleCopy() {
  const copied = await copyToClipboard(props.copyValue)
  if (copied) {
    successMessage()
  } else {
    showErrorMessage('当前环境不支持复制')
  }
  emit('copied', copied)
}

function successMessage() {
  showSuccessMessage(`${props.title}已复制`)
}
</script>

<template>
  <article class="result-card" :data-tone="tone">
    <div class="result-panel-header">
      <div>
        <span class="result-panel-title">{{ title }}</span>
        <span v-if="subtitle" class="meta-hint">{{ subtitle }}</span>
      </div>
      <button v-if="copyValue" type="button" class="ghost-button small-button" @click="handleCopy">
        {{ copyLabel }}
      </button>
    </div>

    <slot />
  </article>
</template>

<style scoped>
.result-card {
  display: grid;
  gap: 0.875rem;
  padding: 1rem;
  border-radius: 18px;
  border: 1px solid var(--result-card-border);
  background: var(--result-card-bg);
  color: var(--text);
}

.result-card[data-tone='success'] {
  border-color: rgba(74, 222, 128, 0.2);
}

.result-card[data-tone='danger'] {
  border-color: rgba(248, 113, 113, 0.24);
}

.result-card :deep(p) {
  margin: 0;
}
</style>
