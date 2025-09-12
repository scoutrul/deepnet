# Настройка DeepGram API

## 🚨 Проблема с WebSocket соединением

Ошибка `WebSocket connection to 'wss://api.deepgram.com/v1/listen' failed` указывает на проблему с API ключом DeepGram.

## ✅ Решение

### 1. **Получите правильный API ключ DeepGram**

1. **Перейдите на** [DeepGram Console](https://console.deepgram.com/)
2. **Войдите** в свой аккаунт или создайте новый
3. **Перейдите в раздел** "API Keys"
4. **Создайте новый API ключ**:
   - Нажмите "Create New Key"
   - Выберите "Full Access" или "Live Streaming"
   - Скопируйте ключ (начинается с `sk-`)

### 2. **Обновите .env файл**

```bash
# Замените текущий ключ на новый
VITE_DEEPGRAM_API_KEY=sk-your-new-key-here
```

### 3. **Проверьте формат ключа**

Правильный формат DeepGram API ключа:
- ✅ Начинается с `sk-`
- ✅ Длина примерно 40-50 символов
- ✅ Пример: `sk-1234567890abcdef1234567890abcdef12345678`

### 4. **Перезапустите приложение**

```bash
# Остановите dev сервер (Ctrl+C)
# Запустите заново
npm run dev
```

## 🔍 Диагностика

### Проверьте консоль браузера:

**✅ Правильный ключ:**
```
🎤 [DEEPGRAM] API Key: sk-1234567...
🎤 [DEEPGRAM] DeepGram client initialized successfully
```

**❌ Неправильный ключ:**
```
🎤 [DEEPGRAM] API Key: NOT PROVIDED
🎤 [DEEPGRAM] Failed to initialize DeepGram client: API ключ DeepGram не предоставлен
```

### Типы ошибок:

1. **`WebSocket connection error`** - Неверный API ключ или проблемы с сетью
2. **`401 Unauthorized`** - Неверный API ключ
3. **`403 Forbidden`** - API ключ не имеет доступа к Live Streaming

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

## 🆘 Если проблема остается

### 1. **Проверьте интернет-соединение**
- DeepGram требует стабильного интернета
- Проверьте, не блокирует ли файрвол WebSocket соединения

### 2. **Попробуйте другой браузер**
- Chrome, Edge, Safari работают лучше всего
- Firefox может иметь проблемы с WebSocket

### 3. **Проверьте API ключ в DeepGram Console**
- Убедитесь, что ключ активен
- Проверьте, что у ключа есть доступ к Live Streaming

### 4. **Временное решение - Web Speech API**
Если DeepGram не работает, приложение автоматически переключится на Web Speech API:
- Статус: "Web Speech API готов" (оранжевый бейдж)
- Функциональность будет ограничена, но базовое распознавание работает

## 📞 Поддержка

Если проблема не решается:
1. Проверьте [DeepGram Documentation](https://developers.deepgram.com/)
2. Обратитесь в [DeepGram Support](https://support.deepgram.com/)
3. Проверьте [Status Page](https://status.deepgram.com/)

**После получения правильного API ключа DeepGram будет работать корректно!** 🚀
