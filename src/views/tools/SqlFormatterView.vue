<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import ResultCard from '@/components/toolkit/ResultCard.vue'
import ToolActionBar from '@/components/toolkit/ToolActionBar.vue'
import ToolPageLayout from '@/components/toolkit/ToolPageLayout.vue'
import ToolPaneShell from '@/components/toolkit/ToolPaneShell.vue'
import ToolPanel from '@/components/toolkit/ToolPanel.vue'
import { copyToClipboard } from '@/lib/clipboard'
import { buildSqlStats, formatSql, type SqlFormatterOptions, type SqlKeywordCase } from '@/lib/sql-formatter'
import { readStorage, writeStorage } from '@/lib/storage'

interface SqlTemplate {
  label: string
  summary: string
  input: string
}

const sqlFormatterStateDomain = 'tool-history:sql-formatter:state'

function parseSavedState(raw: string) {
  try {
    return JSON.parse(raw) as Partial<{
      input: string
      options: SqlFormatterOptions
    }>
  } catch {
    return undefined
  }
}

const templates: SqlTemplate[] = [
  {
    label: '简单查询',
    summary: '适合快速整理单表查询和条件语句。',
    input: "select id,name,email from users where active = 1 and role = 'admin' order by created_at desc",
  },
  {
    label: '联表查询',
    summary: '适合快速整理 join、group by 和聚合字段。',
    input:
      'select u.id,u.name,o.total from users u left join orders o on u.id = o.user_id where o.status = \'paid\' group by u.id,u.name,o.total',
  },
  {
    label: '更新语句',
    summary: '适合清理 set 列表与 where 条件。',
    input: "update users set name = 'Alice', updated_at = now(), status = 'active' where id = 1",
  },
]

const savedState = readStorage<
  Partial<{
    input: string
    options: SqlFormatterOptions
  }>
>(sqlFormatterStateDomain, {}, {
  parseLegacy: (raw) => parseSavedState(raw),
})

const sqlInput = ref(savedState.input ?? templates[0]?.input ?? '')
const options = ref<SqlFormatterOptions>({
  keywordCase: savedState.options?.keywordCase ?? 'upper',
  indentSize: savedState.options?.indentSize ?? 2,
  compact: savedState.options?.compact ?? false,
})
const toastMessage = ref('')

const formattedResult = computed(() => formatSql(sqlInput.value, options.value))
const inputStats = computed(() => buildSqlStats(sqlInput.value))
const outputStats = computed(() => buildSqlStats(formattedResult.value.value ?? ''))
const hasChanges = computed(() => formattedResult.value.ok && formattedResult.value.value !== sqlInput.value)

watch(
  [sqlInput, options],
  () => {
    writeStorage(sqlFormatterStateDomain, {
      input: sqlInput.value,
      options: options.value,
    })
  },
  { deep: true }
)

async function copyOutput() {
  const value = formattedResult.value.value ?? ''
  const success = await copyToClipboard(value)
  toastMessage.value = success ? '格式化结果已复制' : '当前环境不支持复制'

  window.setTimeout(() => {
    toastMessage.value = ''
  }, 1600)
}

function applyTemplate(template: SqlTemplate) {
  sqlInput.value = template.input
}

function useOutputAsInput() {
  if (formattedResult.value.ok && formattedResult.value.value) {
    sqlInput.value = formattedResult.value.value
  }
}

function clearAll() {
  sqlInput.value = ''
}

function updateKeywordCase(keywordCase: SqlKeywordCase) {
  options.value = {
    ...options.value,
    keywordCase,
  }
}
</script>

<template>
  <ToolPageLayout wide class="sql-formatter-page">
    <template #editor>
      <ToolPaneShell title="SQL 输入" subtitle="把凌乱 SQL 粘进来，快速得到更易读的格式化结果或单行压缩版本。">
        <ToolActionBar>
          <button type="button" class="solid-button" :disabled="!formattedResult.ok || !formattedResult.value" @click="copyOutput">
            复制结果
          </button>
          <button type="button" class="ghost-button" :disabled="!hasChanges" @click="useOutputAsInput">用结果覆盖输入</button>
          <button type="button" class="ghost-button" @click="clearAll">清空</button>
        </ToolActionBar>

        <ToolPanel title="格式化选项">
          <div class="sql-option-grid">
            <div class="tab-row">
              <button
                type="button"
                class="tab-button"
                :data-active="options.keywordCase === 'upper'"
                @click="updateKeywordCase('upper')"
              >
                关键字大写
              </button>
              <button
                type="button"
                class="tab-button"
                :data-active="options.keywordCase === 'lower'"
                @click="updateKeywordCase('lower')"
              >
                关键字小写
              </button>
            </div>

            <label class="field-row">
              <span class="field-label">缩进空格数</span>
              <input v-model.number="options.indentSize" class="text-input" type="number" min="2" max="6" step="1" />
            </label>

            <label class="text-option-item">
              <input v-model="options.compact" type="checkbox" />
              <span>压缩成单行 SQL</span>
            </label>
          </div>
        </ToolPanel>

        <ToolPanel title="模板">
          <div class="sql-template-list">
            <button v-for="template in templates" :key="template.label" type="button" class="sql-template-card" @click="applyTemplate(template)">
              <div class="sql-template-top">
                <strong>{{ template.label }}</strong>
                <span class="sql-template-action">使用模板</span>
              </div>
              <p>{{ template.summary }}</p>
            </button>
          </div>
        </ToolPanel>

        <label class="field-row">
          <span class="field-label">原始 SQL</span>
          <textarea v-model="sqlInput" class="text-area text-area-full" spellcheck="false" placeholder="SELECT * FROM users WHERE id = 1" />
        </label>
      </ToolPaneShell>
    </template>

    <template #viewer>
      <ToolPaneShell title="格式化结果" subtitle="首版聚焦通用 SQL 的可读性优化，不做数据库执行和真实语法校验。">
        <div class="sql-summary-grid">
          <ResultCard title="输入统计" tone="neutral">
            <div class="data-list">
              <article class="data-row">
                <div>
                  <span class="result-label">字符数</span>
                  <strong class="result-value">{{ inputStats.characters }}</strong>
                </div>
                <div>
                  <span class="result-label">行数</span>
                  <strong class="result-value">{{ inputStats.lines }}</strong>
                </div>
              </article>
            </div>
          </ResultCard>

          <ResultCard title="输出统计" :tone="formattedResult.ok ? 'success' : 'danger'">
            <div class="data-list">
              <article class="data-row">
                <div>
                  <span class="result-label">字符数</span>
                  <strong class="result-value">{{ outputStats.characters }}</strong>
                </div>
                <div>
                  <span class="result-label">行数</span>
                  <strong class="result-value">{{ outputStats.lines }}</strong>
                </div>
              </article>
            </div>
          </ResultCard>
        </div>

        <ResultCard
          title="格式化输出"
          :subtitle="options.compact ? '当前处于单行压缩模式' : '当前处于多行格式化模式'"
          :copy-value="formattedResult.value || ''"
          copy-label="复制结果"
          :tone="formattedResult.ok ? 'success' : 'danger'"
        >
          <textarea
            :value="formattedResult.value || ''"
            class="text-area text-area-full"
            readonly
            :placeholder="formattedResult.error || '格式化结果会显示在这里'"
          />
        </ResultCard>
      </ToolPaneShell>
    </template>
  </ToolPageLayout>

  <section>
    <p v-if="toastMessage" class="clipboard-toast">{{ toastMessage }}</p>
  </section>
</template>

<style scoped>
.sql-option-grid,
.sql-template-list,
.sql-summary-grid {
  display: grid;
  gap: 0.875rem;
}

.sql-summary-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.text-option-item {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  color: var(--text);
}

.sql-template-card {
  display: grid;
  gap: 0.5rem;
  padding: 1rem;
  border-radius: 16px;
  border: 1px solid var(--surface-card-border);
  background: var(--surface-card-bg);
  text-align: left;
  color: var(--text);
}

.sql-template-card p {
  margin: 0;
  color: var(--muted);
}

.sql-template-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.sql-template-action {
  color: var(--accent);
  font-size: 0.875rem;
}

@media (max-width: 900px) {
  .sql-summary-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
