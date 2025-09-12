# ПЛАН РЕФАКТОРИНГА DEEPNET CONTEXT SYSTEM

## ОБЗОР РЕФАКТОРИНГА

Цель рефакторинга: устранить избыточность, упростить архитектуру, улучшить поддерживаемость и добавить четкое управление состоянием.

## КРИТИЧЕСКИЕ ПРОБЛЕМЫ

### 1. ДУБЛИРОВАНИЕ ГОЛОСОВЫХ СЕРВИСОВ
- **voiceService.ts** (39KB, 1092 строки) - Web Speech API
- **deepgramVoiceService.ts** (12KB, 409 строк) - DeepGram API  
- **voiceServiceFactory.ts** (2.4KB) - фабрика для выбора

### 2. ОГРОМНЫЕ ФАЙЛЫ
- **SearchPanel.vue** (30KB, 854 строки)
- **Message.vue** (20KB, 538 строк)
- **ContextPanel.vue** (22KB, 615 строк)
- **dialogProcessor.ts** (22KB, 692 строки)

### 3. ИЗБЫТОЧНОСТЬ КОНТЕКСТНЫХ СЕРВИСОВ
- 5 отдельных сервисов для контекста
- Возможное дублирование функциональности
- Сложная система зависимостей

## ПЛАН РЕФАКТОРИНГА ПО ФАЗАМ

### ФАЗА 1: УДАЛЕНИЕ ИЗБЫТОЧНОСТИ (КРИТИЧЕСКИЙ ПРИОРИТЕТ)

#### Задача 1.1: Объединение голосовых сервисов
**Цель**: Удалить дублирование, оставить только DeepGram

**Действия**:
1. Удалить `src/services/voiceService.ts` (39KB)
2. Удалить `src/services/voiceServiceFactory.ts` (2.4KB)
3. Переименовать `deepgramVoiceService.ts` → `voiceService.ts`
4. Обновить все импорты в компонентах
5. Упростить интерфейс голосового сервиса

**Файлы для изменения**:
- `src/components/voice/VoiceRecorder.vue`
- `src/components/voice/VoicePanel.vue`
- `src/components/MainApp.vue`
- `src/services/context/index.ts`

**Ожидаемый результат**: Уменьшение размера на ~41KB, упрощение архитектуры

#### Задача 1.2: Разбиение SearchPanel.vue
**Цель**: Разбить огромный компонент на более мелкие

**Действия**:
1. Создать `src/components/context/SearchInput.vue`
2. Создать `src/components/context/SearchResults.vue`
3. Создать `src/components/context/SearchFilters.vue`
4. Обновить `SearchPanel.vue` как контейнер
5. Перенести логику в соответствующие компоненты

**Файлы для создания**:
- `src/components/context/SearchInput.vue` (~8KB)
- `src/components/context/SearchResults.vue` (~12KB)
- `src/components/context/SearchFilters.vue` (~6KB)

**Ожидаемый результат**: Уменьшение размера основного компонента с 30KB до ~4KB

#### Задача 1.3: Разбиение Message.vue
**Цель**: Разбить большой компонент сообщения

**Действия**:
1. Создать `src/components/chat/MessageContent.vue`
2. Создать `src/components/chat/MessageActions.vue`
3. Создать `src/components/chat/MessageMetadata.vue`
4. Обновить `Message.vue` как контейнер
5. Перенести логику в соответствующие компоненты

**Файлы для создания**:
- `src/components/chat/MessageContent.vue` (~12KB)
- `src/components/chat/MessageActions.vue` (~4KB)
- `src/components/chat/MessageMetadata.vue` (~4KB)

**Ожидаемый результат**: Уменьшение размера основного компонента с 20KB до ~4KB

#### Задача 1.4: Разбиение ContextPanel.vue
**Цель**: Разбить большой компонент контекста

**Действия**:
1. Создать `src/components/context/ContextA.vue`
2. Создать `src/components/context/ContextB.vue`
3. Создать `src/components/context/GoalSettings.vue`
4. Обновить `ContextPanel.vue` как контейнер
5. Перенести логику в соответствующие компоненты

**Файлы для создания**:
- `src/components/context/ContextA.vue` (~8KB)
- `src/components/context/ContextB.vue` (~8KB)
- `src/components/context/GoalSettings.vue` (~6KB)

**Ожидаемый результат**: Уменьшение размера основного компонента с 22KB до ~4KB

### ФАЗА 2: ОБЪЕДИНЕНИЕ КОНТЕКСТНЫХ СЕРВИСОВ

#### Задача 2.1: Объединение hintGenerator + searchService
**Цель**: Создать единый сервис для подсказок и поиска

**Действия**:
1. Создать `src/services/context/contextAssistant.ts`
2. Объединить функциональность из `hintGenerator.ts` и `searchService.ts`
3. Удалить `hintGenerator.ts` и `searchService.ts`
4. Обновить импорты в компонентах
5. Упростить API контекстного ассистента

**Файлы для создания**:
- `src/services/context/contextAssistant.ts` (~20KB)

**Файлы для удаления**:
- `src/services/context/hintGenerator.ts` (16KB)
- `src/services/context/searchService.ts` (14KB)

**Ожидаемый результат**: Уменьшение размера на ~10KB, упрощение API

#### Задача 2.2: Упрощение dialogProcessor.ts
**Цель**: Убрать избыточную логику из обработчика диалога

**Действия**:
1. Проанализировать `dialogProcessor.ts` (22KB, 692 строки)
2. Выделить основную функциональность
3. Убрать дублирующуюся логику
4. Упростить API
5. Оптимизировать производительность

**Ожидаемый результат**: Уменьшение размера с 22KB до ~12KB

#### Задача 2.3: Создание единого contextService.ts
**Цель**: Объединить все контекстные операции в один сервис

**Действия**:
1. Создать `src/services/context/contextService.ts`
2. Объединить функциональность из `contextManager.ts` и `contextAssistant.ts`
3. Упростить API для работы с контекстом
4. Обновить импорты в компонентах

**Файлы для создания**:
- `src/services/context/contextService.ts` (~15KB)

**Файлы для удаления**:
- `src/services/context/contextManager.ts` (8.2KB)
- `src/services/context/contextAssistant.ts` (20KB)

**Ожидаемый результат**: Упрощение архитектуры, единый API для контекста

### ФАЗА 3: ДОБАВЛЕНИЕ УПРАВЛЕНИЯ СОСТОЯНИЕМ

#### Задача 3.1: Установка Pinia
**Цель**: Добавить централизованное управление состоянием

**Действия**:
1. Установить Pinia: `npm install pinia`
2. Настроить Pinia в `main.ts`
3. Создать базовую структуру stores

**Команды**:
```bash
npm install pinia
```

**Файлы для изменения**:
- `src/main.ts`
- `package.json`

#### Задача 3.2: Создание voiceStore
**Цель**: Централизовать голосовое состояние

**Действия**:
1. Создать `src/stores/voiceStore.ts`
2. Перенести голосовое состояние из компонентов
3. Создать actions для управления голосом
4. Обновить компоненты для использования store

**Файлы для создания**:
- `src/stores/voiceStore.ts` (~8KB)

**Файлы для изменения**:
- `src/components/voice/VoiceRecorder.vue`
- `src/components/voice/VoicePanel.vue`
- `src/components/MainApp.vue`

#### Задача 3.3: Создание contextStore
**Цель**: Централизовать контекстное состояние

**Действия**:
1. Создать `src/stores/contextStore.ts`
2. Перенести контекстное состояние из компонентов
3. Создать actions для управления контекстом
4. Обновить компоненты для использования store

**Файлы для создания**:
- `src/stores/contextStore.ts` (~10KB)

**Файлы для изменения**:
- `src/components/context/ContextPanel.vue`
- `src/components/context/HintPanel.vue`
- `src/components/context/SearchPanel.vue`

#### Задача 3.4: Создание chatStore
**Цель**: Централизовать состояние чата

**Действия**:
1. Создать `src/stores/chatStore.ts`
2. Перенести состояние чата из компонентов
3. Создать actions для управления чатом
4. Обновить компоненты для использования store

**Файлы для создания**:
- `src/stores/chatStore.ts` (~8KB)

**Файлы для изменения**:
- `src/components/chat/Message.vue`
- `src/components/chat/ChatInput.vue`
- `src/components/MainApp.vue`

#### Задача 3.5: Создание uiStore
**Цель**: Централизовать UI состояние

**Действия**:
1. Создать `src/stores/uiStore.ts`
2. Перенести UI состояние из компонентов
3. Создать actions для управления UI
4. Обновить компоненты для использования store

**Файлы для создания**:
- `src/stores/uiStore.ts` (~6KB)

**Файлы для изменения**:
- `src/components/MainApp.vue`
- `src/components/OptionsPanel.vue`

### ФАЗА 4: РЕСТРУКТУРИЗАЦИЯ АРХИТЕКТУРЫ

#### Задача 4.1: Новая структура папок
**Цель**: Создать четкую иерархию компонентов

**Действия**:
1. Создать новую структуру папок
2. Переместить файлы в соответствующие папки
3. Обновить все импорты
4. Обновить конфигурацию

**Новая структура**:
```
src/
├── components/
│   ├── ui/ (общие UI компоненты)
│   ├── voice/ (голосовые компоненты)
│   ├── context/ (контекстные компоненты)
│   └── chat/ (чат компоненты)
├── services/
│   ├── voice/ (голосовые сервисы)
│   ├── context/ (контекстные сервисы)
│   └── chat/ (чат сервисы)
├── stores/ (Pinia stores)
├── types/ (TypeScript типы)
└── utils/ (утилиты)
```

#### Задача 4.2: Четкое разделение слоев
**Цель**: Создать четкие границы между слоями

**Действия**:
1. UI Layer - только Vue компоненты
2. Business Layer - сервисы и бизнес-логика
3. Data Layer - Pinia stores и API
4. Убрать прямые обращения к DOM из сервисов
5. Создать четкие интерфейсы между слоями

#### Задача 4.3: Оптимизация типов
**Цель**: Убрать дублирование типов

**Действия**:
1. Проанализировать все типы в `src/types/`
2. Объединить похожие типы
3. Убрать дублирование
4. Создать единую систему типов
5. Обновить импорты

## ДЕТАЛЬНЫЕ ЗАДАЧИ ДЛЯ ВЫПОЛНЕНИЯ

### ЗАДАЧА 1: Удаление voiceService.ts
**Приоритет**: КРИТИЧЕСКИЙ
**Время**: 2-3 часа

**Шаги**:
1. [ ] Создать резервную копию `voiceService.ts`
2. [ ] Найти все импорты `voiceService.ts`
3. [ ] Обновить импорты на `deepgramVoiceService.ts`
4. [ ] Удалить `voiceService.ts`
5. [ ] Переименовать `deepgramVoiceService.ts` → `voiceService.ts`
6. [ ] Обновить все импорты на новый `voiceService.ts`
7. [ ] Удалить `voiceServiceFactory.ts`
8. [ ] Протестировать голосовое распознавание

**Файлы для изменения**:
- `src/components/voice/VoiceRecorder.vue`
- `src/components/voice/VoicePanel.vue`
- `src/components/MainApp.vue`
- `src/services/context/index.ts`

### ЗАДАЧА 2: Разбиение SearchPanel.vue
**Приоритет**: ВЫСОКИЙ
**Время**: 4-5 часов

**Шаги**:
1. [ ] Создать `SearchInput.vue` с полем ввода и кнопками
2. [ ] Создать `SearchResults.vue` с отображением результатов
3. [ ] Создать `SearchFilters.vue` с фильтрами поиска
4. [ ] Обновить `SearchPanel.vue` как контейнер
5. [ ] Перенести логику в соответствующие компоненты
6. [ ] Обновить стили
7. [ ] Протестировать функциональность

**Файлы для создания**:
- `src/components/context/SearchInput.vue`
- `src/components/context/SearchResults.vue`
- `src/components/context/SearchFilters.vue`

### ЗАДАЧА 3: Разбиение Message.vue
**Приоритет**: ВЫСОКИЙ
**Время**: 3-4 часа

**Шаги**:
1. [ ] Создать `MessageContent.vue` с содержимым сообщения
2. [ ] Создать `MessageActions.vue` с действиями сообщения
3. [ ] Создать `MessageMetadata.vue` с метаданными
4. [ ] Обновить `Message.vue` как контейнер
5. [ ] Перенести логику в соответствующие компоненты
6. [ ] Обновить стили
7. [ ] Протестировать функциональность

**Файлы для создания**:
- `src/components/chat/MessageContent.vue`
- `src/components/chat/MessageActions.vue`
- `src/components/chat/MessageMetadata.vue`

### ЗАДАЧА 4: Разбиение ContextPanel.vue
**Приоритет**: ВЫСОКИЙ
**Время**: 3-4 часа

**Шаги**:
1. [ ] Создать `ContextA.vue` для контекста стороны A
2. [ ] Создать `ContextB.vue` для контекста стороны B
3. [ ] Создать `GoalSettings.vue` для настроек цели
4. [ ] Обновить `ContextPanel.vue` как контейнер
5. [ ] Перенести логику в соответствующие компоненты
6. [ ] Обновить стили
7. [ ] Протестировать функциональность

**Файлы для создания**:
- `src/components/context/ContextA.vue`
- `src/components/context/ContextB.vue`
- `src/components/context/GoalSettings.vue`

### ЗАДАЧА 5: Объединение контекстных сервисов
**Приоритет**: СРЕДНИЙ
**Время**: 6-8 часов

**Шаги**:
1. [ ] Проанализировать `hintGenerator.ts` и `searchService.ts`
2. [ ] Создать `contextAssistant.ts` с объединенной функциональностью
3. [ ] Обновить импорты в компонентах
4. [ ] Удалить `hintGenerator.ts` и `searchService.ts`
5. [ ] Упростить `dialogProcessor.ts`
6. [ ] Создать единый `contextService.ts`
7. [ ] Протестировать функциональность

**Файлы для создания**:
- `src/services/context/contextAssistant.ts`
- `src/services/context/contextService.ts`

**Файлы для удаления**:
- `src/services/context/hintGenerator.ts`
- `src/services/context/searchService.ts`

### ЗАДАЧА 6: Добавление Pinia
**Приоритет**: СРЕДНИЙ
**Время**: 8-10 часов

**Шаги**:
1. [ ] Установить Pinia: `npm install pinia`
2. [ ] Настроить Pinia в `main.ts`
3. [ ] Создать `voiceStore.ts`
4. [ ] Создать `contextStore.ts`
5. [ ] Создать `chatStore.ts`
6. [ ] Создать `uiStore.ts`
7. [ ] Обновить компоненты для использования stores
8. [ ] Протестировать функциональность

**Файлы для создания**:
- `src/stores/voiceStore.ts`
- `src/stores/contextStore.ts`
- `src/stores/chatStore.ts`
- `src/stores/uiStore.ts`

### ЗАДАЧА 7: Реструктуризация папок
**Приоритет**: НИЗКИЙ
**Время**: 4-6 часов

**Шаги**:
1. [ ] Создать новую структуру папок
2. [ ] Переместить файлы в соответствующие папки
3. [ ] Обновить все импорты
4. [ ] Обновить конфигурацию
5. [ ] Протестировать приложение

## МЕТРИКИ УСПЕХА

### КОЛИЧЕСТВЕННЫЕ МЕТРИКИ
- **Уменьшение размера кода**: с ~200KB до ~140KB (-30%)
- **Уменьшение количества файлов**: с 15 компонентов до 25+ мелких
- **Уменьшение размера файлов**: максимальный размер файла <15KB
- **Упрощение зависимостей**: с 12 сервисов до 6-8

### КАЧЕСТВЕННЫЕ МЕТРИКИ
- **Улучшение читаемости**: каждый файл <500 строк
- **Упрощение архитектуры**: четкое разделение слоев
- **Улучшение тестируемости**: изолированные компоненты
- **Ускорение разработки**: четкая структура папок

## РИСКИ И МИТИГАЦИЯ

### РИСКИ
1. **Поломка функциональности** - при удалении файлов
2. **Сложность миграции** - при изменении структуры
3. **Временные затраты** - рефакторинг может занять много времени

### МИТИГАЦИЯ
1. **Создание резервных копий** перед каждым изменением
2. **Поэтапное выполнение** с тестированием на каждом этапе
3. **Документирование изменений** для отслеживания прогресса

## ЗАКЛЮЧЕНИЕ

План рефакторинга позволит:
- **Устранить избыточность** - удалить дублирующиеся сервисы
- **Упростить архитектуру** - разбить большие файлы
- **Улучшить поддерживаемость** - четкая структура
- **Добавить управление состоянием** - централизованные stores
- **Создать масштабируемую архитектуру** - готовность к развитию

Общее время выполнения: 30-40 часов
Рекомендуется выполнять по 1-2 задачи в день с тестированием.
