<script setup lang="ts">
import { planningFiles } from '@/data/docs'
</script>

<template>
  <section class="page">
    <article class="page-card">
      <p class="eyebrow">Spec Flow</p>
      <h2 class="page-title">先写清楚，再开始做</h2>
      <p class="page-intro">
        这个页面对应仓库里的 `docs/` 目录，用来约束我们后续的规划、拆分和验收方式。
      </p>
    </article>

    <section class="page-card">
      <div class="panel-header">
        <div>
          <h3 class="panel-title">文档入口</h3>
          <p class="meta-hint">功能不直接开写，先在下面这些文件里落范围和验收标准。</p>
        </div>
      </div>

      <div class="doc-grid">
        <article v-for="item in planningFiles" :key="item.path" class="doc-card">
          <h4 class="doc-title">{{ item.title }}</h4>
          <div class="doc-list">
            <code>{{ item.path }}</code>
            <p class="doc-description">{{ item.description }}</p>
          </div>
        </article>
      </div>
    </section>

    <section class="page-card">
      <div class="panel-header">
        <div>
          <h3 class="panel-title">推荐工作流</h3>
          <p class="meta-hint">每个功能都走这四步，避免边想边堆导致返工。</p>
        </div>
      </div>

      <ol class="workflow-list">
        <li>先在 `docs/specs/` 新建功能 spec。</li>
        <li>确认范围、输入输出和验收标准。</li>
        <li>进入编码、测试和构建验证。</li>
        <li>完成后回写文档与后续迭代点。</li>
      </ol>
    </section>
  </section>
</template>
