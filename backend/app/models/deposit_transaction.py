from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    BigInteger,
    DateTime,
    ForeignKey,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.database import Base

if TYPE_CHECKING:
    from backend.app.models.contract import Contract


class DepositTransaction(Base):
    __tablename__ = "deposit_transactions"

    id: Mapped[int] = mapped_column(
        primary_key=True
    )

    contract_id: Mapped[int] = mapped_column(
        ForeignKey(
            "contracts.id",
            ondelete="RESTRICT"
        ),
        nullable=False,
        index=True
    )

    transaction_type: Mapped[str] = mapped_column(
        String(20),
        nullable=False
    )

    amount: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False
    )

    note: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

    contract: Mapped["Contract"] = relationship(
        back_populates="deposit_transactions"
    )