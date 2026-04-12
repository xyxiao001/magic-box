<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import ToolActionBar from '@/components/toolkit/ToolActionBar.vue'
import ToolPaneShell from '@/components/toolkit/ToolPaneShell.vue'
import ToolPanel from '@/components/toolkit/ToolPanel.vue'
import { copyToClipboard } from '@/lib/clipboard'
import { readStorage } from '@/lib/storage'
import { useMessage } from '@/shared/composables/useMessage'
import { useToolDownload } from '@/tool-runtime/composables/useToolDownload'
import { useToolDraft } from '@/tool-runtime/composables/useToolDraft'
import { useToolExecution } from '@/tool-runtime/composables/useToolExecution'
import { useToolHistory } from '@/tool-runtime/composables/useToolHistory'
import { useToolSamples } from '@/tool-runtime/composables/useToolSamples'
import { useToolShare } from '@/tool-runtime/composables/useToolShare'
import { useToolState } from '@/tool-runtime/composables/useToolState'
import ToolHistoryPanel from '@/tool-runtime/scaffolds/ToolHistoryPanel.vue'
import ToolSamplePanel from '@/tool-runtime/scaffolds/ToolSamplePanel.vue'
import ToolScaffold from '@/tool-runtime/scaffolds/ToolScaffold.vue'
import type { ToolHistoryEntry } from '@/tool-runtime/services/tool-history-service'
import {
  buildHeaderCookieLabDownloadPayload,
  buildHeaderCookieLabHistoryLabel,
  createHeaderCookieLabInitialInput,
  headerCookieLabRuntimeModule,
  type HeaderCookieLabInput,
  type HeaderCookieLabMode,
  type HeaderCookieLabOutput,
} from './module'

const primaryKey = 'magic-box.header-cookie.primary'
const secondaryKey = 'magic-box.header-cookie.secondary'
const modeKey = 'magic-box.header-cookie.mode'
const primaryDomain = 'tool-history:header-cookie-lab:primary'
const secondaryDomain = 'tool-history:header-cookie-lab:secondary'
const modeDomain = 'tool-history:header-cookie-lab:mode'

function parseMode(raw: string): HeaderCookieLabMode | undefined {
  if (raw === 'headers' || raw === 'cookie' || raw === 'set-cookie') {
    return raw
  }
}

const legacyPrimary = readStorage(primaryDomain, createHeaderCookieLabInitialInput().primaryText, {
  legacyKeys: [primaryKey],
  parseLegacy: (raw) => raw,
})
const legacySecondary = readStorage(secondaryDomain, '', {
  legacyKeys: [secondaryKey],
  parseLegacy: (raw) => raw,
})
const legacyMode = readStorage<HeaderCookieLabMode>(modeDomain, 'headers', {
  legacyKeys: [modeKey],
  parseLegacy: (raw) => parseMode(raw),
})

const state = useToolState<HeaderCookieLabInput, HeaderCookieLabOutput>(headerCookieLabRuntimeModule)
const draft = useToolDraft(headerCookieLabRuntimeModule, state)
const history = useToolHistory(headerCookieLabRuntimeModule, state, {
  buildEntryMeta: (input, output) => ({
    label: buildHeaderCookieLabHistoryLabel(input, output),
    description: output?.exportText.split('\n')[0] || '最近一次结构化结果',
  }),
})
const { run } = useToolExecution(headerCookieLabRuntimeModule, state)
const samples = useToolSamples(headerCookieLabRuntimeModule, state)
const download = useToolDownload(headerCookieLabRuntimeModule, state, {
  buildPayload: (input, output) => buildHeaderCookieLabDownloadPayload(input, output),
})
const share = useToolShare(headerCookieLabRuntimeModule, state, {
  onRestored: () => {
    void run()
  },
})
const { success: showSuccessMessage, error: showErrorMessage } = useMessage()

const defaultInput = createHeaderCookieLabInitialInput()
if (
  state.input.value.mode === defaultInput.mode &&
  state.input.value.primaryText === defaultInput.primaryText &&
  state.input.value.secondaryText === defaultInput.secondaryText &&
  state.input.value.dedupeMode === defaultInput.dedupeMode
) {
  state.input.value = {
    ...state.input.value,
    mode: legacyMode,
    primaryText: legacyPrimary,
    secondaryText: legacySecondary,
  }
}

const restoredSharedState = share.restoreSharedState()

const output = computed(() => state.output.value)
const exportText = computed(() => output.value?.exportText ?? '')
const modeLabel = computed(() => {
  if (state.input.value.mode === 'headers') {
    return 'headers'
  }

  if (state.input.value.mode === 'cookie') {
    return 'cookie'
  }

  return 'set-cookie'
})

watch(
  state.input,
  () => {
    void run()
  },
  { deep: true }
)

async function copyValue(value: string, label: string) {
  const success = await copyToClipboard(value)

  if (success) {
    showSuccessMessage(`${label}已复制`)
    return
  }

  showErrorMessage('当前环境不支持复制')
}

function saveSnapshot() {
  if (!state.output.value) {
    return
  }

  history.recordHistory(state.input.value, state.output.value)
  showSuccessMessage('已保存到历史记录')
}

function clearAll() {
  draft.clearDraft()
  state.input.value = {
    ...createHeaderCookieLabInitialInput(),
    primaryText: '',
    secondaryText: '',
  }
  state.output.value = null
  state.error.value = null
}

function applySampleById(sampleId: string) {
  const sample = samples.samples.value.find((item) => item.id === sampleId)

  if (!sample) {
    return
  }

  samples.applySample(sample)
  void run()
}

onMounted(() => {
  if (!restoredSharedState) {
    void run()
  }
})
</script>

<template>
  <ToolScaffold :meta="headerCookieLabRuntimeModule.meta" :loading="state.loading.value" :error="state.error.value" wide>
    <template #actions>
      <ToolActionBar>
        <button type="button" class="solid-button" :aria-pressed="state.input.value.mode === 'headers'" @click="state.input.value.mode = 'headers'">
          Header
        </button>
        <button type="button" class="ghost-button" :aria-pressed="state.input.value.mode === 'cookie'" @click="state.input.value.mode = 'cookie'">
          Cookie
        </button>
        <button type="button" class="ghost-button" :aria-pressed="state.input.value.mode === 'set-cookie'" @click="state.input.value.mode = 'set-cookie'">
          Set-Cookie
        </button>
        <button type="button" class="ghost-button" :disabled="!exportText" @click="copyValue(exportText, '导出内容')">复制导出</button>
        <button type="button" class="ghost-button" :disabled="!download.canDownload.value" @click="download.download">下载导出</button>
        <button type="button" class="ghost-button" :disabled="!share.canShare.value" @click="share.copyShareUrl">复制分享链接</button>
        <button type="button" class="ghost-button" :disabled="!state.output.value" @click="saveSnapshot">保存快照</button>
        <button type="button" class="ghost-button" @click="clearAll">清空</button>
      </ToolActionBar>
    </template>

    <template #input>
      <ToolPaneShell title="输入" subtitle="支持解析 Header、Cookie 和 Set-Cookie，并导出结构化结果。" :badge="modeLabel">
        <label class="field-row">
          <span class="field-label">主输入</span>
          <textarea
            v-model="state.input.value.primaryText"
            class="text-area text-area-full"
            spellcheck="false"
            placeholder="粘贴原始 header/cookie 文本"
          />
        </label>

        <ToolSamplePanel
          v-if="samples.sampleEnabled && samples.samples.value.length"
          :samples="samples.samples.value"
          @apply="applySampleById"
        />

        <label v-if="state.input.value.mode === 'headers'" class="field-row">
          <span class="field-label">合并输入</span>
          <textarea
            v-model="state.input.value.secondaryText"
            class="text-area text-area-compact"
            spellcheck="false"
            placeholder="可选：粘贴第二段 header，用于合并/去重"
          />
        </label>

        <ToolPanel v-if="state.input.value.mode === 'headers'" title="去重策略" subtitle="某些 header 允许重复，默认保留最后一次出现。">
          <div class="inline-fields">
            <label class="field-row">
              <span class="field-label">策略</span>
              <select v-model="state.input.value.dedupeMode" class="select-input">
                <option value="keep-last">保留最后</option>
                <option value="keep-first">保留最先</option>
              </select>
            </label>
            <article class="data-row">
              <div>
                <span class="result-label">合并后数量</span>
                <strong class="result-value">{{ output?.mergedHeaders.length ?? 0 }}</strong>
              </div>
              <div>
                <span class="result-label">去重后数量</span>
                <strong class="result-value">{{ output?.dedupedHeaders.length ?? 0 }}</strong>
              </div>
            </article>
          </div>
        </ToolPanel>
      </ToolPaneShell>
    </template>

    <template #history>
      <ToolHistoryPanel
        v-if="history.historyEnabled"
        :entries="history.entries.value"
        empty-text="保存一次快照后，这里会记录最近的 Header / Cookie 处理结果。"
        @restore="(entry) => history.restoreEntry(entry as ToolHistoryEntry<HeaderCookieLabInput, HeaderCookieLabOutput>)"
        @remove="history.removeEntry"
        @clear="history.clearHistoryEntries"
      />
    </template>

    <template #output>
      <ToolPaneShell title="结构化视图" subtitle="解析结果仅做常见格式支持，边界输入会尽力解析并保持可读。">
        <ToolPanel v-if="state.input.value.mode === 'headers'" title="Headers">
          <div v-if="output?.dedupedHeaders.length" class="data-list">
            <article v-for="entry in output.dedupedHeaders" :key="entry.id" class="data-row">
              <div>
                <span class="result-label">{{ entry.key }}</span>
                <strong class="result-value">{{ entry.value }}</strong>
              </div>
            </article>
          </div>
          <div v-else class="empty-panel">
            <p>输入 header 后，这里会显示结构化结果。</p>
          </div>
        </ToolPanel>

        <ToolPanel v-else-if="state.input.value.mode === 'cookie'" title="Cookie">
          <div v-if="output?.cookieEntries.length" class="data-list">
            <article v-for="entry in output.cookieEntries" :key="entry.id" class="data-row">
              <div>
                <span class="result-label">{{ entry.name }}</span>
                <strong class="result-value">{{ entry.value }}</strong>
              </div>
            </article>
          </div>
          <div v-else class="empty-panel">
            <p>输入 Cookie header 后，这里会显示键值列表。</p>
          </div>
        </ToolPanel>

        <ToolPanel v-else title="Set-Cookie">
          <div v-if="output?.setCookieEntries.length" class="data-list">
            <article v-for="entry in output.setCookieEntries" :key="entry.id" class="data-row">
              <div>
                <span class="result-label">{{ entry.name }}</span>
                <strong class="result-value">{{ entry.value }}</strong>
                <span class="meta-hint">{{ Object.keys(entry.attributes).join(', ') || '无属性' }}</span>
              </div>
            </article>
          </div>
          <div v-else class="empty-panel">
            <p>输入 Set-Cookie 后，这里会显示结构化结果。</p>
          </div>
        </ToolPanel>

        <ToolPanel title="导出结果" :subtitle="state.input.value.mode === 'set-cookie' ? '导出为结构化 JSON' : '导出为可直接复用的文本格式'">
          <textarea :value="exportText" class="text-area text-area-full header-cookie-output" readonly />
        </ToolPanel>
      </ToolPaneShell>
    </template>
  </ToolScaffold>
</template>

<style scoped>
.header-cookie-output {
  min-height: 18rem;
}

@media (min-width: 1200px) {
  .header-cookie-output {
    min-height: 22rem;
  }
}
</style>
