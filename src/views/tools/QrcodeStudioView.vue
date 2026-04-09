<script setup lang="ts">
import QRCode from 'qrcode'
import { computed, ref, watch } from 'vue'
import { copyToClipboard } from '@/lib/clipboard'
import { buildQrDownloadName, detectQrContentType } from '@/lib/qrcode-tool'

interface QrTemplate {
  label: string
  summary: string
  content: string
}

const qrContent = ref('https://magic-box-lyart.vercel.app/tools/http-lab')
const qrSize = ref(320)
const qrMargin = ref(2)
const foreground = ref('#0f1728')
const background = ref('#f7fbff')
const statusMessage = ref('正在生成二维码')
const statusTone = ref<'neutral' | 'success' | 'danger'>('neutral')
const qrDataUrl = ref('')
const isGenerating = ref(false)

const qrTemplates: QrTemplate[] = [
  {
    label: '项目链接',
    summary: '最常见的分享方式，适合网页、预览地址和文档入口。',
    content: 'https://magic-box-lyart.vercel.app/tools/http-lab',
  },
  {
    label: 'Wi-Fi',
    summary: '适合会议室、演示机和临时网络接入。',
    content: 'WIFI:T:WPA;S:MagicBox;P:12345678;;',
  },
  {
    label: '邮件入口',
    summary: '把常用反馈邮箱、工单地址快速做成二维码。',
    content: 'mailto:hello@magic-box.dev',
  },
  {
    label: '纯文本',
    summary: '把短说明、兑换码或临时口令做成可扫码文本。',
    content: 'Magic Box ships faster with local-first tools.',
  },
]

const sizeOptions = [192, 256, 320, 384, 512]
const marginOptions = [1, 2, 4]

const qrType = computed(() => detectQrContentType(qrContent.value))
const qrDownloadName = computed(() => buildQrDownloadName(qrContent.value))

function applyStatus(message: string, tone: 'neutral' | 'success' | 'danger') {
  statusMessage.value = message
  statusTone.value = tone
}

function applyTemplate(template: QrTemplate) {
  qrContent.value = template.content
  applyStatus(`已应用模板：${template.label}`, 'neutral')
}

async function generateQrCode() {
  const content = qrContent.value.trim()

  if (!content) {
    qrDataUrl.value = ''
    applyStatus('输入内容后会自动生成二维码', 'neutral')
    return
  }

  const generationToken = Symbol('qr-generation')
  latestGenerationToken = generationToken
  isGenerating.value = true

  try {
    const result = await QRCode.toDataURL(content, {
      width: qrSize.value,
      margin: qrMargin.value,
      color: {
        dark: foreground.value,
        light: background.value,
      },
    })

    if (latestGenerationToken !== generationToken) {
      return
    }

    qrDataUrl.value = result
    applyStatus('二维码已更新，可直接下载 PNG', 'success')
  } catch (error) {
    if (latestGenerationToken !== generationToken) {
      return
    }

    qrDataUrl.value = ''
    applyStatus(error instanceof Error ? error.message : '二维码生成失败', 'danger')
  } finally {
    if (latestGenerationToken === generationToken) {
      isGenerating.value = false
    }
  }
}

async function copyContent() {
  const success = await copyToClipboard(qrContent.value)
  applyStatus(success ? '二维码内容已复制' : '当前环境不支持复制', success ? 'neutral' : 'danger')
}

function clearContent() {
  qrContent.value = ''
}

function downloadQrCode() {
  if (!qrDataUrl.value) {
    applyStatus('当前没有可下载的二维码', 'danger')
    return
  }

  const anchor = document.createElement('a')
  anchor.href = qrDataUrl.value
  anchor.download = qrDownloadName.value
  anchor.click()
  applyStatus(`已开始下载 ${qrDownloadName.value}`, 'success')
}

let latestGenerationToken: symbol | null = null

watch(
  [qrContent, qrSize, qrMargin, foreground, background],
  () => {
    void generateQrCode()
  },
  { immediate: true }
)
</script>

<template>
  <section class="tool-page tool-page-qrcode">
    <div class="tool-page-layout">
      <section class="editor-pane">
        <div class="pane-header">
          <div>
            <h2 class="pane-title">配置区</h2>
            <p class="meta-hint">常见链接、文本和 Wi-Fi 载荷都可以直接放进来生成。</p>
          </div>
          <span class="workspace-chip">{{ qrType }}</span>
        </div>

        <label class="field-row">
          <span class="field-label">内容</span>
          <textarea
            v-model="qrContent"
            class="text-area qrcode-content-input"
            spellcheck="false"
            placeholder="https://example.com 或任意文本"
          />
        </label>

        <div class="inline-fields">
          <label class="field-row">
            <span class="field-label">尺寸</span>
            <select v-model="qrSize" class="select-input">
              <option
                v-for="size in sizeOptions"
                :key="size"
                :value="size"
              >
                {{ size }} px
              </option>
            </select>
          </label>

          <label class="field-row">
            <span class="field-label">边距</span>
            <select v-model="qrMargin" class="select-input">
              <option
                v-for="margin in marginOptions"
                :key="margin"
                :value="margin"
              >
                {{ margin }}
              </option>
            </select>
          </label>
        </div>

        <div class="qrcode-color-grid">
          <label class="field-row qrcode-color-field">
            <span class="field-label">前景色</span>
            <div class="qrcode-color-input">
              <input v-model="foreground" class="color-swatch" type="color" />
              <input v-model="foreground" class="text-input" type="text" />
            </div>
          </label>

          <label class="field-row qrcode-color-field">
            <span class="field-label">背景色</span>
            <div class="qrcode-color-input">
              <input v-model="background" class="color-swatch" type="color" />
              <input v-model="background" class="text-input" type="text" />
            </div>
          </label>
        </div>

        <div class="input-toolbar">
          <button
            type="button"
            class="solid-button"
            :disabled="!qrDataUrl || isGenerating"
            @click="downloadQrCode"
          >
            {{ isGenerating ? '生成中...' : '下载 PNG' }}
          </button>
          <button type="button" class="ghost-button" @click="copyContent">复制内容</button>
          <button type="button" class="ghost-button" @click="clearContent">清空内容</button>
        </div>

        <section class="qrcode-template-panel">
          <div class="result-panel-header">
            <span class="result-panel-title">模板</span>
            <span class="meta-hint">快速带入高频载荷，不写说明文档，只给可用模板。</span>
          </div>

          <div class="qrcode-template-list">
            <button
              v-for="template in qrTemplates"
              :key="template.label"
              type="button"
              class="qrcode-template-card"
              @click="applyTemplate(template)"
            >
              <div class="qrcode-template-top">
                <strong class="qrcode-template-title">{{ template.label }}</strong>
                <span class="qrcode-template-action">应用模板</span>
              </div>
              <p class="qrcode-template-summary">{{ template.summary }}</p>
              <code class="qrcode-template-payload">{{ template.content }}</code>
            </button>
          </div>
        </section>
      </section>

      <section class="viewer-pane">
        <div class="pane-header">
          <div>
            <h2 class="pane-title">预览区</h2>
            <p
              class="helper-text"
              :class="{
                'helper-text-success': statusTone === 'success',
                'helper-text-danger': statusTone === 'danger',
              }"
            >
              {{ statusMessage }}
            </p>
          </div>
          <span class="workspace-chip">{{ qrSize }} px</span>
        </div>

        <section class="qrcode-preview-panel">
          <div v-if="qrDataUrl" class="qrcode-preview-shell">
            <img
              class="qrcode-preview-image"
              :src="qrDataUrl"
              :alt="`QR code for ${qrType}`"
            />
          </div>

          <div v-else class="empty-panel">
            <p>输入内容后会在这里出现二维码预览。</p>
          </div>
        </section>

        <section class="qrcode-meta-panel">
          <div class="data-list">
            <div class="data-row">
              <div>
                <span class="result-label">类型</span>
                <strong class="result-value">{{ qrType }}</strong>
              </div>
              <div>
                <span class="result-label">下载名</span>
                <strong class="result-value">{{ qrDownloadName }}</strong>
              </div>
            </div>

            <div class="data-row">
              <div>
                <span class="result-label">前景色</span>
                <strong class="result-value">{{ foreground }}</strong>
              </div>
              <div>
                <span class="result-label">背景色</span>
                <strong class="result-value">{{ background }}</strong>
              </div>
            </div>
          </div>
        </section>
      </section>
    </div>
  </section>
</template>
