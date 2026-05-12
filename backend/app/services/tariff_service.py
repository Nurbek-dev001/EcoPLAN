from sqlalchemy.orm import Session
from datetime import date
from typing import List, Optional
from uuid import UUID
from app.models import Tariff, User
from app.schemas import TariffCreate, TariffUpdate


class TariffService:
    """Service for managing tariffs with temporal support"""

    @staticmethod
    def get_valid_tariffs(
        db: Session,
        target_date: date,
        region: Optional[str] = None
    ) -> List[Tariff]:
        """Get tariffs that are valid on a specific date"""
        query = db.query(Tariff).filter(
            Tariff.valid_from <= target_date,
            (Tariff.valid_to.is_(None)) | (Tariff.valid_to >= target_date)
        )

        if region:
            query = query.filter(Tariff.region == region)

        return query.all()

    @staticmethod
    def create_tariff(
        db: Session,
        tariff_create: TariffCreate,
        user_id: UUID
    ) -> Tariff:
        """Create a new tariff with temporal support"""
        # Close previous version if it exists
        existing = db.query(Tariff).filter(
            Tariff.name == tariff_create.name,
            Tariff.region == tariff_create.region,
            Tariff.category == tariff_create.category,
            Tariff.valid_to.is_(None)
        ).first()

        if existing and existing.valid_to is None:
            existing.valid_to = date.today()

        tariff = Tariff(
            name=tariff_create.name,
            region=tariff_create.region,
            category=tariff_create.category,
            value=tariff_create.value,
            unit=tariff_create.unit,
            valid_from=tariff_create.valid_from,
            created_by=user_id,
        )

        db.add(tariff)
        db.commit()
        db.refresh(tariff)
        return tariff

    @staticmethod
    def get_tariff_history(
        db: Session,
        tariff_id: UUID
    ) -> List[Tariff]:
        """Get all versions of a tariff"""
        # Find the current tariff to get name/region/category
        current = db.query(Tariff).filter(Tariff.id == tariff_id).first()
        if not current:
            return []

        return db.query(Tariff).filter(
            Tariff.name == current.name,
            Tariff.region == current.region,
            Tariff.category == current.category,
        ).order_by(Tariff.valid_from.desc()).all()

    @staticmethod
    def bulk_import_tariffs(
        db: Session,
        tariffs: List[TariffCreate],
        user_id: UUID
    ) -> int:
        """Bulk import tariffs"""
        count = 0
        for tariff_data in tariffs:
            TariffService.create_tariff(db, tariff_data, user_id)
            count += 1
        return count
