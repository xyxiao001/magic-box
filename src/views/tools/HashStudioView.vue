<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { copyToClipboard } from '@/lib/clipboard'
import { compareTargetHash, hashFile, hashText, type HashResultRow } from '@/lib/hash-tool'

type InputMode = 'text' | 'file'

const storageKey = 'magic-box.hash-studio.text'
const fileInput = ref<HTMLInputElement | null>(null)
const inputMode = ref<InputMode>('text')
const textInput = ref(localStorage.getItem(storageKey) || 'magic-box')
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

async function copyValue(value: string, label: string) {
  const success = await copyToClipboard(value)
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
  localStorage.setItem(storageKey, textInput.value)

  if (inputMode.value === 'text') {
    void computeTextHashes()
  }
})

void computeTextHashes()
</script>

<template>
  <section class="tool-page tool-page-hash">
    <div class="tool-page-layout">
      <section class="editor-pane">
        <div class="pane-header">
          <div>
            <h2 class="pane-title">输入源</h2>
            <p class="meta-hint">支持文本和单文件两种模式，全部在浏览器本地计算。</p>
          </div>
          <span class="workspace-chip">{{ inputMode === 'text' ? '文本模式' : '文件模式' }}</span>
        </div>

        <div class="input-toolbar">
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
        </div>

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

        <section class="http-panel">
          <div class="result-panel-header">
            <span class="result-panel-title">文件输入</span>
            <span class="meta-hint">适合校验下载文件、构建产物和压缩包是否一致。</span>
          </div>

          <div class="image-dropzone">
            <strong>{{ fileMeta ? fileMeta.name : '选择一个文件进行哈希计算' }}</strong>
            <p>{{ fileMeta ? `${fileMeta.type} · ${fileMeta.size}` : '不会上传文件，只在本地读取和计算。' }}</p>
            <div class="input-toolbar">
              <button type="button" class="solid-button" @click="openFilePicker">选择文件</button>
              <button type="button" class="ghost-button" @click="switchToTextMode">回到文本模式</button>
            </div>
            <input ref="fileInput" class="image-file-input" type="file" @change="handleFileChange" />
          </div>
        </section>

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
      </section>

      <section class="viewer-pane">
        <div class="pane-header">
          <div>
            <h2 class="pane-title">哈希结果</h2>
            <p class="meta-hint">先看算法和值，再用目标 hash 快速判断是否一致。</p>
          </div>
        </div>

        <section class="http-panel">
          <div class="result-panel-header">
            <span class="result-panel-title">比对状态</span>
            <span class="meta-hint">大小写不敏感，直接对比完整值。</span>
          </div>

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
        </section>

        <section class="http-panel">
          <div class="result-panel-header">
            <span class="result-panel-title">算法结果</span>
            <span class="meta-hint">每项都可单独复制，长度字段方便快速判断类型。</span>
          </div>

          <div v-if="rows.length" class="hash-result-list">
            <article v-for="row in rows" :key="row.algorithm" class="hash-result-card">
              <div class="result-panel-header">
                <span class="result-panel-title">{{ row.algorithm }}</span>
                <button type="button" class="ghost-button small-button" @click="copyValue(row.value, row.algorithm)">
                  复制
                </button>
              </div>
              <div class="data-list">
                <article class="data-row">
                  <div>
                    <span class="result-label">长度</span>
                    <strong class="result-value">{{ row.length }}</strong>
                  </div>
                </article>
              </div>
              <code class="package-command-code hash-code">{{ row.value }}</code>
            </article>
          </div>
          <div v-else class="empty-panel">
            <p>输入文本或选择文件后，这里会显示结果。</p>
          </div>
        </section>
      </section>
    </div>

    <p v-if="copiedMessage" class="clipboard-toast">{{ copiedMessage }}</p>
  </section>
</template>
