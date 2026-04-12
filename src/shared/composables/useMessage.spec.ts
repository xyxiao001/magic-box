import { afterEach, describe, expect, it, vi } from 'vitest'
import { useMessage } from './useMessage'

describe('useMessage', () => {
  afterEach(() => {
    const { messages, removeMessage } = useMessage()
    for (const message of messages.value) {
      removeMessage(message.id)
    }
    vi.useRealTimers()
  })

  it('shows success messages and removes them after duration', () => {
    vi.useFakeTimers()
    const { messages, success } = useMessage()

    success('复制成功', 1000)

    expect(messages.value).toHaveLength(1)
    expect(messages.value[0]).toMatchObject({
      text: '复制成功',
      tone: 'success',
    })

    vi.advanceTimersByTime(1000)

    expect(messages.value).toHaveLength(0)
  })
})
