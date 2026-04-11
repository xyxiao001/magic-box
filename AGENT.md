# Magic Box Project Rules

## Goal

本项目是一个 local-first 的工具集合站点。默认目标不是“先把功能做出来”，而是：

1. 先明确范围
2. 再实现核心能力
3. 最后同步文档与交付信息

## Default Workflow

所有中等及以上改动，默认遵循以下顺序：

1. 先确认是否需要 spec
2. 明确本次范围、不做什么、验收标准
3. 实现 `src/lib/` 中的核心逻辑
4. 实现 `src/views/tools/` 或相关 UI 接入
5. 更新注册表、搜索、文档
6. 做最小充分验证
7. 提交前检查 README / roadmap / spec 是否需要回写

## New Tool Rules

新增工具时，必须先写 spec，再编码。

### 必做项

- 先在 `docs/specs/` 新增一份递增编号的 spec
- spec 需基于 `docs/specs/templates/feature-spec-template.md`
- spec 至少写清楚：
  - 背景
  - 用户故事
  - 本次范围
  - 不做什么
  - 交互与页面
  - 数据与状态
  - 验收标准
  - 风险与待确认问题

### 编码顺序

- 先补 `src/lib/` 中的纯函数或核心处理逻辑
- 再补 `src/views/tools/` 中的工具页面
- 再接入 `src/tools/registry/definitions.ts`
- 如有必要，补 `src/tools/registry/search.ts` 中的搜索关键词或别名
- 如有必要，补对应测试文件

### 文档回写

新增工具完成后，至少检查以下文件是否需要同步：

- `README.md`
- `docs/roadmap.md`
- `docs/specs/`

## README Rules

以下情况必须检查 `README.md`：

- 新增工具
- 删除工具
- 调整工具数量
- 调整产品能力说明
- 新增或修改常用命令
- 调整目录结构约定
- 调整部署或 CI 描述

如果代码状态已经变化，而 README 仍描述旧状态，提交前必须补齐。

## Roadmap Rules

以下情况必须检查 `docs/roadmap.md`：

- 计划中的工具已经落地
- 已完成工具列表发生变化
- 下一批建议项已经发生明显变化
- 阶段划分已经不再反映真实状态

如果某个工具已经实现，不应继续停留在 planned 状态。

## Validation Rules

默认做“最小充分验证”，避免无意义的大而全校验。

### 代码改动后

- 优先检查本次修改文件的诊断
- 优先补或更新与改动直接相关的测试
- 至少执行与本次改动强相关的校验，例如：
  - `pnpm exec vitest run <target-spec-files>`
  - `pnpm typecheck`

### 文档改动后

- 至少检查文档内容是否与当前代码一致
- 需要时检查 markdown 诊断

### 默认不要做

- 未经明确要求，不启动 `pnpm dev`
- 未经明确要求，不执行 `pnpm build`
- 不为了“显得完整”而跑整仓高成本命令

## Commit Rules

提交前默认检查以下事项：

- 是否已先写 spec 再做新增工具
- `README.md` 是否需要更新
- `docs/roadmap.md` 是否需要更新
- 是否补了必要的注册表接入
- 是否补了最关键的测试或类型检查
- 是否确认当前提交范围没有混入无关改动

提交信息应尽量反映用户可感知结果：

- 新增工具或新增能力：优先用 `feat`
- 修复行为或展示问题：优先用 `fix`
- 仅文档变更：用 `docs`

## File Placement Rules

默认按以下位置落代码：

- 工具页面：`src/views/tools/`
- 核心逻辑与纯函数：`src/lib/`
- 注册表与搜索：`src/tools/registry/`
- 通用组件：`src/components/toolkit/`
- 规划与功能说明：`docs/specs/`

不要把大量业务逻辑直接堆进页面组件；优先抽到 `src/lib/`。

## Product Rules

新增工具或调整工具展示时，优先遵循以下原则：

- 优先 local-first
- 能不联网就不联网
- 能本地处理就明确本地处理
- 标签、文案和交互优先面向用户价值，而不是内部实现细节
- 模板、示例和默认输入要服务真实使用场景

## Safety Rules

- 不要回退用户未明确要求回退的改动
- 不要顺手重构无关模块
- 不要为了通过校验修改与当前任务无关的代码
- 发现工作区出现意外变动时，先暂停并确认

## Quick Checklist

开始前：

- 这是普通改动，还是新增工具？
- 如果是新增工具，spec 写了吗？

编码后：

- `src/lib/` 和 `src/views/tools/` 是否职责分离？
- 注册表和搜索是否已接入？

提交前：

- README 更新了吗？
- roadmap 更新了吗？
- 跑了足够但不过量的验证吗？
- 提交范围干净吗？
