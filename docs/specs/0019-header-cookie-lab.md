# 0019 Header & Cookie Lab

## 背景

Header 和 Cookie 问题是接口联调与线上排障的常见阻塞点：鉴权失败、跨域、缓存、灰度、网关签名、追踪链路等都依赖 header/cookie。把一段原始 header/cookie 文本解析成结构化视图，并支持一键编辑、合并、去重与导出，会非常实用。

## 用户故事

作为前端/后端/测试同学，我希望把请求/响应 header 或 Cookie 粘贴进来后，能立刻看到结构化列表、重复项、常见字段解释，并能导出为 JSON 或重新拼回文本，从而更快定位问题并复现请求。

## 首版范围

- Header 工具
  - 解析：从原始文本解析 `Key: Value` 列表（支持多行输入）
  - 规范化：大小写不敏感显示，保留原始 key
  - 操作：合并两段 header、去重（按 key）、删除/编辑单项
  - 导出：导出为 JSON、导出为 fetch headers 片段
  - 常见字段提示（只做说明，不做复杂推断）：
    - `Authorization`、`Content-Type`、`Accept`、`User-Agent`
    - `Cache-Control`、`ETag`、`If-None-Match`
    - `X-Request-Id` / `Trace-Id`（提示其用途）
- Cookie 工具
  - 解析 `Cookie: a=b; c=d` 为键值列表
  - 解析 `Set-Cookie`（单行多条、或多行多条）
    - name/value、domain、path、expires/max-age、secure、httponly、samesite
  - 支持拼回 Cookie header 字符串
  - 支持导出为 JSON

## 不做什么（首版不含）

- 不做 RFC 全量覆盖（以常见格式为主）
- 不做自动修复跨域策略（只做解释与格式化）
- 不做浏览器真实 Cookie jar 管理

## 交互与页面

- 左侧：原始输入（Header 文本 / Cookie 文本 / Set-Cookie 文本）+ 示例
- 右侧：结构化表格视图 + 导出区
- 操作按钮：合并、去重、复制、清空

## 数据与状态

- 本地存储：保存最近一次输入与视图 tab
- 不上传内容，本地解析与导出

## 验收标准

- 粘贴一段 header 文本后：
  - 正确解析为列表
  - 去重/编辑/删除生效
  - 导出 JSON 正确
- 粘贴 Cookie/Set-Cookie 后：
  - 结构化字段可读
  - 能正确拼回 Cookie header
  - 导出 JSON 正确
- 错误格式有清晰提示，不崩溃

## 风险与待确认问题

- Set-Cookie 细节很多（逗号、过期时间格式），首版要严格限定支持范围并给出提示
- Header key 重复在某些场景是合法的（如 `Set-Cookie`、某些代理 header），去重策略需可配置
