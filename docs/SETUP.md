# DeepNet Context System - Настройка

## Установка и настройка

### 1. Установка зависимостей
```bash
npm install
```

### 2. Настройка API ключей

Создайте файл `.env` в корне проекта на основе `env.example`:

```bash
cp env.example .env
```

**ВАЖНО**: Без файла `.env` приложение не будет работать, так как отсутствуют API ключи.

Отредактируйте `.env` файл и добавьте ваши API ключи:

```env
# API Keys (Ключи API)
VITE_OPENROUTER_API_KEY=sk-or-your-key-here
VITE_ANTHROPIC_API_KEY=your_anthropic_key_here
VITE_DEEPGRAM_API_KEY=your_deepgram_key_here

# API Configuration (Конфигурация API)
VITE_API_BASE_URL=https://openrouter.ai/api/v1
VITE_CHAT_MODEL=anthropic/claude-3.5-sonnet

# App Settings (Настройки приложения)
VITE_APP_TITLE=DeepNet Context System
VITE_DEBUG=false
```

**📋 Подробная документация по переменным**: См. [VARIABLES.md](./VARIABLES.md)

### 3. Получение API ключей

#### OpenRouter API Key
1. Зарегистрируйтесь на [OpenRouter](https://openrouter.ai/)
2. Перейдите в раздел "Keys" 
3. Создайте новый API ключ
4. Скопируйте ключ (начинается с `sk-or-`)

#### DeepGram API Key
1. Зарегистрируйтесь на [DeepGram](https://deepgram.com/)
2. Перейдите в раздел "API Keys"
3. Создайте новый API ключ
4. Скопируйте ключ

### 4. Запуск приложения

```bash
# Режим разработки
npm run dev

# Сборка для продакшена
npm run build
```

Приложение будет доступно по адресу `http://localhost:5173/` (или другому порту, если 5173 занят).

## Статус системы

✅ **Все ошибки исправлены:**
- `process is not defined` - исправлено
- `require is not defined` - исправлено
- Переменные окружения настроены для Vite
- Централизованная конфигурация через `appConfig`

✅ **Переменные окружения унифицированы:**
- Удалены дублирующиеся переменные
- Единый источник истины в `appConfig.ts`
- Типобезопасная конфигурация
- Документация по переменным в `VARIABLES.md`

✅ **Система готова к работе:**
- DeepGram интеграция настроена
- LLM агент интегрирован
- Контекстная система работает
- Голосовое распознавание функционирует

## Использование

1. **Настройка контекста**: Укажите информацию о себе (сторона A), собеседнике (сторона B) и цели коммуникации
2. **Голосовое распознавание**: Нажмите кнопку записи и говорите - система будет распознавать речь через DeepGram
3. **Контекстные подсказки**: Система автоматически генерирует подсказки на основе диалога
4. **Поиск**: Используйте поиск для нахождения конкретной информации в диалоге

## Архитектура

- **DeepGram**: Распознавание голоса в реальном времени
- **LLM Agent**: Анализ диалога и генерация подсказок
- **Context Manager**: Управление контекстом и диалогом
- **Dialog Processor**: Обработка и анализ диалога
- **Hint Generator**: Генерация контекстных подсказок
- **Search Service**: Поиск по диалогу

## Технологии

- Vue 2.7.16 + Composition API
- TypeScript
- Tailwind CSS
- DeepGram JavaScript SDK
- OpenRouter API
- Vite