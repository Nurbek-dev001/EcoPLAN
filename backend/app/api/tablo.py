from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.models import Train
from app.schemas import TrainResponse
from app.core.security import get_current_user
from app.models import User

router = APIRouter(prefix="/api/tablo", tags=["tablo"])


@router.get("/search/{train_number}", response_model=TrainResponse)
async def search_train_in_tablo(
    train_number: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Search for a train by number in local database.
    Future: will integrate with tablo-railways.kz scraping.
    """
    # Try exact match
    train = db.query(Train).filter(Train.number == train_number).first()
    if not train:
        # Try with leading zeros (e.g. "1" -> "001")
        padded = train_number.zfill(3)
        train = db.query(Train).filter(Train.number == padded).first()
    
    if not train:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "message": f"Поезд №{train_number} не найден в системе",
                "suggestion": "Создайте маршрут вручную или проверьте номер поезда",
                "source": "tablo-railways.kz",
            }
        )
    
    return TrainResponse.from_orm(train)


@router.post("/parse")
async def parse_tablo_route(
    train_number: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Attempt to parse train data from tablo-railways.kz.
    
    NOTE: tablo-railways.kz is a Nuxt.js SPA rendered client-side.
    Full scraping requires a headless browser (Playwright/Selenium).
    This endpoint currently returns a placeholder with instructions.
    """
    # TODO: Implement headless browser scraping when Playwright is available
    return {
        "status": "not_implemented",
        "message": "Парсинг tablo-railways.kz требует headless-браузера (Playwright)",
        "train_number": train_number,
        "instructions": [
            "1. Установите Playwright: pip install playwright && playwright install",
            "2. Реализуйте скрейпинг в app/services/tablo_scraper.py",
            "3. Используйте endpoint /api/tablo/search/{number} для поиска в локальной БД"
        ],
        "fallback": f"/api/tablo/search/{train_number}"
    }
