---
name: "new-tool-workflow"
description: "Magic Box 新工具工作流说明。新增工具、批量规划工具、或用户明确要求遵循项目新工具流程时使用。"
---

# New Tool Workflow

当任务涉及以下场景时，使用这个 skill：

- 为 Magic Box 新增一个或多个工具
- 批量实现一组 roadmap 工具
- 用户明确要求遵循项目的新工具工作流
- 将规划中的工具正式落地为可用实现

这是一个项目定制 skill，默认基于当前仓库结构工作：

- `docs/specs/`：功能 spec
- `src/lib/`：核心逻辑、纯函数、解析与转换
- `src/modules/<group>/<tool>/`：工具模块实现
- `src/platform/tool-registry/`：平台注册表与定义构建
- `src/tools/registry/`：对外兼容导出入口
- `src/tool-runtime/`：runtime、脚手架与通用能力
- `README.md`、`docs/roadmap.md`：必须检查是否需要回写的文档

## 何时调用

以下情况应调用：

- 用户要求新增一个工具
- 用户要求批量实现多个工具
- 用户要求“按项目新工具流程来”
- `docs/roadmap.md` 中某个 planned 工具要正式实现

以下情况不要调用：

- 只是现有工具的小修小补，且范围没有实质升级为“新工具”
- 纯文档编辑，没有新增工具工作
- 与工具新增无关的简单重构

## 核心规则

Magic Box 的新工具默认遵循这个顺序：

1. 先写 spec
2. 明确范围
3. 实现核心逻辑
4. 实现模块页面
5. 注册工具
6. 同步文档
7. 做验证
8. 如有需要再提交

除非用户明确要求跳过，否则不要在没有 spec 的情况下直接开始一个全新工具。

## 第 1 步：Spec First

编码前，先检查 `docs/specs/` 中是否已经有合适的 spec。

如果没有：

- 新建一个递增编号的 spec 文件
- 基于 `docs/specs/templates/feature-spec-template.md`
- 至少覆盖：
  - 背景
  - 用户故事
  - 本次范围
  - 不做什么
  - 页面与交互
  - 数据与状态
  - 验收标准
  - 风险与待确认问题

如果用户说“先开始实现”，但这是一个净新增工具，默认仍先补 spec，除非用户明确要求跳过。

## 第 2 步：明确范围

编码前先把 v1 范围缩清楚。

重点确认：

- 谁会用这个工具
- 最常见输入是什么
- 期望输出长什么样
- v1 明确不做什么
- 它是 `local-first` 还是 `network-required`
- 是否需要和相邻工具形成跳转或协同

有歧义时，优先做一个小而完整的 v1，不要一开始摊太大。

## 第 3 步：实现核心逻辑

默认位置：`src/lib/`

规则：

- 解析、格式化、转换、计算、归一化等逻辑尽量放进 `src/lib/`
- 页面保持薄，避免把大段业务逻辑堆进组件
- 优先写纯函数
- 当测试能明显降低回归风险时，补聚焦测试

典型文件形态：

- `src/lib/<tool-name>.ts`
- `src/lib/<tool-name>.spec.ts`

## 第 4 步：实现模块页面

默认位置：`src/modules/<group>/<tool>/`

通常至少会包含：

- `meta.ts`
- `module.ts`
- `page.vue`
- `index.ts`
- 必要时补 `module.spec.ts`

规则：

- 优先复用现有 UI / runtime 模式，例如：
  - `ToolScaffold`
  - `ToolPaneShell`
  - `ToolPanel`
  - `ToolActionBar`
  - `ToolHistoryPanel`
  - `ToolSamplePanel`
- 能接入 runtime 的能力尽量接入：
  - `draft`
  - `history`
  - `sample-data`
  - `share-url`
  - `download-output`
- 默认值、样例、模板要体现真实使用场景
- 文案优先用户价值，不要过度暴露内部实现细节

## 第 5 步：注册工具

工具实现后，必须接入注册表。

必查项：

- 在 `src/platform/tool-registry/definitions.ts` 中接入模块
- 确认 `meta.ts` 中的 `category`、`group`、`order`、`keywords`、`tags`、`capabilities` 合理
- 必要时更新：
  - `src/platform/tool-registry/builder.spec.ts`
  - `src/platform/tool-registry/search.spec.ts`
  - `src/tools/registry/index.spec.ts`

工具只有在应用中可发现、可路由、可搜索后，才算真正完成。

## 第 6 步：同步文档

完成前，至少检查以下内容是否需要同步：

- `README.md`
- `docs/roadmap.md`
- 本次工具对应的 spec

### README 规则

以下情况必须检查 `README.md`：

- 工具数量变化
- 工具列表变化
- 能力说明变化
- 命令、目录结构、运行方式描述已经过时

### Roadmap 规则

以下情况必须检查 `docs/roadmap.md`：

- 一个 planned 工具已经实现
- 已完成工具列表不再准确
- 下一批建议项需要调整

## 第 7 步：验证

遵循“最小充分验证”。

优先检查：

- 已编辑文件的 diagnostics
- 新逻辑的定向测试
- 涉及页面和 lib 时运行 `pnpm typecheck`

默认避免：

- `pnpm dev`
- `pnpm build`
- 对当前改动没有明显增益的大而全高成本校验

## 第 8 步：提交前检查

提交前至少确认：

- spec 已存在
- 核心逻辑与 UI 职责分离
- registry 接入完成
- `README.md` 已检查
- `docs/roadmap.md` 已检查
- 验证足够
- 没有混入无关改动

提交信息要尽量反映用户可感知结果：

- 新工具或新能力：优先 `feat`
- 行为修复或展示修复：优先 `fix`
- 纯文档：`docs`

## 推荐执行顺序

在对话中，优先按以下节奏推进：

1. 查看相邻工具和现有实现
2. 检查或创建 spec
3. 给出简短实现计划
4. 实现 `src/lib/` 逻辑
5. 实现 `src/modules/` 页面与模块
6. 接入 registry 与文档
7. 做定向验证
8. 如用户要求，再提交和推送

## 示例

### 示例 1

用户说：“新增一个 Password Generator”

预期流程：

1. 在 `docs/specs/` 中创建或补齐 spec
2. 在 `src/lib/` 中实现密码生成逻辑
3. 在 `src/modules/<group>/password-generator/` 中实现模块
4. 接入 `src/platform/tool-registry/definitions.ts`
5. 更新 `README.md` 和 `docs/roadmap.md`
6. 做定向验证

### 示例 2

用户说：“把 roadmap 里的 3 个工具做掉”

预期流程：

1. 先检查 roadmap 条目
2. 优先补齐缺失 spec
3. 分批或成组实现，保持每批范围闭合
4. 同步 registry 和文档
5. 验证并交付
