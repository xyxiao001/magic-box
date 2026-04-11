export type TextCaseMode = 'none' | 'upper' | 'lower' | 'title'

export interface TextToolkitOptions {
  caseMode: TextCaseMode
  trimLines: boolean
  removeBlankLines: boolean
  collapseSpaces: boolean
  dedupeLines: boolean
  sortLines: boolean
  prefix: string
  suffix: string
}

export interface TextToolkitStats {
  characters: number
  charactersNoSpaces: number
  words: number
  lines: number
}

export const defaultTextToolkitOptions: TextToolkitOptions = {
  caseMode: 'none',
  trimLines: false,
  removeBlankLines: false,
  collapseSpaces: false,
  dedupeLines: false,
  sortLines: false,
  prefix: '',
  suffix: '',
}

function toTitleCase(value: string) {
  return value.replace(/\S+/g, (word) => {
    const lower = word.toLowerCase()
    return lower.charAt(0).toUpperCase() + lower.slice(1)
  })
}

function applyCaseMode(value: string, mode: TextCaseMode) {
  if (mode === 'upper') {
    return value.toUpperCase()
  }

  if (mode === 'lower') {
    return value.toLowerCase()
  }

  if (mode === 'title') {
    return toTitleCase(value)
  }

  return value
}

function collapseInlineSpaces(value: string) {
  return value.replace(/[ \t]{2,}/g, ' ')
}

export function processTextToolkit(input: string, options: TextToolkitOptions) {
  let lines = input.split(/\r?\n/)

  lines = lines.map((line) => {
    let nextLine = line

    if (options.trimLines) {
      nextLine = nextLine.trim()
    }

    if (options.collapseSpaces) {
      nextLine = collapseInlineSpaces(nextLine)
    }

    nextLine = applyCaseMode(nextLine, options.caseMode)
    nextLine = `${options.prefix}${nextLine}${options.suffix}`

    return nextLine
  })

  if (options.removeBlankLines) {
    lines = lines.filter((line) => line.trim().length > 0)
  }

  if (options.dedupeLines) {
    const seen = new Set<string>()
    lines = lines.filter((line) => {
      if (seen.has(line)) {
        return false
      }

      seen.add(line)
      return true
    })
  }

  if (options.sortLines) {
    lines = [...lines].sort((left, right) => left.localeCompare(right, 'zh-Hans-CN'))
  }

  return lines.join('\n')
}

export function buildTextToolkitStats(input: string): TextToolkitStats {
  const lines = input.length ? input.split(/\r?\n/).length : 0
  const words = input.trim().length ? input.trim().split(/\s+/).length : 0

  return {
    characters: input.length,
    charactersNoSpaces: input.replace(/\s/g, '').length,
    words,
    lines,
  }
}
