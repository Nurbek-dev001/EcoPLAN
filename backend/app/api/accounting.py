"""
1C:Бухгалтерия integration API.
Export accounting entries (проводки) directly to 1C format.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from uuid import UUID

from app.database import get_db
from app.models import User, Calculation
from app.services import RBACService
from app.core.security import get_current_user
from app.integrations.accounting_1c import calculation_to_1c_entries, generate_1c_xml, generate_1c_txt
from app.tasks.sync_tasks import export_1c_async

router = APIRouter(prefix="/api/accounting", tags=["accounting"])


@router.get("/1c-export/{calculation_id}")
async def export_1c(
    calculation_id: UUID,
    format: str = "xml",  # xml, txt, json
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Export a calculation's accounting entries to 1C format."""
    if not RBACService.can_view_reports(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")

    calc = db.query(Calculation).filter(Calculation.id == str(calculation_id)).first()
    if not calc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Calculation not found")

    entries = calculation_to_1c_entries(calc)

    if format.lower() == "xml":
        xml_content = generate_1c_xml(entries)
        return Response(
            content=xml_content,
            media_type="application/xml",
            headers={"Content-Disposition": f"attachment; filename=calc_{calculation_id}.xml"}
        )
    elif format.lower() == "txt":
        txt_content = generate_1c_txt(entries)
        return Response(
            content=txt_content,
            media_type="text/plain; charset=utf-8",
            headers={"Content-Disposition": f"attachment; filename=calc_{calculation_id}.txt"}
        )
    elif format.lower() == "json":
        return {
            "calculation_id": str(calculation_id),
            "train_number": calc.train_number,
            "entries": entries,
            "total_amount": sum(e["amount"] for e in entries),
        }
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported format. Use xml, txt, or json.")


@router.post("/1c-export/batch")
async def export_1c_batch(
    calculation_ids: List[UUID],
    format: str = "xml",
    background: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Batch export multiple calculations to 1C. Optionally run as background Celery task."""
    if not RBACService.can_view_reports(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")

    if background:
        task = export_1c_async.delay([str(c) for c in calculation_ids], format)
        return {"task_id": task.id, "status": "queued", "calculations_count": len(calculation_ids)}

    all_entries: List[Dict[str, Any]] = []
    for cid in calculation_ids:
        calc = db.query(Calculation).filter(Calculation.id == str(cid)).first()
        if calc:
            all_entries.extend(calculation_to_1c_entries(calc))

    if format.lower() == "xml":
        xml_content = generate_1c_xml(all_entries)
        return Response(
            content=xml_content,
            media_type="application/xml",
            headers={"Content-Disposition": "attachment; filename=batch_export.xml"}
        )
    elif format.lower() == "txt":
        txt_content = generate_1c_txt(all_entries)
        return Response(
            content=txt_content,
            media_type="text/plain; charset=utf-8",
            headers={"Content-Disposition": "attachment; filename=batch_export.txt"}
        )
    else:
        return {
            "calculations_count": len(calculation_ids),
            "entries": all_entries,
            "total_amount": sum(e["amount"] for e in all_entries),
        }


@router.get("/1c-mapping")
async def get_1c_mapping(
    current_user: User = Depends(get_current_user),
):
    """Return the expense group to 1C account mapping."""
    if not RBACService.can_view_reports(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")

    return {
        "mapping": {
            "Расходники": {"account_dr": "20.01", "account_cr": "10.01", "name": "Материалы"},
            "МЖС": {"account_dr": "20.01", "account_cr": "60.01", "name": "Поставщики"},
            "Станционные": {"account_dr": "20.01", "account_cr": "25.01", "name": "Общепроизводственные"},
            "Санобработка": {"account_dr": "20.01", "account_cr": "25.01", "name": "Общепроизводственные"},
            "Default": {"account_dr": "20.01", "account_cr": "25.01", "name": "Прочие"},
        }
    }
