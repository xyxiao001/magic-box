<script setup lang="ts">
withDefaults(
  defineProps<{
    wide?: boolean
    singleColumn?: boolean
  }>(),
  {
    wide: false,
    singleColumn: false,
  }
)
</script>

<template>
  <section class="tool-page">
    <div
      class="tool-page-layout"
      :class="{
        'wide-layout': wide,
        'tool-page-layout-single': singleColumn,
      }"
    >
      <template v-if="$slots.editor || $slots.viewer">
        <section v-if="$slots.editor" class="editor-pane">
          <slot name="editor" />
        </section>
        <section v-if="$slots.viewer" class="viewer-pane">
          <slot name="viewer" />
        </section>
      </template>

      <slot v-else />
    </div>
  </section>
</template>

<style scoped>
.tool-page-layout-single {
  grid-template-columns: minmax(0, 1fr);
}
</style>
