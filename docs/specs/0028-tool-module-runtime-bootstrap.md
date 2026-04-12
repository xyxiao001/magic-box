# 0028 Tool Module Runtime Bootstrap

## 背景

`docs/architecture-refactor.md` 已经定义了 `magic-box` 从“工具页面集合”升级为“工具平台底座”的目标态，但该文档覆盖面较大，适合作为架构方向说明，不适合作为一次性编码任务的直接输入。

按照当前仓库的 spec 流程，接下来需要先把大方案拆成一个边界清晰、可验证、可逐步回滚的首期 spec，再进入编码实现。

当前仓库已经具备部分基础能力：

- `src/tools/registry/` 已能承接工具定义、分类和搜索
- `src/components/toolkit/` 已沉淀出部分通用页面骨架
- `src/lib/` 已沉淀大量可测试的纯逻辑
- `src/views/tools/` 仍承载主要工具页面，页面装配和状态管理重复度较高

因此，首期最合适的切入点不是“大规模迁目录”，而是先把后续演进所依赖的三个平台核心抽象立起来：

- 工具模块协议
- 工具运行时脚手架
- 平台级模块注册入口

## 用户故事

作为持续维护 `magic-box` 的开发者，我希望新增工具时优先接入统一的模块协议、运行时和注册中心，而不是继续复制页面级实现，从而降低新增工具成本，并为后续搜索、历史记录、草稿、分享和文档映射建立稳定的扩展点。

## 本次范围

- 新增 `src/platform/`、`src/tool-runtime/`、`src/modules/` 三层目录骨架
- 定义 `ToolModuleMeta`、`ToolCapability`、`ToolModule` 等核心协议
- 建立模块注册入口，使平台可以从“模块列表”派生注册与后续扩展能力
- 实现首版 `ToolScaffold`、`useToolState`、`useToolExecution`
- 为首批试点工具建立模块结构并接入新运行时：
  - `JSON Toolkit`
  - `Text Toolkit`
  - `UUID Studio`
- 保持现有功能、路由与搜索能力可用，允许新老结构并存
- 为新增平台层能力补最小必要测试

## 不做什么

- 不一次性迁移所有工具到 `modules/`
- 不要求本次内完成 `history`、`draft`、`share-url`、`download-output` 的完整统一实现
- 不强制把现有 `src/tools/registry/`、`src/components/toolkit/`、`src/lib/` 立即删除或整体替换
- 不在本次内完成 `feature-flags`、`analytics`、`docs` 映射、`Fuse.js`、`IndexedDB` 等增强项
- 不修改复杂会话型工具的核心模型，例如 `HTTP Lab`、`WebSocket Lab`、`Image Studio`

## 交互与页面

本次既包含开发侧结构改造，也包含首批工具页的用户可见改造。

### 开发侧接入方式

新增一个工具时，目标接入链路应收敛为：

1. 在 `src/modules/<domain>/<tool-id>/` 下创建模块目录
2. 定义 `meta.ts`、`logic.ts`、`schema.ts`、`examples.ts`、`page.vue`、`index.ts`
3. 在模块注册入口中增加模块导出
4. 由平台自动派生元数据、路由和后续搜索文档

### 首批试点工具页目标

试点工具页应尽量简化为“模块适配器”，由统一运行时承接通用行为：

- 标题、描述、能力标签统一展示
- 输入区、输出区、操作栏通过统一骨架组织
- 执行前校验、执行中状态、执行后输出由统一 composable 承接
- 错误提示、重置动作保持一致

### 页面体验约束

- 现有工具能力不能回退
- 页面布局允许与现有风格保持接近，不追求一次性统一全部视觉细节
- 对用户来说，试点工具的交互应更一致，但不应增加额外学习成本

## 目录与代码结构

### 新增目录骨架

```text
src/
  platform/
    tool-registry/
      builder.ts
      schema.ts
      validator.ts
  tool-runtime/
    protocols/
      tool-module.ts
      tool-capabilities.ts
      tool-context.ts
    scaffolds/
      ToolScaffold.vue
    composables/
      useToolState.ts
      useToolExecution.ts
  modules/
    json/
      json-toolkit/
    text/
      text-toolkit/
    security/
      uuid-studio/
```

### 模块协议草案

```ts
export interface ToolModuleMeta {
  id: string
  title: string
  category: string
  group: string
  path: string
  description: string
  keywords: string[]
  capabilities?: ToolCapability[]
  order?: number
}

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

export interface ToolModule<Input = unknown, Output = unknown> {
  meta: ToolModuleMeta
  createInitialInput: () => Input
  execute?: (input: Input, context: ToolExecutionContext) => Output | Promise<Output>
  validate?: (input: Input) => ToolValidationResult
  page: Component
}
```

### 与现有结构的关系

- 短期内保留 `src/views/tools/`，但试点工具页面从“完整页面实现”收敛为“模块适配器”或直接迁入 `modules/`
- 短期内保留 `src/tools/registry/`，但新增一层从 `ToolModule` 派生注册数据的桥接逻辑
- 短期内保留 `src/lib/`，试点工具的纯逻辑可以先复用现有实现，再逐步下沉到模块目录

## 数据与状态

- 输入来源：
  - 用户在试点工具页中的表单输入
  - `createInitialInput()` 提供统一默认值
- 输出结果：
  - `execute()` 的同步或异步执行结果
  - 校验失败时统一落到 `error`
- 是否需要本地存储：
  - 首版以兼容现有存储方式为主
  - 不新增后端存储
  - 若试点工具已有草稿或偏好存储，应保证行为不回退

`useToolState` 首版至少统一管理以下状态：

- `input`
- `output`
- `error`
- `loading`
- `dirty`
- `lastExecutedAt`

`useToolExecution` 首版至少统一承接以下流程：

- 执行前调用 `validate`
- 清理旧错误
- 包装 `try/catch`
- 写入 `output`
- 更新执行状态

## 实施步骤

### Step 1：协议与骨架

- 建立 `tool-runtime/protocols/`
- 建立 `ToolModuleMeta`、`ToolCapability`、`ToolModule`
- 实现最小可用版 `ToolScaffold.vue`
- 实现 `useToolState.ts`、`useToolExecution.ts`

### Step 2：注册桥接

- 在 `platform/tool-registry/` 中增加从模块列表派生注册结果的逻辑
- 保留与现有 registry 输出兼容的接口，避免一次性改动过大
- 增加校验：至少覆盖重复 `id`、重复 `path`、缺失基础字段

### Step 3：试点工具迁移

- 选择 `JSON Toolkit`、`Text Toolkit`、`UUID Studio`
- 为每个试点工具建立模块目录
- 优先复用现有 `lib` 纯逻辑，避免在迁移首轮重写核心算法
- 页面层切换到 `ToolScaffold + useToolState + useToolExecution`

### Step 4：验证与回写

- 补平台层与试点工具的最小必要测试
- 回写本 spec 的实施结果
- 若试点结论成立，再继续拆后续 spec，进入批量迁移阶段

## 验收标准

- 代码结构层：
  - `src/platform/`、`src/tool-runtime/`、`src/modules/` 目录骨架已建立
  - `ToolModuleMeta`、`ToolCapability`、`ToolModule` 协议已落地
  - 平台存在一个明确的模块注册入口
- 运行时层：
  - `ToolScaffold`、`useToolState`、`useToolExecution` 可被试点工具复用
  - 试点工具不再各自手写完整执行状态流转
- 迁移层：
  - `JSON Toolkit`、`Text Toolkit`、`UUID Studio` 中至少 2 个成功迁入新模式，另 1 个至少完成模块骨架
  - 用户可正常访问试点工具，核心能力不回退
- 工程质量层：
  - 新增平台层逻辑具备最小必要测试
  - 不直接破坏现有 registry、路由和搜索主流程

## 风险与待确认问题

- 首版抽象过重的风险较高，因此 `ToolModule` 协议要尽量控制在最小闭环，不要预先塞入过多字段
- 试点工具若直接迁目录，可能影响现有导入路径；首轮更适合通过桥接兼容
- `JSON Toolkit`、`Text Toolkit`、`UUID Studio` 的页面复杂度不同，迁移节奏可能不一致
- `useToolExecution` 首版只适合同步或简单异步工具，复杂会话型工具需要后续 spec 单独处理
- 如果模块注册入口与现有 `src/tools/registry/` 边界定义不清，容易出现“双事实源”

## 与后续 spec 的关系

本 spec 只解决“平台骨架是否成立”的问题。若本次试点成功，后续建议继续拆出以下独立 spec：

- `0029-sync-tool-batch-migration.md`：批量迁移同步转换类工具
- history / draft / share / download 能力协议统一
- 搜索层从 registry 搜索升级到模块搜索文档
- 复杂工具迁移策略

## 参考文档

- `docs/architecture-refactor.md`
- `docs/architecture.md`
- `docs/specs/0023-platform-foundation-refactor.md`
