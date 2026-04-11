/* global console, process */

import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

const rootDir = process.cwd()
const targetDir = path.resolve(rootDir, process.argv[2] ?? 'src/views/tools')

const darkPatterns = [
  /rgba\(15,\s*23,\s*42/i,
  /rgba\(3,\s*9,\s*16/i,
  /#07111d\b/i,
  /rgba\(241,\s*245,\s*249/i,
  /rgba\(226,\s*232,\s*240/i,
  /rgba\(125,\s*211,\s*252/i,
]

const lightOverridePatterns = [
  /data-theme=['"]mac-light['"]/,
  /:global\(html\[data-theme=['"]mac-light['"]\]\)/,
]

const themeBranchPatterns = [
  /theme\s*===\s*['"]mac-light['"]/,
  /theme\s*!==\s*['"]mac-light['"]/,
  /dataset\.theme\s*===\s*['"]mac-light['"]/,
  /dataset\.theme\s*!==\s*['"]mac-light['"]/,
  /const\s+\w*isLight\w*\s*=\s*.*mac-light/,
  /\bisLight\b/,
]

async function collectVueFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(directory, entry.name)

      if (entry.isDirectory()) {
        return collectVueFiles(fullPath)
      }

      return entry.isFile() && fullPath.endsWith('.vue') ? [fullPath] : []
    })
  )

  return files.flat()
}

function getMatchingLines(source, patterns) {
  return source
    .split('\n')
    .map((line, index) => ({
      lineNumber: index + 1,
      line,
    }))
    .filter(({ line }) => patterns.some((pattern) => pattern.test(line)))
}

async function main() {
  const vueFiles = await collectVueFiles(targetDir)
  const findings = []

  for (const filePath of vueFiles) {
    const source = await readFile(filePath, 'utf8')
    const darkMatches = getMatchingLines(source, darkPatterns)

    if (!darkMatches.length) {
      continue
    }

    const hasLightOverride = lightOverridePatterns.some((pattern) => pattern.test(source))
    const hasThemeBranch = themeBranchPatterns.some((pattern) => pattern.test(source))

    if (hasLightOverride || hasThemeBranch) {
      continue
    }

    findings.push({
      filePath,
      darkMatches,
    })
  }

  if (!findings.length) {
    console.log(`No suspicious files found in ${path.relative(rootDir, targetDir)}`)
    return
  }

  console.log(`Found ${findings.length} suspicious file(s) in ${path.relative(rootDir, targetDir)}:`)

  for (const finding of findings) {
    console.log(`\n- ${path.relative(rootDir, finding.filePath)}`)

    for (const match of finding.darkMatches.slice(0, 6)) {
      console.log(`  L${match.lineNumber}: ${match.line.trim()}`)
    }

    if (finding.darkMatches.length > 6) {
      console.log(`  ...and ${finding.darkMatches.length - 6} more match(es)`)
    }
  }

  process.exitCode = 1
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
