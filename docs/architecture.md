# Architecture

## 文档定位

`magic-box` 已经不是“准备接工具的前端容器”，而是一套已经落地的 local-first 工具平台。

这份文档只记录两类内容：

- 当前仓库已经落地的架构事实
- 团队现在必须遵守的运行时装配规则

更大的目标态与迁移思路，参考 `docs/architecture-refactor.md`；单次迭代范围，参考 `docs/specs/`。

## 当前判断

项目当前已经形成三个稳定中心：

1. `src/modules/`：工具模块事实源
2. `src/platform/tool-registry/`：工具注册和搜索事实源
3. `src/tool-runtime/`：工具页共性行为事实源

核心设计已经从“每个工具都是一页独立实现”切换为：

> 每个工具先是一个 `ToolModule`，页面只是模块在 runtime 中的呈现。

这也是后续新增工具、批量迁移工具、统一体验与降低维护成本的基础。

## 分层事实

### App Shell

- `src/main.ts`
- `src/App.vue`
- `src/router/`
- `src/views/`

职责：

- 应用入口
- 路由装配
- 全局布局与文档页承接
- 不承载具体工具的领域逻辑

### Platform

- `src/platform/tool-registry/`
- `src/tools/registry/` 仍保留兼容导出职责

职责：

- 从模块构建工具定义
- 归一化搜索字段
- 把 `capabilities` 映射成发现层 tag
- 维持注册、搜索、路由所需的稳定元数据接口

### Tool Runtime

- `src/tool-runtime/protocols/`
- `src/tool-runtime/composables/`
- `src/tool-runtime/scaffolds/`
- `src/tool-runtime/services/`

职责：

- 统一工具状态模型
- 统一执行流
- 承接 history、draft、download、share、samples 等横切能力
- 定义 capability 到 UI 装配的规则

### Tool Module

- `src/modules/<domain>/<tool-id>/`

职责：

- 声明工具元数据
- 定义输入输出结构
- 提供纯逻辑或执行函数
- 提供 capability 所需的运行时适配器
- 提供页面组件

### Shared / Lib

- `src/shared/`
- `src/components/toolkit/`
- `src/lib/`

职责：

- 复用 UI 基件
- 可测试纯函数
- 与单个工具无关的通用能力

## 当前目录模型

```text
src/
  components/toolkit/          # 旧通用 UI 与正在继续复用的基础组件
  lib/                         # 可测试纯逻辑与存储抽象
  modules/                     # 工具模块主目录
  platform/tool-registry/      # 注册、校验、搜索文档构建
  router/                      # 顶层路由
  shared/                      # 全局共享 composables / feedback
  stores/                      # 工作台聚合状态
  tool-runtime/                # 运行时协议、脚手架、服务、通用 composables
  views/                       # 文档页等应用级视图
```

当前不再建议把新工具直接落在散乱的页面目录里；新增工具默认进入 `src/modules/`。

## 模块协议

当前统一协议位于 `src/tool-runtime/protocols/tool-module.ts`。

`ToolModule` 的职责分为四部分：

1. `meta`
2. `createInitialInput`
3. `execute` / `validate` / `samples`
4. `runtime`

其中：

- `meta` 决定注册、搜索、分类、能力声明
- `execute` / `validate` 决定工具运行逻辑
- `runtime` 决定 capability 如何真正装配到脚手架与操作栏

也就是说：

> `capabilities` 不再只是“标签声明”，而是 runtime 装配的开关。

## Capability 自动装配规则

### 规则目标

运行时需要解决的不是“有没有某个 composable”，而是“声明了 capability 的工具，是否能被自动装配成一致的页面行为”。

因此当前规则采用两层模型：

1. `meta.capabilities`：声明工具拥有哪些平台能力
2. `runtime.<capability adapter>`：提供该能力真正落地所需的数据或回调

缺一不可：

- 没有 capability：runtime 不允许装配
- 只有 capability 没有 adapter：runtime 视为能力未接线

### 标准映射

| Capability | Runtime 装配点 | 说明 |
| --- | --- | --- |
| `draft` | `ToolActionBar` | 自动产出“重置/清空”动作，清 draft 后再 reset |
| `history` | `ToolScaffold` | 自动挂载历史面板 |
| `history` + `mode: 'manual'` | `ToolActionBar` | 自动产出“保存快照”动作 |
| `sample-data` | `ToolScaffold` | 自动挂载示例输入面板 |
| `copy-output` | `ToolActionBar` | 自动产出复制结果动作 |
| `download-output` | `ToolActionBar` | 自动产出下载动作 |
| `share-url` | `ToolActionBar` | 自动产出“复制分享链接”动作 |
| `share-url` + `autoRunOnRestore` | runtime restore 流程 | 从 URL 恢复状态后自动重跑 |

### 规则细节

#### 1. `capabilities` 是唯一事实源

页面组件、脚手架、注册中心不应该再各自维护一套“这个工具支持什么”的平行判断。

允许出现的判断形式应该收敛为：

- registry 从 `meta.capabilities` 派生发现层 tag
- runtime 从 `meta.capabilities` 判定是否允许装配某个共性能力

#### 2. adapter 只补“能力落地细节”

有些 capability 只需要开关，例如：

- `draft`
- `sample-data`

有些 capability 还需要模块补充 adapter，例如：

- `download-output` 需要 `buildPayload`
- `copy-output` 需要 `buildText`
- `history` 需要 `buildEntryMeta`
- `share-url` 需要 `buildShareState` / `applySharedState`

因此 `runtime` 的职责不是重复声明 capability，而是为 capability 提供最小必要参数。

#### 3. Scaffold 负责固定位置，页面不再手工复制面板骨架

`ToolScaffold` 当前固定承接：

- `actions`
- `input`
- `samplePanel`
- `historyPanel`
- `output`

统一布局顺序为：

1. 操作栏
2. 输入区
3. 示例面板
4. 历史面板
5. 输出区

这样页面作者只需要提供业务输入和业务输出，不再为“示例面板放哪、历史面板放哪”重复决定。

#### 4. Action Bar 负责共性动作，页面只保留业务动作

`ToolActionBar` 现在支持两类按钮共存：

- 页面定义的业务动作
- runtime 根据 capability 自动生成的共性动作

推荐顺序：

1. 左侧先放业务主动作，例如“格式化”“生成”“切换模式”
2. 右侧顺序追加 runtime 动作，例如“复制结果”“下载结果”“复制分享链接”“保存快照”“重置”

页面不应该再重复手写这些标准能力按钮。

#### 5. History 需要显式记录策略

`history` 不是单一行为，需要区分两种模式：

- `mode: 'on-success'`
  适合显式执行类工具，例如 `json-toolkit`、`uuid-studio`
- `mode: 'manual'`
  适合实时计算类工具，例如 `text-toolkit`

原因：

- 实时计算工具如果每次输入都自动入历史，会污染记录
- 显式执行工具则应该在成功后自动记录，减少用户负担

因此历史记录策略必须在 `runtime.history.mode` 中声明，不能散落在页面里凭经验决定。

## 当前运行时组合方式

### 基础 composables

- `useToolState`
- `useToolExecution`
- `useToolDraft`
- `useToolHistory`
- `useToolDownload`
- `useToolShare`
- `useToolSamples`
- `useToolCapabilityRuntime`

其中新增的核心收敛点是 `useToolCapabilityRuntime`：

- 读取 `meta.capabilities`
- 读取 `runtime` adapter
- 组装 `actionItems`
- 组装 `samplePanel`
- 组装 `historyPanel`
- 处理 share restore / history record / draft reset 等共性流程

页面接入目标应收敛为：

```ts
const state = useToolState(toolModule)
const execution = useToolExecution(toolModule, state, {
  onSuccess: ({ input, output }) => runtime.handleExecutionSuccess(input, output),
})
const runtime = useToolCapabilityRuntime(toolModule, state, execution)
```

页面模板目标应收敛为：

```vue
<ToolScaffold
  :meta="toolModule.meta"
  :loading="state.loading.value"
  :error="state.error.value"
  :sample-panel="runtime.samplePanel.value"
  :history-panel="runtime.historyPanel.value"
>
  <template #actions>
    <ToolActionBar :items="runtime.actionItems.value">
      <!-- 业务动作 -->
    </ToolActionBar>
  </template>
</ToolScaffold>
```

## 当前试点落地情况

以下模块已经按“capability 驱动装配”的模式收敛：

- `src/modules/json/json-toolkit/`
- `src/modules/text/text-toolkit/`
- `src/modules/security/uuid-studio/`

这三个试点分别覆盖了三种典型模式：

- 显式执行 + 自动 history：`json-toolkit`
- 实时计算 + 手动 snapshot：`text-toolkit`
- 生成类 + copy-output：`uuid-studio`

这三类工具验证通过后，其它同步工具应优先复用相同模式，而不是重新手搓页面按钮和面板。

## Registry 与 Runtime 的边界

当前边界必须保持清晰：

- registry 负责“这个工具如何被发现”
- runtime 负责“这个工具如何被运行”

具体来说：

- `platform/tool-registry/builder.ts` 会把 `capabilities` 映射为展示 tag，例如 `favorite-supported`、`history-supported`
- `tool-runtime` 不能反向依赖 registry tag 做行为判断
- 行为判断只能基于 `meta.capabilities`

这是为了避免出现“搜索页显示支持 history，但运行页根本没装 history 面板”的双事实源问题。

## 新增工具接入规范

新增工具默认按以下顺序接入：

1. 在 `src/modules/<domain>/<tool-id>/` 建目录
2. 编写 `meta.ts`
3. 编写 `module.ts`
4. 在 `module.ts` 中声明 `meta.capabilities`
5. 在 `module.ts` 中补 `runtime` adapter
6. 在 `page.vue` 中接入 `useToolState + useToolExecution + useToolCapabilityRuntime`
7. 接入 registry 导出
8. 补最小必要测试

禁止新增以下反模式：

- 在页面里再次手写一套 capability 开关
- 在页面里重复实现历史面板和示例面板骨架
- 在 registry tag 上做运行时行为判断
- capability 已声明，但动作按钮和面板仍完全手工拼装

## 什么时候允许偏离统一脚手架

以下类型可以保留更多页面自由度：

- `http-lab`
- `websocket-lab`
- `image-studio`
- 其它强会话、强工作区、强可视化工具

但即使是复杂工具，也仍应遵守两条底线：

1. `meta.capabilities` 仍是能力声明事实源
2. 能复用 runtime 的共性能力时，优先复用，不再重复造轮子

## 当前已知边界

- `copy-output` 仍需要模块显式提供 `buildText`
- 某些复杂工具的 share state 可能不只是一份输入对象，后续可能还需要更细的 share adapter
- `ToolScaffold` 目前统一了样例与历史面板位置，但复杂工具的 workspace 子区域仍可能保留自定义布局
- 旧的 `components/toolkit/*` 组件仍在被复用，短期内属于“稳定兼容层”，不是问题

## 后续方向

接下来架构演进的重点不是继续扩目录，而是持续扩大这套规则的覆盖面：

1. 把更多同步类工具迁入 capability 自动装配模式
2. 继续减少页面中的手写 history/share/download/draft 逻辑
3. 为复杂工具补充更细粒度的 runtime adapter，而不是回退到页面复制
4. 保持文档、spec 与当前实现同步

最终标准很简单：

> 当一个模块声明了 capability，runtime 就应该稳定地把它装到正确的位置；
> 页面只负责业务差异，不负责重复拼平台能力。
