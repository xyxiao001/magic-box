export interface ToolDownloadPayload {
  filename: string
  content: string | Blob
  mimeType?: string
}

function createDownloadBlob(payload: ToolDownloadPayload) {
  if (payload.content instanceof Blob) {
    return payload.content
  }

  return new Blob([payload.content], {
    type: payload.mimeType ?? 'text/plain;charset=utf-8',
  })
}

export function downloadToolOutput(payload: ToolDownloadPayload) {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return false
  }

  const blob = createDownloadBlob(payload)
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')

  anchor.href = objectUrl
  anchor.download = payload.filename
  anchor.style.display = 'none'

  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()

  window.setTimeout(() => {
    URL.revokeObjectURL(objectUrl)
  }, 0)

  return true
}
