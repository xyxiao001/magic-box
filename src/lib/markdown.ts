export function escapeHtml(input: string) {
  return input
    .replaceAll(/&/g, '&amp;')
    .replaceAll(/</g, '&lt;')
    .replaceAll(/>/g, '&gt;')
}

function escapeAttribute(input: string) {
  return input.replaceAll(/"/g, '&quot;').replaceAll(/</g, '&lt;')
}

function normalizeCodeLanguage(input: string) {
  const lang = input.trim().toLowerCase()

  if (lang === 'js') {
    return 'javascript'
  }

  if (lang === 'ts') {
    return 'typescript'
  }

  if (lang === 'sh' || lang === 'shell' || lang === 'zsh') {
    return 'bash'
  }

  if (lang === 'md') {
    return 'markdown'
  }

  return lang
}

function applyInlineFormatting(input: string) {
  const inlineSnippets: string[] = []

  let text = input.replace(/`([^`\n]+)`/g, (_, code: string) => {
    const index = inlineSnippets.length
    inlineSnippets.push(`<code>${code}</code>`)
    return `@@INLINE_${index}@@`
  })

  text = text.replace(
    /!\[([^\]]*)\]\(((?:https?:\/\/|data:image\/[a-zA-Z+.-]+;base64,[^\s)]+|\/)[^\s)]*)\)/g,
    (_, alt: string, url: string) => {
      const safeUrl = escapeAttribute(url)
      const safeAlt = escapeAttribute(alt)
      return `<img src="${safeUrl}" alt="${safeAlt}" class="md-image">`
    }
  )

  text = text.replace(
    /\[([^\]]+)\]\(((?:https?:\/\/|mailto:|\/|#)[^\s)]+)\)/g,
    (_, label: string, url: string) => {
      const safeUrl = escapeAttribute(url)
      return `<a href="${safeUrl}" target="_blank" rel="noreferrer">${label}</a>`
    }
  )

  text = text.replace(/~~([^~]+)~~/g, '<del>$1</del>')
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  text = text.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>')

  return text.replace(/@@INLINE_(\d+)@@/g, (_, idx: string) => {
    const i = Number(idx)
    return inlineSnippets[i] ?? ''
  })
}

function splitTableRow(line: string) {
  const trimmed = line.trim()
  const normalized = trimmed.startsWith('|') ? trimmed.slice(1) : trimmed
  const normalized2 = normalized.endsWith('|') ? normalized.slice(0, -1) : normalized

  return normalized2.split('|').map((cell) => cell.trim())
}

function isTableSeparator(line: string) {
  if (!line.includes('|')) {
    return false
  }

  const cells = splitTableRow(line).filter((cell) => cell.length > 0)

  if (!cells.length) {
    return false
  }

  return cells.every((cell) => /^:?-{3,}:?$/.test(cell))
}

function getLeadingWhitespaceWidth(line: string) {
  const match = /^(\s*)/.exec(line)

  if (!match) {
    return 0
  }

  return match[1].replaceAll('\t', '  ').length
}

function matchListMarker(line: string) {
  const unorderedMatch = /^(\s*)([-*+])\s+(.*)$/.exec(line)

  if (unorderedMatch) {
    return {
      indent: unorderedMatch[1].replaceAll('\t', '  ').length,
      ordered: false,
      content: unorderedMatch[3],
    }
  }

  const orderedMatch = /^(\s*)(\d+)\.\s+(.*)$/.exec(line)

  if (orderedMatch) {
    return {
      indent: orderedMatch[1].replaceAll('\t', '  ').length,
      ordered: true,
      content: orderedMatch[3],
    }
  }

  return null
}

function parseTaskContent(content: string) {
  const taskMatch = /^\[([ xX])\]\s+(.*)$/.exec(content)

  if (!taskMatch) {
    return null
  }

  return {
    checked: taskMatch[1].toLowerCase() === 'x',
    content: taskMatch[2],
  }
}

function buildAlignedCell(tag: 'th' | 'td', content: string, align: 'left' | 'center' | 'right' | null) {
  const style = align ? ` style="text-align: ${align}"` : ''
  return `<${tag}${style}>${applyInlineFormatting(content)}</${tag}>`
}

function renderListBlock(lines: string[], startIndex: number) {
  const firstItem = matchListMarker(lines[startIndex] ?? '')

  if (!firstItem) {
    return { html: '', nextIndex: startIndex }
  }

  const tag = firstItem.ordered ? 'ol' : 'ul'
  const baseIndent = firstItem.indent
  const items: string[] = []
  let cursor = startIndex

  while (cursor < lines.length) {
    const current = lines[cursor] ?? ''

    if (!current.trim()) {
      break
    }

    const marker = matchListMarker(current)

    if (!marker || marker.indent < baseIndent || marker.ordered !== firstItem.ordered) {
      break
    }

    if (marker.indent > baseIndent) {
      const nested = renderListBlock(lines, cursor)

      if (items.length) {
        items[items.length - 1] = items[items.length - 1].replace('</li>', `${nested.html}</li>`)
      }

      cursor = nested.nextIndex
      continue
    }

    cursor += 1

    const continuation: string[] = []
    const nestedBlocks: string[] = []
    while (cursor < lines.length) {
      const next = lines[cursor] ?? ''

      if (!next.trim()) {
        break
      }

      const nextMarker = matchListMarker(next)
      const nextIndent = getLeadingWhitespaceWidth(next)

      if (nextMarker && nextIndent <= baseIndent) {
        break
      }

      if (nextMarker && nextIndent > baseIndent) {
        break
      }

      if (nextIndent <= baseIndent) {
        break
      }

      const nestedContent = next.slice(Math.min(next.length, baseIndent + 2))

      if (nestedContent.trim() && (startsWithComplexBlock(nestedContent) || nestedBlocks.length > 0)) {
        nestedBlocks.push(nestedContent)
        cursor += 1
        continue
      }

      continuation.push(next.trim())
      cursor += 1
    }

    const task = parseTaskContent(marker.content)
    const content = task ? task.content : marker.content
    const body = [content, ...continuation].map((part) => applyInlineFormatting(part)).join('<br>')
    const nestedHtml = nestedBlocks.length ? renderBlocks(nestedBlocks.join('\n')) : ''

    if (task) {
      items.push(
        `<li class="md-task-list-item"><label class="md-task-label"><input type="checkbox" disabled${task.checked ? ' checked' : ''}><span>${body}</span></label>${nestedHtml}</li>`
      )
      continue
    }

    items.push(`<li>${body}${nestedHtml}</li>`)
  }

  return {
    html: `<${tag}>${items.join('')}</${tag}>`,
    nextIndex: cursor,
  }
}

function startsWithComplexBlock(line: string) {
  const trimmed = line.trim()
  return (
    trimmed.startsWith('&gt;') ||
    trimmed.startsWith('#') ||
    trimmed === '---' ||
    Boolean(matchListMarker(line)) ||
    /^@@CODE_\d+@@$/.test(trimmed)
  )
}

function renderBlocks(escapedText: string) {
  const lines = escapedText.split(/\r?\n/)
  const htmlParts: string[] = []

  let cursor = 0

  function isBlank(line: string) {
    return line.trim().length === 0
  }

  function isCodePlaceholder(line: string) {
    return /^@@CODE_\d+@@$/.test(line.trim())
  }

  function startsList(line: string) {
    return Boolean(matchListMarker(line))
  }

  function startsBlock(line: string) {
    const trimmed = line.trim()
    return (
      trimmed.startsWith('#') ||
      trimmed === '---' ||
      trimmed.startsWith('&gt;') ||
      isCodePlaceholder(line) ||
      startsList(line)
    )
  }

  while (cursor < lines.length) {
    while (cursor < lines.length && isBlank(lines[cursor] ?? '')) {
      cursor += 1
    }

    if (cursor >= lines.length) {
      break
    }

    const line = lines[cursor] ?? ''
    const trimmed = line.trim()

    if (isCodePlaceholder(line)) {
      htmlParts.push(trimmed)
      cursor += 1
      continue
    }

    const headingMatch = /^(#{1,6})\s+(.*)$/.exec(trimmed)
    if (headingMatch) {
      const level = headingMatch[1].length
      const content = applyInlineFormatting(headingMatch[2])
      htmlParts.push(`<h${level}>${content}</h${level}>`)
      cursor += 1
      continue
    }

    if (trimmed === '---') {
      htmlParts.push('<hr>')
      cursor += 1
      continue
    }

    if (trimmed.startsWith('&gt;')) {
      const quoted: string[] = []
      while (cursor < lines.length) {
        const current = lines[cursor] ?? ''
        const currentTrimmed = current.trim()

        if (!currentTrimmed.startsWith('&gt;')) {
          break
        }

        quoted.push(currentTrimmed.replace(/^&gt;\s?/, ''))
        cursor += 1
      }

      const inner = renderBlocks(quoted.join('\n'))
      htmlParts.push(`<blockquote>${inner}</blockquote>`)
      continue
    }

    if ((lines[cursor] ?? '').includes('|') && isTableSeparator(lines[cursor + 1] ?? '')) {
      const header = splitTableRow(lines[cursor] ?? '')
      const alignments = splitTableRow(lines[cursor + 1] ?? '').map((cell) => {
        if (cell.startsWith(':') && cell.endsWith(':')) {
          return 'center'
        }

        if (cell.endsWith(':')) {
          return 'right'
        }

        if (cell.startsWith(':')) {
          return 'left'
        }

        return null
      })
      cursor += 2
      const rows: string[][] = []

      while (cursor < lines.length) {
        const rowLine = lines[cursor] ?? ''

        if (isBlank(rowLine)) {
          break
        }

        if (!rowLine.includes('|')) {
          break
        }

        rows.push(splitTableRow(rowLine))
        cursor += 1
      }

      const headHtml = header
        .map((cell, index) => buildAlignedCell('th', cell, alignments[index] ?? null))
        .join('')

      const bodyHtml = rows
        .map(
          (row) =>
            `<tr>${row
              .map((cell, index) => buildAlignedCell('td', cell, alignments[index] ?? null))
              .join('')}</tr>`
        )
        .join('')

      htmlParts.push(`<table><thead><tr>${headHtml}</tr></thead><tbody>${bodyHtml}</tbody></table>`)
      continue
    }

    if (matchListMarker(line)) {
      const list = renderListBlock(lines, cursor)
      htmlParts.push(list.html)
      cursor = list.nextIndex
      continue
    }

    const paragraphLines: string[] = []
    while (cursor < lines.length) {
      const current = lines[cursor] ?? ''

      if (isBlank(current)) {
        break
      }

      if (paragraphLines.length > 0 && startsBlock(current)) {
        break
      }

      paragraphLines.push(current)
      cursor += 1
    }

    const paragraphHtml = paragraphLines.map((l) => applyInlineFormatting(l)).join('<br>')
    htmlParts.push(`<p>${paragraphHtml}</p>`)
  }

  return htmlParts.join('\n')
}

export function getMarkdownStats(input: string) {
  const chars = input.length
  const codeBlocks = (input.match(/```/g) || []).length / 2
  const withoutCode = input.replace(/```[\s\S]*?```/g, '').trim()
  const paragraphs = withoutCode
    .split(/\n{2,}/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0).length
  return { chars, paragraphs, codeBlocks }
}

export function renderMarkdown(raw: string) {
  if (!raw.trim()) {
    return ''
  }

  const codeSnippets: string[] = []
  let text = raw.replace(/```(\w+)?\n([\s\S]*?)```/g, (_, lang: string | undefined, body: string) => {
    const index = codeSnippets.length
    const content = escapeHtml(body)
    const normalized = lang ? normalizeCodeLanguage(lang) : ''
    const language = normalized ? ` class="language-${escapeAttribute(normalized)}"` : ''
    codeSnippets.push(`<pre class="md-pre"><code${language}>${content}</code></pre>`)
    return `@@CODE_${index}@@`
  })

  text = escapeHtml(text)
  const htmlBlocks = renderBlocks(text)

  const finalHtml = htmlBlocks.replace(/@@CODE_(\d+)@@/g, (_, idx: string) => {
    const i = Number(idx)
    return codeSnippets[i] ?? ''
  })

  return finalHtml
}
