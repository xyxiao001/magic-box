# 0018 Request Converter

## 背景

联调接口时，最常见的“交换格式”就是 cURL。前端需要把 cURL 变成 fetch/axios 代码；后端需要把请求重放、复现问题；测试需要把接口用例快速转为可运行片段。把这些动作收敛成一个本地转换器，可以显著降低“复制粘贴 + 手工改代码”的时间。

## 用户故事

作为前端/后端/测试同学，我希望粘贴一段 cURL 后，自动得到等价的 fetch / axios / Node 请求片段，并能快速调整 headers、query、body，从而更快复现与定位接口问题。

## 首版范围

- 输入：支持粘贴常见 cURL（GET/POST/PUT/PATCH/DELETE）
  - 支持 `-X/--request`
  - 支持 `-H/--header`
  - 支持 `-d/--data/--data-raw/--data-binary`
  - 支持 `--compressed`（忽略或提示）
  - 支持 `-u user:pass`（转 Basic Auth header，或提示）
- 解析输出：结构化展示
  - Method、URL、Query Params、Headers、Body（字符串/JSON）
- 代码生成：一键生成
  - `fetch`（浏览器）
  - `axios`（TypeScript）
  - `node18 fetch`（Node 内置 fetch）
- 操作能力：
  - 一键复制生成代码
  - 一键复制结构化 JSON（request config）
  - 对错误 cURL 给出明确提示（不崩溃）

## 不做什么（首版不含）

- 不做 HAR 导入
- 不做 Postman collection 导入/导出
- 不做复杂 shell 变量/多行脚本求值（只做尽力解析与提示）
- 不做 multipart/form-data 完整解析（可提示“暂不支持”）

## 交互与页面

- 左侧：cURL 输入框 + 示例模板 + 解析错误提示
- 右侧：tabs（结构化视图 / fetch / axios / node fetch）
- 顶部：复制按钮与常见开关（是否保留 cookies、是否自动 JSON stringify）

## 数据与状态

- 本地存储：保存最近一次输入与最后一次选中的输出格式
- 不上传内容，解析与生成全部在本地完成

## 验收标准

- 输入一段常见 cURL 后：
  - 能正确解析 URL、method、headers、body
  - fetch/axios/node-fetch 代码可直接运行（语法正确）
- 对 JSON body：
  - 能识别并格式化展示
  - 生成代码能正确设置 `Content-Type`（若 cURL 已包含则保留）
- 对非法输入：
  - 页面有清晰错误提示
  - 不影响继续输入与解析

## 风险与待确认问题

- cURL 语法非常宽松，首版以“覆盖常见场景 + 明确提示边界”为原则
- 对 `-d` 的 quoting/转义兼容度需要通过用例逐步补全
