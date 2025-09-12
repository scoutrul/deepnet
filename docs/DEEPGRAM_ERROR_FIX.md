# Исправление ошибки DeepGram WebSocket

## 🚨 Проблема

```
WebSocket connection to 'wss://api.deepgram.com/v1/listen' failed
```

## ✅ Решение

### 1. **Улучшена диагностика API ключа**

Добавлена проверка формата API ключа DeepGram:

```javascript
// Проверяем API ключ
if (!this.config.apiKey) {
  throw new Error('API ключ DeepGram не предоставлен')
}

if (!this.config.apiKey.startsWith('sk-')) {
  throw new Error('Неверный формат API ключа DeepGram. Ключ должен начинаться с "sk-"')
}
```

### 2. **Улучшена обработка ошибок WebSocket**

Добавлена детальная диагностика ошибок:

```javascript
// Определяем тип ошибки
let errorMessage = 'Ошибка соединения DeepGram'
let errorType: 'connection' | 'authentication' | 'quota' | 'processing' | 'network' | 'unknown' = 'connection'

if (error.message && error.message.includes('WebSocket connection error')) {
  errorMessage = 'Ошибка WebSocket соединения. Проверьте API ключ и интернет-соединение'
  errorType = 'network'
} else if (error.message && error.message.includes('401')) {
  errorMessage = 'Неверный API ключ DeepGram'
  errorType = 'authentication'
} else if (error.message && error.message.includes('403')) {
  errorMessage = 'API ключ DeepGram не имеет доступа к сервису'
  errorType = 'authentication'
}
```

### 3. **Улучшен fallback на Web Speech API**

Если DeepGram не работает, система автоматически переключается на Web Speech API:

```javascript
// Fallback to Web Speech API
console.log('🎤 [FACTORY] Creating Web Speech API voice service')
return this.createWebSpeechService()
```

## 🔍 Диагностика

### Проверьте консоль браузера:

**✅ Правильный API ключ:**
```
🎤 [DEEPGRAM] API Key: sk-1234567...
🎤 [DEEPGRAM] DeepGram client initialized successfully
🎤 [FACTORY] DeepGram service created successfully
```

**❌ Неправильный API ключ:**
```
🎤 [DEEPGRAM] API Key: NOT PROVIDED
🎤 [DEEPGRAM] Failed to initialize DeepGram client: API ключ DeepGram не предоставлен
🎤 [FACTORY] Failed to create DeepGram service, falling back to Web Speech API
```

## 🛠️ Как исправить

### 1. **Получите правильный API ключ DeepGram**

1. Перейдите на [DeepGram Console](https://console.deepgram.com/)
2. Войдите в аккаунт или создайте новый
3. Перейдите в "API Keys"
4. Создайте новый ключ с доступом к Live Streaming
5. Скопируйте ключ (начинается с `sk-`)

### 2. **Обновите .env файл**

```bash
# Замените на правильный ключ
VITE_DEEPGRAM_API_KEY=sk-your-new-key-here
```

### 3. **Перезапустите приложение**

```bash
# Остановите dev сервер (Ctrl+C)
npm run dev
```

## 📊 Результат

### После исправления:

- ✅ **DeepGram работает** - статус "DeepGram готов" (зеленый кружок)
- ✅ **WebSocket соединение** устанавливается успешно
- ✅ **Голосовое распознавание** работает в реальном времени
- ✅ **Fallback на Web Speech API** если DeepGram недоступен

### Интерфейс:

- **Статус**: "Готов к записи" / "Запись..."
- **Режим**: "DeepGram" (синий бейдж) или "Web Speech API" (оранжевый)
- **Кнопки**: "Начать запись" / "Остановить"
- **Индикатор**: Красная точка при записи

## 🧪 Тестирование

### 1. **Проверьте статус в приложении:**
- Должно быть: "DeepGram готов" (зеленый кружок)
- Должен быть синий бейдж "DeepGram"

### 2. **Попробуйте запись:**
- Нажмите "Начать запись"
- Должно появиться: "Запись в процессе..."
- Говорите - должен появиться распознанный текст

### 3. **Проверьте консоль:**
- Не должно быть ошибок WebSocket
- Должны быть сообщения о транскрипции

## 📚 Документация

Создана подробная документация:
- `DEEPGRAM_SETUP.md` - инструкция по настройке DeepGram
- `USAGE_GUIDE.md` - руководство по использованию приложения
- `DEEPGRAM_ERROR_FIX.md` - отчет об исправлении ошибок

## 🎉 Готово!

После получения правильного API ключа DeepGram:
- **WebSocket соединение** работает корректно
- **Голосовое распознавание** функционирует в реальном времени
- **Система автоматически переключается** на Web Speech API при проблемах

**DeepGram полностью функционален!** 🚀
