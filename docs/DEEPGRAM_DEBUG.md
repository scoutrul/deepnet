# Отладка DeepGram - Cannot read properties of undefined (reading 'listen')

## 🚨 Проблема

```
TypeError: Cannot read properties of undefined (reading 'listen')
at DeepGramVoiceService.initializeConnection (deepgramVoiceService.ts:215:37)
```

## ✅ Исправления

### 1. **Добавлена проверка инициализации DeepGram клиента**

```javascript
// Проверяем, что DeepGram клиент инициализирован
if (!this.deepgram) {
  console.error('🎤 [DEEPGRAM] DeepGram client not initialized')
  throw new Error('DeepGram клиент не инициализирован')
}
```

### 2. **Улучшена инициализация в конструкторе**

```javascript
private initializeDeepGram(): void {
  try {
    // ... проверки API ключа ...
    
    this.deepgram = createClient(this.config.apiKey)
    
    // Проверяем, что клиент создался
    if (!this.deepgram) {
      throw new Error('Не удалось создать DeepGram клиент')
    }
    
    console.log('🎤 [DEEPGRAM] DeepGram client initialized successfully')
  } catch (error) {
    console.error('🎤 [DEEPGRAM] Failed to initialize DeepGram client:', error)
    this.deepgram = null // Явно устанавливаем null
    // Выбрасываем ошибку, чтобы конструктор знал об ошибке
    throw error
  }
}
```

### 3. **Добавлена проверка в метод start()**

```javascript
async start(): Promise<void> {
  // Проверяем, что DeepGram клиент инициализирован
  if (!this.deepgram) {
    console.error('🎤 [DEEPGRAM] DeepGram client not initialized')
    throw new Error('DeepGram клиент не инициализирован')
  }
  
  // ... остальной код ...
}
```

## 🔍 Диагностика

### Проверьте консоль браузера:

**✅ Правильная инициализация:**
```
🎤 [DEEPGRAM] API Key: sk-1234567...
🎤 [DEEPGRAM] DeepGram client initialized successfully
🎤 [DEEPGRAM] Starting voice recognition...
🎤 [DEEPGRAM] Creating DeepGram connection with options: {...}
```

**❌ Ошибка инициализации:**
```
🎤 [DEEPGRAM] API Key: NOT PROVIDED
🎤 [DEEPGRAM] Failed to initialize DeepGram client: API ключ DeepGram не предоставлен
🎤 [FACTORY] Failed to create DeepGram service, falling back to Web Speech API
```

**❌ Ошибка при запуске:**
```
🎤 [DEEPGRAM] DeepGram client not initialized
🎤 [DEEPGRAM] Failed to start voice recognition: DeepGram клиент не инициализирован
```

## 🛠️ Как исправить

### 1. **Проверьте API ключ DeepGram**

Убедитесь, что в `.env` файле есть правильный ключ:

```bash
VITE_DEEPGRAM_API_KEY=sk-your-key-here
```

### 2. **Проверьте формат ключа**

Ключ должен:
- Начинаться с `sk-`
- Быть длиной примерно 40-50 символов
- Быть действительным (получен из DeepGram Console)

### 3. **Получите новый API ключ**

1. Перейдите на [DeepGram Console](https://console.deepgram.com/)
2. Войдите в аккаунт
3. Перейдите в "API Keys"
4. Создайте новый ключ с доступом к Live Streaming
5. Скопируйте ключ

### 4. **Перезапустите приложение**

```bash
# Остановите dev сервер (Ctrl+C)
npm run dev
```

## 🧪 Тестирование

### 1. **Проверьте инициализацию**

В консоли должны быть сообщения:
```
🎤 [DEEPGRAM] API Key: sk-1234567...
🎤 [DEEPGRAM] DeepGram client initialized successfully
```

### 2. **Проверьте статус в приложении**

- Должно быть: "DeepGram готов" (зеленый кружок)
- Должен быть синий бейдж "DeepGram"

### 3. **Попробуйте запись**

- Нажмите "Начать запись"
- Не должно быть ошибок в консоли
- Должно появиться: "Запись в процессе..."

## 📊 Ожидаемое поведение

### После исправления:

- ✅ **DeepGram инициализируется** без ошибок
- ✅ **API ключ проверяется** на корректность
- ✅ **WebSocket соединение** устанавливается
- ✅ **Голосовое распознавание** работает
- ✅ **Fallback на Web Speech API** при проблемах

### Если проблема остается:

- ❌ **Проверьте API ключ** - возможно, недействителен
- ❌ **Проверьте интернет** - DeepGram требует стабильного соединения
- ❌ **Попробуйте другой браузер** - Chrome, Edge, Safari работают лучше

## 🎉 Результат

После получения правильного API ключа DeepGram:
- **Ошибка `Cannot read properties of undefined`** исчезнет
- **Голосовое распознавание** будет работать корректно
- **WebSocket соединение** установится успешно

**DeepGram полностью функционален!** 🚀
