# 0024 Next Tool Batch Planning

## 背景

在 `0023 Platform Foundation Refactor` 完成后，Magic Box 已经具备更稳定的新增工具接入底座：

- 工具 registry 已统一
- 路由可由 registry 自动派生
- 搜索、收藏、最近使用和本地存储已有统一能力
- 工具页面已有可复用的 Workbench 基础组件

接下来可以从“先把平台底座补齐”切换到“持续扩展高频工具集”。本轮规划目标，是为下一批 8 个工具确定优先级、首版边界、复用关系和分批落地顺序。

## 用户故事

作为 Magic Box 的核心用户，我希望平台持续补齐高频、低学习成本、local-first 友好的工具，从而在接口联调、文本处理、鉴权排障、数据转换和基础生成类场景中，尽量不需要离开当前工作台切换到其他网站。

## 本次范围

- 规划下一批 8 个工具的优先级和首版范围
- 明确这些工具与现有 `HTTP Lab`、`Request Converter`、`Header & Cookie Lab`、`JWT Studio`、`JSON Toolkit` 等能力的联动关系
- 给出建议分批顺序，便于后续连续实现
- 为每个工具标记适合复用的平台层能力

## 不做什么

- 本文档不直接进入编码实现
- 不在本次内把 8 个工具逐一展开成完整页面级交互设计稿
- 不一次性为每个工具单独生成完整 spec，优先先确认 batch 级优先级

## 候选工具清单

| 优先级 | 工具 | 价值判断 | 备注 |
| --- | --- | --- | --- |
| P0 | URL Inspector | 与 `HTTP Lab`、`Request Converter`、`Header & Cookie Lab` 联动最强 | 高频、可快速复用现有输入面板能力 |
| P0 | Text Toolkit | 覆盖面最大，开发与非开发都能用 | 通用价值最高 |
| P0 | JWT Sign / Verify | 补齐 `JWT Studio` 的生成与校验闭环 | 鉴权场景完整性提升明显 |
| P1 | JSON Diff / JSONPath | 接口联调、配置排查常用 | 与 `JSON Toolkit`、`Diff Studio` 联动强 |
| P1 | UUID / NanoID Studio | 实现简单、使用高频 | 成本低、回报快 |
| P1 | CSV Toolkit | 通用性强，可覆盖更广用户 | 对运营、测试、产品也有价值 |
| P2 | SQL Formatter | 典型刚需，且适合 local-first | 需确认格式化方案与依赖体积 |
| P2 | Password Generator | 简单实用，补齐基础工具集 | 开发复杂度最低 |

## 优先级原则

本轮排序主要依据以下原则：

- 是否高频出现在日常联调、排障、文本处理场景
- 是否与当前已有工具形成明确联动
- 是否适合 local-first，不依赖后端
- 是否能较低成本验证平台底座对新增工具的支撑能力
- 是否能覆盖开发者与非开发者两类用户

## 推荐分批顺序

### Batch 1：高联动 + 高频入口

- URL Inspector
- Text Toolkit
- JWT Sign / Verify

原因：

- 三者都能明显验证 `0023` 的平台底座收益
- 与现有工具联动最强，容易拉出组合场景
- 对搜索、收藏、最近使用和统一页面骨架都有代表性

### Batch 2：数据处理能力补强

- JSON Diff / JSONPath
- UUID / NanoID Studio
- CSV Toolkit

原因：

- 都是开发和测试场景里的高频刚需
- 一部分实现简单，适合拉高新增工具节奏
- 一部分能验证更复杂的输入输出工作台抽象

### Batch 3：基础工具补齐

- SQL Formatter
- Password Generator

原因：

- 两者都实用，但与现有工具联动弱于前两批
- `SQL Formatter` 需要关注格式化依赖与 bundle 体积
- `Password Generator` 简单，适合作为快节奏补位工具

## 单工具规划

### 1. URL Inspector

#### 目标用户问题

- 链接中混杂 query、hash、路径片段时，不方便快速拆解
- 跳转链接、回调地址、埋点链接、OAuth 参数常常需要逐项确认
- 联调时需要反复在 URL 解析、参数修改、重新拼接之间来回切换

#### 首版范围

- 输入任意 URL
- 解析 protocol、host、pathname、query、hash
- query 参数表格化展示
- 支持修改 query 参数并重新生成 URL
- 支持复制完整 URL、复制 query JSON、复制单个参数
- 支持识别并展示是否存在 URL 编码

#### 联动关系

- 可从 `HTTP Lab` 复用 URL 输入形态
- 可与 `Request Converter` 的请求 URL 联动
- 可与 `Header & Cookie Lab` 一起支持 callback / redirect / signed url 排查

#### 适合复用的平台能力

- `ToolPageLayout`
- `ToolPanel`
- `ResultCard`
- 统一 storage
- 搜索别名：`url`、`query`、`params`、`链接`

### 2. Text Toolkit

#### 目标用户问题

- 常见文本处理需求分散在很多小网站中
- 替换、裁剪、去重、大小写转换、行处理等需求高频但碎片化
- 很多场景不值得打开 IDE 或写脚本

#### 首版范围

- 大小写转换
- 去重与排序
- 去空行、裁剪空白、合并多空格
- 行前后缀批量追加
- 文本统计（字符数、词数、行数）
- 结果复制

#### 联动关系

- 与 `Regex Workbench` 构成文本处理双入口
- 与 `Markdown Studio`、`Header & Cookie Lab`、`CSV Toolkit` 有明显前后置关系

#### 适合复用的平台能力

- `ToolActionBar`
- `ResultCard`
- 统一 storage
- 最近使用与收藏排序

### 3. JWT Sign / Verify

#### 目标用户问题

- 当前已有 `JWT Studio`，但只覆盖解析，不覆盖签发和验签
- 开发和测试常需要本地生成临时 token 做联调
- 排查 token 无效时，需要同时看 payload、算法、secret 与签名结果

#### 首版范围

- 支持 HS256 签发与验签
- 输入 header、payload、secret
- 输出 JWT token
- 输入 token + secret 验证签名是否通过
- 展示签发时间、过期时间、未生效时间等常见 claim
- 与 `JWT Studio` 保持字段结构一致

#### 联动关系

- 与 `JWT Studio` 组成“生成 / 解析 / 验签”闭环
- 可与 `HTTP Lab` 配合生成 Authorization header

#### 适合复用的平台能力

- `ToolPageLayout`
- `ToolPanel`
- `ErrorBanner`
- 统一 storage

### 4. JSON Diff / JSONPath

#### 目标用户问题

- 配置差异排查常常不是纯文本 diff，而是 JSON 结构差异
- 调试响应体时，经常需要从大 JSON 中快速取某个路径
- 接口联调、灰度排查和 schema 对照都很高频

#### 首版范围

- JSON 对象级 diff
- 高亮新增、删除、修改字段
- 输入 JSONPath 表达式并返回命中结果
- 支持复制命中结果与路径

#### 联动关系

- 与 `JSON Toolkit`、`Diff Studio` 直接联动
- 可承接 `HTTP Lab` 的响应体

#### 适合复用的平台能力

- 双栏布局
- `ResultCard`
- 树视图或结构化预览
- 搜索别名：`json diff`、`jsonpath`

### 5. UUID / NanoID Studio

#### 目标用户问题

- 开发和测试经常需要生成唯一 ID
- 常见需求包括批量生成、长度控制、字符集控制和格式校验

#### 首版范围

- 生成 UUID v4
- 生成 NanoID
- 支持批量生成
- 支持复制单个或全部结果
- 支持基础校验

#### 联动关系

- 可作为很多其他工具的辅助输入
- 可与 `JSON Toolkit`、`HTTP Lab`、`CSV Toolkit` 联动

#### 适合复用的平台能力

- `ToolActionBar`
- `ResultCard`
- 统一 storage

### 6. CSV Toolkit

#### 目标用户问题

- CSV 与 JSON/表格数据间转换需求很高频
- 很多用户只需要简单清洗和格式转换，不需要完整表格软件

#### 首版范围

- CSV 转 JSON
- JSON 转 CSV
- 分隔符切换
- 是否包含表头开关
- 复制与下载结果

#### 联动关系

- 与 `Text Toolkit`、`JSON Toolkit` 关系紧密
- 可作为更广用户群的入口工具

#### 适合复用的平台能力

- `ToolPanel`
- `ToolActionBar`
- 统一 storage

### 7. SQL Formatter

#### 目标用户问题

- SQL 在联调、排障、数据核对中很常见
- 很多用户只想要快速格式化和关键字大写，不需要完整数据库工具

#### 首版范围

- 格式化 SQL
- 关键字大写
- 基础压缩
- 复制结果

#### 联动关系

- 相对独立
- 更像基础工具补齐项

#### 风险点

- 需要控制格式化依赖体积
- 需要明确首版支持的 SQL 方言范围

### 8. Password Generator

#### 目标用户问题

- 需要快速生成强密码，但不希望依赖联网服务
- 常见需求包括长度、字符集和易混淆字符控制

#### 首版范围

- 长度控制
- 大小写、数字、符号开关
- 排除易混淆字符
- 强度提示
- 一键复制

#### 联动关系

- 相对独立
- 属于基础工具集补齐项

#### 适合复用的平台能力

- `ResultCard`
- `ToolActionBar`
- 最近使用和收藏

## 与 0023 的关系

这批新增工具可以作为 `0023 Platform Foundation Refactor` 的直接验证集：

- registry 是否足以支撑新增工具快速接入
- 路由、导航、搜索和收藏是否能自动派生
- toolkit 组件是否足以支撑不同形态的工具页
- 统一 storage 是否足以支撑输入与偏好持久化

如果 Batch 1 能顺利落地，说明平台底座已经具备进入持续扩展期的条件。

## 建议实施顺序

### Step 1

先为 Batch 1 三个工具分别补独立 spec：

- URL Inspector
- Text Toolkit
- JWT Sign / Verify

### Step 2

完成 registry 注册和占位路由接入。

### Step 3

优先按 toolkit 基础组件实现页面骨架，再逐个补业务逻辑。

### Step 4

为 JSON Diff / JSONPath、UUID / NanoID Studio、CSV Toolkit 继续补 spec 与实现。

## 验收标准

- 8 个新增工具的优先级、范围和分批顺序清晰可讨论
- 每个工具都具备明确的首版边界
- 能看出与现有工具和平台底座的复用关系
- 后续编码时可以直接按 Batch 逐步展开，而无需重新做方向性讨论
