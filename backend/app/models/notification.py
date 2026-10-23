from __future__ import annotations

from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    String,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.database import Base

if TYPE_CHECKING:
    from backend.app.models.contract import Contract


class Notification(Base):
    __tablename__ = "notifications"

    __table_args__ = (
        UniqueConstraint(
            "contract_id",
            "reminder_stage",
            "contract_end_date",
            name="uq_notifications_contract_stage_end_date",
        ),
    )

    id: Mapped[int] = mapped_column(
        primary_key=True
    )

    notification_type: Mapped[str] = mapped_column(
        String(50),
        default="CONTRACT_EXPIRY",
        nullable=False,
    )

    contract_id: Mapped[int] = mapped_column(
        ForeignKey("contracts.id"),
        nullable=False,
    )

    reminder_stage: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )

    contract_end_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
    )

    title: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    message: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
    )

    is_read: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        server_default=text("false"),
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    contract: Mapped["Contract"] = relationship()