<script setup lang="ts">
import { useMessage } from '@/shared/composables/useMessage'

const { messages, removeMessage } = useMessage()
</script>

<template>
  <section v-if="messages.length" class="app-message-stack" aria-live="polite" aria-atomic="true">
    <article
      v-for="message in messages"
      :key="message.id"
      class="app-message-card"
      :data-tone="message.tone"
      role="status"
    >
      <strong class="app-message-title">
        {{
          message.tone === 'success'
            ? '操作成功'
            : message.tone === 'error'
              ? '操作失败'
              : '提示'
        }}
      </strong>
      <p>{{ message.text }}</p>
      <button type="button" class="ghost-button small-button" @click="removeMessage(message.id)">关闭</button>
    </article>
  </section>
</template>

<style scoped>
.app-message-stack {
  position: fixed;
  right: calc(28px + var(--safe-right));
  bottom: calc(28px + var(--safe-bottom));
  display: grid;
  gap: 12px;
  z-index: 24;
}

.app-message-card {
  display: grid;
  gap: 0.5rem;
  width: min(360px, calc(100vw - 32px));
  padding: 14px 16px;
  border-radius: 18px;
  border: 1px solid rgba(140, 240, 218, 0.24);
  background: rgba(8, 19, 33, 0.96);
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.28);
}

.app-message-card[data-tone='success'] {
  border-color: rgba(134, 241, 182, 0.32);
}

.app-message-card[data-tone='error'] {
  border-color: rgba(255, 126, 157, 0.32);
}

.app-message-title {
  font-size: 0.95rem;
}

.app-message-card p {
  margin: 0;
  color: var(--muted);
}

html[data-theme='mac-light'] .app-message-card {
  background: rgba(255, 255, 255, 0.94);
}
</style>
