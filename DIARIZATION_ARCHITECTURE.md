# Архитектура диаризации диалогов

## Обзор системы

Система диаризации диалогов реализована по принципам чистой архитектуры с разделением на слои:

```
┌─────────────────────────────────────────────────────────────┐
│                        UI LAYER                            │
├─────────────────────────────────────────────────────────────┤
│  MainApp.vue                                               │
│  ├── DiarizedMessage.vue (карточка сообщения)              │
│  ├── Кнопка "Очистить диалог"                              │
│  └── Список диаризованных сообщений                        │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                    ADAPTER LAYER                           │
├─────────────────────────────────────────────────────────────┤
│  uiBusinessAdapter.ts                                       │
│  ├── startDiarization()                                    │
│  ├── stopDiarization()                                     │
│  ├── sendAudioToDiarization()                              │
│  └── getDiarizationState()                                 │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                   BUSINESS LAYER                           │
├─────────────────────────────────────────────────────────────┤
│  chatStore.ts (State Management)                           │
│  ├── clearDialog()                                         │
│  ├── appendDiarizedSegment()                               │
│  ├── finalizeDiarizedMessage()                             │
│  ├── updateDiarizationState()                              │
│  └── addSpeaker()                                          │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                    SERVICE LAYER                           │
├─────────────────────────────────────────────────────────────┤
│  diarizationService.ts                                      │
│  ├── DeepGram Live API с diarize: true                     │
│  ├── Обработка сегментов речи                              │
│  ├── Создание спикеров с цветами                           │
│  └── Event-driven архитектура                              │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                    CONFIG LAYER                            │
├─────────────────────────────────────────────────────────────┤
│  appConfig.ts                                               │
│  ├── deepgram.diarize: true                                │
│  ├── diarization.speakerColors[]                           │
│  └── diarization.mergeTimeout                              │
└─────────────────────────────────────────────────────────────┘
```

## Поток данных

### 1. Инициализация
```
MainApp.vue → uiBusinessAdapter.startDiarization() → diarizationService.start()
```

### 2. Обработка аудио
```
Микрофон → diarizationService.sendAudio() → DeepGram API → onSegment event
```

### 3. Создание сообщений
```
onSegment → chatStore.appendDiarizedSegment() → finalizeDiarizedMessage() → UI обновление
```

### 4. Очистка диалога
```
MainApp.vue → uiBusinessAdapter.clearDialog() → chatStore.clearDialog()
```

## Типы данных

### DiarizedSegment
```typescript
{
  id: string
  speakerId: string
  speakerName: string
  text: string
  isFinal: boolean
  timestamp: number
  confidence: number
  startTime?: number
  endTime?: number
}
```

### DiarizedMessage
```typescript
{
  id: string
  speakerId: string
  speakerName: string
  speakerColor: string
  content: string
  timestamp: number
  segments: DiarizedSegment[]
  isActive: boolean
}
```

### DiarizedSpeaker
```typescript
{
  id: string
  name: string
  color: string
  displayName: string
}
```

## Ключевые особенности

### 1. Event-Driven Architecture
- Сервис диаризации генерирует события
- Адаптер подписывается на события
- Store обновляется через события

### 2. Graceful Degradation
- При отсутствии API ключа DeepGram система работает без диаризации
- UI показывает подсказки вместо ошибок
- Кнопка "Очистить диалог" всегда доступна

### 3. Real-time Updates
- Сегменты добавляются в реальном времени
- Активные сообщения помечаются индикатором
- Цветовая схема для разных спикеров

### 4. Clean Architecture
- Четкое разделение слоев
- Зависимости направлены внутрь
- Легкое тестирование и поддержка

## Конфигурация

### DeepGram настройки
```typescript
{
  diarize: true,           // Включаем диаризацию
  smart_format: true,      // Умное форматирование
  interim_results: true,   // Промежуточные результаты
  punctuate: true,         // Пунктуация
  language: 'ru-RU'        // Русский язык
}
```

### Цветовая схема спикеров
```typescript
speakerColors: [
  '#3B82F6', // blue-500
  '#EF4444', // red-500
  '#10B981', // emerald-500
  '#F59E0B', // amber-500
  '#8B5CF6', // violet-500
  '#EC4899', // pink-500
  '#06B6D4', // cyan-500
  '#84CC16'  // lime-500
]
```

## Использование

### Запуск диаризации
```typescript
await uiBusinessAdapter.startDiarization()
```

### Остановка диаризации
```typescript
await uiBusinessAdapter.stopDiarization()
```

### Очистка диалога
```typescript
uiBusinessAdapter.getChatStore().actions.clearDialog()
```

### Отправка аудио
```typescript
await uiBusinessAdapter.sendAudioToDiarization(audioData)
```

## Преимущества архитектуры

1. **Модульность**: Каждый слой отвечает за свою область
2. **Тестируемость**: Легко мокать зависимости
3. **Расширяемость**: Простое добавление новых функций
4. **Поддерживаемость**: Четкая структура кода
5. **Производительность**: Эффективная обработка событий
