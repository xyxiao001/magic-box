<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import ResultCard from '@/components/toolkit/ResultCard.vue'
import ToolActionBar from '@/components/toolkit/ToolActionBar.vue'
import ToolPageLayout from '@/components/toolkit/ToolPageLayout.vue'
import ToolPanel from '@/components/toolkit/ToolPanel.vue'
import { compareTargetHash, hashFile, hashText, type HashResultRow } from '@/lib/hash-tool'
import { readStorage, writeStorage } from '@/lib/storage'

type InputMode = 'text' | 'file'

const storageKey = 'magic-box.hash-studio.text'
const storageDomain = 'tool-history:hash-studio:text'
const fileInput = ref<HTMLInputElement | null>(null)
const inputMode = ref<InputMode>('text')
const textInput = ref(
  readStorage(storageDomain, 'magic-box', {
    legacyKeys: [storageKey],
    parseLegacy: (raw) => raw,
  })
)
const targetHash = ref('')
const fileMeta = ref<{ name: string; type: string; size: string } | null>(null)
const rows = ref<HashResultRow[]>([])
const statusMessage = ref('输入文本或选择文件后，将在本地计算多种哈希值')
const statusTone = ref<'neutral' | 'success' | 'danger'>('neutral')
const isBusy = ref(false)
const copiedMessage = ref('')

const compareResult = computed(() => compareTargetHash(targetHash.value, rows.value))

function applyStatus(message: string, tone: 'neutral' | 'success' | 'danger') {
  statusMessage.value = message
  statusTone.value = tone
}

async function computeTextHashes() {
  isBusy.value = true

  try {
    rows.value = await hashText(textInput.value)
    fileMeta.value = null
    applyStatus('文本哈希已更新', 'success')
  } catch {
    rows.value = []
    applyStatus('文本哈希计算失败', 'danger')
  } finally {
    isBusy.value = false
  }
}

async function applyFile(file: File) {
  isBusy.value = true

  try {
    const result = await hashFile(file)
    rows.value = result.rows
    fileMeta.value = result.meta
    applyStatus(`已计算 ${file.name} 的哈希结果`, 'success')
  } catch {
    rows.value = []
    fileMeta.value = null
    applyStatus('文件哈希计算失败', 'danger')
  } finally {
    isBusy.value = false
  }
}

function openFilePicker() {
  fileInput.value?.click()
}

function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]

  if (file) {
    inputMode.value = 'file'
    void applyFile(file)
  }

  target.value = ''
}

function handleResultCopied(label: string, success: boolean) {
  copiedMessage.value = success ? `${label}已复制` : '当前环境不支持复制'

  window.setTimeout(() => {
    copiedMessage.value = ''
  }, 1600)
}

function switchToTextMode() {
  inputMode.value = 'text'
  fileMeta.value = null
  void computeTextHashes()
}

watch(textInput, () => {
  writeStorage(storageDomain, textInput.value)

  if (inputMode.value === 'text') {
    void computeTextHashes()
  }
})

void computeTextHashes()
</script>

<template>
  <ToolPageLayout>
    <template #editor>
      <ToolPanel title="输入源" subtitle="支持文本和单文件两种模式，全部在浏览器本地计算。" :badge="inputMode === 'text' ? '文本模式' : '文件模式'">
        <ToolActionBar>
          <button
            type="button"
            class="ghost-button small-button"
            :aria-pressed="inputMode === 'text'"
            @click="switchToTextMode"
          >
            文本模式
          </button>
          <button
            type="button"
            class="ghost-button small-button"
            :aria-pressed="inputMode === 'file'"
            @click="openFilePicker"
          >
            文件模式
          </button>
        </ToolActionBar>

        <label class="field-row">
          <span class="field-label">文本输入</span>
          <textarea
            v-model="textInput"
            class="text-area text-area-full"
            spellcheck="false"
            :disabled="inputMode !== 'text'"
            placeholder="输入任意文本后，即可计算 MD5 / SHA-1 / SHA-256 / SHA-512"
          />
        </label>

        <ToolPanel title="文件输入" subtitle="适合校验下载文件、构建产物和压缩包是否一致。">
          <div class="image-dropzone">
            <strong>{{ fileMeta ? fileMeta.name : '选择一个文件进行哈希计算' }}</strong>
            <p>{{ fileMeta ? `${fileMeta.type} · ${fileMeta.size}` : '不会上传文件，只在本地读取和计算。' }}</p>
            <div class="input-toolbar">
              <button type="button" class="solid-button" @click="openFilePicker">选择文件</button>
              <button type="button" class="ghost-button" @click="switchToTextMode">回到文本模式</button>
            </div>
            <input ref="fileInput" class="image-file-input" type="file" @change="handleFileChange" />
          </div>
        </ToolPanel>

        <label class="field-row">
          <span class="field-label">目标 Hash</span>
          <input
            v-model="targetHash"
            class="text-input"
            type="text"
            placeholder="粘贴目标 hash 后自动比对"
          />
        </label>

        <p
          class="helper-text"
          :class="{
            'helper-text-success': statusTone === 'success',
            'helper-text-danger': statusTone === 'danger',
          }"
        >
          {{ isBusy ? '计算中...' : statusMessage }}
        </p>
      </ToolPanel>
    </template>

    <template #viewer>
      <ToolPanel title="哈希结果" subtitle="先看算法和值，再用目标 hash 快速判断是否一致。">
        <ToolPanel title="比对状态" subtitle="大小写不敏感，直接对比完整值。">
          <div class="data-list">
            <article class="data-row">
              <div>
                <span class="result-label">目标值</span>
                <strong class="result-value">{{ compareResult.normalizedTarget || '—' }}</strong>
              </div>
            </article>

            <article class="data-row">
              <div>
                <span class="result-label">匹配结果</span>
                <strong class="result-value">
                  {{
                    compareResult.normalizedTarget
                      ? compareResult.matched
                        ? `匹配 ${compareResult.matchedAlgorithm}`
                        : '未匹配'
                      : '等待输入目标 hash'
                  }}
                </strong>
              </div>
            </article>
          </div>
        </ToolPanel>

        <ToolPanel title="算法结果" subtitle="每项都可单独复制，长度字段方便快速判断类型。">
          <div v-if="rows.length" class="hash-result-list">
            <ResultCard
              v-for="row in rows"
              :key="row.algorithm"
              :title="row.algorithm"
              :copy-value="row.value"
              :copy-label="`复制 ${row.algorithm}`"
              @copied="(success) => handleResultCopied(row.algorithm, success)"
            >
              <div class="data-list">
                <article class="data-row">
                  <div>
                    <span class="result-label">长度</span>
                    <strong class="result-value">{{ row.length }}</strong>
                  </div>
                </article>
              </div>
              <code class="package-command-code hash-code">{{ row.value }}</code>
            </ResultCard>
          </div>
          <div v-else class="empty-panel">
            <p>输入文本或选择文件后，这里会显示结果。</p>
          </div>
        </ToolPanel>
      </ToolPanel>
    </template>
  </ToolPageLayout>

  <section>
    <p v-if="copiedMessage" class="clipboard-toast">{{ copiedMessage }}</p>
  </section>
</template>
