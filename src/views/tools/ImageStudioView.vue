<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import {
  buildOutputFileName,
  calculateImageTransform,
  formatImageMeta,
  type CropRatioPreset,
  type OutputImageFormat,
} from '@/lib/image-tool'

interface ImagePreset {
  label: string
  summary: string
  format: OutputImageFormat
  quality: number
  scale: number
  crop: CropRatioPreset
}

const configStorageKey = 'magic-box.image-studio.config'
const fileInput = ref<HTMLInputElement | null>(null)
const sourceName = ref('')
const sourceUrl = ref('')
const outputUrl = ref('')
const sourceMeta = ref<{ width: number; height: number; type: string; size: string } | null>(null)
const outputMeta = ref<{ width: number; height: number; type: string; size: string } | null>(null)
const statusMessage = ref('上传图片后即可在本地完成处理和导出')
const statusTone = ref<'neutral' | 'success' | 'danger'>('neutral')
const isProcessing = ref(false)
const isDragging = ref(false)

const savedConfig = (() => {
  try {
    return JSON.parse(localStorage.getItem(configStorageKey) || '{}') as Partial<{
      format: OutputImageFormat
      quality: number
      scale: number
      crop: CropRatioPreset
    }>
  } catch {
    return {}
  }
})()

const outputFormat = ref<OutputImageFormat>(savedConfig.format || 'image/webp')
const quality = ref(Number(savedConfig.quality || 86))
const scale = ref(Number(savedConfig.scale || 100))
const cropRatio = ref<CropRatioPreset>(savedConfig.crop || 'original')

const presets: ImagePreset[] = [
  {
    label: '通用压缩',
    summary: '保持原比例，适合网页上传与临时分享。',
    format: 'image/webp',
    quality: 82,
    scale: 100,
    crop: 'original',
  },
  {
    label: '头像方图',
    summary: '裁成 1:1，适合头像、卡片封面和缩略图。',
    format: 'image/jpeg',
    quality: 88,
    scale: 80,
    crop: '1:1',
  },
  {
    label: '展示横图',
    summary: '裁成 16:9，适合文章头图和分享封面。',
    format: 'image/webp',
    quality: 84,
    scale: 90,
    crop: '16:9',
  },
]

const outputLabel = computed(() => {
  if (outputFormat.value === 'image/png') {
    return 'PNG'
  }

  if (outputFormat.value === 'image/jpeg') {
    return 'JPEG'
  }

  return 'WebP'
})

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

async function processImage() {
  if (!sourceUrl.value || !sourceMeta.value) {
    revokeUrl(outputUrl.value)
    outputUrl.value = ''
    outputMeta.value = null
    return
  }

  isProcessing.value = true

  try {
    const image = await loadImage(sourceUrl.value)
    const transform = calculateImageTransform(
      sourceMeta.value.width,
      sourceMeta.value.height,
      scale.value,
      cropRatio.value
    )

    const canvas = document.createElement('canvas')
    canvas.width = transform.outputWidth
    canvas.height = transform.outputHeight

    const context = canvas.getContext('2d')

    if (!context) {
      throw new Error('当前环境不支持图片处理')
    }

    context.drawImage(
      image,
      transform.crop.sx,
      transform.crop.sy,
      transform.crop.sw,
      transform.crop.sh,
      0,
      0,
      transform.outputWidth,
      transform.outputHeight
    )

    const blob = await canvasToBlob(
      canvas,
      outputFormat.value,
      outputFormat.value === 'image/png' ? undefined : quality.value / 100
    )

    revokeUrl(outputUrl.value)
    outputUrl.value = URL.createObjectURL(blob)
    outputMeta.value = formatImageMeta(
      transform.outputWidth,
      transform.outputHeight,
      blob.size,
      outputFormat.value
    )
    applyStatus('已生成处理结果，可直接下载', 'success')
  } catch (error) {
    outputMeta.value = null
    revokeUrl(outputUrl.value)
    outputUrl.value = ''
    applyStatus(error instanceof Error ? error.message : '图片处理失败', 'danger')
  } finally {
    isProcessing.value = false
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
    sourceUrl.value = nextUrl
    sourceName.value = file.name
    sourceMeta.value = formatImageMeta(image.naturalWidth, image.naturalHeight, file.size, file.type)
    applyStatus('图片已加载，正在生成处理结果', 'neutral')
    await processImage()
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

function applyPreset(preset: ImagePreset) {
  outputFormat.value = preset.format
  quality.value = preset.quality
  scale.value = preset.scale
  cropRatio.value = preset.crop
}

function handleDrop(event: DragEvent) {
  event.preventDefault()
  isDragging.value = false
  const file = event.dataTransfer?.files?.[0]

  if (file) {
    void applyFile(file)
  }
}

function downloadOutput() {
  if (!outputUrl.value) {
    applyStatus('当前没有可下载的结果', 'danger')
    return
  }

  const anchor = document.createElement('a')
  anchor.href = outputUrl.value
  anchor.download = buildOutputFileName(sourceName.value || 'image', outputFormat.value)
  anchor.click()
  applyStatus(`已开始下载 ${anchor.download}`, 'success')
}

watch([outputFormat, quality, scale, cropRatio], () => {
  localStorage.setItem(
    configStorageKey,
    JSON.stringify({
      format: outputFormat.value,
      quality: quality.value,
      scale: scale.value,
      crop: cropRatio.value,
    })
  )

  if (sourceUrl.value) {
    void processImage()
  }
})

onBeforeUnmount(() => {
  revokeUrl(sourceUrl.value)
  revokeUrl(outputUrl.value)
})
</script>

<template>
  <section class="tool-page tool-page-image">
    <div class="tool-page-layout">
      <section class="editor-pane">
        <div class="pane-header">
          <div>
            <h2 class="pane-title">图片处理</h2>
            <p class="meta-hint">拖进来或选择一张图片，在本地完成缩放、裁切、压缩与格式转换。</p>
          </div>
          <span class="workspace-chip">{{ outputLabel }}</span>
        </div>

        <div
          class="image-dropzone"
          :class="{ 'image-dropzone-active': isDragging }"
          @dragover.prevent="isDragging = true"
          @dragleave.prevent="isDragging = false"
          @drop="handleDrop"
        >
          <strong>{{ sourceMeta ? sourceName : '拖拽图片到这里' }}</strong>
          <p>{{ sourceMeta ? '可继续调节输出格式、尺寸与裁切比例。' : '支持 PNG / JPEG / WebP 等常见图片格式。' }}</p>
          <div class="input-toolbar">
            <button type="button" class="solid-button" @click="openPicker">选择图片</button>
            <button
              type="button"
              class="ghost-button"
              :disabled="!outputUrl"
              @click="downloadOutput"
            >
              下载结果
            </button>
          </div>
          <input
            ref="fileInput"
            class="image-file-input"
            type="file"
            accept="image/*"
            @change="handleFileChange"
          />
        </div>

        <section class="http-panel">
          <div class="result-panel-header">
            <span class="result-panel-title">快捷预设</span>
            <span class="meta-hint">先选一个接近目标场景的预设，再微调参数。</span>
          </div>

          <div class="jwt-template-list">
            <button
              v-for="preset in presets"
              :key="preset.label"
              type="button"
              class="http-template-card"
              @click="applyPreset(preset)"
            >
              <div class="http-template-top">
                <span class="http-template-method">IMG</span>
                <span class="http-template-action">应用预设</span>
              </div>
              <strong class="http-template-title">{{ preset.label }}</strong>
              <p class="http-template-summary">{{ preset.summary }}</p>
            </button>
          </div>
        </section>

        <div class="inline-fields">
          <label class="field-row">
            <span class="field-label">输出格式</span>
            <select v-model="outputFormat" class="select-input">
              <option value="image/webp">WebP</option>
              <option value="image/jpeg">JPEG</option>
              <option value="image/png">PNG</option>
            </select>
          </label>

          <label class="field-row">
            <span class="field-label">裁切比例</span>
            <select v-model="cropRatio" class="select-input">
              <option value="original">原始比例</option>
              <option value="1:1">1:1</option>
              <option value="4:3">4:3</option>
              <option value="16:9">16:9</option>
            </select>
          </label>
        </div>

        <div class="inline-fields">
          <label class="field-row">
            <span class="field-label">缩放比例</span>
            <input v-model.number="scale" class="slider-input" type="range" min="10" max="100" />
            <span class="meta-hint">{{ scale }}%</span>
          </label>

          <label class="field-row">
            <span class="field-label">输出质量</span>
            <input
              v-model.number="quality"
              class="slider-input"
              type="range"
              min="40"
              max="100"
              :disabled="outputFormat === 'image/png'"
            />
            <span class="meta-hint">{{ outputFormat === 'image/png' ? 'PNG 无质量参数' : `${quality}%` }}</span>
          </label>
        </div>

        <p
          class="helper-text"
          :class="{
            'helper-text-success': statusTone === 'success',
            'helper-text-danger': statusTone === 'danger',
          }"
        >
          {{ isProcessing ? '处理中...' : statusMessage }}
        </p>
      </section>

      <section class="viewer-pane">
        <div class="pane-header">
          <div>
            <h2 class="pane-title">预览与信息</h2>
            <p class="meta-hint">左侧看原图，右侧看结果；先确认尺寸和体积是否满足目标场景。</p>
          </div>
        </div>

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
              <span class="result-panel-title">结果</span>
              <span class="meta-hint">{{ outputMeta ? `${outputMeta.width} × ${outputMeta.height}` : '等待生成' }}</span>
            </div>

            <div v-if="outputUrl" class="image-preview-shell">
              <img class="image-preview" :src="outputUrl" alt="处理结果预览" />
            </div>
            <div v-else class="empty-panel">
              <p>选择图片后，这里会显示处理结果。</p>
            </div>
          </section>
        </div>

        <section class="http-panel">
          <div class="result-panel-header">
            <span class="result-panel-title">输出摘要</span>
            <span class="meta-hint">适合快速判断是否能直接上传到目标平台。</span>
          </div>

          <div class="data-list">
            <article class="data-row">
              <div>
                <span class="result-label">原图</span>
                <strong class="result-value">
                  {{
                    sourceMeta
                      ? `${sourceMeta.type} · ${sourceMeta.size} · ${sourceMeta.width}×${sourceMeta.height}`
                      : '—'
                  }}
                </strong>
              </div>
            </article>

            <article class="data-row">
              <div>
                <span class="result-label">输出</span>
                <strong class="result-value">
                  {{
                    outputMeta
                      ? `${outputMeta.type} · ${outputMeta.size} · ${outputMeta.width}×${outputMeta.height}`
                      : '—'
                  }}
                </strong>
              </div>
            </article>
          </div>
        </section>
      </section>
    </div>
  </section>
</template>
