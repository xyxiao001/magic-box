<script setup lang="ts">
import { computed, ref } from 'vue'
import { copyToClipboard } from '@/lib/clipboard'
import { analyzeRegex } from '@/lib/regex'
import { useWorkbenchStore } from '@/stores/workbench'

const workbenchStore = useWorkbenchStore()

const pattern = ref('(?<name>[a-z]+)=(\\d+)')
const flags = ref('g')
const replacement = ref('$<name>: $2')
const testText = ref(`count=42
user=7
level=3`)
const copiedMessage = ref('')

const regexExamples = [
  {
    label: '键值对',
    pattern: '(?<name>[a-z]+)=(\\d+)',
    flags: 'g',
    replacement: '$<name>: $2',
    testText: `count=42
user=7
level=3`,
  },
  {
    label: '日期提取',
    pattern: '(\\d{4})-(\\d{2})-(\\d{2})',
    flags: 'g',
    replacement: '$3/$2/$1',
    testText: '2026-04-08\n2025-12-01',
  },
  {
    label: '邮箱域名',
    pattern: '[\\w.+-]+@([\\w.-]+)',
    flags: 'g',
    replacement: '$1',
    testText: 'hello@example.com\nops@magic-box.dev',
  },
]

const analysis = computed(() =>
  analyzeRegex(pattern.value, flags.value, testText.value, replacement.value)
)

async function copyValue(value: string, label: string) {
  const success = await copyToClipboard(value)
  copiedMessage.value = success ? `${label} 已复制` : '当前环境不支持复制'

  window.setTimeout(() => {
    copiedMessage.value = ''
  }, 1600)
}

function applyExample(example: (typeof regexExamples)[number]) {
  pattern.value = example.pattern
  flags.value = example.flags
  replacement.value = example.replacement
  testText.value = example.testText
}
</script>

<template>
  <section class="tool-page tool-page-regex">
    <header class="tool-page-header">
      <div>
        <div class="pill-row">
          <span class="section-badge">正则</span>
          <span class="status-badge">Regex Workbench</span>
        </div>
        <h1 class="tool-page-title">正则表达式工作台</h1>
        <p class="tool-page-description">
          输入表达式、flags 和测试文本，实时查看命中、捕获组和替换预览。
        </p>
      </div>

      <button
        type="button"
        class="ghost-button"
        @click="workbenchStore.toggleFavoriteModule('regex-workbench')"
      >
        {{
          workbenchStore.favoriteModuleIds.includes('regex-workbench')
            ? '取消收藏'
            : '收藏工具'
        }}
      </button>
    </header>

    <div class="tool-page-layout">
      <section class="editor-pane">
        <div class="pane-header">
          <h2 class="pane-title">输入区</h2>
          <p class="meta-hint">更像开发中的正则调试台，而不是单纯的在线示例页。</p>
        </div>

        <div class="regex-field-grid">
          <label class="field-row">
            <span class="field-label">Pattern</span>
            <input
              v-model="pattern"
              class="text-input"
              type="text"
              placeholder="例如 (?<name>[a-z]+)=(\\d+)"
            />
          </label>

          <label class="field-row regex-flags-field">
            <span class="field-label">Flags</span>
            <input
              v-model="flags"
              class="text-input"
              type="text"
              placeholder="gim"
            />
          </label>
        </div>

        <label class="field-row">
          <span class="field-label">Replacement</span>
          <input
            v-model="replacement"
            class="text-input"
            type="text"
            placeholder="$1 / $<name>"
          />
        </label>

        <label class="field-row">
          <span class="field-label">Test Text</span>
          <textarea
            v-model="testText"
            class="text-area text-area-full"
            spellcheck="false"
            placeholder="输入测试文本"
          />
        </label>

        <div class="example-strip">
          <button
            v-for="example in regexExamples"
            :key="example.label"
            type="button"
            class="example-chip"
            @click="applyExample(example)"
          >
            {{ example.label }}
          </button>
        </div>
      </section>

      <section class="viewer-pane">
        <div class="pane-header">
          <h2 class="pane-title">结果区</h2>
          <p
            class="helper-text"
            :class="{ 'helper-text-danger': !analysis.ok }"
          >
            {{
              analysis.ok
                ? `命中 ${analysis.matchCount} 项`
                : analysis.error
            }}
          </p>
        </div>

        <section class="regex-result-panel">
          <div class="result-panel-header">
            <span class="result-panel-title">替换预览</span>
            <button
              type="button"
              class="ghost-button small-button"
              :disabled="!analysis.ok || !analysis.replacementPreview"
              @click="
                analysis.ok &&
                analysis.replacementPreview &&
                copyValue(analysis.replacementPreview, '替换预览')
              "
            >
              复制
            </button>
          </div>

          <pre class="regex-preview">{{ analysis.ok ? analysis.replacementPreview : '' }}</pre>
        </section>

        <section class="regex-result-panel">
          <div class="result-panel-header">
            <span class="result-panel-title">命中列表</span>
          </div>

          <div v-if="analysis.ok && analysis.matches?.length" class="regex-match-list">
            <article
              v-for="(match, matchIndex) in analysis.matches"
              :key="`${match.index}-${matchIndex}`"
              class="regex-match-card"
            >
              <div class="regex-match-top">
                <strong>#{{ matchIndex + 1 }}</strong>
                <span class="regex-match-index">index {{ match.index }}</span>
              </div>
              <code class="regex-hit">{{ match.value }}</code>

              <div v-if="match.groups.length" class="regex-groups">
                <span
                  v-for="group in match.groups"
                  :key="group.index"
                  class="regex-group-chip"
                >
                  ${{ group.index }}: {{ group.value || '∅' }}
                </span>
              </div>

              <div
                v-if="Object.keys(match.namedGroups).length"
                class="regex-groups"
              >
                <span
                  v-for="(value, key) in match.namedGroups"
                  :key="key"
                  class="regex-group-chip regex-group-chip-named"
                >
                  {{ key }}: {{ value || '∅' }}
                </span>
              </div>
            </article>
          </div>

          <div v-else-if="analysis.ok" class="empty-panel">
            <p>当前没有命中结果，可以试试示例或调整 flags。</p>
          </div>
        </section>
      </section>
    </div>

    <p v-if="copiedMessage" class="clipboard-toast">{{ copiedMessage }}</p>
  </section>
</template>
