from __future__ import annotations

from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    UniqueConstraint,
    func,
    text,
)

from sqlalchemy.orm import (
    Mapped,
    mapped_column,
)

from backend.app.database import Base


class ContractOccupant(Base):

    __tablename__ = "contract_occupants"


    __table_args__ = (

        UniqueConstraint(
            "contract_id",
            "tenant_id",
            name="uq_contract_occupant_contract_tenant",
        ),

        # Một tenant chỉ được là người ở cùng ACTIVE
        # tại tối đa một hợp đồng tại một thời điểm.
        Index(
            "uq_contract_occupant_active_tenant",

            "tenant_id",

            unique=True,

            postgresql_where=text(
                "is_active = TRUE"
            ),

        ),

    )


    id: Mapped[int] = mapped_column(
        primary_key=True
    )


    contract_id: Mapped[int] = mapped_column(

        ForeignKey(
            "contracts.id",
            ondelete="CASCADE",
        ),

        nullable=False,

        index=True,

    )


    tenant_id: Mapped[int] = mapped_column(

        ForeignKey(
            "tenants.id",
            ondelete="RESTRICT",
        ),

        nullable=False,

        index=True,

    )


    is_active: Mapped[bool] = mapped_column(

        Boolean,

        default=True,

        server_default=text("TRUE"),

        nullable=False,

    )


    joined_at: Mapped[datetime] = mapped_column(

        DateTime(
            timezone=True
        ),

        server_default=func.now(),

        nullable=False,

    )


    left_at: Mapped[
        datetime | None
    ] = mapped_column(

        DateTime(
            timezone=True
        ),

        nullable=True,

    )
