<script setup lang="ts">
import Prism from 'prismjs'
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { copyToClipboard } from '@/lib/clipboard'
import { getMarkdownStats, renderMarkdown } from '@/lib/markdown'
import { readStorage, writeStorage } from '@/lib/storage'
import 'prismjs/components/prism-bash'
import 'prismjs/components/prism-json'
import 'prismjs/components/prism-markdown'
import 'prismjs/components/prism-markup'
import 'prismjs/components/prism-typescript'

interface MdTemplate {
  label: string
  summary: string
  content: string
}

const storageKey = 'magic-box.markdown-studio.draft'
const storageDomain = 'tool-history:markdown-studio:draft'
const markdownInput = ref(
  readStorage(storageDomain, '# Markdown Studio\n\n在左侧编辑 Markdown，右侧实时预览。', {
    legacyKeys: [storageKey],
    parseLegacy: (raw) => raw,
  })
)
const selectedTemplate = ref('custom')
const statusMessage = ref('')
const statusTone = ref<'neutral' | 'success' | 'danger'>('neutral')
const previewRoot = ref<HTMLDivElement | null>(null)

const templates: MdTemplate[] = [
  {
    label: 'README',
    summary: '带亮点、安装、配置、FAQ 的完整项目说明。',
    content: `# Magic Box

本地优先的开发者工具箱，覆盖 Markdown、HTTP、Regex、JSON、二维码等高频工作流。

![Preview](https://dummyimage.com/1200x640/0f1728/ecf4ff&text=Magic+Box)

## 为什么做这个项目

> 把“临时打开多个在线工具”的碎片流程，收敛成一个统一、顺手、可收藏的工作台。

- 本地优先，尽量不依赖云端
- 深浅主题统一，视觉风格一致
- 每个工具都围绕真实开发场景设计
- 支持模板、复制、导出等高频动作

## 功能列表

- [x] Time Lab：时间戳与日期互转
- [x] JSON Toolkit：格式化 / 压缩 / 校验
- [x] Regex Workbench：匹配、替换、模板与高亮
- [x] HTTP Lab：快速请求调试
- [x] Markdown Studio：编辑、预览与导出
- [ ] 更多工作流模板持续补充

## 快速开始

\`\`\`bash
pnpm install
pnpm dev
\`\`\`

## 常用命令

| 命令 | 说明 |
| :--- | ---: |
| \`pnpm dev\` | 启动本地开发环境 |
| \`pnpm lint\` | 检查代码风格 |
| \`pnpm typecheck\` | 检查 TypeScript 类型 |
| \`pnpm test\` | 运行单元测试 |

## 配置说明

1. 启动后进入任一工具页
2. 在侧栏中收藏高频工具
3. 通过 \`⌘K\` 快速搜索与切换模块

## FAQ

### 数据会上传吗？

默认不会，工具优先在浏览器本地处理数据。

### 支持移动端吗？

支持基础适配，但推荐在桌面端获得完整体验。

## License

MIT
`,
  },
  {
    label: 'Issue',
    summary: '覆盖背景、复现步骤、预期/实际、影响范围的缺陷模板。',
    content: `# [Bug] Markdown Studio 导出样式异常

## 背景

在最近一次功能迭代后，Markdown Studio 新增了表格与代码高亮导出能力，需要确认 HTML / PNG 导出结果是否与页面预览保持一致。

## 当前现象

> 导出 HTML 后，代码块高亮正常，但表格边框在浅色主题下对比度偏弱。

## 预期结果

- 导出结果与页面预览保持一致
- 浅色主题下表格、引用块和图片边框清晰可见
- 不影响深色主题导出效果

## 复现步骤

1. 打开 \`Markdown Studio\`
2. 粘贴包含表格、代码块、图片的 Markdown
3. 切换到浅色主题
4. 点击“导出 HTML”
5. 在浏览器中打开导出文件

## 实际结果

- 表格头部层次感不足
- 个别引用块边框过浅

## 影响范围

| 范围 | 说明 |
| :--- | :--- |
| 功能 | Markdown Studio |
| 环境 | Chrome / Safari |
| 主题 | mac-light |

## 截图 / 日志

![Issue Screenshot](https://dummyimage.com/1200x720/1b2433/f8fbff&text=Issue+Screenshot)

\`\`\`text
[export-html] table contrast is too low in light theme
\`\`\`

## 备注

- [ ] 已确认是否稳定复现
- [ ] 已确认是否为本次迭代引入
- [ ] 已补充对应测试
`,
  },
  {
    label: 'Changelog',
    summary: '更接近真实发布说明的版本记录模板。',
    content: `# Changelog

## v0.7.0 - 2026-04-09

### Added

- 新增 Markdown Studio，支持实时预览、模板、统计与复制
- 新增 HTML / PNG 导出能力
- 新增代码高亮与表格、任务列表、图片渲染

### Improved

- 优化工作区顶部 header，减少垂直占用
- 调整移动端布局，降低页面压缩感
- 统一 Markdown 预览区与导出结果的视觉风格

### Fixed

- 修复 blockquote 在 HTML escape 后未被正确识别的问题
- 修复表格对齐测试与实际输出不一致的问题

### Notes

> 本次版本重点从“可用”推进到“更完整的文档工作流”。

## v0.6.0 - 2026-04-08

- 新增 HTTP Lab
- 新增 QRCode Studio
- 新增 Package Radar
`,
  },
  {
    label: 'API',
    summary: '适合函数 / 模块 / SDK 的接口说明模板。',
    content: `# renderMarkdown

将 Markdown 字符串转换为安全可渲染的 HTML 片段，供预览区或导出能力复用。

## 基本信息

| 字段 | 内容 |
| :--- | :--- |
| 模块 | \`src/lib/markdown.ts\` |
| 返回值 | \`string\` |
| 场景 | 预览、导出、模板展示 |

## 函数签名

\`\`\`ts
export function renderMarkdown(raw: string): string
\`\`\`

## 参数

| 参数 | 类型 | 必填 | 说明 |
| :--- | :--- | :---: | :--- |
| \`raw\` | \`string\` | 是 | 原始 Markdown 输入 |

## 返回结果

- 返回已做安全转义和轻量语法解析后的 HTML
- 会保留标题、列表、引用、表格、图片、代码块等结构

## 使用示例

\`\`\`ts
import { renderMarkdown } from '@/lib/markdown'

const html = renderMarkdown('# Hello\\n\\n- item')
\`\`\`

## 行为说明

1. 先抽离围栏代码块
2. 对原始内容执行 HTML escape
3. 逐块解析标题、列表、引用、表格与段落
4. 最后回填代码块 HTML

## 注意事项

> 当前实现以“轻量、安全、可控”为优先，不追求完整 CommonMark 兼容。

- [x] 支持基础高频语法
- [x] 支持协议白名单链接
- [x] 支持图片与任务列表
- [ ] 暂未支持脚注与复杂嵌套表格
`,
  },
  {
    label: 'Meeting',
    summary: '适合需求讨论、评审同步和阶段回顾。',
    content: `# 项目例会纪要

## 会议背景

- 时间：2026-04-09 15:00
- 参与人：产品、设计、前端、测试
- 主题：Markdown Studio 收尾与提交流程确认

## 关键结论

> 当前版本已覆盖主要文档编辑与导出场景，可以进入提交流程。

- 保留轻量解析，不引入重型 Markdown 引擎
- 导出功能纳入首版
- 模板内容需要再丰富一轮

## 待办事项

- [x] 补齐列表、表格、引用、图片支持
- [x] 增加代码高亮
- [x] 优化预览区视觉样式
- [ ] 完成最终提交说明

## 风险与备注

| 风险 | 影响 | 应对 |
| :--- | :---: | :--- |
| 复杂 Markdown 兼容不足 | 中 | 持续补高频语法 |
| PNG 导出在不同浏览器表现不一 | 中 | 继续做回归验证 |
| 样式演进导致导出不一致 | 低 | 复用预览区 HTML |
`,
  },
]

const htmlPreview = computed(() => renderMarkdown(markdownInput.value))
const stats = computed(() => getMarkdownStats(markdownInput.value))

function applyStatus(message: string, tone: 'neutral' | 'success' | 'danger') {
  statusMessage.value = message
  statusTone.value = tone
}

function renderPreview() {
  const root = previewRoot.value
  if (!root) {
    return
  }

  root.innerHTML = htmlPreview.value

  root.querySelectorAll('pre code[class*="language-"]').forEach((node) => {
    Prism.highlightElement(node as HTMLElement)
  })
}

function applyTemplate(t: MdTemplate) {
  markdownInput.value = t.content
  selectedTemplate.value = t.label
  applyStatus(`已应用模板：${t.label}`, 'neutral')
}

async function copySource() {
  const success = await copyToClipboard(markdownInput.value)
  applyStatus(success ? '原文已复制' : '当前环境不支持复制', success ? 'neutral' : 'danger')
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function buildExportStyles(theme: string | undefined) {
  const isLight = theme === 'mac-light'
  const background = isLight ? '#eef2f8' : '#07111d'
  const text = isLight ? '#172235' : '#ecf4ff'
  const muted = isLight ? '#69758d' : '#94a8c5'
  const border = isLight ? 'rgba(84, 102, 132, 0.14)' : 'rgba(140, 190, 255, 0.16)'
  const cardBackground = isLight
    ? 'linear-gradient(180deg, rgba(255, 255, 255, 0.88), rgba(250, 252, 255, 0.96))'
    : 'linear-gradient(180deg, rgba(15, 29, 48, 0.82), rgba(9, 18, 31, 0.9))'
  const inlineCodeBackground = isLight ? 'rgba(10, 132, 255, 0.06)' : 'rgba(255, 255, 255, 0.04)'
  const inlineCodeBorder = isLight ? 'rgba(105, 124, 154, 0.14)' : 'rgba(255, 255, 255, 0.08)'
  const blockquoteBackground = isLight ? 'rgba(10, 132, 255, 0.06)' : 'rgba(255, 255, 255, 0.04)'
  const linkDecoration = isLight ? 'rgba(10, 132, 255, 0.32)' : 'rgba(140, 240, 218, 0.4)'
  const codeBlockBackground = isLight
    ? 'linear-gradient(180deg, rgba(255, 255, 255, 0.88), rgba(250, 252, 255, 0.86))'
    : 'linear-gradient(180deg, rgba(255, 255, 255, 0.06), transparent 38%), rgba(3, 9, 16, 0.58)'

  return `
    :root{color:${text};background:${background};font-family:'IBM Plex Sans','PingFang SC','Helvetica Neue',sans-serif;line-height:1.6;}
    *{box-sizing:border-box;}
    body{margin:0;padding:24px;background:${background};}
    .markdown-preview{max-width:960px;margin:0 auto;padding:22px;border:1px solid ${border};border-radius:24px;background:${cardBackground};box-shadow:0 20px 50px rgba(0,0,0,0.12);}
    .markdown-preview p{margin:0 0 12px;}
    .markdown-preview h1,.markdown-preview h2,.markdown-preview h3,.markdown-preview h4,.markdown-preview h5,.markdown-preview h6{margin:18px 0 10px;letter-spacing:-0.03em;}
    .markdown-preview h1{font-size:1.7rem;}
    .markdown-preview h2{font-size:1.35rem;}
    .markdown-preview h3{font-size:1.15rem;}
    .markdown-preview ul,.markdown-preview ol{margin:0 0 12px 18px;padding:0;display:grid;gap:6px;}
    .markdown-preview li > ul,.markdown-preview li > ol{margin-top:8px;margin-bottom:0;}
    .markdown-preview a{color:${isLight ? '#0a84ff' : '#8cf0da'};text-decoration:underline;text-underline-offset:3px;text-decoration-color:${linkDecoration};}
    .markdown-preview del{color:${muted};text-decoration-thickness:1.5px;}
    .markdown-preview .md-image{display:block;width:100%;max-width:min(100%,720px);margin:14px 0;border-radius:18px;border:1px solid ${inlineCodeBorder};box-shadow:inset 0 1px 0 rgba(255,255,255,0.12),0 16px 36px rgba(0,0,0,0.14);}
    .markdown-preview code{padding:2px 7px;border-radius:10px;border:1px solid ${inlineCodeBorder};background:${inlineCodeBackground};font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono','Courier New',monospace;font-size:0.92em;}
    .markdown-preview .md-pre{margin:12px 0;padding:14px 16px;border-radius:20px;border:1px solid ${inlineCodeBorder};background:${codeBlockBackground};overflow:auto;}
    .markdown-preview .md-pre code{padding:0;border:none;background:transparent;font-size:0.86em;}
    .markdown-preview blockquote{margin:12px 0;padding:12px 14px;border-radius:18px;border:1px solid ${border};background:${blockquoteBackground};box-shadow:inset 0 1px 0 rgba(255,255,255,0.1);}
    .markdown-preview blockquote p{margin:0;color:${muted};}
    .markdown-preview table{width:100%;margin:12px 0;border-collapse:separate;border-spacing:0;border:1px solid ${border};border-radius:18px;overflow:hidden;}
    .markdown-preview th,.markdown-preview td{padding:10px 12px;border-bottom:1px solid ${inlineCodeBorder};vertical-align:top;}
    .markdown-preview th{text-align:left;background:${inlineCodeBackground};}
    .markdown-preview tr:last-child td{border-bottom:none;}
    .markdown-preview .md-task-list-item{list-style:none;}
    .markdown-preview .md-task-label{display:inline-flex;align-items:flex-start;gap:10px;}
    .markdown-preview .md-task-label input{margin-top:4px;}
    .markdown-preview .token.comment,.markdown-preview .token.prolog,.markdown-preview .token.doctype,.markdown-preview .token.cdata{color:${isLight ? 'rgba(105, 117, 141, 0.9)' : 'rgba(148, 168, 197, 0.85)'};}
    .markdown-preview .token.punctuation{color:${isLight ? 'rgba(23, 34, 53, 0.68)' : 'rgba(236, 244, 255, 0.7)'};}
    .markdown-preview .token.property,.markdown-preview .token.tag,.markdown-preview .token.constant,.markdown-preview .token.symbol,.markdown-preview .token.deleted{color:${isLight ? 'rgba(216, 74, 99, 0.95)' : '#ff7e9d'};}
    .markdown-preview .token.boolean,.markdown-preview .token.number{color:${isLight ? 'rgba(255, 159, 10, 0.95)' : '#ffc477'};}
    .markdown-preview .token.selector,.markdown-preview .token.attr-name,.markdown-preview .token.string,.markdown-preview .token.char,.markdown-preview .token.builtin,.markdown-preview .token.inserted{color:${isLight ? 'rgba(31, 155, 90, 0.95)' : '#86f1b6'};}
    .markdown-preview .token.operator,.markdown-preview .token.entity,.markdown-preview .token.url{color:${isLight ? 'rgba(23, 34, 53, 0.76)' : 'rgba(236, 244, 255, 0.8)'};}
    .markdown-preview .token.atrule,.markdown-preview .token.attr-value,.markdown-preview .token.keyword{color:${isLight ? 'rgba(10, 132, 255, 0.95)' : '#8fc2ff'};}
    .markdown-preview .token.function,.markdown-preview .token.class-name{color:${isLight ? 'rgba(9, 112, 214, 0.95)' : '#7ff4d9'};}
    .markdown-preview .token.regex,.markdown-preview .token.important,.markdown-preview .token.variable{color:${isLight ? 'rgba(255, 159, 10, 0.95)' : '#ffbe78'};}
    .markdown-preview .token.important,.markdown-preview .token.bold{font-weight:700;}
    .markdown-preview .token.italic{font-style:italic;}
  `.trim()
}

function exportHtml() {
  const root = previewRoot.value
  if (!root) {
    applyStatus('预览区未就绪', 'danger')
    return
  }

  const theme = document.documentElement.dataset.theme
  const css = buildExportStyles(theme)

  const doc = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Markdown Studio Export</title>
    <style>${css}</style>
  </head>
  <body>
    <main class="markdown-preview">${root.innerHTML}</main>
  </body>
</html>`

  downloadBlob('markdown-studio.html', new Blob([doc], { type: 'text/html;charset=utf-8' }))
  applyStatus('已导出 HTML', 'success')
}

async function exportPng() {
  const root = previewRoot.value
  if (!root) {
    applyStatus('预览区未就绪', 'danger')
    return
  }

  try {
    const { toPng } = await import('html-to-image')
    const theme = document.documentElement.dataset.theme
    const backgroundColor = theme === 'mac-light' ? '#eef2f8' : '#07111d'
    const dataUrl = await toPng(root, { cacheBust: true, pixelRatio: 2, backgroundColor })
    const blob = await (await fetch(dataUrl)).blob()
    downloadBlob('markdown-studio.png', blob)
    applyStatus('已导出 PNG', 'success')
  } catch {
    applyStatus('导出 PNG 失败', 'danger')
  }
}

onMounted(() => {
  void nextTick(() => {
    renderPreview()
  })
})

watch(markdownInput, (val) => {
  writeStorage(storageDomain, val)
})

watch(htmlPreview, () => {
  void nextTick(() => {
    renderPreview()
  })
})
</script>

<template>
  <section class="tool-page">
    <div class="tool-page-layout">
      <section class="editor-pane">
        <div class="pane-header">
          <div>
            <h2 class="pane-title">编辑区</h2>
            <p class="meta-hint">支持标题、列表、任务列表、引用、表格、图片、删除线、链接、行内代码与围栏代码块，并提供轻量高亮。</p>
          </div>
          <span class="workspace-chip">{{ stats.chars }} chars · {{ stats.paragraphs }} 段 · {{ stats.codeBlocks }} 块</span>
        </div>

        <div class="input-toolbar">
          <button
            v-for="t in templates"
            :key="t.label"
            type="button"
            class="ghost-button small-button"
            :aria-pressed="selectedTemplate === t.label"
            @click="applyTemplate(t)"
          >
            {{ t.label }}
          </button>
          <button type="button" class="ghost-button small-button" @click="copySource">复制原文</button>
          <button type="button" class="ghost-button small-button" @click="exportHtml">导出 HTML</button>
          <button type="button" class="ghost-button small-button" @click="exportPng">导出 PNG</button>
        </div>

        <textarea
          v-model="markdownInput"
          class="text-area text-area-full"
          spellcheck="false"
          placeholder="# Hello\n\n支持基础 Markdown 语法和代码块。"
        />

        <p
          v-if="statusMessage"
          class="helper-text"
          :class="{
            'helper-text-success': statusTone === 'success',
            'helper-text-danger': statusTone === 'danger',
          }"
        >
          {{ statusMessage }}
        </p>
      </section>

      <section class="viewer-pane">
        <div class="pane-header">
          <div>
            <h2 class="pane-title">预览区</h2>
            <p class="meta-hint">渲染只做轻量支持，确保安全前提下提供清晰可读的效果。</p>
          </div>
        </div>

        <div ref="previewRoot" class="doc-card markdown-preview"></div>
      </section>
    </div>
  </section>
</template>
