export const TOOL_SHARE_QUERY_KEY = 'share'

function encodeBase64Url(value: string) {
  const bytes = new TextEncoder().encode(value)
  let binary = ''

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4))
  const binary = atob(`${normalized}${padding}`)
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))

  return new TextDecoder().decode(bytes)
}

export function encodeToolShareState(state: unknown) {
  return encodeBase64Url(JSON.stringify(state))
}

export function decodeToolShareState<T>(encodedState: string) {
  try {
    return JSON.parse(decodeBase64Url(encodedState)) as T
  } catch {
    return null
  }
}

export function buildToolShareUrl(path: string, state: unknown, currentUrl = window.location.href) {
  const url = new URL(currentUrl)

  url.pathname = path
  url.search = ''
  url.hash = ''
  url.searchParams.set(TOOL_SHARE_QUERY_KEY, encodeToolShareState(state))

  return url.toString()
}

export function readToolShareStateFromUrl<T>(currentUrl = window.location.href) {
  const url = new URL(currentUrl)
  const encodedState = url.searchParams.get(TOOL_SHARE_QUERY_KEY)

  if (!encodedState) {
    return null
  }

  return decodeToolShareState<T>(encodedState)
}
