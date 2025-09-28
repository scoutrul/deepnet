# DeepNet Chat System

## 🎯 Product Overview

**DeepNet Chat System** — это система живой диктовки с LLM интеграцией для интерактивного изучения и анализа контента. Приложение позволяет пользователям диктовать текст в реальном времени, выделять ключевые слова и получать расширенную информацию через AI.

## 🚀 Key Features

### 1. Live Dictation (Живая диктовка)
- **Real-time Speech Recognition**: Распознавание речи в реальном времени через DeepGram WebSocket
- **Continuous Transcription**: Непрерывная транскрипция с сохранением форматирования
- **Auto-restart**: Автоматический перезапуск при проблемах с распознаванием
- **Persistence**: Сохранение транскрипта в localStorage

### 2. Interactive Word Selection (Интерактивное выделение слов)
- **Click Selection**: Выделение слов кликом мыши
- **Drag Selection**: Выделение фраз перетаскиванием курсора
- **Visual Highlighting**: Зеленое выделение выбранных слов
- **Toggle Selection**: Повторный клик для отмены выделения

### 3. Query Constructor (Конструктор запросов)
- **Word Collection**: Сбор выбранных слов в запрос
- **Manual Input**: Ручной ввод дополнительного текста
- **Compact Interface**: Компактный интерфейс внизу экрана
- **Auto-clear**: Автоматическая очистка после отправки

### 4. LLM Integration (LLM интеграция)
- **Anthropic Claude**: Использование Claude-3.5-Haiku для ответов
- **Context Awareness**: Полный контекст диктовки в системном промпте
- **Tabbed Responses**: Каждый ответ в отдельной вкладке
- **Word Re-selection**: Возможность выделения слов из ответов LLM

### 5. Context Management (Управление контекстом)
- **Side A/B Context**: Дополнительные контекстные блоки
- **Collapsible UI**: Сворачиваемые панели контекста
- **Persistence**: Сохранение контекста в localStorage
- **Clear Functions**: Отдельные кнопки очистки для каждого блока

## 🏗️ Technical Architecture

### Frontend Stack
- **Framework**: Vue 2.7.16 (Options API + Composition API)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v3.4.14
- **Build Tool**: Vite v4.5.14

### Component Structure
```
src/
├── components/
│   ├── MainApp.vue              # Главный компонент приложения
│   └── chat/
│       ├── LiveDictation.vue    # Компонент живой диктовки
│       └── LLMResponseTabs.vue  # Вкладки ответов LLM
├── services/
│   ├── voice/
│   │   └── websocketTranscriptionService.ts  # WebSocket распознавание
│   ├── chat/
│   │   ├── chatService.ts       # Сервис чата
│   │   └── aiClient.ts          # AI клиент
│   └── providers/
│       └── anthropicProvider.ts # Провайдер Anthropic
├── config/
│   └── appConfig.ts             # Конфигурация приложения
└── types/
    └── *.ts                     # TypeScript типы
```

### Core Services

#### WebSocket Transcription Service
- **Real-time Streaming**: Потоковое распознавание через DeepGram WebSocket
- **Audio Processing**: Обработка аудио чанков в реальном времени
- **Error Handling**: Обработка ошибок соединения и переподключение
- **State Management**: Управление состоянием записи и распознавания

#### Chat Service
- **LLM Integration**: Интеграция с Anthropic Claude API
- **Context Building**: Построение контекста из диктовки и дополнительных блоков
- **Response Processing**: Обработка ответов LLM
- **Error Handling**: Обработка ошибок API и таймаутов

## 📱 User Experience Flow

### 1. Initial Setup
```
Пользователь → Открывает приложение → Видит интерфейс диктовки
```

### 2. Speech Recognition
```
Пользователь → Нажимает "Начать" → Говорит → Видит транскрипт в реальном времени
```

### 3. Word Selection
```
Пользователь → Выделяет слова → Видит их в конструкторе запросов
```

### 4. LLM Query
```
Пользователь → Отправляет запрос → Получает ответ в новой вкладке
```

### 5. Context Building
```
Пользователь → Заполняет контекстные блоки → Использует в запросах
```

## 🔧 Configuration & Environment

### Environment Variables
```bash
# DeepGram Configuration
VITE_DEEPGRAM_API_KEY=your_deepgram_api_key

# Anthropic Configuration  
VITE_ANTHROPIC_API_KEY=your_anthropic_api_key
VITE_API_BASE_URL=https://api.anthropic.com
VITE_CHAT_MODEL=claude-3-5-haiku-20241022

# App Settings
VITE_APP_TITLE=DeepNet Chat System
VITE_REQUEST_TIMEOUT_MS=30000
```

### DeepGram Configuration
```typescript
{
  model: 'nova-2',
  language: 'ru',
  streaming: true,
  interimResults: true,
  punctuate: true,
  diarize: true,
  smartFormat: true,
  endpointing: 900,
  vadEvents: true
}
```

## 🚀 Performance Features

### Optimization
- **Debounced Storage**: Debouncing для localStorage операций
- **Word Selection Cache**: Кэширование результатов выделения слов
- **Shallow Watching**: Оптимизированное отслеживание изменений
- **Efficient Rendering**: Минимальные перерендеры компонентов

### Persistence
- **localStorage Integration**: Сохранение всех данных между сессиями
- **Selective Clearing**: Гранулярная очистка данных
- **Auto-save**: Автоматическое сохранение изменений

## 🔒 Security & Privacy

### Data Handling
- **No Audio Storage**: Аудио данные не сохраняются локально
- **Direct Streaming**: Прямая передача в DeepGram без промежуточного хранения
- **API Key Security**: Безопасное хранение API ключей в переменных окружения

### Privacy Features
- **Local Processing**: Обработка выделения слов на клиенте
- **Optional Context**: Контекстные блоки опциональны
- **Clear Functions**: Полная очистка данных по требованию

## 🛠️ Installation & Setup

### Prerequisites
- Node.js 16+
- npm 8+
- DeepGram API key
- Anthropic API key

### Quick Start
```bash
# Clone repository
git clone <repository-url>
cd deepnet

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your API keys

# Start development server
npm run dev

# Build for production
npm run build
```

### Development Commands
```bash
npm run dev          # Start development server
npm run build        # Build production bundle
npm run preview      # Preview production build
```

## 📚 Documentation

Вся техническая документация находится в папке `docs/`:

- `docs/DIARIZATION_ARCHITECTURE.md` - Архитектура системы диаризации
- `docs/SYSTEM_AUDIO_GUIDE.md` - Руководство по системному аудио
- `docs/MACOS_LIMITATIONS.md` - Ограничения macOS
- `docs/AUDIO_FIX_SUMMARY.md` - Исправления аудио проблем

## 🧪 Testing

### Manual Testing
1. **Speech Recognition**: Тестирование распознавания речи
2. **Word Selection**: Проверка выделения слов и фраз
3. **LLM Integration**: Тестирование запросов к LLM
4. **Persistence**: Проверка сохранения данных
5. **Error Handling**: Тестирование обработки ошибок

### Browser Compatibility
- **Chrome**: Полная поддержка
- **Firefox**: Поддерживается
- **Safari**: Ограниченная поддержка
- **Edge**: Полная поддержка

## 🔄 Recent Changes

### Major Refactoring (2024-12-28)
- **Removed Main Tab**: Удалена основная вкладка с MVP функционалом
- **Simplified Architecture**: Упрощена архитектура до чат-системы
- **Component Cleanup**: Удалены неиспользуемые компоненты и сервисы
- **Bundle Optimization**: Уменьшен размер bundle с ~328KB до ~198KB

### Features Preserved
- ✅ Live dictation functionality
- ✅ LLM integration
- ✅ Word selection and query constructor
- ✅ Context management
- ✅ localStorage persistence

## 📈 Future Enhancements

### Short Term
- **Export Functionality**: Экспорт транскриптов и ответов
- **Theme System**: Светлая/темная тема
- **Keyboard Shortcuts**: Горячие клавиши для управления

### Medium Term
- **Multi-language Support**: Поддержка других языков
- **Advanced Analytics**: Анализ паттернов использования
- **Integration APIs**: Подключение к внешним системам

## 🤝 Contributing

### Development Guidelines
- **Code Style**: TypeScript strict mode, Vue 2 Options API
- **Component Structure**: Props down, events up
- **Testing**: Manual testing with real APIs
- **Documentation**: JSDoc comments for public APIs

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- **DeepGram**: За отличное распознавание речи
- **Anthropic**: За Claude AI модель
- **Vue.js Team**: За отличный фреймворк
- **Tailwind CSS**: За utility-first подход

---

**DeepNet Chat System** - Живая диктовка с AI интеграцией 🚀

*Последнее обновление: 2024-12-28*