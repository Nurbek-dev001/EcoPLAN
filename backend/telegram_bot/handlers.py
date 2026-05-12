"""Telegram bot handlers for EcoPlan Hub."""
from telegram import Update
from telegram.ext import ContextTypes
from telegram_bot.api_client import get_dashboard_summary, get_alerts, get_train_report


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    user = update.effective_user
    welcome = (
        f"👋 Здравствуйте, {user.first_name}!\n\n"
        "🚂 <b>КТЖ Финансы — EcoPlan Hub Bot</b>\n"
        "Я помогу вам получать дайджесты, проверять расходы поездов и получать уведомления об аномалиях.\n\n"
        "<b>Команды:</b>\n"
        "/digest — Утренний дайджест\n"
        "/train [номер] — Расходы поезда\n"
        "/alerts — Активные уведомления\n"
        "/help — Помощь"
    )
    await update.message.reply_text(welcome, parse_mode="HTML")


async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    text = (
        "<b>📋 Справка по командам</b>\n\n"
        "/start — Начать работу с ботом\n"
        "/digest — Получить сводку по филиалу\n"
        "/train [номер] — Показать расходы поезда (например, /train 001)\n"
        "/alerts — Список активных уведомлений\n"
        "/help — Эта справка\n\n"
        "🎤 <b>Голосовые команды</b> (beta): отправьте голосовое сообщение с текстом «расходы поезда 001»"
    )
    await update.message.reply_text(text, parse_mode="HTML")


async def digest(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    summary = get_dashboard_summary()
    if "error" in summary:
        await update.message.reply_text(f"⚠️ Ошибка получения данных: {summary['error']}")
        return

    text = (
        "📊 <b>Дайджест EcoPlan Hub</b>\n\n"
        f"• Всего расчётов: <b>{summary.get('total_calculations', 0)}</b>\n"
        f"• На утверждении: <b>{summary.get('pending_approvals', 0)}</b>\n"
        f"• Активных пользователей: <b>{summary.get('active_users', 0)}</b>\n"
        f"• Событий за 7 дней: <b>{summary.get('recent_activities_7days', 0)}</b>\n\n"
        "Хорошего рабочего дня! 🚀"
    )
    await update.message.reply_text(text, parse_mode="HTML")


async def train_report(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    args = context.args
    if not args:
        await update.message.reply_text("❗ Укажите номер поезда. Пример: <code>/train 001</code>", parse_mode="HTML")
        return

    train_number = args[0]
    report = get_train_report(train_number)

    if report is None:
        await update.message.reply_text(f"🚫 Поезд {train_number} не найден.")
        return
    if "error" in report:
        await update.message.reply_text(f"⚠️ Ошибка: {report['error']}")
        return

    revenue = report.get("revenue", 0)
    expenses = report.get("expenses", 0)
    profit = report.get("profit", revenue - expenses)
    margin = report.get("margin", 0)
    route = report.get("route", "—")

    is_profit = profit >= 0
    emoji = "🟢" if is_profit else "🔴"
    result_text = "Прибыль" if is_profit else "Убыток"

    text = (
        f"🚆 <b>Поезд {train_number}</b>\n"
        f"🛤 Маршрут: {route}\n\n"
        f"💰 Доходы: <b>{revenue:,.0f} тг</b>\n"
        f"📉 Расходы: <b>{expenses:,.0f} тг</b>\n"
        f"{emoji} {result_text}: <b>{profit:,.0f} тг</b>\n"
        f"📈 Рентабельность: <b>{margin:.1f}%</b>"
    )
    await update.message.reply_text(text, parse_mode="HTML")


async def alerts_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    alerts = get_alerts()
    if not alerts:
        await update.message.reply_text("✅ Активных уведомлений нет.")
        return

    if isinstance(alerts, dict) and "error" in alerts:
        await update.message.reply_text(f"⚠️ Ошибка: {alerts['error']}")
        return

    lines = ["🔔 <b>Активные уведомления</b>\n"]
    for alert in alerts[:10]:
        emoji = "🔴" if alert.get("type") == "critical" else "🟡" if alert.get("type") == "warning" else "🔵"
        lines.append(f"{emoji} <b>Поезд {alert.get('train_number', '—')}</b>: {alert.get('message', '')}")

    await update.message.reply_text("\n".join(lines), parse_mode="HTML")


async def voice_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Basic voice handler: transcribe is not implemented, just respond with hint."""
    await update.message.reply_text(
        "🎤 Голосовые команды в режиме beta.\n"
        "Попробуйте текстовые команды:\n"
        "/train [номер] — расходы поезда\n"
        "/digest — сводка"
    )
