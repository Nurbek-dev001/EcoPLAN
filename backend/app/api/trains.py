from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.database import get_db
from app.models import Train, User
from app.schemas import TrainCreate, TrainUpdate, TrainResponse, TrainListResponse
from app.services import AuditService
from app.core.security import get_current_user

router = APIRouter(prefix="/api/trains", tags=["trains"])


@router.post("/", response_model=TrainResponse)
async def create_train(
    train: TrainCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new train"""
    # Check if train number already exists
    existing = db.query(Train).filter(Train.number == train.number).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Train number already exists")

    db_train = Train(
        number=train.number,
        route=train.route,
        from_station=train.from_station,
        to_station=train.to_station,
        distance_km=train.distance_km,
        duration_hours=train.duration_hours,
        schedule_data=train.schedule_data,
    )

    db.add(db_train)
    db.commit()
    db.refresh(db_train)

    # Log audit
    AuditService.log_action(
        db, current_user.id, "train", db_train.id, "create",
        new_values=train.dict()
    )

    return TrainResponse.from_orm(db_train)


@router.get("/", response_model=List[TrainListResponse])
async def list_trains(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List trains"""
    trains = db.query(Train).offset(skip).limit(limit).all()
    return [TrainListResponse.from_orm(train) for train in trains]


@router.get("/{train_id}", response_model=TrainResponse)
async def get_train(
    train_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific train"""
    train = db.query(Train).filter(Train.id == train_id).first()
    if not train:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Train not found")

    return TrainResponse.from_orm(train)


@router.get("/number/{train_number}", response_model=TrainResponse)
async def get_train_by_number(
    train_number: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get train by number"""
    train = db.query(Train).filter(Train.number == train_number).first()
    if not train:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Train not found")

    return TrainResponse.from_orm(train)


@router.put("/{train_id}", response_model=TrainResponse)
async def update_train(
    train_id: UUID,
    train_update: TrainUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a train"""
    train = db.query(Train).filter(Train.id == train_id).first()
    if not train:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Train not found")

    # Store old values
    old_values = {
        "route": train.route,
        "from_station": train.from_station,
        "to_station": train.to_station,
        "distance_km": train.distance_km,
        "duration_hours": train.duration_hours,
        "schedule_data": train.schedule_data,
    }

    # Update fields
    for field, value in train_update.dict(exclude_unset=True).items():
        setattr(train, field, value)

    db.commit()
    db.refresh(train)

    # Log audit
    new_values = {
        "route": train.route,
        "from_station": train.from_station,
        "to_station": train.to_station,
        "distance_km": train.distance_km,
        "duration_hours": train.duration_hours,
        "schedule_data": train.schedule_data,
    }
    AuditService.log_action(
        db, current_user.id, "train", train.id, "update",
        old_values=old_values, new_values=new_values
    )

    return TrainResponse.from_orm(train)