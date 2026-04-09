<script setup lang="ts">
import { computed, ref } from 'vue'
import { copyToClipboard } from '@/lib/clipboard'
import { analyzeRegex, type RegexMatchEntry } from '@/lib/regex'

type RegexTemplateCategory = 'extract' | 'transform' | 'content' | 'cleanup'

interface RegexTemplate {
  label: string
  category: RegexTemplateCategory
  summary: string
  pattern: string
  flags: string
  replacement: string
  testText: string
}

interface HighlightSegment {
  kind: 'plain' | 'match'
  value: string
  matchNumber?: number
  zeroWidth?: boolean
}

const pattern = ref('(?<name>[a-z]+)=(\\d+)')
const flags = ref('g')
const replacement = ref('$<name>: $2')
const testText = ref(`count=42
user=7
level=3`)
const copiedMessage = ref('')
const exampleSearch = ref('')
const activeCategory = ref<'all' | RegexTemplateCategory>('all')

const categoryMeta = {
  all: { label: '全部', hint: '所有模板' },
  extract: { label: '提取', hint: '抓取字段、链接和地址' },
  transform: { label: '替换', hint: '脱敏、格式重组和输出转换' },
  content: { label: '内容', hint: 'Markdown、HTML 和日志结构' },
  cleanup: { label: '清洗', hint: '空白字符和文本整理' },
} as const

const regexExamples: RegexTemplate[] = [
  {
    label: '键值对',
    category: 'extract',
    summary: '提取类似 env、query string 或日志字段里的 key=value 对。',
    pattern: '(?<name>[a-z]+)=(\\d+)',
    flags: 'g',
    replacement: '$<name>: $2',
    testText: `count=42
user=7
level=3`,
  },
  {
    label: '日期提取',
    category: 'transform',
    summary: '把 YYYY-MM-DD 重排成更适合展示的格式。',
    pattern: '(\\d{4})-(\\d{2})-(\\d{2})',
    flags: 'g',
    replacement: '$3/$2/$1',
    testText: '2026-04-08\n2025-12-01',
  },
  {
    label: '邮箱域名',
    category: 'extract',
    summary: '抓取邮箱里的域名部分，用于做来源聚合。',
    pattern: '[\\w.+-]+@([\\w.-]+)',
    flags: 'g',
    replacement: '$1',
    testText: 'hello@example.com\nops@magic-box.dev',
  },
  {
    label: 'URL 提取',
    category: 'extract',
    summary: '从文案、日志或 Markdown 中提取 HTTP 链接。',
    pattern: 'https?:\\/\\/[^\\s)"]+',
    flags: 'g',
    replacement: '[link] $&',
    testText:
      '文档地址 https://developer.mozilla.org/docs/Web/JavaScript ，线上站点 https://magic-box-lyart.vercel.app/tools/time-lab',
  },
  {
    label: '手机号脱敏',
    category: 'transform',
    summary: '保留前三后四位，适合展示用户信息时做脱敏。',
    pattern: '(1\\d{2})\\d{4}(\\d{4})',
    flags: 'g',
    replacement: '$1****$2',
    testText: '13812345678\n15600001234',
  },
  {
    label: 'IPv4 地址',
    category: 'extract',
    summary: '从配置、ACL 或请求日志里找出合法 IPv4 地址。',
    pattern:
      '\\b(?:(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)\\.){3}(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)\\b',
    flags: 'g',
    replacement: '[ip] $&',
    testText: 'allow 192.168.0.12\nblock 10.10.10.300\nfallback 8.8.8.8',
  },
  {
    label: 'Markdown 标题',
    category: 'content',
    summary: '批量定位不同级别标题，适合做文档结构预览。',
    pattern: '^(#{1,6})\\s+(.+)$',
    flags: 'gm',
    replacement: '$1 [$2]',
    testText: '# Magic Box\n## Regex Workbench\n### 模板清单',
  },
  {
    label: 'HTML 标签',
    category: 'content',
    summary: '提取标签名，快速检查结构或做简单清洗。',
    pattern: '<([a-z][\\w-]*)(?:\\s[^>]*)?>',
    flags: 'gi',
    replacement: '<$1>',
    testText:
      '<section class="hero">\n  <img src="/logo.png" alt="logo" />\n  <button data-role="cta">Open</button>\n</section>',
  },
  {
    label: '日志级别',
    category: 'content',
    summary: '定位 INFO、WARN、ERROR、DEBUG 等日志级别。',
    pattern: '\\b(INFO|WARN|ERROR|DEBUG)\\b',
    flags: 'g',
    replacement: '[$1]',
    testText:
      '2026-04-08 INFO boot ok\n2026-04-08 WARN cache miss\n2026-04-08 ERROR request timeout',
  },
  {
    label: '驼峰拆词',
    category: 'transform',
    summary: '把 camelCase 拆成更易读的单词边界。',
    pattern: '([a-z0-9])([A-Z])',
    flags: 'g',
    replacement: '$1 $2',
    testText: 'magicBoxRegexWorkbench\nparseHTTPHeader',
  },
  {
    label: '连续空行压缩',
    category: 'cleanup',
    summary: '清理多余空行，适合整理日志、文档和 Prompt。',
    pattern: '\\n{3,}',
    flags: 'g',
    replacement: '\n\n',
    testText: 'first\n\n\n\nsecond\n\n\nthird',
  },
  {
    label: '连续空格压缩',
    category: 'cleanup',
    summary: '把多个空格或 tab 压缩成单个空格。',
    pattern: '[ \\t]{2,}',
    flags: 'g',
    replacement: ' ',
    testText: 'const    answer   =    42;\nlet\t\tname\t=   "dev";',
  },
  {
    label: '中文括号内容',
    category: 'content',
    summary: '抓取中文说明里的括号内容，适合摘要或清洗。',
    pattern: '（([^）]+)）',
    flags: 'g',
    replacement: '[$1]',
    testText: '正则工具（支持命名分组）\n时间工具（支持批量转换）',
  },
]

const quickFlags = [
  { flag: 'g', meaning: '全局匹配，列出文本中的所有命中。' },
  { flag: 'i', meaning: '忽略大小写，适合 URL、标签和日志关键词。' },
  { flag: 'm', meaning: '多行模式，让 ^ 和 $ 作用于每一行。' },
  { flag: 's', meaning: '让 . 可以跨行匹配，处理大块文本时更常见。' },
  { flag: 'u', meaning: '启用 Unicode 感知，处理中英文混排更稳。' },
]

const quickRecipes = [
  { token: '(...)', meaning: '捕获组，替换时可用 $1、$2 引用。' },
  { token: '(?<name>...)', meaning: '命名分组，替换时可用 $<name>。' },
  { token: '\\b', meaning: '单词边界，常用于日志级别、关键词和 token。' },
  { token: '\\s / \\S', meaning: '空白与非空白字符，经常配合清洗文本。' },
  { token: '?= / ?!', meaning: '正向预查与负向预查，适合只校验上下文。' },
]

const analysis = computed(() =>
  analyzeRegex(pattern.value, flags.value, testText.value, replacement.value)
)

const templateCategories = computed(() => {
  const categoryOrder: Array<'all' | RegexTemplateCategory> = [
    'all',
    'extract',
    'transform',
    'content',
    'cleanup',
  ]

  return categoryOrder.map((id) => ({
    id,
    label: categoryMeta[id].label,
    hint: categoryMeta[id].hint,
    count:
      id === 'all'
        ? regexExamples.length
        : regexExamples.filter((example) => example.category === id).length,
  }))
})

const filteredRegexExamples = computed(() => {
  const query = exampleSearch.value.trim().toLowerCase()

  return regexExamples.filter((example) => {
    const matchesCategory =
      activeCategory.value === 'all' || example.category === activeCategory.value

    const matchesQuery =
      query.length === 0 ||
      [example.label, example.summary, example.pattern, example.replacement]
        .join(' ')
        .toLowerCase()
        .includes(query)

    return matchesCategory && matchesQuery
  })
})

const highlightSegments = computed(() => {
  if (!analysis.value.ok || !analysis.value.matches) {
    return [{ kind: 'plain', value: testText.value }] satisfies HighlightSegment[]
  }

  return buildHighlightSegments(testText.value, analysis.value.matches)
})

async function copyValue(value: string, label: string) {
  const success = await copyToClipboard(value)
  copiedMessage.value = success ? `${label} 已复制` : '当前环境不支持复制'

  window.setTimeout(() => {
    copiedMessage.value = ''
  }, 1600)
}

function applyExample(example: RegexTemplate) {
  pattern.value = example.pattern
  flags.value = example.flags
  replacement.value = example.replacement
  testText.value = example.testText
}

function isActiveExample(example: RegexTemplate) {
  return (
    pattern.value === example.pattern &&
    flags.value === example.flags &&
    replacement.value === example.replacement &&
    testText.value === example.testText
  )
}

function buildHighlightSegments(text: string, matches: RegexMatchEntry[]) {
  if (!matches.length) {
    return [{ kind: 'plain', value: text }] satisfies HighlightSegment[]
  }

  const segments: HighlightSegment[] = []
  let cursor = 0

  matches.forEach((match, matchIndex) => {
    const start = Math.max(0, match.index)
    const end = start + match.value.length

    if (start > cursor) {
      segments.push({
        kind: 'plain',
        value: text.slice(cursor, start),
      })
    }

    if (match.value.length === 0) {
      segments.push({
        kind: 'match',
        value: '∅',
        matchNumber: matchIndex + 1,
        zeroWidth: true,
      })
      return
    }

    if (end > cursor) {
      segments.push({
        kind: 'match',
        value: text.slice(start, end),
        matchNumber: matchIndex + 1,
      })
      cursor = end
    }
  })

  if (cursor < text.length) {
    segments.push({
      kind: 'plain',
      value: text.slice(cursor),
    })
  }

  return segments.length
    ? segments
    : ([{ kind: 'plain', value: text }] satisfies HighlightSegment[])
}
</script>

<template>
  <section class="tool-page tool-page-regex">
    <div class="tool-page-layout">
      <section class="editor-pane">
        <div class="pane-header">
          <div>
            <h2 class="pane-title">输入区</h2>
            <p class="meta-hint">左边负责构造与挑选表达式，右边专注查看命中结果。</p>
          </div>
          <span class="workspace-chip">{{ filteredRegexExamples.length }} 个模板可用</span>
        </div>

        <div class="regex-field-grid">
          <label class="field-row">
            <span class="field-label">Pattern</span>
            <input
              v-model="pattern"
              class="text-input"
              type="text"
              placeholder="例如 (?<name>[a-z]+)=(\\d+)"
            />
          </label>

          <label class="field-row regex-flags-field">
            <span class="field-label">Flags</span>
            <input
              v-model="flags"
              class="text-input"
              type="text"
              placeholder="gim"
            />
          </label>
        </div>

        <label class="field-row">
          <span class="field-label">Replacement</span>
          <input
            v-model="replacement"
            class="text-input"
            type="text"
            placeholder="$1 / $<name>"
          />
        </label>

        <label class="field-row">
          <span class="field-label">Test Text</span>
          <textarea
            v-model="testText"
            class="text-area text-area-full"
            spellcheck="false"
            placeholder="输入测试文本"
          />
        </label>

        <section class="regex-reference-panel">
          <div class="result-panel-header">
            <span class="result-panel-title">模板库</span>
            <span class="meta-hint">按用途检索并一键带入输入区</span>
          </div>

          <label class="field-row">
            <span class="field-label">搜索模板</span>
            <input
              v-model="exampleSearch"
              class="text-input"
              type="text"
              placeholder="按模板名、用途、表达式搜索"
            />
          </label>

          <div class="regex-category-strip">
            <button
              v-for="category in templateCategories"
              :key="category.id"
              type="button"
              class="regex-category-chip"
              :class="{ 'regex-category-chip-active': activeCategory === category.id }"
              @click="activeCategory = category.id"
            >
              <span>{{ category.label }}</span>
              <small>{{ category.count }}</small>
            </button>
          </div>

          <div v-if="filteredRegexExamples.length" class="regex-template-list">
            <button
              v-for="example in filteredRegexExamples"
              :key="example.label"
              type="button"
              class="regex-template-card"
              :class="{ 'regex-template-card-active': isActiveExample(example) }"
              @click="applyExample(example)"
            >
              <div class="regex-template-top">
                <span class="regex-template-kicker">
                  {{ categoryMeta[example.category].label }}
                </span>
                <span class="regex-template-action">使用模板</span>
              </div>
              <strong class="regex-template-title">{{ example.label }}</strong>
              <p class="regex-template-summary">{{ example.summary }}</p>
              <code class="regex-template-pattern">{{ example.pattern }}</code>
            </button>
          </div>

          <div v-else class="empty-panel">
            <p>没有找到符合条件的模板，可以换个关键词或者切回全部分类。</p>
          </div>
        </section>

        <section class="regex-reference-panel">
          <div class="result-panel-header">
            <span class="result-panel-title">常用速查</span>
            <span class="meta-hint">不展开长文档，只保留真正常用的部分。</span>
          </div>

          <div class="regex-reference-grid">
            <article class="regex-reference-card">
              <h3 class="regex-reference-title">Flags</h3>
              <div class="regex-reference-list">
                <div
                  v-for="flag in quickFlags"
                  :key="flag.flag"
                  class="regex-reference-item"
                >
                  <code class="regex-reference-token">{{ flag.flag }}</code>
                  <p class="regex-reference-copy">{{ flag.meaning }}</p>
                </div>
              </div>
            </article>

            <article class="regex-reference-card">
              <h3 class="regex-reference-title">常见片段</h3>
              <div class="regex-reference-list">
                <div
                  v-for="recipe in quickRecipes"
                  :key="recipe.token"
                  class="regex-reference-item"
                >
                  <code class="regex-reference-token">{{ recipe.token }}</code>
                  <p class="regex-reference-copy">{{ recipe.meaning }}</p>
                </div>
              </div>
            </article>
          </div>
        </section>
      </section>

      <section class="viewer-pane">
        <div class="pane-header">
          <div>
            <h2 class="pane-title">结果区</h2>
            <p
              class="helper-text"
              :class="{ 'helper-text-danger': !analysis.ok }"
            >
              {{
                analysis.ok
                  ? `命中 ${analysis.matchCount} 项，替换结果实时联动`
                  : analysis.error
              }}
            </p>
          </div>
          <span v-if="analysis.ok" class="workspace-chip">/{{ flags || '∅' }}/</span>
        </div>

        <section class="regex-result-panel">
          <div class="result-panel-header">
            <span class="result-panel-title">命中高亮</span>
            <span class="meta-hint">
              {{
                analysis.ok && analysis.matchCount
                  ? `${analysis.matchCount} 个命中已着色`
                  : '整段文本按命中区间高亮'
              }}
            </span>
          </div>

          <div
            v-if="analysis.ok"
            class="regex-highlight-canvas"
          >
            <template
              v-for="(segment, segmentIndex) in highlightSegments"
              :key="`${segment.kind}-${segmentIndex}`"
            >
              <mark
                v-if="segment.kind === 'match'"
                class="regex-highlight-match"
                :class="{ 'regex-highlight-match-zero': segment.zeroWidth }"
              >
                <span class="regex-highlight-order">#{{ segment.matchNumber }}</span>
                {{ segment.value }}
              </mark>
              <span v-else class="regex-highlight-plain">{{ segment.value }}</span>
            </template>
          </div>

          <div v-else class="empty-panel">
            <p>正则无效时不会生成高亮，先修正表达式或 flags。</p>
          </div>
        </section>

        <section class="regex-result-panel">
          <div class="result-panel-header">
            <span class="result-panel-title">替换预览</span>
            <button
              type="button"
              class="ghost-button small-button"
              :disabled="!analysis.ok || !analysis.replacementPreview"
              @click="
                analysis.ok &&
                analysis.replacementPreview &&
                copyValue(analysis.replacementPreview, '替换预览')
              "
            >
              复制
            </button>
          </div>

          <pre class="regex-preview">{{ analysis.ok ? analysis.replacementPreview : '' }}</pre>
        </section>

        <section class="regex-result-panel">
          <div class="result-panel-header">
            <span class="result-panel-title">命中列表</span>
          </div>

          <div v-if="analysis.ok && analysis.matches?.length" class="regex-match-list">
            <article
              v-for="(match, matchIndex) in analysis.matches"
              :key="`${match.index}-${matchIndex}`"
              class="regex-match-card"
            >
              <div class="regex-match-top">
                <strong>#{{ matchIndex + 1 }}</strong>
                <span class="regex-match-index">index {{ match.index }}</span>
              </div>
              <code class="regex-hit">{{ match.value || '∅' }}</code>

              <div v-if="match.groups.length" class="regex-groups">
                <span
                  v-for="group in match.groups"
                  :key="group.index"
                  class="regex-group-chip"
                >
                  ${{ group.index }}: {{ group.value || '∅' }}
                </span>
              </div>

              <div
                v-if="Object.keys(match.namedGroups).length"
                class="regex-groups"
              >
                <span
                  v-for="(value, key) in match.namedGroups"
                  :key="key"
                  class="regex-group-chip regex-group-chip-named"
                >
                  {{ key }}: {{ value || '∅' }}
                </span>
              </div>
            </article>
          </div>

          <div v-else-if="analysis.ok" class="empty-panel">
            <p>当前没有命中结果，可以试试模板库或调整 flags。</p>
          </div>
        </section>
      </section>
    </div>

    <p v-if="copiedMessage" class="clipboard-toast">{{ copiedMessage }}</p>
  </section>
</template>
