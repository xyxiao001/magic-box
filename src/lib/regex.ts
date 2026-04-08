export interface RegexGroupEntry {
  index: number
  value: string
}

export interface RegexMatchEntry {
  index: number
  value: string
  groups: RegexGroupEntry[]
  namedGroups: Record<string, string>
}

export interface RegexAnalysisResult {
  ok: boolean
  error?: string
  matchCount?: number
  matches?: RegexMatchEntry[]
  replacementPreview?: string
}

function withGlobalFlag(flags: string) {
  return flags.includes('g') ? flags : `${flags}g`
}

function normalizeNamedGroups(groups: Record<string, string | undefined> | undefined) {
  if (!groups) {
    return {}
  }

  return Object.fromEntries(
    Object.entries(groups).map(([key, value]) => [key, value ?? ''])
  )
}

export function analyzeRegex(
  pattern: string,
  flags: string,
  testText: string,
  replacement: string
): RegexAnalysisResult {
  try {
    const activePattern = pattern || '(?:)'
    const baseRegex = new RegExp(activePattern, flags)
    const listingRegex = new RegExp(activePattern, withGlobalFlag(flags))
    const matches = Array.from(testText.matchAll(listingRegex)).map((match) => ({
      index: match.index ?? 0,
      value: match[0] ?? '',
      groups: match.slice(1).map((value, index) => ({
        index: index + 1,
        value: value ?? '',
      })),
      namedGroups: normalizeNamedGroups(match.groups),
    }))

    return {
      ok: true,
      matchCount: matches.length,
      matches,
      replacementPreview: testText.replace(baseRegex, replacement),
    }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : '正则表达式无效',
    }
  }
}
