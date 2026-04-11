<script setup lang="ts">
import { computed } from 'vue'

defineOptions({
  name: 'JsonTreeNode',
})

const props = withDefaults(
  defineProps<{
    value: unknown
    nodeKey?: string
    level?: number
    defaultOpenDepth?: number
    isRoot?: boolean
  }>(),
  {
    nodeKey: '',
    level: 0,
    defaultOpenDepth: 1,
    isRoot: false,
  }
)

const isArrayValue = computed(() => Array.isArray(props.value))
const isObjectValue = computed(
  () => props.value !== null && typeof props.value === 'object' && !Array.isArray(props.value)
)
const isCollapsible = computed(() => isArrayValue.value || isObjectValue.value)
const isExpandable = computed(() => isCollapsible.value && childEntries.value.length > 0)
const childEntries = computed(() => {
  if (isArrayValue.value) {
    return (props.value as unknown[]).map((item, index) => ({
      key: String(index),
      value: item,
    }))
  }

  if (isObjectValue.value) {
    return Object.entries(props.value as Record<string, unknown>).map(([key, value]) => ({
      key,
      value,
    }))
  }

  return []
})
const nodeTypeLabel = computed(() => {
  if (isArrayValue.value) {
    return 'Array'
  }

  if (isObjectValue.value) {
    return 'Object'
  }

  if (props.value === null) {
    return 'Null'
  }

  if (typeof props.value === 'string') {
    return 'String'
  }

  if (typeof props.value === 'number') {
    return 'Number'
  }

  if (typeof props.value === 'boolean') {
    return 'Boolean'
  }

  return 'Value'
})
const itemCountLabel = computed(() => {
  if (!isCollapsible.value) {
    return ''
  }

  const count = childEntries.value.length
  const unit = isArrayValue.value ? '项' : '个字段'
  return `${count} ${unit}`
})
const previewText = computed(() => {
  if (!isCollapsible.value || !childEntries.value.length) {
    return isArrayValue.value ? '空数组' : '空对象'
  }

  const previewItems = childEntries.value.slice(0, 3).map(({ key, value }) => {
    if (isArrayValue.value) {
      return formatPreviewValue(value)
    }

    return `${key}: ${formatPreviewValue(value)}`
  })

  return childEntries.value.length > 3 ? `${previewItems.join(', ')}, ...` : previewItems.join(', ')
})
const valueText = computed(() => formatLeafValue(props.value))
const keyLabel = computed(() => {
  if (!props.nodeKey) {
    return ''
  }

  return isArrayKey(props.nodeKey) ? `[${props.nodeKey}]` : `"${props.nodeKey}"`
})
const detailOpen = computed(() => props.level < props.defaultOpenDepth)
const valueClass = computed(() => {
  if (props.value === null) {
    return 'json-tree-value-null'
  }

  if (typeof props.value === 'string') {
    return 'json-tree-value-string'
  }

  if (typeof props.value === 'number') {
    return 'json-tree-value-number'
  }

  if (typeof props.value === 'boolean') {
    return 'json-tree-value-boolean'
  }

  return 'json-tree-value-plain'
})

function isArrayKey(value: string) {
  return /^\d+$/.test(value)
}

function formatPreviewValue(value: unknown) {
  if (value === null) {
    return 'null'
  }

  if (Array.isArray(value)) {
    return `Array(${value.length})`
  }

  if (typeof value === 'object') {
    return `Object(${Object.keys(value as Record<string, unknown>).length})`
  }

  if (typeof value === 'string') {
    return value.length > 18 ? `"${value.slice(0, 18)}..."` : `"${value}"`
  }

  return String(value)
}

function formatLeafValue(value: unknown) {
  if (typeof value === 'string') {
    return `"${value}"`
  }

  return String(value)
}
</script>

<template>
  <div class="json-tree-node" :class="{ 'json-tree-node-root': isRoot }" :style="{ '--json-tree-level': String(level) }">
    <details v-if="isExpandable" class="json-tree-branch" :class="{ 'json-tree-root': isRoot }" :open="detailOpen">
      <summary class="json-tree-summary">
        <span v-if="keyLabel" class="json-tree-key" :class="{ 'json-tree-key-index': /^\d+$/.test(nodeKey) }">{{ keyLabel }}</span>
        <span v-if="isRoot" class="json-tree-root-label">Root</span>
        <span class="json-tree-type">{{ nodeTypeLabel }}</span>
        <span class="json-tree-meta">{{ itemCountLabel }}</span>
        <span class="json-tree-preview">{{ previewText }}</span>
      </summary>

      <div class="json-tree-children">
        <JsonTreeNode
          v-for="entry in childEntries"
          :key="entry.key"
          :value="entry.value"
          :node-key="entry.key"
          :level="level + 1"
          :default-open-depth="defaultOpenDepth"
          :is-root="false"
        />
      </div>
    </details>

    <div v-else class="json-tree-leaf" :class="{ 'json-tree-root': isRoot, 'json-tree-leaf-empty': isCollapsible }">
      <span v-if="keyLabel" class="json-tree-key">{{ keyLabel }}</span>
      <span v-if="isRoot" class="json-tree-root-label">Root</span>
      <span v-if="isCollapsible" class="json-tree-type">{{ nodeTypeLabel }}</span>
      <span v-if="isCollapsible" class="json-tree-meta">{{ itemCountLabel }}</span>
      <span v-if="isCollapsible" class="json-tree-preview">{{ previewText }}</span>
      <code v-else class="json-tree-value" :class="valueClass">{{ valueText }}</code>
    </div>
  </div>
</template>
