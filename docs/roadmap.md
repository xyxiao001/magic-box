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

## Phase 10: Planned

- URL Inspector
- Text Toolkit
- JWT Sign / Verify
- JSON Diff / JSONPath
- UUID / NanoID Studio
- CSV Toolkit
- SQL Formatter
- Password Generator

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

下一批建议：

- `URL Inspector`：和 `HTTP Lab`、`Request Converter`、`Header & Cookie Lab` 联动最强
- `Text Toolkit`：覆盖面最大，开发和非开发都能直接使用
- `JWT Sign / Verify`：补齐 `JWT Studio` 的生成、解析、验签闭环
- `JSON Diff / JSONPath`：接口联调、配置排查和响应体分析高频场景
- `UUID / NanoID Studio`：实现简单、使用高频，适合快速补位
- `CSV Toolkit`：可覆盖开发、测试、运营、产品等更广用户群
- `SQL Formatter`：典型刚需，且适合本地处理
- `Password Generator`：简单实用，补齐基础工具集

## 开发流程

延续现在的原流程：

1. 建 spec
2. 评审范围
3. 编码实现
4. 跑 `lint` / `typecheck` / `test` / `build`
5. 提交并推送
