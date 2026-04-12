<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { VueCropper } from 'cropper-next-vue'
import 'cropper-next-vue/style.css'
import {
  normalizeOutputQuality,
  normalizeRotationDegrees,
  toCropperOutputType,
  type CropLayoutSize,
  type ImageMeta,
  type OutputImageFormat,
} from './logic'

interface CropperPreviewPayload {
  w: number
  h: number
  url: string
  html: string
}

interface CropperLoadPayload {
  type: string
  message: string
}

interface CropperInstance {
  getCropBlob: () => Promise<Blob>
  rotateLeft: () => void
  rotateRight: () => void
  rotateClear: () => void
}

const props = withDefaults(
  defineProps<{
    img?: string
    cropLayout: CropLayoutSize
    outputFormat: OutputImageFormat
    outputQuality: number
    rotation?: number
    sourceMeta?: ImageMeta | null
  }>(),
  {
    img: '',
    rotation: 0,
    sourceMeta: null,
  }
)

const emit = defineEmits<{
  exported: [{ blob: Blob; width: number; height: number }]
  error: [message: string]
  loaded: []
  'preview-change': [payload: CropperPreviewPayload | null]
  'processing-change': [processing: boolean]
}>()

const cropperRef = ref<CropperInstance | null>(null)
const cropperRenderKey = ref(0)
const wrapperLayout = {
  width: '100%',
  height: '420px',
}
const cropperOutputType = computed(() => toCropperOutputType(props.outputFormat))
const cropperOutputSize = computed(() => normalizeOutputQuality(props.outputFormat, props.outputQuality))
const maxSideLength = computed(() => {
  if (!props.sourceMeta) {
    return 3000
  }

  return Math.max(props.sourceMeta.width, props.sourceMeta.height, 3000)
})

let exportTimer: number | null = null
let exportRequestId = 0
let currentRotation = 0

function clearExportTimer() {
  if (exportTimer !== null) {
    window.clearTimeout(exportTimer)
    exportTimer = null
  }
}

function revokeObjectUrl(url: string) {
  if (url) {
    URL.revokeObjectURL(url)
  }
}

function applyRotation(targetRotation: number) {
  if (!cropperRef.value) {
    currentRotation = normalizeRotationDegrees(targetRotation)
    return
  }

  const nextRotation = normalizeRotationDegrees(targetRotation)
  const previousRotation = normalizeRotationDegrees(currentRotation)

  if (nextRotation === previousRotation) {
    return
  }

  if (nextRotation === 0) {
    cropperRef.value.rotateClear()
    currentRotation = 0
    return
  }

  const delta = (nextRotation - previousRotation + 360) % 360
  if (delta === 90) {
    cropperRef.value.rotateRight()
  } else if (delta === 180) {
    cropperRef.value.rotateRight()
    cropperRef.value.rotateRight()
  } else if (delta === 270) {
    cropperRef.value.rotateLeft()
  }

  currentRotation = nextRotation
}

function readBlobSize(blob: Blob) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const image = new Image()
    image.onload = () => {
      const width = image.naturalWidth
      const height = image.naturalHeight
      revokeObjectUrl(url)
      resolve({ width, height })
    }
    image.onerror = () => {
      revokeObjectUrl(url)
      reject(new Error('裁剪结果尺寸读取失败'))
    }
    image.src = url
  })
}

async function exportCurrentCrop() {
  if (!props.img || !cropperRef.value) {
    emit('preview-change', null)
    emit('processing-change', false)
    return
  }

  const requestId = ++exportRequestId
  emit('processing-change', true)

  try {
    const blob = await cropperRef.value.getCropBlob()
    const size = await readBlobSize(blob)
    if (requestId !== exportRequestId) {
      return
    }
    emit('exported', { blob, width: size.width, height: size.height })
  } catch (error) {
    if (requestId !== exportRequestId) {
      return
    }
    emit('error', error instanceof Error ? error.message : '裁剪结果导出失败')
  } finally {
    if (requestId === exportRequestId) {
      emit('processing-change', false)
    }
  }
}

function scheduleExport(delay = 140) {
  clearExportTimer()
  if (!props.img) {
    emit('preview-change', null)
    emit('processing-change', false)
    return
  }

  exportTimer = window.setTimeout(() => {
    void exportCurrentCrop()
  }, delay)
}

function handlePreviewChange(payload: CropperPreviewPayload) {
  emit('preview-change', payload)
  scheduleExport()
}

function handleImageLoad(payload: CropperLoadPayload) {
  if (payload.type !== 'success') {
    emit('error', payload.message || '图片加载失败')
    return
  }

  currentRotation = 0
  applyRotation(props.rotation)
  emit('loaded')
  scheduleExport(80)
}

watch(
  () => props.img,
  async (nextImg) => {
    clearExportTimer()
    emit('preview-change', null)
    if (!nextImg) {
      currentRotation = 0
      emit('processing-change', false)
      return
    }

    await nextTick()
    currentRotation = 0
    applyRotation(props.rotation)
    scheduleExport(120)
  }
)

watch(
  () => [props.outputFormat, props.outputQuality, props.cropLayout.width, props.cropLayout.height],
  async () => {
    if (!props.img) {
      return
    }

    await nextTick()
    scheduleExport(120)
  }
)

watch(
  () => [props.cropLayout.width, props.cropLayout.height],
  async ([nextWidth, nextHeight], [previousWidth, previousHeight]) => {
    if (!props.img) {
      return
    }

    if (nextWidth === previousWidth && nextHeight === previousHeight) {
      return
    }

    clearExportTimer()
    emit('preview-change', null)
    currentRotation = 0
    cropperRenderKey.value += 1
    await nextTick()
  }
)

watch(
  () => props.rotation,
  async (nextRotation) => {
    if (!props.img) {
      currentRotation = normalizeRotationDegrees(nextRotation)
      return
    }

    await nextTick()
    applyRotation(nextRotation)
    scheduleExport(90)
  }
)

onBeforeUnmount(() => {
  clearExportTimer()
})
</script>

<template>
  <section class="image-crop-workspace">
    <div v-if="props.img" class="image-crop-workspace-shell">
      <VueCropper
        :key="cropperRenderKey"
        ref="cropperRef"
        class="image-crop-workspace-cropper"
        :img="props.img"
        :wrapper="wrapperLayout"
        :crop-layout="props.cropLayout"
        :output-type="cropperOutputType"
        :output-size="cropperOutputSize"
        :max-side-length="maxSideLength"
        :center-box="true"
        @img-load="handleImageLoad"
        @real-time="handlePreviewChange"
      />
    </div>
    <div v-else class="empty-panel image-crop-workspace-empty">
      <p>上传图片后，这里会进入可视化裁剪模式。</p>
    </div>
  </section>
</template>
