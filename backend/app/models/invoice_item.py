from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    BigInteger,
    DateTime,
    ForeignKey,
    Integer,
    String,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.database import Base

if TYPE_CHECKING:
    from backend.app.models.invoice import Invoice


class InvoiceItem(Base):
    __tablename__ = "invoice_items"

    id: Mapped[int] = mapped_column(
        primary_key=True
    )

    invoice_id: Mapped[int] = mapped_column(
        ForeignKey(
            "invoices.id",
            ondelete="CASCADE"
        ),
        nullable=False,
        index=True
    )

    item_type: Mapped[str] = mapped_column(
        String(30),
        nullable=False
    )

    description: Mapped[str] = mapped_column(
        String(150),
        nullable=False
    )

    quantity: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True
    )

    unit: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True
    )

    unit_price: Mapped[int | None] = mapped_column(
        BigInteger,
        nullable=True
    )

    amount: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

    invoice: Mapped["Invoice"] = relationship(
        back_populates="items"
    )