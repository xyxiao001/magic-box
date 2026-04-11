<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { copyToClipboard } from '@/lib/clipboard'
import {
  generateTypeScriptFromJson,
  generateZodFromJson,
  parseJsonInput,
  type JsonTypegenConfig,
  type TsStyle,
} from '@/lib/json-typegen'
import { readStorage, writeStorage } from '@/lib/storage'

type OutputTab = 'typescript' | 'zod'

const inputKey = 'magic-box.json-typegen.input'
const stateKey = 'magic-box.json-typegen.state'
const inputDomain = 'tool-history:json-typegen:input'
const stateDomain = 'tool-history:json-typegen:state'

function parseSavedState(raw: string) {
  try {
    return JSON.parse(raw) as Partial<JsonTypegenConfig & { tab: OutputTab }>
  } catch {
    return undefined
  }
}

const jsonInput = ref(
  readStorage(inputDomain, '{\n  "id": 1,\n  "name": "Magic Box"\n}', {
    legacyKeys: [inputKey],
    parseLegacy: (raw) => raw,
  })
)
const saved = readStorage<Partial<JsonTypegenConfig & { tab: OutputTab }>>(stateDomain, {}, {
  legacyKeys: [stateKey],
  parseLegacy: (raw) => parseSavedState(raw),
})

const config = ref<JsonTypegenConfig>({
  rootName: saved.rootName || 'Root',
  tsStyle: (saved.tsStyle as TsStyle) || 'interface',
  zodStrict: Boolean(saved.zodStrict),
  nullAsOptional: Boolean(saved.nullAsOptional),
})
const activeTab = ref<OutputTab>(saved.tab || 'typescript')
const toastMessage = ref('')

const parsed = computed(() => parseJsonInput(jsonInput.value))
const outputTs = computed(() => (parsed.value.ok ? generateTypeScriptFromJson(parsed.value.value, config.value) : ''))
const outputZod = computed(() => (parsed.value.ok ? generateZodFromJson(parsed.value.value, config.value) : ''))

async function copyValue(value: string, label: string) {
  const success = await copyToClipboard(value)
  toastMessage.value = success ? `${label}已复制` : '当前环境不支持复制'
  window.setTimeout(() => {
    toastMessage.value = ''
  }, 1600)
}

watch(jsonInput, (value) => {
  writeStorage(inputDomain, value)
})

watch(
  [config, activeTab],
  () => {
    writeStorage(stateDomain, {
      ...config.value,
      tab: activeTab.value,
    })
  },
  { deep: true }
)
</script>

<template>
  <section class="tool-page tool-page-typegen">
    <div class="tool-page-layout wide-layout">
      <section class="editor-pane">
        <div class="pane-header">
          <div>
            <h2 class="pane-title">JSON 输入</h2>
            <p class="meta-hint">输入 JSON 后自动推断 TypeScript 类型与 Zod schema。</p>
          </div>
          <span class="workspace-chip">{{ parsed.ok ? '已解析' : '错误' }}</span>
        </div>

        <label class="field-row">
          <span class="field-label">JSON</span>
          <textarea v-model="jsonInput" class="text-area text-area-full" spellcheck="false" />
        </label>

        <p class="helper-text" :class="{ 'helper-text-danger': !parsed.ok }">
          {{ parsed.ok ? '已解析，可在右侧切换输出并复制。' : parsed.error }}
        </p>

        <section class="http-panel">
          <div class="result-panel-header">
            <span class="result-panel-title">生成配置</span>
            <span class="meta-hint">首版仅提供少量开关，避免生成结果过于复杂。</span>
          </div>

          <div class="inline-fields">
            <label class="field-row">
              <span class="field-label">根类型名</span>
              <input v-model="config.rootName" class="text-input" type="text" />
            </label>
            <label class="field-row">
              <span class="field-label">TS 风格</span>
              <select v-model="config.tsStyle" class="select-input">
                <option value="interface">interface</option>
                <option value="type">type</option>
              </select>
            </label>
          </div>

          <div class="inline-fields">
            <label class="field-row">
              <span class="field-label">Zod strict</span>
              <select v-model="config.zodStrict" class="select-input">
                <option :value="false">关闭</option>
                <option :value="true">开启</option>
              </select>
            </label>
            <label class="field-row">
              <span class="field-label">null 视为可选</span>
              <select v-model="config.nullAsOptional" class="select-input">
                <option :value="false">否</option>
                <option :value="true">是</option>
              </select>
            </label>
          </div>
        </section>
      </section>

      <section class="viewer-pane">
        <div class="pane-header">
          <div>
            <h2 class="pane-title">输出</h2>
            <p class="meta-hint">生成结果为代码片段，可直接复制到项目中。</p>
          </div>
        </div>

        <div class="tab-row">
          <button
            type="button"
            class="tab-button"
            :data-active="activeTab === 'typescript'"
            @click="activeTab = 'typescript'"
          >
            TypeScript
          </button>
          <button type="button" class="tab-button" :data-active="activeTab === 'zod'" @click="activeTab = 'zod'">
            Zod
          </button>
          <button
            type="button"
            class="ghost-button small-button"
            :disabled="!parsed.ok"
            @click="copyValue(activeTab === 'typescript' ? outputTs : outputZod, activeTab === 'typescript' ? 'TypeScript' : 'Zod')"
          >
            复制
          </button>
        </div>

        <textarea
          :value="activeTab === 'typescript' ? outputTs : outputZod"
          class="text-area text-area-full"
          readonly
          placeholder="输入 JSON 后，这里会生成代码"
        />
      </section>
    </div>

    <p v-if="toastMessage" class="clipboard-toast">{{ toastMessage }}</p>
  </section>
</template>
