import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ErrorBanner from '@/components/toolkit/ErrorBanner.vue'
import ResultCard from '@/components/toolkit/ResultCard.vue'
import { useMessage } from '@/shared/composables/useMessage'
import ToolPageLayout from '@/components/toolkit/ToolPageLayout.vue'
import ToolTagList from '@/components/toolkit/ToolTagList.vue'

const { copyToClipboardMock } = vi.hoisted(() => ({
  copyToClipboardMock: vi.fn(async () => true),
}))

vi.mock('@/lib/clipboard', () => ({
  copyToClipboard: copyToClipboardMock,
}))

describe('toolkit components', () => {
  afterEach(() => {
    const { messages, removeMessage } = useMessage()
    for (const message of messages.value) {
      removeMessage(message.id)
    }
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  it('renders tool page layout slots', () => {
    const wrapper = mount(ToolPageLayout, {
      slots: {
        editor: '<div class="editor-content">左侧内容</div>',
        viewer: '<div class="viewer-content">右侧内容</div>',
      },
    })

    expect(wrapper.find('.editor-pane .editor-content').text()).toBe('左侧内容')
    expect(wrapper.find('.viewer-pane .viewer-content').text()).toBe('右侧内容')
  })

  it('copies result card content', async () => {
    const { messages } = useMessage()
    const wrapper = mount(ResultCard, {
      props: {
        title: '结果',
        copyValue: 'hello',
        copyLabel: '复制结果',
      },
      slots: {
        default: '<code>hello</code>',
      },
    })

    await wrapper.get('button').trigger('click')

    expect(copyToClipboardMock).toHaveBeenCalledWith('hello')
    expect(messages.value.at(-1)?.text).toBe('结果已复制')
  })

  it('renders error banner message', () => {
    const wrapper = mount(ErrorBanner, {
      props: {
        title: '解析失败',
        message: '输入内容不合法',
        hint: '请检查格式',
      },
    })

    expect(wrapper.text()).toContain('解析失败')
    expect(wrapper.text()).toContain('输入内容不合法')
    expect(wrapper.text()).toContain('请检查格式')
  })

  it('renders capability tag labels', () => {
    const wrapper = mount(ToolTagList, {
      props: {
        tags: ['offline-ready', 'history-supported', 'favorite-supported'],
      },
    })

    expect(wrapper.text()).toContain('Offline Ready')
    expect(wrapper.text()).not.toContain('History Supported')
    expect(wrapper.text()).not.toContain('Favorite Supported')
  })
})
