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

## Phase 9: Planned

- Request Converter
- Header & Cookie Lab
- JSON Typegen
- WebSocket Lab
- HMAC Signer

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

- `Request Converter`：联调最常见入口，能直接把 cURL 变成可运行代码
- `Header & Cookie Lab`：排障高频，尤其是鉴权、跨域、缓存、灰度链路
- `JSON Typegen`：前后端都刚需，生成 TS/Zod 省大量重复劳动
- `WebSocket Lab`：实时链路联调工具，常见但缺轻量替代
- `HMAC Signer`：网关签名/Webhook 验签场景很高频，能显著降低排查成本

## 开发流程

延续现在的原流程：

1. 建 spec
2. 评审范围
3. 编码实现
4. 跑 `lint` / `typecheck` / `test` / `build`
5. 提交并推送
