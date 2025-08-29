export function escapeForRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function highlightTerms(html: string, terms: Array<{ text: string; info: string }>): string {
  if (!html || !terms?.length) return html || ''
  let result = html
  const sorted = [...terms].sort((a, b) => b.text.length - a.text.length)
  for (const t of sorted) {
    const pattern = new RegExp(`\\b${escapeForRegex(t.text)}\\b`, 'gi')
    result = result.replace(
      pattern,
      `<span class="term-highlight underline decoration-dotted underline-offset-2 cursor-pointer hover:text-slate-700" data-term="${t.text}" data-info="${t.info}">${t.text}</span>`
    )
  }
  return result
}


