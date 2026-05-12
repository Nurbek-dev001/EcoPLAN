#!/usr/bin/env python3
"""Standalone runner for EcoPlan Hub Telegram Bot."""
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

from telegram_bot.bot import main

if __name__ == "__main__":
    main()
