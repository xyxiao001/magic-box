# Magic Box

Magic Box 是一个 local-first 的百宝箱网站，覆盖开发工具、内容工具、效率工具和日常通用工具。仓库当前已经包含完整的工具矩阵、PWA 支持、Liquid Glass 风格界面，以及一套持续扩展的 spec 驱动开发流程。

## 仓库当前包含什么

### 已落地工具

- 开发与调试
  - Time Lab
  - JSON Toolkit
  - Codec Lab
  - Regex Workbench
  - HTTP Lab
  - Package Radar
  - JWT Studio
  - Diff Studio
  - Cron Planner
  - Hash Studio
- 文档与内容
  - Markdown Studio
- 视觉与媒体
  - QRCode Studio
  - Image Studio
  - Color Studio
- 通用效率
  - Calculator Pro
  - Unit Converter
  - Clipboard History
  - Weather Desk
  - White Noise Studio

### 产品能力

- Local-first：大量工具直接在浏览器本地完成处理
- PWA：支持安装、缓存静态资源、离线访问已访问页面
- 搜索与收藏：支持快速搜索工具、收藏高频模块
- 深浅主题：统一的桌面感与 Liquid Glass 视觉风格
- Spec Flow：每个功能先写 spec，再实现、测试、交付

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

## 常用命令

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm check
```

## 目录结构

- `src/views/tools/`：所有工具页面
- `src/lib/`：可测试的纯函数与工具逻辑
- `src/router/`：工具路由
- `src/data/`：工具元数据与展示配置
- `src/stores/`：全局状态，如主题、收藏、搜索
- `public/`：静态资源、图标与 PWA 相关素材
- `docs/specs/`：功能 spec
- `docs/roadmap.md`：路线图
- `docs/architecture.md`：架构说明

## PWA 与访问体验

- 支持安装为桌面或移动端应用
- 自动缓存核心静态资源，提升二次访问速度
- 发现新版本时提供刷新提示
- 已添加应用图标、主题色和 Apple Touch Icon

## 开发方式

仓库当前采用 spec 驱动流程：

1. 在 `docs/specs/` 新建功能 spec
2. 明确范围、交互和验收标准
3. 在 `src/lib/` 和 `src/views/tools/` 实现
4. 运行 `lint`、`typecheck`、`test`、`build`
5. 提交并推送

## 部署

- `vercel.json` 已处理 SPA 路由刷新问题
- GitHub Actions 已包含 CI 与 Vercel 生产部署流程

如果需要启用 Vercel 自动部署，仓库会使用以下 Secrets：

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`
