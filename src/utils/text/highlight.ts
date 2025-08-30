export function escapeForRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function highlightTerms(html: string, terms: Array<{ text: string; info: string }>): string {
  if (!html || !terms?.length) return html || ''
  
  // АГРЕССИВНАЯ очистка: убираем ВСЕ HTML-атрибуты и теги
  let result = html
    // 0. Специфично удаляем паттерны " data-info="">" и подобные
    .replace(/"\s+data-info="[^"]*"[^>]*>/g, '')
    .replace(/"\s+data-[a-zA-Z-]+="[^"]*"[^>]*>/g, '')
    // 1. Удаляем ВСЕ HTML-теги с атрибутами
    .replace(/<[^>]*>/g, '')
    // 2. Удаляем ВСЕ data-* атрибуты в любом виде
    .replace(/data-[a-zA-Z-]+="[^"]*"/g, '')
    // 3. Удаляем ВСЕ class и style атрибуты
    .replace(/class="[^"]*"/g, '')
    .replace(/style="[^"]*"/g, '')
    // 4. Удаляем ВСЕ оставшиеся HTML-атрибуты
    .replace(/[a-zA-Z-]+="[^"]*"/g, '')
    // 5. Удаляем ВСЕ оставшиеся HTML-теги
    .replace(/<[^>]*>/g, '')
    // 6. Удаляем ВСЕ оставшиеся символы > и <
    .replace(/[<>]/g, '')
    .replace(/\s{2,}/g, ' ') // Схлопываем множественные пробелы
  
  const sorted = [...terms].sort((a, b) => b.text.length - a.text.length)
  for (const t of sorted) {
    // Экранируем специальные символы в тексте термина
    const escapedText = escapeForRegex(t.text)
    const pattern = new RegExp(`\\b${escapedText}\\b`, 'gi')
    
    // Заменяем только текст, не затрагивая существующие HTML-теги
    result = result.replace(
      pattern,
      `<span class="term-highlight underline decoration-dotted underline-offset-2 cursor-pointer hover:text-slate-700" data-term="${escapedText}" data-info="${t.info}">${t.text}</span>`
    )
  }
  
  return result
}


