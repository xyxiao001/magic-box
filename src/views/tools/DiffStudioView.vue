<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { copyToClipboard } from '@/lib/clipboard'
import { buildLineDiff } from '@/lib/diff'
import { readStorage, writeStorage } from '@/lib/storage'

interface DiffTemplate {
  label: string
  summary: string
  left: string
  right: string
}

const storageLeftKey = 'magic-box.diff-studio.left'
const storageRightKey = 'magic-box.diff-studio.right'
const storageLeftDomain = 'tool-history:diff-studio:left'
const storageRightDomain = 'tool-history:diff-studio:right'

const diffTemplates: DiffTemplate[] = [
  {
    label: '配置变更',
    summary: '适合比较环境变量、Vite 配置和服务参数。',
    left: `APP_NAME=MagicBox
API_BASE=https://api.example.com
FEATURE_MARKDOWN=false
LOG_LEVEL=info`,
    right: `APP_NAME=MagicBox
API_BASE=https://api.internal.example.com
FEATURE_MARKDOWN=true
LOG_LEVEL=warn
TRACE_ENABLED=true`,
  },
  {
    label: '接口响应',
    summary: '适合对比联调前后响应结构和字段变化。',
    left: `{
  "id": 1,
  "name": "Magic Box",
  "status": "draft"
}`,
    right: `{
  "id": 1,
  "name": "Magic Box",
  "status": "published",
  "updatedAt": "2026-04-09T12:00:00Z"
}`,
  },
  {
    label: 'Markdown 文档',
    summary: '适合确认文档标题、列表和说明段落的差异。',
    left: `# Release Notes

- add markdown preview
- improve search`,
    right: `# Release Notes

- add markdown preview
- improve search
- ship html export`,
  },
]

const leftInput = ref(
  readStorage(storageLeftDomain, diffTemplates[0]?.left || '', {
    legacyKeys: [storageLeftKey],
    parseLegacy: (raw) => raw,
  })
)
const rightInput = ref(
  readStorage(storageRightDomain, diffTemplates[0]?.right || '', {
    legacyKeys: [storageRightKey],
    parseLegacy: (raw) => raw,
  })
)
const copiedMessage = ref('')

const diffResult = computed(() => buildLineDiff(leftInput.value, rightInput.value))
const diffStatus = computed(() => {
  if (!leftInput.value.trim() && !rightInput.value.trim()) {
    return '等待输入左右内容'
  }

  if (diffResult.value.identical) {
    return '两侧内容完全一致'
  }

  return '已计算行级差异'
})

function applyTemplate(template: DiffTemplate) {
  leftInput.value = template.left
  rightInput.value = template.right
}

function clearAll() {
  leftInput.value = ''
  rightInput.value = ''
}

async function copyValue(value: string, label: string) {
  const success = await copyToClipboard(value)
  copiedMessage.value = success ? `${label}已复制` : '当前环境不支持复制'

  window.setTimeout(() => {
    copiedMessage.value = ''
  }, 1600)
}

watch(leftInput, (value) => {
  writeStorage(storageLeftDomain, value)
})

watch(rightInput, (value) => {
  writeStorage(storageRightDomain, value)
})
</script>

<template>
  <section class="tool-page tool-page-diff">
    <div class="tool-page-layout wide-layout">
      <section class="editor-pane">
        <div class="pane-header">
          <div>
            <h2 class="pane-title">原始版本</h2>
            <p class="meta-hint">左边放旧内容、线上配置或改动前的文本。</p>
          </div>
          <span class="workspace-chip">{{ diffResult.stats.removed }} 删除</span>
        </div>

        <div class="input-toolbar">
          <button
            v-for="template in diffTemplates"
            :key="template.label"
            type="button"
            class="ghost-button small-button"
            @click="applyTemplate(template)"
          >
            {{ template.label }}
          </button>
          <button type="button" class="ghost-button small-button" @click="clearAll">清空</button>
          <button type="button" class="ghost-button small-button" @click="copyValue(leftInput, '左侧内容')">
            复制左侧
          </button>
        </div>

        <section class="http-panel">
          <div class="result-panel-header">
            <span class="result-panel-title">模板说明</span>
            <span class="meta-hint">快速覆盖配置、响应体和文档三类高频比较场景。</span>
          </div>

          <div class="jwt-template-list">
            <button
              v-for="template in diffTemplates"
              :key="template.label"
              type="button"
              class="http-template-card"
              @click="applyTemplate(template)"
            >
              <div class="http-template-top">
                <span class="http-template-method">DIFF</span>
                <span class="http-template-action">使用模板</span>
              </div>
              <strong class="http-template-title">{{ template.label }}</strong>
              <p class="http-template-summary">{{ template.summary }}</p>
            </button>
          </div>
        </section>

        <label class="field-row">
          <span class="field-label">原始内容</span>
          <textarea
            v-model="leftInput"
            class="text-area text-area-full diff-textarea"
            spellcheck="false"
            placeholder="粘贴旧版本内容"
          />
        </label>
      </section>

      <section class="viewer-pane">
        <div class="pane-header">
          <div>
            <h2 class="pane-title">新版本与差异</h2>
            <p class="meta-hint">{{ diffStatus }}</p>
          </div>
          <span class="workspace-chip">{{ diffResult.stats.added }} 新增 · {{ diffResult.stats.unchanged }} 相同</span>
        </div>

        <div class="input-toolbar">
          <button type="button" class="ghost-button small-button" @click="copyValue(rightInput, '右侧内容')">
            复制右侧
          </button>
        </div>

        <label class="field-row">
          <span class="field-label">新内容</span>
          <textarea
            v-model="rightInput"
            class="text-area text-area-full diff-textarea"
            spellcheck="false"
            placeholder="粘贴新版本内容"
          />
        </label>

        <section class="http-panel">
          <div class="result-panel-header">
            <span class="result-panel-title">差异统计</span>
            <span class="meta-hint">先看改动量，再决定要不要继续逐行排查。</span>
          </div>

          <div class="data-list">
            <article class="data-row">
              <div>
                <span class="result-label">新增</span>
                <strong class="result-value">{{ diffResult.stats.added }}</strong>
              </div>
              <div>
                <span class="result-label">删除</span>
                <strong class="result-value">{{ diffResult.stats.removed }}</strong>
              </div>
            </article>

            <article class="data-row">
              <div>
                <span class="result-label">未变化</span>
                <strong class="result-value">{{ diffResult.stats.unchanged }}</strong>
              </div>
              <div>
                <span class="result-label">状态</span>
                <strong class="result-value">{{ diffResult.identical ? '一致' : '存在差异' }}</strong>
              </div>
            </article>
          </div>
        </section>

        <section class="http-panel diff-result-panel">
          <div class="result-panel-header">
            <span class="result-panel-title">逐行差异</span>
            <span class="meta-hint">新增行看右侧，删除行看左侧，相同行双侧对照。</span>
          </div>

          <div v-if="diffResult.rows.length" class="diff-grid">
            <article
              v-for="(row, index) in diffResult.rows"
              :key="`${row.type}-${index}`"
              class="diff-row"
              :data-type="row.type"
            >
              <div class="diff-cell">
                <span class="diff-line-number">{{ row.leftLineNumber ?? '—' }}</span>
                <code class="diff-code">{{ row.leftText || ' ' }}</code>
              </div>
              <div class="diff-cell">
                <span class="diff-line-number">{{ row.rightLineNumber ?? '—' }}</span>
                <code class="diff-code">{{ row.rightText || ' ' }}</code>
              </div>
            </article>
          </div>
          <div v-else class="empty-panel">
            <p>输入内容后，这里会显示逐行对比结果。</p>
          </div>
        </section>
      </section>
    </div>

    <p v-if="copiedMessage" class="clipboard-toast">{{ copiedMessage }}</p>
  </section>
</template>
