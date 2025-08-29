export function splitToParagraphs(text: string): string[] {
  if (!text) return []
  return String(text)
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(Boolean)
}

export function applyMarkdownBasic(text: string): string {
  if (!text) return ''
  return String(text)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
}

export function sanitizeOpenAttributes(html: string): string {
  if (!html) return ''
  return String(html)
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<([a-zA-Z][a-z0-9]*)\b[^>]*?(\sdata-[a-zA-Z-]+="[^"]*"|\sclass="[^"]*"|\sstyle="[^"]*")+[^>]*>/g, '<$1>')
}

export function doubleNewlinesToBr(htmlOrText: string): string {
  if (!htmlOrText) return ''
  return String(htmlOrText).replace(/\n\s*\n/g, '<br/><br/>')
}


