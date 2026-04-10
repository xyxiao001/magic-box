# 0022 HMAC Signer

## 背景

网关签名、Webhook 验签、内部 API 调用鉴权，经常依赖 HMAC（如 HMAC-SHA256）。排查签名不一致的问题，通常需要手动拼字符串、处理编码、排序 query、然后再算哈希。一个本地的 HMAC 签名工具可以把“猜测”变成“可视化对照”。

## 用户故事

作为后端/前端/测试同学，我希望输入 secret、签名串（或请求要素）后，立刻得到 HMAC 签名结果，并能对比服务端期望值，快速定位到底是拼串、编码、时间戳还是 key 顺序的问题。

## 首版范围

- 基础签名
  - 支持算法：HMAC-SHA256（首版只做一个，保证体验）
  - 输入：secret、message（签名原文）
  - 输出：hex、base64 两种格式
  - 支持复制结果
- 请求辅助模式（首版简化）
  - 输入 method、path、query、timestamp、nonce、body
  - 生成 canonical string（可视化展示）
  - 支持开关：query 排序、空值过滤、换行分隔符
  - 生成 message 后再计算签名
- 校验模式
  - 输入“目标签名”，自动提示匹配/不匹配

## 不做什么（首版不含）

- 不做 RSA/ECDSA 签名
- 不做完整 OpenAPI 或网关协议适配
- 不做密钥管理与团队共享

## 交互与页面

- 左侧：输入区（secret、message 或请求要素）
- 右侧：canonical string、签名结果、对比结果
- 支持模板：常见 webhook、常见网关签名格式（只提供示例）

## 数据与状态

- 本地存储：保存最近一次配置（不保存 secret，或提供“是否保存 secret”开关，默认不保存）
- 不上传任何内容

## 验收标准

- 输入 secret + message 后能输出稳定的 HMAC-SHA256（hex/base64）
- canonical string 生成逻辑可解释、可复制
- 目标签名比对准确
- 对空输入/非法输入有提示

## 风险与待确认问题

- “canonical string”的定义必须明确，否则容易误导用户；首版只提供可配置的通用拼接模式
- secret 的隐私边界要清晰：默认不持久化
