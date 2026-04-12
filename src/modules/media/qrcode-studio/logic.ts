import QRCode from 'qrcode'

export { buildQrDownloadName, detectQrContentType } from '@/lib/qrcode-tool'

export async function generateQrDataUrl(
  content: string,
  size: number,
  margin: number,
  foreground: string,
  background: string
) {
  return QRCode.toDataURL(content, {
    width: size,
    margin,
    color: {
      dark: foreground,
      light: background,
    },
  })
}
