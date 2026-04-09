export interface ToolModule {
  id: string
  title: string
  category: string
  path: string
  description: string
  keywords: string[]
}

export const toolModules: ToolModule[] = [
  {
    id: 'regex-workbench',
    title: 'Regex Workbench',
    category: '正则',
    path: '/tools/regex-workbench',
    description: '测试表达式、查看分组并预览替换结果。',
    keywords: ['regex', 'regexp', 'match', 'replace', 'groups'],
  },
  {
    id: 'http-lab',
    title: 'HTTP Lab',
    category: '接口',
    path: '/tools/http-lab',
    description: '构造请求、调试响应并查看状态码、响应头和响应体。',
    keywords: ['http', 'api', 'fetch', 'request', 'response'],
  },
  {
    id: 'qrcode-studio',
    title: 'QRCode Studio',
    category: '二维码',
    path: '/tools/qrcode-studio',
    description: '本地生成二维码，支持尺寸、配色和 PNG 下载。',
    keywords: ['qrcode', 'qr', 'png', 'download', 'share'],
  },
  {
    id: 'package-radar',
    title: 'Package Radar',
    category: '包管理',
    path: '/tools/package-radar',
    description: '搜索 npm 包并查看版本、安装命令与官方链接。',
    keywords: ['npm', 'package', 'registry', 'version', 'install'],
  },
  {
    id: 'time-lab',
    title: 'Time Lab',
    category: '时间',
    path: '/tools/time-lab',
    description: 'Unix 时间戳与日期字符串互转，支持本地时间和 UTC。',
    keywords: ['timestamp', 'time', 'date', 'utc', 'unix'],
  },
  {
    id: 'json-toolkit',
    title: 'JSON Toolkit',
    category: 'JSON',
    path: '/tools/json-toolkit',
    description: '格式化、压缩、校验 JSON，并给出清晰错误提示。',
    keywords: ['json', 'format', 'minify', 'validate'],
  },
  {
    id: 'codec-lab',
    title: 'Codec Lab',
    category: '编码',
    path: '/tools/codec-lab',
    description: 'Base64 与 URL 编解码，适合接口调试和临时转换。',
    keywords: ['base64', 'urlencode', 'decode', 'encode'],
  },
  {
    id: 'markdown-studio',
    title: 'Markdown Studio',
    category: '文档',
    path: '/tools/markdown-studio',
    description: '编辑 Markdown 并实时预览，内置常用模板与统计。',
    keywords: ['markdown', 'md', 'preview', 'editor', 'readme'],
  },
  {
    id: 'jwt-studio',
    title: 'JWT Studio',
    category: '鉴权',
    path: '/tools/jwt-studio',
    description: '本地解析 JWT，查看 header、payload 与过期状态。',
    keywords: ['jwt', 'token', 'auth', 'claims', 'bearer'],
  },
  {
    id: 'diff-studio',
    title: 'Diff Studio',
    category: '对比',
    path: '/tools/diff-studio',
    description: '逐行比较两段文本，查看新增、删除和未变化内容。',
    keywords: ['diff', 'compare', 'patch', 'text', 'line'],
  },
  {
    id: 'image-studio',
    title: 'Image Studio',
    category: '图片',
    path: '/tools/image-studio',
    description: '本地压缩、裁切、缩放图片，并导出常见格式。',
    keywords: ['image', 'compress', 'resize', 'crop', 'webp'],
  },
  {
    id: 'color-studio',
    title: 'Color Studio',
    category: '颜色',
    path: '/tools/color-studio',
    description: '转换颜色格式、生成配色方案、预览渐变并检查对比度。',
    keywords: ['color', 'hex', 'rgb', 'hsl', 'gradient'],
  },
  {
    id: 'cron-planner',
    title: 'Cron Planner',
    category: '调度',
    path: '/tools/cron-planner',
    description: '解释 5 段 cron 表达式，并预览未来触发时间。',
    keywords: ['cron', 'schedule', 'timer', 'job', 'planner'],
  },
  {
    id: 'hash-studio',
    title: 'Hash Studio',
    category: '校验',
    path: '/tools/hash-studio',
    description: '计算文本或文件的 MD5、SHA-1、SHA-256、SHA-512，并快速比对。',
    keywords: ['hash', 'md5', 'sha256', 'checksum', 'file'],
  },
]
