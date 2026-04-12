import { readonly, ref } from 'vue'

export type AppMessageTone = 'success' | 'error' | 'info'

export interface AppMessageItem {
  id: number
  text: string
  tone: AppMessageTone
}

const messageQueue = ref<AppMessageItem[]>([])
let nextMessageId = 1

function removeMessage(id: number) {
  messageQueue.value = messageQueue.value.filter((item) => item.id !== id)
}

function showMessage(text: string, tone: AppMessageTone = 'info', duration = 1800) {
  const id = nextMessageId
  nextMessageId += 1

  messageQueue.value = [
    ...messageQueue.value,
    {
      id,
      text,
      tone,
    },
  ]

  window.setTimeout(() => {
    removeMessage(id)
  }, duration)

  return id
}

export function useMessage() {
  return {
    messages: readonly(messageQueue),
    showMessage,
    removeMessage,
    success: (text: string, duration?: number) => showMessage(text, 'success', duration),
    error: (text: string, duration?: number) => showMessage(text, 'error', duration),
    info: (text: string, duration?: number) => showMessage(text, 'info', duration),
  }
}
