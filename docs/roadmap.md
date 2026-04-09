# Roadmap

## Phase 1: Foundation

- 初始化 Vue 3 + Vite + TypeScript
- 接入 Pinia、Vue Router、Vitest、ESLint、Prettier
- 建立 `docs/` 规划目录
- 完成首页和 Spec Flow 页面

## Phase 2: First Real Tools

- 时间戳转换器
- JSON 格式化与校验
- Base64 / URL 编解码

## Phase 3: Workflow Features

- 收藏持久化
- 工具侧边栏持续打磨
- 搜索和命令面板

## Phase 4: Completed Expansion

- Regex Workbench

## Phase 5: In Progress

- HTTP Lab
- QRCode Studio
- Package Radar
- Markdown Studio

## 当前状态

已完成：

- `Time Lab`
- `JSON Toolkit`
- `Codec Lab`
- `Regex Workbench`

下一批建议按这个顺序推进：

1. `HTTP Lab`
2. `QRCode Studio`
3. `Package Radar`
4. `Markdown Studio`

优先级理由：

- `HTTP Lab` 用户价值最高，做出来后会直接把百宝箱从“转换工具集合”拉到“开发工作台”
- `QRCode Studio` 可快速交付，适合在高复杂模块之间穿插，保持版本节奏
- `Package Radar` 能补上 npm 包查询、版本检查和安全感知，贴合程序员高频需求
- `Markdown Studio` 和现有本地优先工具栈兼容度高，也适合后续接模板与导出

## 开发流程

延续现在的原流程：

1. 建 spec
2. 评审范围
3. 编码实现
4. 跑 `lint` / `typecheck` / `test` / `build`
5. 提交并推送
