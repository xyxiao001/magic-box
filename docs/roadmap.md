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

## Phase 5: Completed Expansion

- HTTP Lab
- QRCode Studio
- Package Radar
- Markdown Studio

## Phase 6: Completed Expansion

- JWT Studio
- Diff Studio

## Phase 7: Completed Expansion

- Image Studio
- Color Studio
- Cron Planner
- Hash Studio

## Phase 8: Completed Expansion

- Weather Desk
- Calculator Pro
- Unit Converter
- White Noise Studio
- Clipboard History

## Phase 9: Completed Expansion

- Request Converter
- Header & Cookie Lab
- JSON Typegen
- WebSocket Lab
- HMAC Signer

## Phase 10: Completed Expansion

- URL Inspector
- Text Toolkit
- JWT Sign / Verify
- JSON Diff / JSONPath
- UUID / NanoID Studio
- CSV Toolkit
- SQL Formatter

## Phase 11: Planned

- Password Generator
- JSON Schema / OpenAPI Helpers
- SQL Query Runner Mock
- CSV Column Mapping

## 当前状态

已完成：

- `Time Lab`
- `JSON Toolkit`
- `Codec Lab`
- `Regex Workbench`
- `HTTP Lab`
- `QRCode Studio`
- `Package Radar`
- `Markdown Studio`
- `JWT Studio`
- `Diff Studio`
- `Image Studio`
- `Color Studio`
- `Cron Planner`
- `Hash Studio`
- `Calculator Pro`
- `Unit Converter`
- `Clipboard History`
- `Weather Desk`
- `White Noise Studio`
- `URL Inspector`
- `Text Toolkit`
- `JWT Sign / Verify`
- `JSON Typegen`
- `JSON Diff / JSONPath`
- `UUID / NanoID Studio`
- `Request Converter`
- `Header & Cookie Lab`
- `WebSocket Lab`
- `HMAC Signer`
- `CSV Toolkit`
- `SQL Formatter`

下一批建议：

- `Password Generator`：简单实用，补齐基础工具集
- `JSON Schema / OpenAPI Helpers`：和 `HTTP Lab`、`JSON Toolkit`、`JSON Typegen` 能形成更完整的接口链路
- `SQL Query Runner Mock`：适合补 SQL 工具链的“验证结果”能力，但仍保持本地优先
- `CSV Column Mapping`：适合把 `CSV Toolkit` 从格式转换继续扩展到数据清洗场景

## 开发流程

延续现在的原流程：

1. 建 spec
2. 评审范围
3. 编码实现
4. 跑 `lint` / `typecheck` / `test` / `build`
5. 提交并推送
