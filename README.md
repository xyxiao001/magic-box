# Magic Box

Magic Box 是一个 local-first 的百宝箱网站，覆盖开发调试、内容编辑、接口联调、媒体处理和日常效率场景。当前仓库已经落地 31 个工具，带有 PWA、收藏与最近使用、历史记录、Spec Flow 文档约束，以及统一的桌面化界面体验。

## 仓库当前包含什么

### 已落地工具

- 开发与接口
  - Time Lab
  - JSON Toolkit
  - JSON Typegen
  - JSON Diff / JSONPath
  - Codec Lab
  - Regex Workbench
  - HTTP Lab
  - Request Converter
  - URL Inspector
  - Header & Cookie Lab
  - WebSocket Lab
  - SQL Formatter
  - Package Radar
- 鉴权与签名
  - JWT Studio
  - JWT Sign / Verify
  - HMAC Signer
  - Hash Studio
  - UUID / NanoID Studio
- 文档与文本
  - Markdown Studio
  - Text Toolkit
  - CSV Toolkit
  - Diff Studio
- 视觉与媒体
  - QRCode Studio
  - Image Studio
  - Color Studio
- 效率与日常
  - Cron Planner
  - Calculator Pro
  - Unit Converter
  - Clipboard History
  - Weather Desk
  - White Noise Studio

### 产品能力

- Local-first：大部分工具直接在浏览器本地完成解析、转换、计算和导出
- PWA：支持安装、自动更新提示、静态资源缓存和已访问页面离线访问
- 工具工作台：支持搜索、收藏、最近使用以及部分工具的历史记录
- 网络工具补充：`HTTP Lab`、`WebSocket Lab`、`Package Radar`、`Weather Desk` 依赖网络请求
- Spec Flow：`/docs` 页面直接映射仓库里的规划文档，先写 spec 再实现
- 统一体验：深浅主题、Liquid Glass 风格组件和统一工具布局

## 技术栈

- Vue 3
- Vite
- TypeScript
- Vue Router
- Pinia
- Vitest
- ESLint
- Prettier
- vite-plugin-pwa

## 本地运行

```bash
pnpm install
pnpm dev
```

开发服务器默认由 Vite 启动，根路由会重定向到默认工具页，文档页位于 `/docs`。

## 常用命令

```bash
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm format
pnpm format:write
pnpm check:light-theme
pnpm build
pnpm check
```

其中 `pnpm check` 会顺序执行 `lint`、`typecheck`、`test` 和 `build`。

## 目录结构

- `src/views/tools/`：所有工具页面入口
- `src/lib/`：可测试的纯函数、解析逻辑和核心能力
- `src/tools/registry/`：工具注册表、搜索与路由生成
- `src/components/toolkit/`：工具页复用组件
- `src/router/`：应用路由与默认跳转
- `src/data/`：文档页等静态数据
- `src/stores/`：工作台相关全局状态
- `public/`：静态资源、图标与 PWA 素材
- `docs/specs/`：功能 spec 与规划模板
- `docs/roadmap.md`：路线图
- `docs/architecture.md`：架构说明

## PWA 与访问体验

- 支持安装为桌面或移动端应用
- 自动缓存核心静态资源，并对部分网络接口做运行时缓存
- 发现新版本时提供刷新提示
- 已配置应用图标、主题色和 Apple Touch Icon

## 开发方式

仓库当前采用 spec 驱动流程：

1. 在 `docs/specs/` 新建或更新功能 spec
2. 明确范围、输入输出和验收标准
3. 在 `src/lib/`、`src/views/tools/`、`src/tools/registry/` 等目录实现
4. 运行 `lint`、`typecheck`、`test` 等校验
5. 完成后回写文档与后续迭代点

## 部署

- `vercel.json` 已处理 SPA 路由刷新问题
- `.github/workflows/ci.yml` 当前提供安装、Lint、Typecheck、Test、Build 的 CI 流程
- 如需线上部署，可直接接入 Vercel 或其他静态托管平台
