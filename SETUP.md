# Настройка окружения (Environment Setup)

## 🚀 Быстрая настройка

### 1. Создайте файл .env
```bash
# Скопируйте шаблон
cp env.local .env

# Или создайте вручную
touch .env
```

### 2. Настройте переменные окружения
Откройте `.env` и замените значения:

```bash
# Обязательно (Required)
VITE_OPENAI_API_KEY=sk-your-actual-openai-api-key-here

# Опционально (Optional) - используйте значения по умолчанию
VITE_API_BASE_URL=https://api.openai.com/v1
VITE_CHAT_MODEL=gpt-4
VITE_REQUEST_TIMEOUT_MS=20000
VITE_APP_TITLE=DeepNet Encyclopedia
VITE_HTTP_REFERRER=http://localhost:5173
VITE_HTTP_TITLE=DeepNet Encyclopedia
```

### 3. Получите OpenAI API ключ
1. Зайдите на [OpenAI Platform](https://platform.openai.com/)
2. Создайте аккаунт или войдите
3. Перейдите в [API Keys](https://platform.openai.com/api-keys)
4. Создайте новый ключ
5. Скопируйте ключ в `.env`

## 🔧 Проверка конфигурации

### Запуск в режиме разработки
```bash
npm run dev
```

**Примечание о портах**: 
- Vite по умолчанию использует порт 5173
- Если порт занят, Vite автоматически выберет следующий свободный
- Проверьте консоль при запуске `npm run dev` для точного порта
- Обновите `VITE_HTTP_REFERRER` если порт отличается

### Проверка переменных
В браузере откройте DevTools → Console и выполните:
```javascript
console.log(import.meta.env.VITE_OPENAI_API_KEY)
console.log(import.meta.env.VITE_API_BASE_URL)
```

## 🚨 Безопасность

- **НЕ коммитьте** `.env` файл в Git
- **НЕ делитесь** API ключом публично
- **Используйте** `.env.example` для шаблона
- **Проверьте** `.gitignore` содержит `.env`

## 📝 Примеры конфигурации

### Для разработки (Development)
```bash
VITE_OPENAI_API_KEY=sk-dev-key-here
VITE_API_BASE_URL=https://api.openai.com/v1
VITE_CHAT_MODEL=gpt-4
VITE_HTTP_REFERRER=http://localhost:5173
```

### Для продакшна (Production)
```bash
VITE_OPENAI_API_KEY=sk-prod-key-here
VITE_API_BASE_URL=https://api.openai.com/v1
VITE_CHAT_MODEL=gpt-4
VITE_APP_TITLE=DeepNet Encyclopedia
```

## 🆘 Решение проблем

### Ошибка "API key not found"
- Проверьте, что `.env` файл создан
- Убедитесь, что ключ начинается с `sk-`
- Перезапустите dev сервер после изменения `.env`

### Ошибка "401 Unauthorized"
- Проверьте правильность API ключа
- Убедитесь, что ключ активен в OpenAI
- Проверьте лимиты API

### Ошибка "429 Rate Limited"
- Слишком много запросов
- Подождите несколько минут
- Проверьте план подписки OpenAI

---

**Примечание**: Без настроенного API ключа приложение будет работать в режиме мок-ответов для тестирования UI.
