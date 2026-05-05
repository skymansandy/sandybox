/**
 * Preprocesses MkDocs-flavored markdown into standard markdown/HTML
 * that ReactMarkdown can handle. Converts:
 * - Admonitions (!!! type "title" / ??? type "title")
 * - Tabbed content (=== "Tab Title")
 */

export function preprocessMkDocsMarkdown(md: string): string {
  let result = processAdmonitions(md)
  result = processTabs(result)
  return result
}

// Map admonition types to icons and colors
const admonitionMeta: Record<string, { icon: string; color: string }> = {
  note: { icon: '📝', color: '#448aff' },
  abstract: { icon: '📋', color: '#00b0ff' },
  info: { icon: 'ℹ️', color: '#00b8d4' },
  tip: { icon: '💡', color: '#00bfa5' },
  success: { icon: '✅', color: '#00c853' },
  question: { icon: '❓', color: '#64dd17' },
  warning: { icon: '⚠️', color: '#ff9100' },
  failure: { icon: '❌', color: '#ff5252' },
  danger: { icon: '🔥', color: '#ff1744' },
  bug: { icon: '🐛', color: '#f50057' },
  example: { icon: '📖', color: '#7c4dff' },
  quote: { icon: '💬', color: '#9e9e9e' },
}

function processAdmonitions(md: string): string {
  const lines = md.split('\n')
  const output: string[] = []
  let i = 0

  while (i < lines.length) {
    const admonMatch = lines[i].match(/^(!!!|\?\?\?)\+?\s+(\w+)\s*(?:"([^"]*)")?/)
    if (admonMatch) {
      const isCollapsible = lines[i].startsWith('???')
      const isOpenByDefault = lines[i].includes('???+')
      const type = admonMatch[2]
      const title = admonMatch[3] || type.charAt(0).toUpperCase() + type.slice(1)
      const meta = admonitionMeta[type] || admonitionMeta.note

      // Collect indented body lines
      const bodyLines: string[] = []
      i++
      while (i < lines.length && (lines[i].startsWith('    ') || lines[i].trim() === '')) {
        if (lines[i].trim() === '' && i + 1 < lines.length && !lines[i + 1].startsWith('    ')) break
        bodyLines.push(lines[i].replace(/^    /, ''))
        i++
      }
      const body = bodyLines.join('\n').trim()

      if (isCollapsible) {
        output.push(`<details class="admonition admonition-${type}" ${isOpenByDefault ? 'open' : ''} style="border-left: 4px solid ${meta.color}">`)
        output.push(`<summary class="admonition-title" style="color: ${meta.color}">${meta.icon} ${title}</summary>`)
        output.push('')
        output.push(body)
        output.push('')
        output.push('</details>')
        output.push('')
      } else {
        output.push(`<div class="admonition admonition-${type}" style="border-left: 4px solid ${meta.color}">`)
        output.push(`<div class="admonition-title" style="color: ${meta.color}">${meta.icon} ${title}</div>`)
        output.push('')
        output.push(body)
        output.push('')
        output.push('</div>')
        output.push('')
      }
    } else {
      output.push(lines[i])
      i++
    }
  }
  return output.join('\n')
}

function processTabs(md: string): string {
  const lines = md.split('\n')
  const output: string[] = []
  let i = 0
  let tabGroupId = 0

  while (i < lines.length) {
    const tabMatch = lines[i].match(/^===\s+"([^"]+)"/)
    if (tabMatch) {
      tabGroupId++
      const tabs: { label: string; content: string[] }[] = []

      while (i < lines.length) {
        const m = lines[i].match(/^===\s+"([^"]+)"/)
        if (!m) break
        const label = m[1]
        const contentLines: string[] = []
        i++
        while (i < lines.length && !lines[i].match(/^===\s+"/) && !(lines[i].trim() !== '' && !lines[i].startsWith('    ') && !lines[i].startsWith('\t'))) {
          contentLines.push(lines[i].replace(/^    /, ''))
          i++
        }
        // Check if we stopped at non-tab, non-indented content
        if (i < lines.length && !lines[i].match(/^===\s+"/)) {
          tabs.push({ label, content: contentLines })
          break
        }
        tabs.push({ label, content: contentLines })
      }

      const gid = `tabgroup-${tabGroupId}`
      output.push(`<div class="md-tabbed" data-group="${gid}">`)
      output.push(`<div class="md-tabbed-labels">`)
      tabs.forEach((tab, idx) => {
        output.push(`<button class="md-tabbed-label ${idx === 0 ? 'active' : ''}" onclick="(function(el){var g=el.closest('.md-tabbed');g.querySelectorAll('.md-tabbed-label').forEach(function(l){l.classList.remove('active')});el.classList.add('active');g.querySelectorAll('.md-tabbed-content').forEach(function(c){c.style.display='none'});g.querySelectorAll('.md-tabbed-content')[${idx}].style.display='block';})(this)">${tab.label}</button>`)
      })
      output.push(`</div>`)
      tabs.forEach((tab, idx) => {
        output.push(`<div class="md-tabbed-content" style="display: ${idx === 0 ? 'block' : 'none'}">`)
        output.push('')
        output.push(tab.content.join('\n').trim())
        output.push('')
        output.push('</div>')
      })
      output.push('</div>')
      output.push('')
    } else {
      output.push(lines[i])
      i++
    }
  }
  return output.join('\n')
}

/**
 * Extract headings from markdown for TOC
 */
export interface TocEntry {
  id: string
  text: string
  level: number
}

export function extractToc(md: string): TocEntry[] {
  const headingRegex = /^(#{1,4})\s+(.+)$/gm
  const entries: TocEntry[] = []
  let match
  while ((match = headingRegex.exec(md)) !== null) {
    const level = match[1].length
    const text = match[2].replace(/[`*_~]/g, '').trim()
    const id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-')
    entries.push({ id, text, level })
  }
  return entries
}
