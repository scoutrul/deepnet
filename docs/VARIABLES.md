# Унифицированные переменные окружения

## Обзор

Все переменные окружения были унифицированы и приведены к единому стандарту. Удалены дублирующиеся переменные, все настройки централизованы в `appConfig.ts`.

## Структура переменных

### API Keys (Ключи API)
```env
VITE_OPENROUTER_API_KEY=sk-or-your-key-here
VITE_ANTHROPIC_API_KEY=your_anthropic_key_here  
VITE_DEEPGRAM_API_KEY=your_deepgram_key_here
```

### API Configuration (Конфигурация API)
```env
VITE_API_BASE_URL=https://openrouter.ai/api/v1
VITE_CHAT_MODEL=anthropic/claude-3.5-sonnet
```

### App Settings (Настройки приложения)
```env
VITE_APP_TITLE=DeepNet Context System
VITE_APP_VERSION=1.0.0
VITE_DEBUG=false
```

### Request Settings (Настройки запросов)
```env
VITE_REQUEST_TIMEOUT_MS=10000
VITE_HTTP_REFERRER=http://localhost:5173
VITE_HTTP_TITLE=DeepNet Context System
```

## Удаленные дублирующиеся переменные

### ❌ Удалено (дублировало существующие):
- `VITE_OPENAI_API_KEY` → `VITE_OPENROUTER_API_KEY`
- `VITE_OPENROUTER_BASE_URL` → `VITE_API_BASE_URL`
- `VITE_OPENROUTER_MODEL` → `VITE_CHAT_MODEL`
- `VITE_APP_NAME` → `VITE_APP_TITLE`

## Централизованная конфигурация

Все переменные теперь используются через `appConfig.ts`:

```typescript
import { appConfig } from '../config/appConfig'

// Вместо import.meta.env.VITE_OPENROUTER_API_KEY
const apiKey = appConfig.llm.apiKey

// Вместо import.meta.env.VITE_API_BASE_URL  
const baseUrl = appConfig.llm.baseUrl

// Вместо import.meta.env.VITE_CHAT_MODEL
const model = appConfig.llm.model
```

## Преимущества унификации

1. **Единый источник истины** - все настройки в `appConfig.ts`
2. **Нет дублирования** - каждая переменная используется только один раз
3. **Типобезопасность** - TypeScript проверяет все настройки
4. **Легкость поддержки** - изменения в одном месте
5. **Fallback значения** - автоматические значения по умолчанию

## Миграция

Если у вас есть старый `.env` файл, обновите его согласно новой структуре:

```bash
# Старый формат
VITE_OPENAI_API_KEY=sk-or-...
VITE_OPENROUTER_BASE_URL=https://...

# Новый формат  
VITE_OPENROUTER_API_KEY=sk-or-...
VITE_API_BASE_URL=https://...
```
