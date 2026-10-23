"""Shared transition baseline. No synthetic meter readings."""
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from backend.app.models.invoice import Invoice


def get_transition_baselines(db: Session, year: int, month: int, room_id: int | None = None) -> dict[int, int]:
    statement = select(Invoice).where(
        Invoice.year == year, Invoice.month == month,
        Invoice.status != "CANCELLED",
        Invoice.electricity_transition_new_reading.is_not(None),
    )
    if room_id is not None:
        statement = statement.where(Invoice.room_id == room_id)
    result = {}
    for invoice in db.scalars(statement).all():
        old = invoice.electricity_transition_old_reading
        new = invoice.electricity_transition_new_reading
        if (invoice.room_id in result or old is None or old < 0 or new < old
                or invoice.meter_reading_id is not None
                or invoice.electricity_period_year is not None
                or invoice.electricity_period_month is not None):
            raise HTTPException(409, "Ambiguous or invalid electricity transition baseline")
        result[invoice.room_id] = new
    return result
