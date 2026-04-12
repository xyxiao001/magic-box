# Architecture Refactor

## 文档定位

`magic-box` 已经从单纯的工具集合，演进为一个具备工作台、收藏、最近使用、历史记录、PWA、文档约束与统一 UI 风格的 local-first 工具平台。

`docs/architecture.md` 记录当前已经落地的工程事实；本文档描述下一阶段的目标架构与迁移方案，用来指导后续目录演进、平台抽象与工具接入方式。

相关文档：

- `docs/architecture.md`：当前已落地架构事实
- `docs/specs/0023-platform-foundation-refactor.md`：平台基础重构的落地 spec 与阶段进展
- `docs/specs/0028-tool-module-runtime-bootstrap.md`：本轮按 spec 流程推进的首期执行范围
- `docs/specs/0029-sync-tool-batch-migration.md`：第二批同步转换类工具的批量迁移方案
- `docs/roadmap.md`：版本路线图与工具批次规划

## 1. 背景与目标

`magic-box` 当前的架构方向是正确的，但随着工具数量持续增长，项目的核心矛盾已经从“如何再做一个新工具”，转向“如何让后续几十个工具继续低成本接入，并保持一致的可维护性、可测试性和体验质量”。

本次重构的目标不是推翻现有实现，而是在保留已有能力的前提下，把项目从“工具页面集合”升级为“工具平台底座”。

本方案重点解决以下问题：

1. 工具页视图层重复逻辑较多，新增工具仍依赖页面级复制改造。
2. 工具注册表偏展示配置，尚未升级为平台元数据中心。
3. 工具能力如复制、下载、导入、历史记录、分享、示例数据等缺少统一协议。
4. 状态管理与本地持久化边界未来会膨胀。
5. 搜索增强、文档映射、埋点、实验开关等能力还没有统一承接点。
6. 测试重心偏 `lib` 层，平台级与交互级保障仍需加强。

## 2. 与现状衔接

当前仓库已经具备一套较完整的平台化基础设施，例如：

- `src/platform/tool-registry/`：已经承接工具注册、定义构建与搜索相关能力
- `src/tool-runtime/`：已经承接工具运行时、脚手架与通用能力
- `src/modules/`：已经成为工具页面、模块协议和领域实现的主要承载层
- `src/components/toolkit/`：已经沉淀页面骨架与通用工具页组件
- `src/lib/storage.ts`：已经承担本地存储抽象与旧 key 迁移
- `src/lib/`：仍是多数工具纯逻辑与单测的主要归属地

因此，这份方案可以从“迁移中设计文档”理解为“平台化重构落地说明”。当前重点不再是推动旧结构逐步迁移，而是巩固职责边界、清理历史兼容层，并为后续扩展提供稳定约束。

## 3. 重构原则

### 3.1 平台优先，而不是页面优先

后续新增工具应尽量依赖统一的脚手架、协议和基础设施，而不是继续新增大量独立页面逻辑。

### 3.2 业务逻辑下沉，页面只做编排

尽可能把纯逻辑放到 `lib` / `modules` / `composables` 中，视图组件只负责组织输入、输出和状态展示。

### 3.3 配置驱动优先

工具的元信息、能力、搜索词、分组、文档关联、实验开关等，应尽量从“硬编码逻辑”转为“声明式配置”。

### 3.4 local-first 与安全边界明确

默认优先本地处理；涉及网络请求、敏感数据、历史记录的功能，必须显式区分能力与风险边界。

### 3.5 渐进式重构

以兼容现有功能为前提，通过“新增平台抽象 + 旧工具逐步迁移”的方式推进，而不是一次性重写。

## 4. 总体架构目标

重构后，项目应形成以下几层：

| 层级 | 职责 |
| --- | --- |
| App Shell 层 | 应用入口、路由、主题、PWA、全局布局 |
| Platform 层 | 工具注册、能力协议、搜索、持久化、埋点、实验开关 |
| Tool Runtime 层 | 通用工具脚手架、通用 composables、历史/导出/导入等横切能力 |
| Tool Module 层 | 每个工具的领域逻辑、schema、示例数据、页面适配器 |
| Shared UI / Shared Utils 层 | 通用组件、工具函数、类型定义 |

核心思想是：

> “页面”不再是工具的核心单位，`Tool Module` 才是核心单位；页面只是模块的呈现方式之一。

## 5. 推荐目录改造

### 5.1 现状问题

当前目录结构已经比早期方案清晰很多，但仍有一些值得持续关注的边界：

- `src/modules` 已承载工具实现，但部分页面仍保留旧存储兼容逻辑
- `src/lib` 是纯逻辑区，但仍可继续按领域补齐归属边界
- `src/tools/registry` 现在主要是兼容导出层，真实平台中心已转到 `src/platform/tool-registry`
- `src/stores` 仍需要避免继续扩张成杂糅层

### 5.2 推荐目录结构

```text
src/
  app/
    App.vue
    main.ts
    router/
      index.ts
      guards.ts
    providers/
      theme.ts
      pwa.ts
      analytics.ts

  platform/
    tool-registry/
      definitions/
        index.ts
        developer.ts
        text.ts
        security.ts
        media.ts
        productivity.ts
        network.ts
      schema.ts
      builder.ts
      validator.ts
      search.ts
      categories.ts
      capabilities.ts
    persistence/
      storage.ts
      keys.ts
      adapters/
        local-storage.ts
        indexed-db.ts
    search/
      engine.ts
      synonyms.ts
      ranking.ts
      presets.ts
    docs/
      doc-links.ts
    feature-flags/
      index.ts
    analytics/
      events.ts
      tracker.ts

  tool-runtime/
    scaffolds/
      ToolScaffold.vue
      ToolInputPanel.vue
      ToolOutputPanel.vue
      ToolActionBar.vue
      ToolStatusBar.vue
      ToolHistoryPanel.vue
    composables/
      useToolState.ts
      useToolHistory.ts
      useToolFavorites.ts
      useToolRecent.ts
      useToolDraft.ts
      useToolClipboard.ts
      useToolDownload.ts
      useToolShare.ts
      useToolExecution.ts
    protocols/
      tool-module.ts
      tool-capabilities.ts
      tool-context.ts
    services/
      tool-history-service.ts
      tool-draft-service.ts
      tool-share-service.ts

  modules/
    json/
      json-toolkit/
        index.ts
        meta.ts
        schema.ts
        examples.ts
        page.vue
        logic.ts
        transforms.ts
        __tests__/
      json-typegen/
        ...
      json-diff-jsonpath/
        ...
    text/
      markdown-studio/
      text-toolkit/
      diff-studio/
      sql-formatter/
    network/
      http-lab/
      websocket-lab/
      package-radar/
      weather-desk/
    security/
      jwt-studio/
      jwt-sign-verify/
      hmac-signer/
      hash-studio/
      uuid-studio/
    media/
      qrcode-studio/
      image-studio/
      color-studio/
    productivity/
      cron-planner/
      calculator-pro/
      unit-converter/
      clipboard-history/
      white-noise-studio/

  shared/
    components/
      base/
      feedback/
      form/
      display/
    composables/
      useDebounce.ts
      useAsyncTask.ts
    utils/
      string.ts
      number.ts
      date.ts
      file.ts
      crypto.ts
    types/
      common.ts
      ui.ts
    constants/
      app.ts
      routes.ts

  stores/
    workbench.ts
    preferences.ts
    pwa.ts

  styles/
    tokens.css
    theme.css
    utilities.css
```

### 5.3 目录改造思路说明

#### `app/`

只处理应用级启动逻辑，不承载具体工具实现。

#### `platform/`

平台能力中心，重点承接：

- 工具注册与校验
- 搜索引擎
- 持久化适配
- 埋点
- 文档关联
- 实验开关

#### `tool-runtime/`

通用工具运行时，负责所有工具共享的行为协议与脚手架。例如：

- 统一输入/输出布局
- 历史记录
- 草稿恢复
- 复制/下载/分享
- 错误状态与执行状态管理

#### `modules/`

每个工具的真正归属地。一个工具不再只是 `views/tools/xxx.vue`，而是一个完整模块：

- `meta.ts`：工具元数据
- `schema.ts`：输入输出结构
- `logic.ts`：纯逻辑
- `examples.ts`：示例数据
- `page.vue`：页面适配器

#### `shared/`

不与工具强耦合的通用能力。

## 6. 工具模块抽象设计

### 6.1 目标

定义统一的工具模块协议，让平台能够基于模块做：

- 注册
- 路由生成
- 搜索
- 自动渲染工具页框架
- 自动注入收藏、最近使用、历史、分享、导出等能力

### 6.2 推荐核心协议

```ts
export interface ToolModuleMeta {
  id: string
  title: string
  category: string
  group: string
  path: string
  description: string
  keywords: string[]
  aliases?: string[]
  tags?: string[]
  status?: 'stable' | 'beta' | 'experimental'
  capabilities?: ToolCapability[]
  docs?: {
    spec?: string
    help?: string
    adr?: string[]
  }
  search?: {
    commonQueries?: string[]
    searchableText?: string
  }
  seo?: {
    title?: string
    description?: string
  }
  featureFlag?: string
  order?: number
}
```

```ts
export type ToolCapability =
  | 'favorite'
  | 'recent'
  | 'history'
  | 'draft'
  | 'copy-output'
  | 'download-output'
  | 'import-file'
  | 'share-url'
  | 'sample-data'
  | 'network-access'
  | 'sensitive-input'
```

```ts
export interface ToolModule<Input = unknown, Output = unknown> {
  meta: ToolModuleMeta
  createInitialInput: () => Input
  execute?: (input: Input, context: ToolExecutionContext) => Output | Promise<Output>
  validate?: (input: Input) => ToolValidationResult
  useViewModel?: () => ToolViewModel<Input, Output>
  page: Component
}
```

### 6.3 设计说明

#### `meta`

平台配置的主入口，后续所有展示与能力判断尽量从这里读取。

#### `createInitialInput`

统一输入初始化，避免每个页面自己写默认值散落。

#### `execute`

适合“输入 -> 输出”清晰的工具，尤其是文本转换、生成类工具。

#### `validate`

统一校验入口，便于脚手架显示错误。

#### `useViewModel`

为复杂工具保留扩展点，比如 `HTTP Lab` / `WebSocket Lab` 这类非简单同步转换工具。

#### `page`

实际展示组件，作为模块渲染入口。

## 7. Tool Runtime 抽象设计

### 7.1 统一脚手架目标

平台希望把 70% 以上工具纳入同一交互骨架：

- 标题与描述
- 输入面板
- 操作栏
- 结果面板
- 错误提示
- 历史记录
- 导出/复制/重置
- 示例数据
- 最近使用更新

### 7.2 推荐脚手架组件

#### `ToolScaffold.vue`

统一承接：

- 工具页标题区
- 能力标签区
- editor/viewer 两栏布局
- 错误态/空态
- 底部操作区

建议 props：

```ts
interface ToolScaffoldProps {
  meta: ToolModuleMeta
  loading?: boolean
  error?: string | null
  wide?: boolean
  singleColumn?: boolean
}
```

slots：

- `header`
- `input`
- `actions`
- `output`
- `history`
- `footer`

#### `ToolActionBar.vue`

统一渲染常见按钮：

- 运行
- 重置
- 复制结果
- 下载结果
- 导入文件
- 加载示例
- 收藏

按钮显示由 `capabilities` 决定。

#### `ToolHistoryPanel.vue`

统一历史记录的展示、搜索、恢复、清除逻辑。不要让每个工具自己重写历史面板。

### 7.3 推荐 composables

#### `useToolState`

统一管理：

- `input`
- `output`
- `error`
- `loading`
- `dirty`
- `lastExecutedAt`

#### `useToolExecution`

对同步/异步执行流程统一封装：

- 执行前校验
- `try/catch`
- 成功后写 `history` / `recent`
- 失败后设置 `error`

#### `useToolHistory`

统一处理按工具维度的历史记录。

#### `useToolDraft`

支持自动草稿恢复。

#### `useToolClipboard`

封装复制逻辑和反馈提示。

#### `useToolDownload`

封装文本、JSON、图片、CSV 等通用导出逻辑。

#### `useToolShare`

负责 URL state 编码/解码，适合 URL Inspector、Markdown、JSON 等工具。

## 8. 注册中心重构设计

### 8.1 从“definitions.ts”升级为“模块注册中心”

当前 `definitions.ts` 已经很接近平台元数据中心，但不建议继续把所有定义堆在一个大文件中。

推荐改造：

```text
platform/tool-registry/definitions/
  developer.ts
  text.ts
  network.ts
  security.ts
  media.ts
  productivity.ts
  index.ts
```

每个文件导出一组 `ToolModuleMeta` 或模块引用。

### 8.2 注册流程建议

```ts
import { developerTools } from './definitions/developer'
import { networkTools } from './definitions/network'
import { mediaTools } from './definitions/media'

export const toolModules = [
  ...developerTools,
  ...networkTools,
  ...mediaTools,
]
```

然后统一走：

- `validateToolModules()`
- `buildToolRoutes()`
- `buildSearchIndex()`

### 8.3 增加校验规则

除了现有的 `duplicateIds` / `duplicatePaths`，建议新增：

- title 唯一性校验
- category/group 合法性校验
- capability 合法性校验
- docs 路径存在性校验
- featureFlag 合法性校验
- 搜索字段长度/空值校验

## 9. 搜索系统重构设计

### 9.1 目标

从“简单字符串命中”升级为“可配置、可扩展、可运营优化”的搜索层。

### 9.2 推荐结构

```text
platform/search/
  engine.ts
  synonyms.ts
  ranking.ts
  presets.ts
```

#### `synonyms.ts`

维护通用同义词组，不要内联在评分逻辑中。

#### `ranking.ts`

定义标题、关键词、别名、类目、常见查询的权重。

#### `engine.ts`

统一产出搜索结果，后续可以切到 `Fuse.js` 而不影响外部接口。

### 9.3 推荐接口

```ts
export interface ToolSearchDocument {
  id: string
  title: string
  category: string
  keywords: string[]
  aliases?: string[]
  description: string
  commonQueries?: string[]
  searchableText?: string
}
```

```ts
export interface ToolSearchEngine {
  search(query: string, context?: ToolSearchContext): ToolSearchResult[]
}
```

### 9.4 搜索实现建议

短期可保留当前自研评分逻辑，但接口层先抽象出来。中期可接入 `Fuse.js`，只替换 `engine.ts` 内部实现。

## 10. 状态管理与持久化设计

### 10.1 状态拆分建议

| Store | 职责 |
| --- | --- |
| `workbench` | 首页工作台聚合态 |
| `preferences` | 主题、布局、偏好设置 |
| `favorites` | 收藏工具 |
| `recent-tools` | 最近使用 |
| `tool-history` | 按工具的历史记录索引 |
| `pwa` | 更新提示、安装状态 |
| `search` | 搜索词、筛选条件 |

不建议把所有东西继续堆在一个 store。

### 10.2 持久化适配层

不要让 Store 或工具页面直接读写 `localStorage`。

推荐结构：

```text
platform/persistence/
  storage.ts
  keys.ts
  adapters/
    local-storage.ts
    indexed-db.ts
```

统一接口：

```ts
export interface KeyValueStorage {
  get<T>(key: string): Promise<T | null> | T | null
  set<T>(key: string, value: T): Promise<void> | void
  remove(key: string): Promise<void> | void
}
```

这样后续可以平滑迁移：

- 轻量数据走 `LocalStorage`
- 历史记录、剪贴板、草稿走 `IndexedDB`

## 11. 不同类型工具的推荐实现模式

### 11.1 同步转换类工具

适用：

- JSON Toolkit
- Codec Lab
- SQL Formatter
- Text Toolkit
- Header & Cookie Lab

推荐模式：

- `logic.ts` 提供纯函数
- `page.vue` 通过 `useToolState + useToolExecution` 组织页面
- `history`、`copy`、`download` 由 runtime 承接

### 11.2 生成类工具

适用：

- UUID Studio
- Hash Studio
- HMAC Signer
- QRCode Studio

推荐模式：

- `schema.ts` 管理配置项
- `execute()` 直接产出结果
- `download`、`copy` 由 capability 自动带出

### 11.3 会话型 / 网络型工具

适用：

- HTTP Lab
- WebSocket Lab
- Weather Desk
- Package Radar

推荐模式：

- 保留更强的 `useViewModel`
- 网络状态、连接状态单独建 composable
- 明确 capability 包含 `network-access`
- 历史记录与敏感字段做差异化存储

### 11.4 富交互编辑类工具

适用：

- Markdown Studio
- Image Studio
- Clipboard History

推荐模式：

- 允许模块内部保留更高自由度
- 但仍接入统一 scaffold、history、favorites、recent、draft

## 12. 推荐代码结构示意图

### 12.1 平台总体关系图

```text
┌──────────────────────── App Shell ────────────────────────┐
│ main.ts / router / theme / pwa / global layout           │
└───────────────────────────┬───────────────────────────────┘
                            │
                            ▼
┌────────────────────── Platform Layer ─────────────────────┐
│ tool-registry / search / persistence / analytics / docs   │
└───────────────────────────┬───────────────────────────────┘
                            │
                            ▼
┌────────────────────── Tool Runtime ───────────────────────┐
│ ToolScaffold / capabilities / useToolState / history      │
│ clipboard / download / draft / execution                  │
└───────────────────────────┬───────────────────────────────┘
                            │
                            ▼
┌────────────────────── Tool Modules ───────────────────────┐
│ json-toolkit / markdown / http-lab / jwt / qrcode ...     │
│ meta / schema / logic / examples / page                   │
└───────────────────────────┬───────────────────────────────┘
                            │
                            ▼
┌──────────────────────── Shared Layer ─────────────────────┐
│ base components / utils / types / constants               │
└───────────────────────────────────────────────────────────┘
```

### 12.2 单个工具模块结构图

```text
modules/json/json-toolkit/
  meta.ts        -> 工具元数据
  schema.ts      -> 输入输出结构定义
  logic.ts       -> JSON 格式化 / 压缩 / 校验纯逻辑
  examples.ts    -> 示例输入
  page.vue       -> 页面适配器
  __tests__/     -> 单测
```

运行关系：

```text
meta.ts ─┐
schema.ts ├──> Tool Module ───> Registry ───> Router / Search / Workbench
logic.ts ─┤
page.vue ─┘                │
                           └──> Tool Runtime (history / copy / download / draft)
```

### 12.3 工具页面执行流

```text
用户输入
   │
   ▼
useToolState
   │
   ▼
validate(input)
   │
   ├── 校验失败 -> 展示错误
   │
   └── 校验通过
          │
          ▼
      execute(input)
          │
          ├── 成功 -> output
          │         ├── recent +1
          │         ├── history 写入
          │         └── 可选自动复制 / 分享
          │
          └── 失败 -> error
```

## 13. 页面层推荐写法

重构后，页面组件应尽量简化为“模块适配器”。

推荐风格：

```vue
<script setup lang="ts">
import { useToolState } from '@/tool-runtime/composables/useToolState'
import { useToolExecution } from '@/tool-runtime/composables/useToolExecution'
import { jsonToolkitModule } from './index'

const state = useToolState(jsonToolkitModule)
const { run, reset } = useToolExecution(jsonToolkitModule, state)
</script>

<template>
  <ToolScaffold :meta="jsonToolkitModule.meta" :error="state.error">
    <template #input>
      <JsonEditor v-model="state.input.source" />
    </template>

    <template #actions>
      <ToolActionBar
        :meta="jsonToolkitModule.meta"
        @run="run"
        @reset="reset"
      />
    </template>

    <template #output>
      <JsonResultViewer :value="state.output" />
    </template>

    <template #history>
      <ToolHistoryPanel :tool-id="jsonToolkitModule.meta.id" />
    </template>
  </ToolScaffold>
</template>
```

这样每个工具页的差异只剩下：

- 特定输入组件
- 特定结果组件
- 特定执行逻辑

而不是重复拼装整页结构。

## 14. 文档体系重构建议

建议在 `docs/` 内补齐以下文档结构：

```text
docs/
  architecture.md
  architecture-refactor.md
  roadmap.md
  adr/
    0001-tool-registry-driven-architecture.md
    0002-local-first-data-policy.md
    0003-tool-runtime-capability-protocol.md
  specs/
    ...
```

推荐拆分：

- `architecture.md`：描述当前已落地架构事实
- `architecture-refactor.md`：描述本次重构方案
- `adr/`：记录关键架构决策

这样可以避免 README、架构文档、实现状态长期脱节。

## 15. 分阶段实施路径

### P0：两周内可落地的最小重构

目标：先搭平台骨架，不大规模迁移。

1. 新增 `platform/`、`tool-runtime/`、`modules/` 目录
2. 抽出 `ToolModuleMeta`、`ToolCapability`、`ToolModule` 协议
3. 重写注册中心为 `tool-modules` 形式
4. 实现 `ToolScaffold`、`useToolState`、`useToolExecution`
5. 选择 2 到 3 个典型工具迁移试点：
   - JSON Toolkit
   - Text Toolkit
   - UUID Studio

成果：

- 新老架构可并存
- 平台抽象被验证
- 新工具可直接走新模式

### P1：一个版本周期内完成

目标：把“高重复、低复杂工具”批量迁移。

1. 批量迁移文本 / 生成 / 格式化类工具
2. 引入统一 history / draft / copy / download
3. 搜索层抽象为独立 engine
4. 拆分 store 与持久化层
5. 增加 registry 校验规则
6. 补齐 architecture + ADR 文档

迁移优先级建议：

- JSON / Text / Codec / Diff / SQL / UUID / Hash / HMAC / QRCode

### P2：平台增强期

目标：处理复杂工具与工程护栏。

1. 迁移 HTTP Lab / WebSocket Lab / Image Studio 等复杂工具
2. 接入 Playwright 关键路径 E2E
3. 接入 bundle 分析
4. 增加敏感数据保护策略
5. 视情况引入 `Fuse.js` / `Dexie`

## 16. 风险与规避

### 风险 1：抽象过度，反而拖慢开发

规避方式：只抽象高频公共行为，不强行让所有工具共用完全相同模型。

### 风险 2：复杂工具难以塞进统一协议

规避方式：协议允许 `useViewModel` 扩展，不追求“一刀切”。

### 风险 3：新老目录并存造成混乱

规避方式：通过迁移清单与 README 明确标记“新模块规范”，旧目录只做兼容过渡。

### 风险 4：持久化重构引发历史数据兼容问题

规避方式：设计 storage version 与 migration 逻辑。

## 17. 最终建议

这次重构的核心，不是“把代码换个目录”，而是建立三件最重要的东西：

1. 工具模块协议
2. 工具运行时脚手架
3. 平台级元数据中心

只要这三件事立住，后续无论是继续加工具、做搜索增强、做文档映射、做埋点、做实验开关、做 AI 能力接入，都会容易很多。

对 `magic-box` 来说，最关键的转变是：

> 从“每个工具都是一个页面”
>
> 升级到
>
> “每个工具都是一个模块，页面只是模块的外壳”。
