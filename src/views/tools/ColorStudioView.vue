<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { copyToClipboard } from '@/lib/clipboard'
import {
  buildColorSchemes,
  buildLinearGradientCss,
  formatHsl,
  formatRgb,
  getContrastLevel,
  getContrastRatio,
  parseColorInput,
} from '@/lib/color-tool'

interface ColorTemplate {
  label: string
  summary: string
  color: string
}

const storageKey = 'magic-box.color-studio.state'

const savedState = (() => {
  try {
    return JSON.parse(localStorage.getItem(storageKey) || '{}') as Partial<{
      colorInput: string
      gradientTarget: string
      angle: number
    }>
  } catch {
    return {}
  }
})()

const colorInput = ref(savedState.colorInput || '#3366FF')
const gradientTarget = ref(savedState.gradientTarget || '#FF7A59')
const gradientAngle = ref(Number(savedState.angle || 135))
const toastMessage = ref('')

const templates: ColorTemplate[] = [
  {
    label: '品牌蓝',
    summary: '适合 SaaS、控制台和产品主按钮。',
    color: '#3366FF',
  },
  {
    label: '薄荷绿',
    summary: '适合成功态、轻交互和清爽视觉主题。',
    color: '#42D6A4',
  },
  {
    label: '珊瑚橙',
    summary: '适合营销卡片、强调区与 CTA。',
    color: '#FF7A59',
  },
]

const parsedBase = computed(() => parseColorInput(colorInput.value))
const parsedGradientTarget = computed(() => parseColorInput(gradientTarget.value))

const baseHex = computed(() => parsedBase.value.hex || '#3366FF')
const baseRgb = computed(() =>
  parsedBase.value.ok && parsedBase.value.rgb ? formatRgb(parsedBase.value.rgb) : '—'
)
const baseHsl = computed(() =>
  parsedBase.value.ok && parsedBase.value.hsl ? formatHsl(parsedBase.value.hsl) : '—'
)

const schemes = computed(() => buildColorSchemes(baseHex.value))
const gradientCss = computed(() =>
  buildLinearGradientCss(baseHex.value, parsedGradientTarget.value.hex || '#FF7A59', gradientAngle.value)
)

const contrastWithWhite = computed(() => getContrastRatio(baseHex.value, '#FFFFFF'))
const contrastWithDark = computed(() => getContrastRatio(baseHex.value, '#111827'))

function handleColorPickerInput(event: Event) {
  colorInput.value = (event.target as HTMLInputElement).value
}

async function copyValue(value: string, label: string) {
  const success = await copyToClipboard(value)
  toastMessage.value = success ? `${label}已复制` : '当前环境不支持复制'

  window.setTimeout(() => {
    toastMessage.value = ''
  }, 1600)
}

function applyTemplate(template: ColorTemplate) {
  colorInput.value = template.color
}

watch([colorInput, gradientTarget, gradientAngle], () => {
  localStorage.setItem(
    storageKey,
    JSON.stringify({
      colorInput: colorInput.value,
      gradientTarget: gradientTarget.value,
      angle: gradientAngle.value,
    })
  )
})
</script>

<template>
  <section class="tool-page tool-page-color">
    <div class="tool-page-layout">
      <section class="editor-pane">
        <div class="pane-header">
          <div>
            <h2 class="pane-title">颜色输入</h2>
            <p class="meta-hint">支持 HEX、rgb()、hsl()，同时可直接用颜色选择器取值。</p>
          </div>
          <span class="workspace-chip">{{ parsedBase.ok ? '已解析' : '输入有误' }}</span>
        </div>

        <div class="input-toolbar">
          <button
            v-for="template in templates"
            :key="template.label"
            type="button"
            class="ghost-button small-button"
            @click="applyTemplate(template)"
          >
            {{ template.label }}
          </button>
        </div>

        <div class="color-input-group">
          <input
            :value="baseHex"
            class="color-picker-input"
            type="color"
            @input="handleColorPickerInput"
          />

          <label class="field-row">
            <span class="field-label">基础颜色</span>
            <input
              v-model="colorInput"
              class="text-input"
              type="text"
              placeholder="#3366FF / rgb(51, 102, 255) / hsl(225 100% 60%)"
            />
          </label>
        </div>

        <div class="inline-fields">
          <label class="field-row">
            <span class="field-label">渐变终点</span>
            <input v-model="gradientTarget" class="text-input" type="text" placeholder="#FF7A59" />
          </label>

          <label class="field-row">
            <span class="field-label">角度</span>
            <input v-model.number="gradientAngle" class="slider-input" type="range" min="0" max="360" />
            <span class="meta-hint">{{ gradientAngle }}°</span>
          </label>
        </div>

        <p class="helper-text" :class="{ 'helper-text-danger': !parsedBase.ok || !parsedGradientTarget.ok }">
          {{
            !parsedBase.ok
              ? parsedBase.error
              : !parsedGradientTarget.ok
                ? '渐变终点颜色格式无效'
                : '颜色已解析，可继续复制格式、配色和渐变 CSS'
          }}
        </p>

        <section class="http-panel">
          <div class="result-panel-header">
            <span class="result-panel-title">格式转换</span>
            <span class="meta-hint">适合在设计稿、CSS、运营素材之间来回切换。</span>
          </div>

          <div class="data-list">
            <article class="data-row">
              <div>
                <span class="result-label">HEX</span>
                <strong class="result-value">{{ baseHex }}</strong>
              </div>
              <button type="button" class="ghost-button small-button" @click="copyValue(baseHex, 'HEX')">复制</button>
            </article>

            <article class="data-row">
              <div>
                <span class="result-label">RGB</span>
                <strong class="result-value">{{ baseRgb }}</strong>
              </div>
              <button type="button" class="ghost-button small-button" @click="copyValue(baseRgb, 'RGB')">复制</button>
            </article>

            <article class="data-row">
              <div>
                <span class="result-label">HSL</span>
                <strong class="result-value">{{ baseHsl }}</strong>
              </div>
              <button type="button" class="ghost-button small-button" @click="copyValue(baseHsl, 'HSL')">复制</button>
            </article>
          </div>
        </section>
      </section>

      <section class="viewer-pane">
        <div class="pane-header">
          <div>
            <h2 class="pane-title">配色与预览</h2>
            <p class="meta-hint">先看色板和渐变，再确认文字对比度是否满足真实使用场景。</p>
          </div>
        </div>

        <section class="http-panel">
          <div class="result-panel-header">
            <span class="result-panel-title">色板方案</span>
            <span class="meta-hint">包含原色、浅色、深色、互补色和类似色。</span>
          </div>

          <div class="color-scheme-grid">
            <article v-for="entry in schemes" :key="entry.label" class="color-card">
              <div class="color-swatch" :style="{ background: entry.hex }"></div>
              <strong>{{ entry.label }}</strong>
              <span class="meta-hint">{{ entry.hex }}</span>
              <button type="button" class="ghost-button small-button" @click="copyValue(entry.hex, entry.label)">
                复制
              </button>
            </article>
          </div>
        </section>

        <section class="http-panel">
          <div class="result-panel-header">
            <span class="result-panel-title">渐变预览</span>
            <button type="button" class="ghost-button small-button" @click="copyValue(gradientCss, '渐变 CSS')">
              复制 CSS
            </button>
          </div>

          <div class="gradient-preview-shell">
            <div class="gradient-preview" :style="{ background: gradientCss }"></div>
          </div>
          <code class="package-command-code">{{ gradientCss }}</code>
        </section>

        <section class="http-panel">
          <div class="result-panel-header">
            <span class="result-panel-title">对比度检查</span>
            <span class="meta-hint">这里先检查和白底、深底的可读性。</span>
          </div>

          <div class="contrast-grid">
            <article class="contrast-card contrast-card-light">
              <div class="contrast-sample" :style="{ color: baseHex, background: '#FFFFFF' }">Magic Box</div>
              <strong>{{ contrastWithWhite.toFixed(2) }} · {{ getContrastLevel(contrastWithWhite) }}</strong>
              <span class="meta-hint">白底文字</span>
            </article>

            <article class="contrast-card contrast-card-dark">
              <div class="contrast-sample" :style="{ color: baseHex, background: '#111827' }">Magic Box</div>
              <strong>{{ contrastWithDark.toFixed(2) }} · {{ getContrastLevel(contrastWithDark) }}</strong>
              <span class="meta-hint">深底文字</span>
            </article>
          </div>
        </section>
      </section>
    </div>

    <p v-if="toastMessage" class="clipboard-toast">{{ toastMessage }}</p>
  </section>
</template>
