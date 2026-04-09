export interface DiffRow {
  type: 'same' | 'add' | 'remove'
  leftLineNumber: number | null
  rightLineNumber: number | null
  leftText: string
  rightText: string
}

export interface DiffStats {
  added: number
  removed: number
  unchanged: number
}

export interface DiffResult {
  rows: DiffRow[]
  stats: DiffStats
  identical: boolean
}

function splitLines(input: string) {
  if (!input) {
    return []
  }

  return input.replaceAll('\r\n', '\n').split('\n')
}

export function buildLineDiff(left: string, right: string): DiffResult {
  const leftLines = splitLines(left)
  const rightLines = splitLines(right)

  const m = leftLines.length
  const n = rightLines.length
  const dp = Array.from({ length: m + 1 }, () => Array.from({ length: n + 1 }, () => 0))

  for (let i = m - 1; i >= 0; i -= 1) {
    for (let j = n - 1; j >= 0; j -= 1) {
      if (leftLines[i] === rightLines[j]) {
        dp[i][j] = dp[i + 1][j + 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1])
      }
    }
  }

  const rows: DiffRow[] = []
  const stats: DiffStats = { added: 0, removed: 0, unchanged: 0 }

  let i = 0
  let j = 0
  let leftLineNumber = 1
  let rightLineNumber = 1

  while (i < m && j < n) {
    if (leftLines[i] === rightLines[j]) {
      rows.push({
        type: 'same',
        leftLineNumber,
        rightLineNumber,
        leftText: leftLines[i],
        rightText: rightLines[j],
      })
      stats.unchanged += 1
      i += 1
      j += 1
      leftLineNumber += 1
      rightLineNumber += 1
      continue
    }

    if (dp[i + 1][j] >= dp[i][j + 1]) {
      rows.push({
        type: 'remove',
        leftLineNumber,
        rightLineNumber: null,
        leftText: leftLines[i],
        rightText: '',
      })
      stats.removed += 1
      i += 1
      leftLineNumber += 1
      continue
    }

    rows.push({
      type: 'add',
      leftLineNumber: null,
      rightLineNumber,
      leftText: '',
      rightText: rightLines[j],
    })
    stats.added += 1
    j += 1
    rightLineNumber += 1
  }

  while (i < m) {
    rows.push({
      type: 'remove',
      leftLineNumber,
      rightLineNumber: null,
      leftText: leftLines[i],
      rightText: '',
    })
    stats.removed += 1
    i += 1
    leftLineNumber += 1
  }

  while (j < n) {
    rows.push({
      type: 'add',
      leftLineNumber: null,
      rightLineNumber,
      leftText: '',
      rightText: rightLines[j],
    })
    stats.added += 1
    j += 1
    rightLineNumber += 1
  }

  return {
    rows,
    stats,
    identical: stats.added === 0 && stats.removed === 0,
  }
}
