import { buildQrDownloadName, detectQrContentType, generateQrDataUrl } from './logic'
import { qrcodeStudioMeta } from './meta'
import type { ToolSample } from '@/tool-runtime/protocols/tool-module'
import type { ToolModule } from '@/tool-runtime/protocols/tool-module'

export interface QrcodeStudioInput {
  content: string
  size: number
  margin: number
  foreground: string
  background: string
}

export interface QrcodeStudioOutput {
  type: string
  downloadName: string
  dataUrl: string
}

export const qrcodeStudioSamples: ToolSample<QrcodeStudioInput>[] = [
  {
    id: 'project-link',
    label: '项目链接',
    summary: '最常见的分享方式，适合网页、预览地址和文档入口。',
    apply: () => ({
      content: 'https://magic-box-lyart.vercel.app/tools/http-lab',
      size: 320,
      margin: 2,
      foreground: '#0f1728',
      background: '#f7fbff',
    }),
  },
  {
    id: 'wifi',
    label: 'Wi-Fi',
    summary: '适合会议室、演示机和临时网络接入。',
    apply: () => ({
      content: 'WIFI:T:WPA;S:MagicBox;P:12345678;;',
      size: 320,
      margin: 2,
      foreground: '#0f1728',
      background: '#f7fbff',
    }),
  },
  {
    id: 'email',
    label: '邮件入口',
    summary: '把常用反馈邮箱、工单地址快速做成二维码。',
    apply: () => ({
      content: 'mailto:hello@magic-box.dev',
      size: 320,
      margin: 2,
      foreground: '#0f1728',
      background: '#f7fbff',
    }),
  },
  {
    id: 'text',
    label: '纯文本',
    summary: '把短说明、兑换码或临时口令做成可扫码文本。',
    apply: () => ({
      content: 'Magic Box ships faster with local-first tools.',
      size: 320,
      margin: 2,
      foreground: '#0f1728',
      background: '#f7fbff',
    }),
  },
]

export function createQrcodeStudioInitialInput(): QrcodeStudioInput {
  return {
    content: 'https://magic-box-lyart.vercel.app/tools/http-lab',
    size: 320,
    margin: 2,
    foreground: '#0f1728',
    background: '#f7fbff',
  }
}

export async function executeQrcodeStudio(input: QrcodeStudioInput): Promise<QrcodeStudioOutput> {
  const trimmed = input.content.trim()
  if (!trimmed) {
    throw new Error('输入内容后会自动生成二维码')
  }

  return {
    type: detectQrContentType(trimmed),
    downloadName: buildQrDownloadName(trimmed),
    dataUrl: await generateQrDataUrl(trimmed, input.size, input.margin, input.foreground, input.background),
  }
}

export function buildQrcodeStudioHistoryLabel(output: QrcodeStudioOutput) {
  return `${output.type} 二维码`
}

export const qrcodeStudioRuntimeModule: Omit<ToolModule<QrcodeStudioInput, QrcodeStudioOutput>, 'page'> = {
  meta: qrcodeStudioMeta,
  createInitialInput: createQrcodeStudioInitialInput,
  execute: async (input) => executeQrcodeStudio(input),
  samples: qrcodeStudioSamples,
}
