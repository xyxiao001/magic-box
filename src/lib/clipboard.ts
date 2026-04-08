export async function copyToClipboard(value: string) {
  if (!value || typeof navigator === 'undefined' || !navigator.clipboard) {
    return false
  }

  await navigator.clipboard.writeText(value)
  return true
}
