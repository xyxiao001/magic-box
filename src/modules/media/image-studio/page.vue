<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import ToolActionBar from '@/components/toolkit/ToolActionBar.vue'
import ToolPaneShell from '@/components/toolkit/ToolPaneShell.vue'
import { useMessage } from '@/shared/composables/useMessage'
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
import ImageCropWorkspace from './ImageCropWorkspace.vue'
import {
  buildCropLayout,
  buildOutputFileName,
  calculateScaledDimensions,
  formatImageMeta,
  normalizeRotationDegrees,
  type ImageMeta,
  type OutputImageFormat,
} from './logic'
import {
  buildImageStudioHistoryLabel,
  imageStudioRuntimeModule,
  normalizeImageStudioInput,
  type ImageStudioInput,
  type ImageStudioOutput,
} from './module'

interface CropperPreviewPayload {
  w: number
  h: number
  url: string
  html: string
}

interface CropperExportPayload {
  blob: Blob
  width: number
  height: number
}

const configStorageKey = 'magic-box.image-studio.config'
const configStorageDomain = 'tool-history:image-studio:config'
const fileInput = ref<HTMLInputElement | null>(null)
const sourceName = ref('')
const sourceUrl = ref('')
const outputUrl = ref('')
const sourceMeta = ref<ImageMeta | null>(null)
const outputMeta = ref<ImageMeta | null>(null)
const livePreview = ref<CropperPreviewPayload | null>(null)
const statusMessage = ref('上传图片后即可进入可视化裁剪并导出结果')
const statusTone = ref<'neutral' | 'success' | 'danger'>('neutral')
const isDragging = ref(false)
const isCropperProcessing = ref(false)
const isFinalizing = ref(false)

let finalizeRequestId = 0

function parseSavedConfig(raw: string) {
  try {
    return normalizeImageStudioInput(JSON.parse(raw) as Partial<ImageStudioInput>)
  } catch {
    return undefined
  }
}

const state = useToolState<ImageStudioInput, ImageStudioOutput>(imageStudioRuntimeModule)
const draft = useToolDraft(imageStudioRuntimeModule, state, {
  legacyKeys: [configStorageDomain, configStorageKey],
  parseLegacy: (raw) => normalizeImageStudioInput(parseSavedConfig(raw)),
})
const history = useToolHistory(imageStudioRuntimeModule, state, {
  buildEntryMeta: (_, output) => ({
    label: output ? buildImageStudioHistoryLabel(output) : '图片配置',
    description: output ? `${output.formatLabel} · ${output.scaleLabel}` : '',
  }),
})
const { run } = useToolExecution(imageStudioRuntimeModule, state)
const samples = useToolSamples(imageStudioRuntimeModule, state)
const share = useToolShare(imageStudioRuntimeModule, state, {
  applySharedState: (sharedState) => {
    state.input.value = normalizeImageStudioInput(sharedState as Partial<ImageStudioInput>)
    state.error.value = null
  },
  onRestored: () => {
    void run()
  },
})
const { success: showSuccessMessage } = useMessage()

const restoredSharedState = share.restoreSharedState()
const output = computed(() => state.output.value)
const isProcessing = computed(() => isCropperProcessing.value || isFinalizing.value)
const cropLayout = computed(() => buildCropLayout(state.input.value.crop, sourceMeta.value))
const previewSizeLabel = computed(() => {
  if (livePreview.value) {
    return `${Math.round(livePreview.value.w)} × ${Math.round(livePreview.value.h)}`
  }

  return '—'
})
const normalizedRotation = computed(() => normalizeRotationDegrees(state.input.value.rotation))

function applyStatus(message: string, tone: 'neutral' | 'success' | 'danger') {
  statusMessage.value = message
  statusTone.value = tone
}

function revokeUrl(url: string) {
  if (url) {
    URL.revokeObjectURL(url)
  }
}

function openPicker() {
  fileInput.value?.click()
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('图片加载失败'))
    image.src = url
  })
}

function canvasToBlob(canvas: HTMLCanvasElement, type: OutputImageFormat, qualityValue?: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob)
        return
      }
      reject(new Error('图片导出失败'))
    }, type, qualityValue)
  })
}

async function resizeBlobToTarget(blob: Blob, width: number, height: number) {
  const { width: targetWidth, height: targetHeight } = calculateScaledDimensions(width, height, state.input.value.scale)
  const shouldFillBackground = state.input.value.format === 'image/jpeg' || state.input.value.background === 'fill'
  if (!shouldFillBackground && targetWidth === width && targetHeight === height) {
    return {
      blob,
      width,
      height,
    }
  }

  const blobUrl = URL.createObjectURL(blob)
  try {
    const image = await loadImage(blobUrl)
    const canvas = document.createElement('canvas')
    canvas.width = targetWidth
    canvas.height = targetHeight
    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error('当前环境不支持图片处理')
    }

    if (shouldFillBackground) {
      context.fillStyle = state.input.value.fillColor
      context.fillRect(0, 0, targetWidth, targetHeight)
    }

    context.drawImage(image, 0, 0, targetWidth, targetHeight)
    const scaledBlob = await canvasToBlob(
      canvas,
      state.input.value.format,
      state.input.value.format === 'image/png' ? undefined : state.input.value.quality / 100
    )

    return {
      blob: scaledBlob,
      width: targetWidth,
      height: targetHeight,
    }
  } finally {
    revokeUrl(blobUrl)
  }
}

function clearOutputState() {
  revokeUrl(outputUrl.value)
  outputUrl.value = ''
  outputMeta.value = null
}

async function finalizeCrop(payload: CropperExportPayload) {
  const requestId = ++finalizeRequestId
  isFinalizing.value = true

  try {
    const scaled = await resizeBlobToTarget(payload.blob, payload.width, payload.height)
    if (requestId !== finalizeRequestId) {
      return
    }

    revokeUrl(outputUrl.value)
    outputUrl.value = URL.createObjectURL(scaled.blob)
    outputMeta.value = formatImageMeta(scaled.width, scaled.height, scaled.blob.size, state.input.value.format)
  } catch (error) {
    if (requestId !== finalizeRequestId) {
      return
    }

    clearOutputState()
    applyStatus(error instanceof Error ? error.message : '图片处理失败', 'danger')
  } finally {
    if (requestId === finalizeRequestId) {
      isFinalizing.value = false
    }
  }
}

async function applyFile(file: File) {
  if (!file.type.startsWith('image/')) {
    applyStatus('请选择图片文件', 'danger')
    return
  }

  const nextUrl = URL.createObjectURL(file)
  try {
    const image = await loadImage(nextUrl)
    revokeUrl(sourceUrl.value)
    clearOutputState()
    sourceUrl.value = nextUrl
    sourceName.value = file.name
    sourceMeta.value = formatImageMeta(image.naturalWidth, image.naturalHeight, file.size, file.type)
    livePreview.value = null
    applyStatus('图片已加载，拖拽裁切框即可实时预览结果', 'neutral')
  } catch {
    revokeUrl(nextUrl)
    applyStatus('无法读取当前图片，请换一个文件试试', 'danger')
  }
}

function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    void applyFile(file)
  }
  target.value = ''
}

function handleDrop(event: DragEvent) {
  event.preventDefault()
  isDragging.value = false
  const file = event.dataTransfer?.files?.[0]
  if (file) {
    void applyFile(file)
  }
}

function handleWorkspacePreviewChange(payload: CropperPreviewPayload | null) {
  livePreview.value = payload
}

function handleWorkspaceProcessing(nextProcessing: boolean) {
  isCropperProcessing.value = nextProcessing
}

function handleWorkspaceLoaded() {
  applyStatus('裁剪工作区已就绪，可拖拽裁切框并使用上方按钮旋转图片', 'neutral')
}

function handleWorkspaceError(message: string) {
  applyStatus(message, 'danger')
}

function handleWorkspaceExported(payload: CropperExportPayload) {
  void finalizeCrop(payload)
}

function rotateLeft() {
  state.input.value.rotation = normalizeRotationDegrees(state.input.value.rotation - 90)
  applyStatus('已向左旋转 90°', 'neutral')
}

function rotateRight() {
  state.input.value.rotation = normalizeRotationDegrees(state.input.value.rotation + 90)
  applyStatus('已向右旋转 90°', 'neutral')
}

function resetRotation() {
  state.input.value.rotation = 0
  applyStatus('已恢复原始朝向', 'neutral')
}

function downloadOutput() {
  if (!outputUrl.value) {
    applyStatus('当前没有可下载的结果', 'danger')
    return
  }

  const anchor = document.createElement('a')
  anchor.href = outputUrl.value
  anchor.download = buildOutputFileName(sourceName.value || 'image', state.input.value.format)
  anchor.click()
  applyStatus(`已开始下载 ${anchor.download}`, 'success')
}

function applySampleById(sampleId: string) {
  const sample = samples.samples.value.find((item) => item.id === sampleId)
  if (!sample) return
  samples.applySample(sample)
  void run()
}

function saveSnapshot() {
  if (!state.output.value || !sourceUrl.value) return
  history.recordHistory(state.input.value, state.output.value)
  showSuccessMessage('已保存到历史记录')
}

function restoreHistoryEntry(entry: ToolHistoryEntry<ImageStudioInput, ImageStudioOutput>) {
  state.input.value = normalizeImageStudioInput(entry.input)
  state.output.value = entry.output
  state.error.value = null
  state.loading.value = false
  state.dirty.value = false
  if (!sourceUrl.value) {
    applyStatus('已恢复裁剪配置，请重新上传原图继续编辑', 'neutral')
    return
  }

  applyStatus('已恢复裁剪配置，正在同步工作区', 'neutral')
}

function resetAll() {
  draft.clearDraft()
  state.input.value = imageStudioRuntimeModule.createInitialInput()
  revokeUrl(sourceUrl.value)
  clearOutputState()
  sourceUrl.value = ''
  sourceName.value = ''
  sourceMeta.value = null
  livePreview.value = null
  applyStatus('上传图片后即可进入可视化裁剪并导出结果', 'neutral')
  void run()
}

watch(
  state.input,
  () => {
    void run()
  },
  { deep: true }
)

watch(sourceUrl, (nextUrl) => {
  if (nextUrl) {
    return
  }

  finalizeRequestId += 1
  livePreview.value = null
  clearOutputState()
})

onMounted(() => {
  state.input.value = normalizeImageStudioInput(state.input.value)
  if (!restoredSharedState) {
    void run()
    return
  }

  applyStatus('已恢复分享配置，请重新上传原图继续裁剪', 'neutral')
})

onBeforeUnmount(() => {
  revokeUrl(sourceUrl.value)
  clearOutputState()
})
</script>

<template>
  <ToolScaffold :meta="imageStudioRuntimeModule.meta" :loading="false" :error="state.error.value" wide>
    <template #actions>
      <ToolActionBar>
        <button type="button" class="solid-button" @click="openPicker">选择图片</button>
        <button type="button" class="ghost-button" :disabled="!outputUrl" @click="downloadOutput">下载结果</button>
        <button type="button" class="ghost-button" :disabled="!share.canShare.value" @click="share.copyShareUrl">复制分享链接</button>
        <button type="button" class="ghost-button" :disabled="!sourceUrl || !state.output.value" @click="saveSnapshot">保存快照</button>
        <button type="button" class="ghost-button" @click="resetAll">重置</button>
      </ToolActionBar>
    </template>

    <template #input>
      <ToolPaneShell title="图片处理" :subtitle="statusMessage" :badge="output?.formatLabel || 'WebP'">
        <div
          class="image-dropzone"
          :class="{ 'image-dropzone-active': isDragging }"
          @dragover.prevent="isDragging = true"
          @dragleave.prevent="isDragging = false"
          @drop="handleDrop"
        >
          <strong>{{ sourceMeta ? sourceName : '拖拽图片到这里' }}</strong>
          <p>{{ sourceMeta ? '拖拽裁切框可实时更新预览，分享与历史只保存当前配置。' : '支持 PNG / JPEG / WebP 等常见图片格式。' }}</p>
          <input ref="fileInput" class="image-file-input" type="file" accept="image/*" @change="handleFileChange" />
        </div>

        <ToolSamplePanel
          v-if="samples.sampleEnabled && samples.samples.value.length"
          :samples="samples.samples.value"
          @apply="applySampleById"
        />

        <div class="inline-fields">
          <label class="field-row">
            <span class="field-label">输出格式</span>
            <select v-model="state.input.value.format" class="select-input">
              <option value="image/webp">WebP</option>
              <option value="image/jpeg">JPEG</option>
              <option value="image/png">PNG</option>
            </select>
          </label>

          <label class="field-row">
            <span class="field-label">裁切比例</span>
            <select v-model="state.input.value.crop" class="select-input">
              <option value="original">原始比例</option>
              <option value="1:1">1:1</option>
              <option value="4:3">4:3</option>
              <option value="16:9">16:9</option>
            </select>
          </label>
        </div>

        <div class="inline-fields">
          <label class="field-row">
            <span class="field-label">输出缩放</span>
            <input v-model.number="state.input.value.scale" class="slider-input" type="range" min="10" max="100" />
            <span class="meta-hint">{{ state.input.value.scale }}%</span>
          </label>

          <label class="field-row">
            <span class="field-label">输出质量</span>
            <input
              v-model.number="state.input.value.quality"
              class="slider-input"
              type="range"
              min="40"
              max="100"
              :disabled="state.input.value.format === 'image/png'"
            />
            <span class="meta-hint">{{ output?.qualityLabel }}</span>
          </label>
        </div>

        <div class="inline-fields">
          <label class="field-row">
            <span class="field-label">背景填充</span>
            <select v-model="state.input.value.background" class="select-input" :disabled="state.input.value.format === 'image/jpeg'">
              <option value="transparent">透明</option>
              <option value="fill">纯色填充</option>
            </select>
          </label>

          <label class="field-row">
            <span class="field-label">填充颜色</span>
            <div class="qrcode-color-input">
              <input v-model="state.input.value.fillColor" class="color-swatch" type="color" />
              <input v-model="state.input.value.fillColor" class="text-input" type="text" />
            </div>
          </label>
        </div>

        <p class="meta-hint">
          {{ state.input.value.format === 'image/jpeg' ? 'JPEG 不支持透明背景，导出时会自动使用填充颜色。' : 'PNG / WebP 可保留透明背景，也可选择纯色填充。' }}
        </p>

        <p class="helper-text" :class="{ 'helper-text-success': statusTone === 'success', 'helper-text-danger': statusTone === 'danger' }">
          {{ isProcessing ? '处理中...' : statusMessage }}
        </p>
      </ToolPaneShell>
    </template>

    <template #history>
      <ToolHistoryPanel
        v-if="history.historyEnabled"
        :entries="history.entries.value"
        empty-text="保存一次快照后，这里会记录最近的图片处理配置。"
        @restore="(entry) => restoreHistoryEntry(entry as ToolHistoryEntry<ImageStudioInput, ImageStudioOutput>)"
        @remove="history.removeEntry"
        @clear="history.clearHistoryEntries"
      />
    </template>

    <template #output>
      <ToolPaneShell title="裁剪工作区" subtitle="裁剪区单独占一行，先调好构图，再确认结果尺寸与体积。">
        <section class="http-panel image-studio-cropper-panel">
          <div class="result-panel-header">
            <div>
              <span class="result-panel-title">裁剪区</span>
              <span class="meta-hint">{{ cropLayout.width }} × {{ cropLayout.height }} · {{ output?.cropLabel || '原始比例' }} · 旋转 {{ normalizedRotation }}°</span>
            </div>
            <div class="image-crop-toolbar">
              <button type="button" class="ghost-button" :disabled="!sourceUrl" @click="rotateLeft">左转 90°</button>
              <button type="button" class="ghost-button" :disabled="!sourceUrl" @click="rotateRight">右转 90°</button>
              <button type="button" class="ghost-button" :disabled="!sourceUrl || normalizedRotation === 0" @click="resetRotation">回正</button>
            </div>
          </div>
          <ImageCropWorkspace
            :img="sourceUrl"
            :crop-layout="cropLayout"
            :output-format="state.input.value.format"
            :output-quality="state.input.value.quality"
            :rotation="state.input.value.rotation"
            :source-meta="sourceMeta"
            @loaded="handleWorkspaceLoaded"
            @error="handleWorkspaceError"
            @exported="handleWorkspaceExported"
            @preview-change="handleWorkspacePreviewChange"
            @processing-change="handleWorkspaceProcessing"
          />
        </section>
      </ToolPaneShell>

      <ToolPaneShell title="预览与摘要" subtitle="左侧查看原图，右侧实时查看裁剪效果并确认导出信息。">
        <div class="image-preview-grid">
          <section class="http-panel">
            <div class="result-panel-header">
              <span class="result-panel-title">原图</span>
              <span class="meta-hint">{{ sourceMeta ? `${sourceMeta.width} × ${sourceMeta.height}` : '未选择图片' }}</span>
            </div>
            <div v-if="sourceUrl" class="image-preview-shell">
              <img class="image-preview" :src="sourceUrl" alt="原图预览" />
            </div>
            <div v-else class="empty-panel">
              <p>上传图片后，这里会显示原图预览。</p>
            </div>
          </section>

          <section class="http-panel">
            <div class="result-panel-header">
              <span class="result-panel-title">实时预览</span>
            </div>
            <div class="image-preview-stack">
              <div class="image-preview-meta">
                <p class="meta-hint">当前角度：{{ normalizedRotation }}°</p>
                <p class="meta-hint">预览尺寸：{{ previewSizeLabel }}</p>
                <p class="helper-text">右侧实时展示当前裁剪框里的内容，拖拽后会立即刷新。</p>
              </div>

              <div v-if="livePreview?.html || livePreview?.url" class="image-preview-shell image-preview-html-shell">
                <!-- eslint-disable-next-line vue/no-v-html -->
                <div
                  v-if="livePreview?.html"
                  class="image-preview-html-content"
                  :style="{ width: `${Math.round(livePreview.w)}px`, height: `${Math.round(livePreview.h)}px` }"
                  v-html="livePreview.html"
                ></div>
                <img
                  v-else
                  class="image-preview"
                  :src="livePreview.url"
                  :style="{ width: `${Math.round(livePreview.w)}px`, height: `${Math.round(livePreview.h)}px` }"
                  alt="实时预览"
                />
              </div>
              <div v-else class="empty-panel">
                <p>拖拽裁切框后，这里会显示 real-time 轻量预览。</p>
              </div>
            </div>
          </section>
        </div>

        <section class="http-panel">
          <div class="result-panel-header">
            <span class="result-panel-title">导出摘要</span>
          </div>
          <div class="data-list">
            <article class="data-row">
              <div>
                <span class="result-label">实时尺寸</span>
                <strong class="result-value">{{ previewSizeLabel }}</strong>
              </div>
            </article>
            <article class="data-row">
              <div>
                <span class="result-label">原图</span>
                <strong class="result-value">{{ sourceMeta ? `${sourceMeta.type} · ${sourceMeta.size} · ${sourceMeta.width}×${sourceMeta.height}` : '—' }}</strong>
              </div>
            </article>
            <article class="data-row">
              <div>
                <span class="result-label">导出结果</span>
                <strong class="result-value">{{ outputMeta ? `${outputMeta.type} · ${outputMeta.size} · ${outputMeta.width}×${outputMeta.height}` : '—' }}</strong>
              </div>
            </article>
            <article class="data-row">
              <div>
                <span class="result-label">旋转</span>
                <strong class="result-value">{{ output?.rotationLabel || `${normalizedRotation}°` }}</strong>
              </div>
            </article>
            <article class="data-row">
              <div>
                <span class="result-label">背景</span>
                <strong class="result-value">{{ output?.backgroundLabel || '—' }}</strong>
              </div>
            </article>
          </div>
        </section>
      </ToolPaneShell>
    </template>
  </ToolScaffold>
</template>
