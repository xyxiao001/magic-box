# Spec Workflow

`specs/` 目录用于描述具体功能，不直接替代代码任务，而是把功能边界先讲清楚。

## 命名建议

使用递增编号：

- `0001-foundation-bootstrap.md`
- `0002-regex-workbench.md`
- `0003-http-lab.md`
- `0004-qrcode-studio.md`

## 每份 spec 至少回答这些问题

- 这个功能解决谁的什么问题
- 本次包含什么，不包含什么
- 页面或交互大致长什么样
- 数据从哪里来
- 如何验收
- 可能的风险是什么

## 开发节奏

1. 建 spec
2. 评审范围
3. 编码实现
4. 运行 `lint` / `typecheck` / `test` / `build`
5. 回写结果并提交
