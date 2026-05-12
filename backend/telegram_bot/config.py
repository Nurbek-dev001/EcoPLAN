import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from backend root (one level up from this file)
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "8757887933:AAFNieHm2LcM3wJnRipOcFKHWxi49t7aKBc")
API_BASE_URL = os.getenv("ECOPLAN_API_URL", "http://localhost:8000/api")
DEMO_MODE = os.getenv("BOT_DEMO_MODE", "true").lower() == "true"
ADMIN_CHAT_IDS = list(map(int, filter(None, os.getenv("ADMIN_CHAT_IDS", "").split(","))))
