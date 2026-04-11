# 0023 Platform Foundation Refactor

## 背景

Magic Box 当前已经从“少量工具集合”发展为“持续扩展的本地优先工具平台”。现阶段工程基础可用，但随着工具数量增加，平台层已经逐步暴露出一些典型问题：

- 工具元数据、导航展示、路由配置存在分散维护问题
- 多个工具页面在布局、交互结构、结果展示上开始重复实现
- 搜索与排序能力较基础，难以支撑更多工具后的发现效率
- 收藏、最近使用、主题等本地持久化能力缺少统一抽象
- 后续新增工具仍需手工接入多个模块，接入成本偏高且易遗漏
- local-first 与 PWA 的产品定位已经明确，但平台层能力尚未系统化

本次重构目标不是改变产品定位，而是在不影响现有功能可用性的前提下整理平台底座，为后续 20 到 50 个工具的扩展提供稳定支撑。

## 用户故事

作为持续扩展 Magic Box 的开发者，我希望平台层能提供统一的工具注册、路由生成、搜索排序、页面骨架和本地存储能力，从而让新增工具的接入更简单、已有工具体验更一致，也让后续维护成本保持可控。

## 本次范围

- 建立统一的工具注册中心，让工具信息成为单一事实源
- 让路由、导航、搜索索引、收藏展示基于统一注册信息自动派生
- 抽象统一的工具页面骨架组件，减少页面重复代码
- 建立统一的本地存储层，规范 key、版本和迁移策略
- 升级搜索排序逻辑，引入相关度、收藏、最近使用等权重
- 为后续新增工具提供标准接入方式，降低维护成本
- 采用可逐步迁移的方式落地，保证随时可回滚

## 不做什么

- 不对所有已存在工具的业务逻辑做重写
- 不强制一次性替换所有工具页面样式，只优先抽离共性结构
- 不引入后端服务，不改变 local-first 基本策略
- 不在本次内完成所有 PWA 能力增强
- 不在本次内引入插件市场、在线同步或多用户配置同步
- 不修改现有工具的核心对外功能定义

## 用户问题

当前用户未必直接感知到底层架构问题，但会通过以下体验表现出来：

| 问题 | 用户表现 |
| --- | --- |
| 工具越来越多但搜索不够智能 | 输入关键词后目标工具不总在前面 |
| 页面体验不统一 | 不同工具的操作区、结果区、复制方式不一致 |
| 新工具上线节奏变慢 | 工具接入链路长、易出错 |
| 离线/联网能力边界不清晰 | 用户不知道某个工具是否依赖网络 |
| 常用工具访问路径不够短 | 收藏和最近使用能力还可以继续加强 |

## 方案概览

本次重构拆为五个子模块，可按相互独立的方式分阶段上线：

- Tool Registry 重构
- Router 自动派生
- Workbench UI 基础组件抽象
- Storage 层统一
- Search Ranking 升级

## 详细方案

### 1. Tool Registry：统一工具注册中心

#### 现状

当前工具数据至少分布在以下几个位置：

- 路由配置
- 工具展示数据
- 文档或 roadmap

新增一个工具时需要改多处，容易发生遗漏和漂移。

#### 目标

建立统一的工具注册中心，作为以下能力的唯一数据来源：

- 路由
- 首页和侧边栏展示
- 搜索索引
- 收藏排序
- 最近使用
- 工具标签展示
- 后续文档生成

#### 数据结构草案

```ts
export type ToolCategory =
  | 'developer'
  | 'content'
  | 'media'
  | 'productivity'
  | 'utility'

export type ToolCapabilityTag =
  | 'offline-ready'
  | 'network-required'
  | 'local-processing'
  | 'beta'
  | 'favorite-supported'
  | 'history-supported'

export interface ToolDefinition {
  id: string
  title: string
  description: string
  category: ToolCategory
  path: string
  keywords: string[]
  tags: ToolCapabilityTag[]
  order?: number
  hidden?: boolean
  searchableText?: string
  loader: () => Promise<unknown>
}
```

#### 目录建议

```text
src/
  tools/
    registry/
      categories.ts
      definitions.ts
      index.ts
      search.ts
      types.ts
```

#### 约束

- 每个工具必须有唯一 `id`
- 每个工具必须有唯一 `path`
- `loader` 必须使用动态导入
- 路由不可再单独手写重复工具定义
- 搜索字段默认由 `title + description + keywords + category` 派生

#### 验收标准

- 新增工具只需在 registry 中增加一条定义即可接入主流程
- 首页、侧边栏、路由均基于 registry 自动生成
- 删除任一工具时，不需要在多处同步删除

### 2. Router：从 registry 自动生成路由

#### 现状

当前各工具页面路由由人工维护，未来工具增多后会持续膨胀。

#### 目标

- 所有工具路由从 registry 自动生成
- 默认采用懒加载，降低首屏成本
- 支持工具独立 meta 信息，例如标题、分类和标签

#### 路由生成示意

```ts
const toolRoutes = toolDefinitions.map((tool) => ({
  path: tool.path,
  name: tool.id,
  component: tool.loader,
  meta: {
    title: tool.title,
    category: tool.category,
    tags: tool.tags,
  },
}))
```

#### 约束

- 所有工具页必须懒加载
- 非工具页（首页、关于页、spec flow 页面等）可以保留静态声明
- 404 页与默认重定向逻辑保持兼容

#### 验收标准

- 首屏 bundle 相较当前版本下降，或至少没有明显升高
- 工具页访问正常，刷新路由不报错
- 新增工具不需要修改 `router/index.ts` 中的工具列表

### 3. Workbench UI：抽象通用页面骨架

#### 现状

多数工具页面都具备类似结构，但大概率由各自独立实现：

- 输入区域
- 参数区域
- 输出区域
- 错误提示
- 复制或下载操作
- 示例和说明区

#### 目标

抽取可组合的通用 UI 组件，减少重复实现并统一体验。

#### 计划组件

`ToolPageLayout`

- 负责整体页面布局
- 包含页面标题、描述、标签展示和主体双栏或单栏容器

`ToolPanel`

- 负责通用卡片容器
- 包含标题、副标题、操作区和内容区

`ResultCard`

- 负责展示输出结果
- 支持纯文本、代码块、状态信息和复制按钮

`ErrorBanner`

- 负责统一错误态展示
- 支持错误标题、错误详情和可选恢复建议

`ToolActionBar`

- 负责统一操作按钮区
- 支持运行、清空、复制、下载和使用示例等操作

`ToolTagList`

- 负责展示能力标签
- 例如 Offline Ready、Network Required、Local Processing、Beta

#### 目录建议

```text
src/components/toolkit/
  ToolActionBar.vue
  ToolPageLayout.vue
  ToolPanel.vue
  ResultCard.vue
  ErrorBanner.vue
  ToolTagList.vue
```

#### 设计原则

- 允许组合，不要过度封装成黑盒
- 优先抽通用结构，不抽业务差异过大的逻辑
- 工具页可局部覆盖样式，但应遵循统一 spacing 和 token

#### 验收标准

- 至少 3 个现有工具迁移到新骨架且功能不回退
- 新增工具可以只通过装配基础组件完成页面主体
- 不同工具间的交互结构更加统一

### 4. Storage：统一本地存储抽象

#### 现状

本地存储能力分散在 store 或工具内部，后续容易出现：

- key 命名不统一
- 数据结构无版本
- 难以迁移
- 难以测试

#### 目标

建立统一 storage 层，负责：

- key 规范
- schema version
- 默认值
- 安全读写
- 迁移策略

#### key 规范

统一使用以下前缀：

```text
magic-box:v1:<domain>
```

例如：

- `magic-box:v1:theme`
- `magic-box:v1:favorites`
- `magic-box:v1:recent-tools`
- `magic-box:v1:tool-history:json-toolkit`

#### API 草案

```ts
export interface StorageAdapter {
  get<T>(key: string, fallback: T): T
  set<T>(key: string, value: T): void
  remove(key: string): void
}

export function createScopedKey(domain: string): string
export function readStorage<T>(domain: string, fallback: T): T
export function writeStorage<T>(domain: string, value: T): void
```

#### 迁移策略

- 初期兼容旧 key 读取
- 首次读取成功后迁移到新 key
- 保留迁移日志开关，便于开发调试

#### 验收标准

- 收藏、主题、最近使用接入统一 storage
- 工具本身不再散落操作裸 `localStorage`
- 升级 schema 时可做平滑迁移

### 5. Search Ranking：升级搜索与排序

#### 现状

当前搜索主要是简单 contains 匹配，再叠加少量收藏优先，相关度策略较弱。

#### 目标

让搜索结果更符合用户直觉，提高工具发现效率。

#### 排序策略

对每个工具按命中情况打分：

| 规则 | 分值建议 |
| --- | ---: |
| title 完全匹配 | +100 |
| title 前缀匹配 | +80 |
| title 包含 | +60 |
| keyword 精确匹配 | +50 |
| keyword 包含 | +35 |
| category 匹配 | +20 |
| description 匹配 | +15 |
| 已收藏 | +10 |
| 最近使用 | +15 |
| 使用频次高 | +0 到 +15 |

#### 功能补充

- 支持别名映射，例如：
  - 时间戳 / timestamp / unix
  - 二维码 / qr / qr-code
  - 请求头 / header
  - 编解码 / encode / decode
- 空搜索时默认排序：
  - 收藏优先
  - 最近使用优先
  - 再按分类和 `order`

#### 验收标准

- 常见关键词能把目标工具排到前列
- 收藏和最近使用会合理影响默认排序
- 搜索逻辑可通过单测覆盖

## 实施阶段

### Phase 1：注册中心与懒加载

范围：

- 建立 registry
- 路由由 registry 自动派生
- 首批工具迁移
- 保证现有首页与导航仍可用

产出：

- `src/tools/registry/*`
- 新版 `router/index.ts`

风险：

- 迁移初期可能出现 path 或 id 漏配
- 懒加载可能影响部分类型推断

### Phase 2：Storage 与 Search

范围：

- 抽 storage 层
- 收藏与最近使用迁移
- 搜索算法替换

产出：

- `src/lib/storage.ts`
- `src/tools/registry/search.ts`

风险：

- 老数据迁移兼容
- 排序结果变化需要产品和使用体验验收

### Phase 3：Workbench UI

范围：

- 抽通用组件
- 迁移 3 到 5 个代表性工具页
- 形成新增工具模板

推荐优先迁移工具：

- JSON Toolkit
- Request Converter
- JWT Studio
- Hash Studio
- Markdown Studio

风险：

- 过度封装导致反而难用
- 局部样式与原页面出现不一致

## 当前进展

更新时间：2026-04-11

当前状态：进行中

### 已完成

- 已建立统一工具注册中心，新增 `src/tools/registry/*`
- 已将工具元数据收口到 registry，`src/data/tool-modules.ts` 退化为兼容导出层
- 已由 registry 自动生成工具路由，`src/router/index.ts` 不再手写工具路由列表
- 已实现 registry 唯一性校验、路由派生和基础 search helper
- 已实现统一 storage 层，并提供 favorites、recent-tools 等平台级封装
- 已将主题、搜索词、收藏、最近使用接入统一 storage
- 已完成工具页层面的存储迁移，`src/views/tools/` 下不再直接使用裸 `localStorage` 或 `sessionStorage`
- 已实现搜索排序升级，支持别名映射、收藏、最近使用和使用频次加权
- 已抽出 `ToolPageLayout`、`ToolPanel`、`ResultCard`、`ErrorBanner`、`ToolActionBar`、`ToolTagList` 等基础组件
- 已迁移代表性工具页到统一骨架，包括 `Request Converter`、`JWT Studio`、`Hash Studio`
- 已在 App 导航和搜索面板接入能力标签、最近使用和新的排序逻辑

### 已完成阶段

- Phase 1：注册中心与懒加载，已完成
- Phase 2：Storage 与 Search，已完成
- Phase 3：Workbench UI，已完成首轮落地

### 已验证

- `pnpm typecheck`
- `pnpm lint`
- 平台层相关单测与组件测试
- 工具页目录下 `localStorage|sessionStorage` 静态搜索结果为 `0`

### 尚未完成

- 尚未把全部工具页迁移到统一的 Workbench 骨架组件，当前仍有部分页面沿用旧布局结构
- 尚未补充更系统的回归测试清单执行记录，例如收藏迁移、最近使用默认排序、PWA 相关人工回归
- 尚未执行 build 级验证与 bundle 体积对比

### 与原计划的差异说明

- Storage 迁移范围已超出原计划中的 favorites、recent-tools、theme，进一步覆盖到了全部工具页的本地持久化输入与配置
- Workbench UI 目前采用“先抽组件、再迁代表性页面”的方式落地，没有强行一次性迁完所有工具页
- 搜索排序已经接入主导航与搜索面板，但后续仍可继续补充更细的别名体系和解释性展示

## 技术细节约束

- 继续使用 Vue 3 + TypeScript
- 所有平台层新增逻辑都需要补对应单测
- 工具 registry 与 search 必须保持纯函数、可测试
- 不引入重量级状态管理替代方案，继续基于 Pinia
- 不新增后端依赖
- 不引入必须联网的核心平台能力

## 数据与状态

- 平台层统一管理工具注册信息、搜索索引、收藏、最近使用和主题设置
- 收藏、最近使用、主题等统一走 storage 抽象，不再由各工具散落读写
- 平台能力保持 local-first，不新增服务端依赖
- 旧存储 key 在迁移期内兼容读取，成功读取后再写回新 key

## 测试策略

### 单元测试

覆盖以下模块：

- registry 唯一性校验
- search score 计算
- storage 读写与迁移
- route 生成逻辑

### 组件测试

覆盖以下场景：

- `ToolPageLayout` 正常渲染
- `ResultCard` 复制行为
- `ErrorBanner` 展示错误
- `ToolTagList` 展示 tag

### 回归测试

重点检查：

- 收藏不丢失
- 已有工具可访问
- 搜索结果符合预期
- PWA 不受破坏
- 构建体积未异常上升

## 验收标准

### 工程层

- 工具注册信息有且仅有一个核心定义源
- 所有工具路由通过 registry 自动生成
- 新增一个工具的改动点显著减少
- 收藏、最近使用、主题等使用统一存储层
- 搜索逻辑具备明确、可测试的打分规则

### 用户体验层

- 搜索结果更准确
- 工具页结构更统一
- 首页和工具导航不出现功能回退
- 页面加载体验不差于当前版本

### 质量层

- `lint`、`typecheck`、`test`、`build` 全通过
- 新增平台层代码具备测试覆盖
- 重构过程不破坏现有工具核心能力

## 回滚方案

若任一阶段上线后出现明显问题，允许按模块回滚：

- registry 方案保留旧工具数据映射作为兜底一版
- search ranking 可通过开关退回简单 contains 逻辑
- storage 层保留旧 key 兼容读取
- Workbench UI 采用逐工具迁移，不做一次性全量替换

## 建议目录结构

```text
src/
  components/
    toolkit/
      ToolActionBar.vue
      ToolPageLayout.vue
      ToolPanel.vue
      ResultCard.vue
      ErrorBanner.vue
      ToolTagList.vue

  tools/
    registry/
      categories.ts
      definitions.ts
      index.ts
      search.ts
      types.ts

  lib/
    storage.ts
    recent-tools.ts
    favorites.ts
```

## 开发任务拆解建议

### Task 1

建立 `ToolDefinition` 类型与 registry 基础结构。

### Task 2

将现有工具数据迁移到 registry。

### Task 3

由 registry 自动生成路由并切换为懒加载。

### Task 4

抽统一 storage 层，迁移 favorites 和 recent-tools。

### Task 5

实现新版搜索打分与排序。

### Task 6

抽 `ToolPageLayout`、`ToolPanel`、`ResultCard` 等基础组件。

### Task 7

迁移代表性工具页。

### Task 8

补齐单测、组件测试与回归检查。

## 风险与待确认问题

- registry 是否只覆盖工具页，还是顺便承载部分文档生成能力，需要在实现前确认边界
- 搜索排序中的“最近使用”和“使用频次高”是否需要产品上可解释，避免结果看起来不可预测
- Workbench UI 的抽象粒度需要控制，避免把业务差异较大的工具强行塞进同一套黑盒
- storage 迁移需要明确哪些旧 key 仍需长期兼容，哪些只在一个版本内过渡

## 后续扩展空间

- 工具标签体系继续扩展，例如 offline、network、auth、text、media
- 最近使用与使用统计进一步细化
- 工具页分享链接
- 工具预设模板
- README 或 docs 自动生成工具清单
- bundle 分析与性能门禁
- 工具脚手架生成器
