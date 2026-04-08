# Magic Box

面向程序员的百宝箱网站骨架，重点是先把“规划 -> 实现 -> 验证”的节奏搭起来，再持续增加真实工具模块。

## 当前技术栈

- Vue 3
- Vite
- TypeScript
- Vue Router
- Pinia
- Vitest
- ESLint + Prettier

## 启动方式

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

## 文档协作

`docs/` 是规划入口：

- `docs/roadmap.md`：阶段路线图
- `docs/architecture.md`：工程和模块边界
- `docs/specs/`：功能 spec
- `docs/specs/templates/feature-spec-template.md`：spec 模板

推荐流程：

1. 先写 spec。
2. 再确定范围和验收标准。
3. 然后进入编码与测试。

## 部署与 CI

- `vercel.json` 已为 SPA 路由配置 rewrite，刷新工具页不会丢路由。
- GitHub Actions 已配置：
  - `.github/workflows/ci.yml`
  - `.github/workflows/vercel-production.yml`

Vercel 部署工作流需要这 3 个 GitHub Secrets：

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`
