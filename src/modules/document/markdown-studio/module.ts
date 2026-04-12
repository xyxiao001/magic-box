import { getMarkdownStats, renderMarkdown } from './logic'
import { markdownStudioMeta } from './meta'
import type { ToolSample } from '@/tool-runtime/protocols/tool-module'
import type { ToolModule } from '@/tool-runtime/protocols/tool-module'

export interface MarkdownStudioInput {
  markdownInput: string
}

export interface MarkdownStudioOutput {
  htmlPreview: string
  stats: ReturnType<typeof getMarkdownStats>
}

export const markdownStudioSamples: ToolSample<MarkdownStudioInput>[] = [
  {
    id: 'readme',
    label: 'README',
    summary: '适合项目首页、安装说明和命令清单。',
    apply: () => ({
      markdownInput: `# Magic Box

本地优先的开发者工具箱，覆盖 Markdown、HTTP、Regex、JSON、二维码等高频工作流。

## 快速开始

\`\`\`bash
pnpm install
pnpm dev
\`\`\`

## 功能列表

- Markdown Studio
- JSON Toolkit
- Regex Workbench
- HTTP Lab
`,
    }),
  },
  {
    id: 'issue',
    label: 'Issue',
    summary: '适合缺陷记录、复现步骤和影响范围整理。',
    apply: () => ({
      markdownInput: `# [Bug] Markdown 导出样式异常

## 当前现象

导出 HTML 后，表格边框在浅色主题下对比度偏弱。

## 复现步骤

1. 打开 Markdown Studio
2. 粘贴包含表格、代码块、图片的 Markdown
3. 点击“导出 HTML”

## 预期结果

- 导出结果与页面预览保持一致
- 表格和引用块对比度清晰
`,
    }),
  },
  {
    id: 'api-doc',
    label: 'API',
    summary: '适合函数、SDK 和模块说明。',
    apply: () => ({
      markdownInput: `# renderMarkdown

将 Markdown 字符串转换为安全可渲染的 HTML 片段。

## 函数签名

\`\`\`ts
export function renderMarkdown(raw: string): string
\`\`\`

## 参数

| 参数 | 类型 | 说明 |
| :--- | :--- | :--- |
| raw | string | 原始 Markdown 输入 |
`,
    }),
  },
]

export function createMarkdownStudioInitialInput(): MarkdownStudioInput {
  return {
    markdownInput: '# Markdown Studio\n\n在左侧编辑 Markdown，右侧实时预览。',
  }
}

export function executeMarkdownStudio(input: MarkdownStudioInput): MarkdownStudioOutput {
  return {
    htmlPreview: renderMarkdown(input.markdownInput),
    stats: getMarkdownStats(input.markdownInput),
  }
}

export function buildMarkdownStudioHistoryLabel(output: MarkdownStudioOutput) {
  return `Markdown ${output.stats.chars} chars`
}

export const markdownStudioRuntimeModule: Omit<ToolModule<MarkdownStudioInput, MarkdownStudioOutput>, 'page'> = {
  meta: markdownStudioMeta,
  createInitialInput: createMarkdownStudioInitialInput,
  execute: (input) => executeMarkdownStudio(input),
  samples: markdownStudioSamples,
}
