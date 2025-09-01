# Reddit AI Trends Telegram Bot

Минималистичное MVP решение для Telegram бота, который ежедневно переводит и публикует отчеты о трендах AI с Reddit.

## Философия

**"Нулевые зависимости где возможно"** - используем встроенные возможности Node.js 18+ по максимуму.

## Технический стек

- **Node.js 18+** - встроенные fetch API, crypto
- **Vercel Functions** - serverless + cron jobs
- **OpenRouter API** - перевод через AI модели
- **Telegram Bot API** - прямые HTTP запросы
- **Единственная зависимость** - `marked` для MD→HTML

## Архитектура

```
Vercel Cron (12:00 UTC) → /api/daily-report.js → [GitHub MD fetch] → [OpenRouter translate] → [MD→HTML] → [Telegram send]
```

## Быстрый старт

### 1. Установка зависимостей

```bash
npm install
```

### 2. Настройка переменных окружения

```bash
cp .env.example .env.local
```

Заполните `.env.local`:

```env
# Telegram Bot
TELEGRAM_BOT_TOKEN=your_bot_token_from_botfather
TELEGRAM_CHANNEL_ID=@your_channel_name

# OpenRouter AI
OPENROUTER_API_KEY=sk-or-v1-your-api-key

# Security
CRON_SECRET=generate-random-string-here

# Source
GITHUB_RAW_URL=https://raw.githubusercontent.com/liyedanpdx/reddit-ai-trends/main/reports/latest_report_en.md
```

### 3. Локальная разработка

```bash
npm run dev
```

Тестирование cron endpoint:
```bash
curl -X POST http://localhost:3000/api/daily-report \\
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### 4. Деплой на Vercel

```bash
npm run deploy
```

## Настройка сервисов

### Telegram Bot

1. Создайте бота через [@BotFather](https://t.me/botfather)
2. Получите токен бота
3. Добавьте бота в канал как администратора
4. Получите ID канала (например, `@my_channel` или `-1001234567890`)

### OpenRouter API

1. Зарегистрируйтесь на [openrouter.ai](https://openrouter.ai)
2. Создайте API ключ
3. Пополните баланс для использования `deepseek/deepseek-chat`

### Vercel

1. Подключите репозиторий к Vercel
2. Добавьте environment variables в настройках проекта
3. Деплойте через dashboard или CLI

## Структура проекта

```
├── api/
│   └── daily-report.js     # Вся бизнес-логика (~180 строк)
├── vercel.json            # Настройка cron job (12:00 UTC)
├── package.json           # Только marked в dependencies
├── .env.example          # Шаблон переменных
└── README.md
```

## Функциональность

### Основной флоу

1. **Cron запуск** - каждый день в 12:00 UTC
2. **Безопасность** - проверка `CRON_SECRET`
3. **Получение данных** - fetch MD файла с GitHub
4. **Проверка изменений** - SHA-256 hash контента
5. **Перевод** - через OpenRouter API (deepseek-chat)
6. **Форматирование** - MD→HTML для Telegram
7. **Отправка** - разбивка по 4096 символов + rate limiting

### Обработка edge cases

- ✅ **GitHub недоступен** - graceful error handling
- ✅ **OpenRouter лимиты** - error reporting
- ✅ **Telegram лимиты** - автоматическая разбивка сообщений
- ✅ **Дубликаты** - проверка hash изменений
- ✅ **Rate limiting** - задержки между запросами

## Мониторинг

### Vercel Dashboard
- Логи функций в реальном времени
- Статистика вызовов cron jobs
- Мониторинг ошибок

### Telegram
- Уведомления об ошибках в канале
- Статус сообщения для каждого деплоя

## Разработка

### Локальное тестирование

```bash
# Запуск dev сервера
vercel dev

# Тестирование endpoint
curl -X POST http://localhost:3000/api/daily-report \\
  -H "Authorization: Bearer test-secret" \\
  -H "Content-Type: application/json"
```

### Производственное тестирование

```bash
# Ручной вызов cron job
curl -X POST https://your-app.vercel.app/api/daily-report \\
  -H "Authorization: Bearer $CRON_SECRET"
```

## Критерии успеха MVP

- ✅ Работает с первого деплоя
- ✅ Меньше 200 строк кода  
- ✅ Одна зависимость (`marked`)
- ✅ Понятно без документации
- ✅ Легко модифицировать

## Стоимость

### Vercel (бесплатный план)
- 100 GB-hours serverless функций/месяц
- Unlimited cron jobs

### OpenRouter
- ~$0.001-0.01 за перевод (зависит от размера)
- ~$0.30/месяц при ежедневном использовании

### Telegram
- Бесплатно

**Итого: ~$0.30/месяц**

## Roadmap

### MVP (текущая версия)
- [x] Базовый перевод через OpenRouter
- [x] Отправка в Telegram канал
- [x] Cron job каждые 24 часа

### v1.1 (возможные улучшения)
- [ ] Vercel KV для хранения hash
- [ ] Множественные источники контента
- [ ] Telegram команды для управления
- [ ] Webhook вместо polling

### v1.2 (расширенные возможности)  
- [ ] Несколько каналов/языков
- [ ] Кастомизация промптов перевода
- [ ] Аналитика и статистика
- [ ] Web интерфейс для настроек

## Поддержка

Если возникли вопросы:
1. Проверьте логи в Vercel Dashboard
2. Убедитесь, что все environment variables заданы
3. Проверьте права бота в Telegram канале

## Лицензия

MIT