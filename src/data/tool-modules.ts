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
]
