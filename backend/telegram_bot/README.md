# Telegram Bot «КТЖ Финансы»

## Установка

```bash
pip install python-telegram-bot requests python-dotenv
```

## Настройка

Создайте `.env` в `backend/telegram_bot/.env`:

```env
TELEGRAM_BOT_TOKEN=your_token_from_BotFather
ECOPLAN_API_URL=http://localhost:8000/api
BOT_DEMO_MODE=true
ADMIN_CHAT_IDS=123456789,987654321
```

## Запуск

```bash
cd backend/telegram_bot
python bot.py
```

## Команды

- `/start` — Приветствие и меню
- `/digest` — Утренний дайджест по филиалу
- `/train [номер]` — Расходы поезда (пример: `/train 001`)
- `/alerts` — Активные уведомления
- `/help` — Справка

## Голосовые команды (beta)

Отправьте голосовое сообщение — бот подскажет доступные текстовые команды.
