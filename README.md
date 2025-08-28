# DeepNet Encyclopedia - Interactive Learning Assistant

## 🎯 Product Overview

**DeepNet Encyclopedia** — это интерактивный чат-помощник для подготовки к техническим интервью и изучения технологий. Приложение использует AI для генерации структурированных ответов с интерактивными терминами, позволяя пользователям глубоко погружаться в любую техническую тему через последовательные вопросы и исследования.

## 🚀 Key Features

### 1. Smart Chat Interface (Умный интерфейс чата)
- **Двухколоночный макет (Two-column layout)**: Чат + опции справа
- **Пузырьки сообщений (Message bubbles)**: Пользователь (справа, темные) / Ассистент (слева, светлые)
- **Автоскролл (Auto-scroll)**: Автоматическое прокручивание к последнему сообщению
- **Индикаторы печати (Typing indicators)**: Анимация для пользователя и ассистента

### 2. Interactive Term System (Интерактивная система терминов)
- **ЛКМ на термин (LMB on term)**: Мгновенный запрос по выбранному термину
- **ПКМ/⌃-клик (RMB/⌃-click)**: Добавление термина в очередь для комбинированного запроса
- **Inline термины (Inline terms)**: Кликабельные фразы прямо в тексте ответа
- **Hover карточки (Hover cards)**: Всплывающие подсказки с описанием терминов

### 3. Configurable Response Quality (Настраиваемое качество ответов)
- **Краткий режим (Short mode)**: 350 токенов, температура 0.3 (концентрированные ответы)
- **Расширенный режим (Extended mode)**: 700 токенов, температура 0.5 (сбалансированные ответы)
- **Максимальный режим (Maximum mode)**: 1200 токенов, температура 0.7 (детальные ответы)

### 4. Context Awareness (Осведомленность о контексте)
- **Предыдущий контекст (Previous context)**: Опция включения предыдущего ответа ассистента
- **Контекстная связность (Contextual coherence)**: Ответы связаны с предыдущими вопросами
- **История сессии (Session history)**: Сохранение контекста на протяжении разговора

## 🏗️ Technical Architecture

### Frontend Stack (Стек фронтенда)
- **Framework (Фреймворк)**: Vue 2 (Options API) + Vue Composition API
- **Language (Язык)**: TypeScript
- **Styling (Стилизация)**: Tailwind CSS v3 + PostCSS
- **Build Tool (Инструмент сборки)**: Vite v4.5.3
- **Plugin (Плагин)**: vite-plugin-vue2

### Component Structure (Структура компонентов)
```
src/
├── App.vue                 # Главный контейнер + состояние (Main container + state)
├── components/
│   ├── Message.vue         # Рендерер сообщений чата (Chat message renderer)
│   ├── ChatInput.vue       # Поле ввода с отправкой (Input field with submit)
│   ├── OptionsPanel.vue    # Панель настроек (Options panel)
│   └── hover/
│       └── HoverTerm.vue   # Интерактивные термины (Interactive terms)
├── services/
│   ├── aiClient.ts         # API коммуникация (API communication)
│   ├── chatService.ts      # Бизнес-логика (Business logic)
│   └── responseParser.ts   # Парсинг ответов AI (AI response parsing)
└── types/
    ├── ai.ts               # Интерфейсы AI ответов (AI response interfaces)
    └── chat.ts             # Типы сообщений (Chat message types)
```

### API Integration (Интеграция API)
- **Provider (Провайдер)**: OpenRouter.ai (OpenAI-compatible)
- **Fallback (Резервный вариант)**: Mock responses для разработки
- **Authentication (Аутентификация)**: Bearer token через env переменные
- **Timeout (Таймаут)**: AbortController с настраиваемым таймаутом

## 📱 User Experience Flow

### 1. Initial Interaction (Начальное взаимодействие)
```
Пользователь → Открывает приложение → Видит приветствие ассистента
```

### 2. Question Submission (Отправка вопроса)
```
Пользователь → Вводит вопрос → Выбирает детализацию → Отправляет
```

### 3. Response Processing (Обработка ответа)
```
AI → Генерирует ответ → Парсится в структуру → Отображается с терминами
```

### 4. Term Exploration (Исследование терминов)
```
Пользователь → Кликает на термин → Получает новый ответ → Углубляется в тему
```

### 5. Context Building (Построение контекста)
```
Пользователь → Добавляет термины в очередь → Формирует комбинированный запрос
```

## 🎨 UI/UX Design Principles

### Visual Hierarchy (Визуальная иерархия)
- **Четкое разделение (Clear separation)**: Пользователь vs Ассистент
- **Цветовая схема (Color scheme)**: Темные пузыри для пользователя, светлые для ассистента
- **Акцентные цвета (Accent colors)**: Индиго для интерактивных элементов

### Interaction Patterns (Паттерны взаимодействия)
- **Hover (Наведение)**: 200ms delay для показа карточек
- **Click (Клик)**: Мгновенная реакция на действия
- **Keyboard (Клавиатура)**: Enter для отправки, Tab для навигации
- **Touch (Сенсор)**: Ctrl+клик для правой кнопки мыши

### Responsive Design (Адаптивный дизайн)
- **Grid Layout (Сеточная компоновка)**: 2/3 для чата, 1/3 для опций
- **Sticky Positioning (Липкое позиционирование)**: Панель опций следует за скроллом
- **Dynamic Height (Динамическая высота)**: Использование svh для мобильных устройств

## 🔧 Configuration & Environment

### Environment Variables (Переменные окружения)
```bash
# API Configuration (Конфигурация API)
VITE_OPENAI_API_KEY=your_openrouter_api_key_here
VITE_API_BASE_URL=https://openrouter.ai/api/v1
VITE_CHAT_MODEL=gpt-4o

# App Settings (Настройки приложения)
VITE_APP_TITLE=DeepNet Encyclopedia
VITE_REQUEST_TIMEOUT_MS=20000

# HTTP Headers (HTTP заголовки)
VITE_HTTP_REFERRER=your_domain
VITE_HTTP_TITLE=DeepNet Encyclopedia
```

### Build Configuration (Конфигурация сборки)
- **Development (Разработка)**: Hot reload, debug panel, mock responses
- **Production (Продакшн)**: Optimized bundle, no debug info
- **TypeScript**: Strict mode, path aliases (@/ → src/)

## 📊 Data Flow

### Request Pipeline (Конвейер запросов)
```
User Input → Options Processing → System Prompt Generation → API Call → Response Parsing → UI Update
```

### State Management (Управление состоянием)
```
App State (Состояние приложения):
├── messages[]           # История сообщений (Message history)
├── options             # Настройки детализации и контекста (Detail and context settings)
├── queuedTerms[]       # Очередь терминов для комбинированного запроса (Term queue for combined query)
├── loading             # Статус загрузки (Loading status)
└── draft               # Текущий черновик пользователя (Current user draft)
```

### Response Schema (Схема ответа)
```typescript
interface ParsedResponse {
  text: string;           // Основной текст ответа (Main response text)
  terms: InteractiveTerm[]; // Массив интерактивных терминов (Array of interactive terms)
}

interface InteractiveTerm {
  text: string;           // Текст термина (Term text)
  info: string;           // Описание/информация (Description/information)
}
```

## 🧪 Development & Testing

### Development Workflow (Рабочий процесс разработки)
1. **Setup (Установка)**: `npm install` + env configuration
2. **Development (Разработка)**: `npm run dev` (mock responses)
3. **Build (Сборка)**: `npm run build` (production bundle)
4. **Preview (Предварительный просмотр)**: `npm run preview` (test production build)

### Mock System (Система моков)
- **Offline Development (Офлайн разработка)**: Работа без API ключа
- **Dynamic Responses (Динамические ответы)**: Различные ответы в зависимости от детализации
- **Error Simulation (Симуляция ошибок)**: Тестирование обработки ошибок

### Debug Features (Отладочные функции)
- **Request Preview (Предварительный просмотр запроса)**: Показ тела запроса в DEV режиме
- **Reactive Updates (Реактивные обновления)**: Автоматическое обновление при изменении опций
- **State Inspection (Инспекция состояния)**: Просмотр текущего состояния приложения

## 🚀 Performance Optimizations

### Frontend Optimizations (Оптимизация фронтенда)
- **Vue Reactivity (Реактивность Vue)**: Минимальные перерендеры
- **Tailwind JIT**: Только используемые CSS классы
- **Lazy Loading (Ленивая загрузка)**: Компоненты загружаются по требованию

### API Optimizations (Оптимизация API)
- **Request Caching (Кэширование запросов)**: Повторное использование системных промптов
- **Timeout Management (Управление таймаутами)**: AbortController для отмены зависших запросов
- **Error Handling (Обработка ошибок)**: Graceful degradation при сбоях API

## 🔒 Security Considerations

### API Security (Безопасность API)
- **Environment Variables (Переменные окружения)**: API ключи не коммитятся в репозиторий
- **Request Validation (Валидация запросов)**: Проверка входных данных
- **Rate Limiting (Ограничение скорости)**: Обработка 429 ошибок

### Frontend Security (Безопасность фронтенда)
- **XSS Prevention (Предотвращение XSS)**: Vue.js автоматическая экранизация
- **Input Sanitization (Санитизация ввода)**: Очистка пользовательского ввода
- **CORS Handling (Обработка CORS)**: Правильная настройка заголовков

## 📈 Future Enhancements

### Short Term (1-2 months) (Краткосрочные)
- **Toggle Removal (Переключение удаления)**: Удаление терминов из очереди по повторному ПКМ
- **Keyboard Navigation (Навигация с клавиатуры)**: Улучшенная навигация с клавиатуры
- **Error Toasts (Уведомления об ошибках)**: Уведомления об ошибках

### Medium Term (3-6 months) (Среднесрочные)
- **Theme System (Система тем)**: Светлая/темная тема
- **Streaming Responses (Потоковые ответы)**: Server-sent events для реалистичной печати
- **Export Functionality (Функция экспорта)**: Экспорт истории разговоров

### Long Term (6+ months) (Долгосрочные)
- **Multi-language Support (Поддержка нескольких языков)**: Поддержка других языков
- **Advanced Analytics (Продвинутая аналитика)**: Анализ паттернов обучения
- **Integration APIs (API интеграции)**: Подключение к внешним системам

## 🛠️ Installation & Setup

### Prerequisites (Предварительные требования)
- Node.js 16+ 
- npm 8+
- OpenRouter API key

### Quick Start (Быстрый старт)
```bash
# Clone repository (Клонировать репозиторий)
git clone <repository-url>
cd deepnet

# Install dependencies (Установить зависимости)
npm install

# Configure environment (Настроить окружение)
cp .env.example .env
# Edit .env with your API key (Отредактировать .env с вашим API ключом)

# Start development server (Запустить сервер разработки)
npm run dev

# Build for production (Собрать для продакшна)
npm run build
```

### Development Commands (Команды разработки)
```bash
npm run dev          # Start development server (Запустить сервер разработки)
npm run build        # Build production bundle (Собрать продакшн бандл)
npm run preview      # Preview production build (Предварительный просмотр продакшн сборки)
npm run type-check   # TypeScript type checking (Проверка типов TypeScript)
```

## 📚 API Documentation (Документация API)

### Chat Completion Endpoint (Эндпоинт завершения чата)
```typescript
POST /chat/completions
{
  "model": "gpt-4.1-mini",
  "messages": [
    { "role": "system", "content": "system_prompt" },
    { "role": "assistant", "content": "previous_context" }, // optional (опционально)
    { "role": "user", "content": "user_question" }
  ],
  "max_tokens": 700,
  "temperature": 0.5
}
```

### System Prompt Structure (Структура системного промпта)
```
Ты — интерактивный чат-помощник «Энциклопедия Погружение».
Цель: помогать быстро погружаться в технические темы.

Правила:
1. Краткие ответы (2-3 предложения)
2. Выделение ключевых терминов
3. Список сопутствующих терминов
4. Контекстная связность
5. Технический стиль

Формат (JSON):
{
  "text": "ответ с выделенными терминами",
  "terms": [
    {"text": "термин", "info": "описание"}
  ]
}
```

## 🤝 Contributing

### Development Guidelines (Руководство по разработке)
- **Code Style (Стиль кода)**: TypeScript strict mode, Vue 2 Options API
- **Component Structure (Структура компонентов)**: Props down, events up
- **Testing (Тестирование)**: Manual testing with mock responses
- **Documentation (Документация)**: JSDoc comments for public APIs

### Project Structure (Структура проекта)
- **Components (Компоненты)**: Презентационные, переиспользуемые
- **Services (Сервисы)**: Бизнес-логика, API интеграция
- **Types (Типы)**: TypeScript интерфейсы и типы
- **Assets (Ресурсы)**: Статические ресурсы и стили

## 📄 License (Лицензия)

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments (Благодарности)

- **Vue.js Team**: За отличный фреймворк
- **Tailwind CSS**: За utility-first подход
- **OpenRouter**: За доступ к AI моделям
- **Vite**: За быструю сборку

---

**DeepNet Encyclopedia** - Интерактивное изучение технологий через AI-помощника 🚀

*Последнее обновление: 2024-12-19*
