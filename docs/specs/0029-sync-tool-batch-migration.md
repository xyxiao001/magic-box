# 0029 Sync Tool Batch Migration

## 背景

`docs/specs/0028-tool-module-runtime-bootstrap.md` 已完成首轮平台骨架验证。当前仓库已经具备以下基础能力：

- `ToolModule` 协议已落地
- `ToolScaffold`、`useToolState`、`useToolExecution` 已可复用
- `draft`、`history`、全局 `message` 已进入 runtime 层
- `JSON Toolkit`、`Text Toolkit`、`UUID Studio` 已完成试点迁移
- 模块定义已可通过桥接层进入现有 registry 和路由主流程

这意味着项目已经不再停留在“目录实验”阶段，而是进入“批量迁移同类工具”的阶段。

结合 `docs/architecture-refactor.md` 中“优先迁移高重复、低复杂、同步转换类工具”的原则，本 spec 选取以下 4 个工具作为第二批迁移对象：

- `Request Converter`
- `URL Inspector`
- `CSV Toolkit`
- `SQL Formatter`

这 4 个工具具备相似特征：

- 输入输出边界清晰
- 主逻辑已经沉淀在 `src/lib/`
- 以 local-first 为主，不依赖复杂会话状态
- 页面层存在重复的草稿存储、复制提示、布局装配逻辑
- 适合直接吃到 `ToolScaffold`、`draft`、`history`、`message` 的平台收益

## 用户故事

作为 `magic-box` 的维护者，我希望把第二批同步转换类工具迁移到统一模块模式，使新增工具和既有工具都能共享一致的页面骨架、执行流、草稿恢复、历史记录和复制反馈，从而降低维护成本，并为后续继续批量迁移提供稳定模板。

## 本次目标

- 为 4 个工具建立 `modules/` 归属目录
- 将 4 个工具从旧页面实现迁移到 `ToolScaffold + useToolState + useToolExecution`
- 接入统一的 `draft`、`history`、全局 `message`
- 保留现有路由、搜索与工作台入口不变
- 尽量兼容已有本地存储 key，避免迁移后用户输入丢失
- 为本批次迁移补最小必要测试

## 不做什么

- 不迁移 `HTTP Lab`、`WebSocket Lab`、`Image Studio`、`Markdown Studio` 等复杂会话型或富交互工具
- 不在本次内处理 `download-output`、`share-url`、`sample-data` 的完整 runtime 协议
- 不要求本次完成 `src/data/tool-modules.ts` 与 registry 的最终单一事实源收口
- 不强行统一这 4 个工具的所有视觉细节，只要求进入统一执行与平台能力模型

## 迁移对象分析

### 1. Request Converter

当前特征：

- 输入是单段 cURL 文本
- 输出是结构化 JSON、`fetch`、`axios`、`node-fetch` 代码片段
- 已有旧存储 key：`magic-box.request-converter.curl`、`magic-box.request-converter.tab`
- 页面中已有 `tab`、复制、错误提示、草稿存储

迁移建议：

- 模块输入结构：
  - `curlInput`
  - `activeTab`
- 模块输出结构：
  - `parsed`
  - `configJson`
  - `fetchSnippet`
  - `axiosSnippet`
  - `nodeFetchSnippet`
- `draft`：
  - 自动保存 `curlInput`
  - 可选保存 `activeTab`
  - 需兼容旧 key
- `history`：
  - 只在解析成功时记录
  - 历史项 label 建议使用 `METHOD + URL host`
- 风险：
  - `activeTab` 更接近 UI 状态，不一定应进入 `execute` 输出，需要在 page adapter 中决定保留在 view state 还是模块输出

### 2. URL Inspector

当前特征：

- 输入是一段完整 URL
- 输出为解析结果、Query JSON、可编辑 query 参数列表和重建 URL
- 页面逻辑包含“解析结果 -> 可编辑状态 -> 重建输入”双向流转
- 当前草稿是页面层自己存 `tool-history:url-inspector:input`

迁移建议：

- 模块输入结构：
  - `urlInput`
- 模块输出结构：
  - 解析结果对象
  - `queryJson`
  - 解码提示
- 页面局部状态：
  - `protocol`
  - `hostname`
  - `port`
  - `pathname`
  - `hash`
  - `queryEntries`
- `draft`：
  - 自动保存 `urlInput`
  - 若保留 query 编辑态为页面局部状态，则不强制进入 draft 首版
- `history`：
  - 建议显式“保存快照”，避免用户每改一个 query 参数都进入历史
  - 历史项 label 建议使用 `host + pathname`
- 风险：
  - 这是本批里最接近“解析 + 编辑 + 重新生成”的工具，迁移时要避免把所有编辑态都错误塞进纯 `execute` 模型

### 3. CSV Toolkit

当前特征：

- 支持 `CSV -> JSON` 与 `JSON -> CSV`
- 结果包含表格预览、JSON 文本、CSV 文本
- 选项较多：分隔符、表头、空白过滤
- 当前页面已经有接近 runtime 的结构，但仍是页面自管理

迁移建议：

- 模块输入结构：
  - `inputMode`
  - `inputText`
  - `options`
- 模块输出结构：
  - `previewResult`
  - `jsonOutput`
  - `csvOutput`
- 页面局部状态：
  - `outputTab`
- `draft`：
  - 自动保存输入模式、输入文本和选项
  - `outputTab` 可作为页面级存储，不要求进入 `execute`
- `history`：
  - 建议显式“保存快照”
  - 历史项 label 建议使用 `CSV -> JSON` 或 `JSON -> CSV`
- 风险：
  - 输出是多视图结果，而不是单一文本；迁移时要避免把 tab 选择和计算结果混成一层数据

### 4. SQL Formatter

当前特征：

- 输入是 SQL 文本
- 输出是格式化后的 SQL
- 选项简单：关键字大小写、缩进、是否压缩
- 页面交互模式与 `Text Toolkit` 高度相似

迁移建议：

- 模块输入结构：
  - `sqlInput`
  - `options`
- 模块输出结构：
  - `formattedResult`
  - `inputStats`
  - `outputStats`
  - `hasChanges`
- `draft`：
  - 自动保存输入与选项
- `history`：
  - 建议显式“保存快照”
  - 历史项 label 建议使用 `格式化 SQL` 或 `压缩 SQL`
- 风险：
  - 风险最低，建议作为本批里最先落地的工具之一

## 统一迁移原则

### 1. 保持纯逻辑继续留在 `lib`

本批不要求重写已有算法。优先继续复用：

- `src/lib/request-converter.ts`
- `src/lib/url-inspector.ts`
- `src/lib/csv-toolkit.ts`
- `src/lib/sql-formatter.ts`

模块层优先做输入输出收口，而不是重写已有纯逻辑。

### 2. 页面只做适配，不重复存储逻辑

迁移后页面应尽量只承接：

- 输入控件
- 结果视图
- 少量 UI 局部状态，例如 tab 或临时编辑态

以下能力应统一下沉到 runtime：

- 执行状态
- 复制反馈
- 草稿恢复
- 历史记录

### 3. 旧存储 key 优先兼容

对已经发布过的工具，迁移时应优先兼容旧 key，例如：

- `Request Converter`：`magic-box.request-converter.curl`、`magic-box.request-converter.tab`
- 其余工具：当前的 `tool-history:*:state` 或 `tool-history:*:input`

目标不是保留旧 key 继续写入，而是在 runtime `draft` 首次读取时兼容迁移。

### 4. 历史策略区分自动与手动

本批工具不强求统一历史写入策略，而是按交互模型选择：

- 自动入历史：
  - `Request Converter`
  - `SQL Formatter`
- 手动保存快照：
  - `URL Inspector`
  - `CSV Toolkit`

判断标准：

- 执行动作是否清晰
- 输入变化是否频繁
- 实时计算是否容易污染历史

### 5. 页面布局约定

后续新增和迁移到 `ToolScaffold` 的组件应遵循以下编辑区布局顺序：

- 操作工具条放在原始输入区上方
- 原始输入优先于模板、示例和辅助面板
- 结果展示框默认高度应优先保证“首屏可直接使用”，避免输出区域过短导致频繁滚动

该约定适用于至少以下类型工具：

- 文本处理类
- 结构转换类
- URL / 请求分析类
- 表格转换类

## 推荐目录结构

```text
src/modules/
  network/
    request-converter/
      index.ts
      meta.ts
      module.ts
      page.vue
      logic.ts
      __tests__/
  network/
    url-inspector/
      index.ts
      meta.ts
      module.ts
      page.vue
      logic.ts
      __tests__/
  developer/
    csv-toolkit/
      index.ts
      meta.ts
      module.ts
      page.vue
      logic.ts
      __tests__/
  database/
    sql-formatter/
      index.ts
      meta.ts
      module.ts
      page.vue
      logic.ts
      __tests__/
```

说明：

- 具体 domain 名称可按现有 category 和仓库目录习惯微调
- 若当前已有更合适的分类命名，以“避免未来继续搬目录”为优先原则

## 实施顺序

### Phase 1：低风险模板验证

先迁以下 2 个：

1. `SQL Formatter`
2. `Request Converter`

原因：

- `SQL Formatter` 与 `Text Toolkit` 模型最接近，迁移风险低
- `Request Converter` 可以验证“单输入、多输出 tab”的模块模式是否稳定

### Phase 2：中等复杂度迁移

再迁以下 2 个：

1. `CSV Toolkit`
2. `URL Inspector`

原因：

- `CSV Toolkit` 需要验证“单次执行对应多输出视图”的设计
- `URL Inspector` 需要验证“解析结果 + 可编辑重建状态”的页面适配边界

## 每个工具的最小交付标准

### 通用标准

- 已建立模块目录并导出 `ToolModule`
- 已接入 `ToolScaffold`
- 已接入全局 `message`
- 已接入 `draft`
- 已接入 `history` 或显式快照策略
- 已通过类型检查与相关测试

### Request Converter

- cURL 输入恢复正常
- 结构化配置、`fetch`、`axios`、`node-fetch` 输出与旧行为一致
- 复制行为走全局 `message`
- 旧 cURL 输入和 tab key 可被兼容读取

### URL Inspector

- URL 解析结果与旧行为一致
- query 可编辑后正确重建 URL
- 复制、草稿和快照历史可正常使用
- 页面局部可编辑态边界清晰，不污染纯执行流

### CSV Toolkit

- `CSV -> JSON`、`JSON -> CSV` 与预览结果一致
- 分隔符、表头、trim 等选项行为不回退
- 草稿恢复和快照历史可正常使用

### SQL Formatter

- 格式化结果与旧逻辑一致
- 输入/输出统计不回退
- `compact`、关键字大小写、缩进参数生效
- 草稿恢复和历史快照可正常使用

## 测试要求

本批至少补三类测试：

### 1. 模块纯逻辑测试

- `module.ts` 的输入输出映射
- 自动/手动历史元信息构造

### 2. runtime 交互测试

- 草稿恢复
- 历史记录写入与恢复
- 执行成功后的 hook 行为

### 3. 关键工具回归测试

- `Request Converter`：多输出片段生成
- `URL Inspector`：编辑 query 后重建 URL
- `CSV Toolkit`：双向转换
- `SQL Formatter`：格式化与压缩

## 验收标准

- 4 个工具都拥有模块目录和模块协议接入点
- 4 个工具都不再依赖页面私有 `toastMessage`
- 4 个工具都不再直接在页面里手写草稿持久化逻辑
- 至少 3 个工具接入统一历史面板，第 4 个若因交互差异采用局部变体，需要在实现中明确说明原因
- registry、router、search、workbench 入口不回退
- `pnpm typecheck`、相关 `vitest`、相关 `eslint` 通过

## 风险与规避

### 风险 1：批量迁移导致页面视觉不一致

规避方式：优先统一结构和能力，不强求一轮内统一所有视觉细节。

### 风险 2：把 UI 局部状态误塞进纯模块协议

规避方式：明确区分：

- `execute` 输入输出
- 页面 view state
- runtime 平台状态

### 风险 3：历史记录被高频输入污染

规避方式：对实时工具采用“手动保存快照”，而不是所有输入变化都自动入历史。

### 风险 4：旧数据兼容丢失

规避方式：为每个工具补 `legacyKeys` 和 `parseLegacy` 迁移读取策略。

## 与前后文的关系

- 本 spec 基于 [0028-tool-module-runtime-bootstrap.md](file:///Users/bytedance/projects/magic-box/docs/specs/0028-tool-module-runtime-bootstrap.md) 的平台基础能力
- 本 spec 是 `architecture-refactor.md` 中“P1 批量迁移同步转换类工具”的直接执行批次
- 若本批成功，下一步可继续拆分：
  - `0030-output-capabilities-unification.md`
  - `0031-registry-single-source-of-truth.md`
  - 复杂工具迁移 spec

## 参考文档

- `docs/architecture-refactor.md`
- `docs/specs/0028-tool-module-runtime-bootstrap.md`
- `src/lib/request-converter.ts`
- `src/lib/url-inspector.ts`
- `src/lib/csv-toolkit.ts`
- `src/lib/sql-formatter.ts`
