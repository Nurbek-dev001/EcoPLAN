"""EcoPlan Hub Telegram Bot entrypoint."""
import logging
from telegram import Update
from telegram.ext import Application, CommandHandler, MessageHandler, filters
from telegram_bot.config import BOT_TOKEN
from telegram_bot.handlers import start, help_command, digest, train_report, alerts_command, voice_handler

logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s", level=logging.INFO
)
logger = logging.getLogger(__name__)


def main() -> None:
    if not BOT_TOKEN or BOT_TOKEN.strip() == "":
        logger.warning("TELEGRAM_BOT_TOKEN not set. Please configure it in backend/.env")
        return

    application = Application.builder().token(BOT_TOKEN).build()

    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("help", help_command))
    application.add_handler(CommandHandler("digest", digest))
    application.add_handler(CommandHandler("train", train_report))
    application.add_handler(CommandHandler("alerts", alerts_command))
    application.add_handler(MessageHandler(filters.VOICE, voice_handler))

    logger.info("Starting EcoPlan Hub Telegram Bot...")
    application.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
