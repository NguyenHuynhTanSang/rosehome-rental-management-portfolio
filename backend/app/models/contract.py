from __future__ import annotations

from datetime import (
    date,
    datetime,
)

from typing import TYPE_CHECKING

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    func,
    text,
)

from sqlalchemy.orm import (
    Mapped,
    mapped_column,
    relationship,
)

from backend.app.database import Base


if TYPE_CHECKING:
    from backend.app.models.room import Room
    from backend.app.models.tenant import Tenant
    from backend.app.models.deposit_transaction import DepositTransaction


class Contract(Base):

    __tablename__ = "contracts"


    __table_args__ = (

        # ==============================
        # DATE
        # ==============================

        CheckConstraint(
            "end_date IS NULL OR end_date >= start_date",
            name="ck_contract_end_date_valid",
        ),

        CheckConstraint(
            "move_in_electric_reading IS NULL OR move_in_electric_reading >= 0",
            name="ck_contract_move_in_electric_nonnegative",
        ),

        CheckConstraint(
            "move_out_electric_reading IS NULL OR move_out_electric_reading >= 0",
            name="ck_contract_move_out_electric_nonnegative",
        ),

        CheckConstraint(
            (
                "move_out_electric_reading IS NULL "
                "OR move_in_electric_reading IS NULL "
                "OR move_out_electric_reading >= move_in_electric_reading"
            ),
            name="ck_contract_electric_handover_order",
        ),


        # ==============================
        # MONEY
        # ==============================

        CheckConstraint(
            "monthly_rent >= 0",
            name="ck_contract_monthly_rent_nonnegative",
        ),

        CheckConstraint(
            "deposit_required >= 0",
            name="ck_contract_deposit_nonnegative",
        ),


        # ==============================
        # RENT BILLING
        # ==============================

        CheckConstraint(
            (
                "rent_billing_cycle_months >= 1 "
                "AND rent_billing_cycle_months <= 12"
            ),
            name="ck_contract_rent_billing_cycle_valid",
        ),

        CheckConstraint(
            (
                "rent_billing_anchor_year >= 2020 "
                "AND rent_billing_anchor_year <= 2100"
            ),
            name="ck_contract_rent_billing_anchor_year_valid",
        ),

        CheckConstraint(
            (
                "rent_billing_anchor_month >= 1 "
                "AND rent_billing_anchor_month <= 12"
            ),
            name="ck_contract_rent_billing_anchor_month_valid",
        ),


        # ==============================
        # OCCUPANTS
        # ==============================

        CheckConstraint(
            "occupant_count >= 1",
            name="ck_contract_occupant_count_positive",
        ),


        # ==============================
        # STATUS
        # ==============================

        CheckConstraint(
            "status IN ('ACTIVE', 'ENDED')",
            name="ck_contract_status_valid",
        ),


        # ==============================
        # ACTIVE CONTRACT PER ROOM
        #
        # Một phòng chỉ có tối đa
        # một ACTIVE contract.
        # ==============================

        Index(
            "uq_contract_active_room",

            "room_id",

            unique=True,

            postgresql_where=text(
                "status = 'ACTIVE'"
            ),

        ),


        # ==============================
        # ACTIVE CONTRACT PER TENANT
        #
        # Một tenant chỉ có tối đa
        # một ACTIVE contract.
        # ==============================

        Index(
            "uq_contract_active_tenant",

            "tenant_id",

            unique=True,

            postgresql_where=text(
                "status = 'ACTIVE'"
            ),

        ),

    )


    # ==============================
    # ID
    # ==============================

    id: Mapped[int] = mapped_column(
        primary_key=True
    )


    # ==============================
    # ROOM
    # ==============================

    room_id: Mapped[int] = mapped_column(

        ForeignKey(
            "rooms.id"
        ),

        nullable=False,

        index=True,

    )


    # ==============================
    # TENANT
    # ==============================

    tenant_id: Mapped[int] = mapped_column(

        ForeignKey(
            "tenants.id"
        ),

        nullable=False,

        index=True,

    )


    # ==============================
    # START DATE
    # ==============================

    start_date: Mapped[
        date
    ] = mapped_column(

        Date,

        nullable=False,

    )


    # ==============================
    # END DATE
    # ==============================

    end_date: Mapped[
        date | None
    ] = mapped_column(

        Date,

        nullable=True,

    )


    # ==============================
    # ELECTRIC HANDOVER
    # ==============================

    move_in_electric_reading: Mapped[
        int | None
    ] = mapped_column(

        Integer,

        nullable=True,

    )


    move_out_electric_reading: Mapped[
        int | None
    ] = mapped_column(

        Integer,

        nullable=True,

    )


    # ==============================
    # RENT
    # ==============================

    monthly_rent: Mapped[
        int
    ] = mapped_column(

        BigInteger,

        nullable=False,

    )


    # ==============================
    # RENT BILLING CYCLE
    #
    # 1 = thu mỗi tháng
    # 3 = thu 3 tháng/lần và thu gộp 3 tháng
    # ==============================

    rent_billing_cycle_months: Mapped[
        int
    ] = mapped_column(

        Integer,

        default=1,

        server_default="1",

        nullable=False,

    )


    # ==============================
    # RENT BILLING ANCHOR
    #
    # Ví dụ:
    # anchor 08/2026 + cycle 3
    # -> thu 08/2026, 11/2026, 02/2027...
    # ==============================

    rent_billing_anchor_year: Mapped[
        int
    ] = mapped_column(

        Integer,

        nullable=False,

    )


    rent_billing_anchor_month: Mapped[
        int
    ] = mapped_column(

        Integer,

        nullable=False,

    )


    # ==============================
    # DEPOSIT
    # ==============================

    deposit_required: Mapped[
        int
    ] = mapped_column(

        BigInteger,

        default=0,

        nullable=False,

    )


    # ==============================
    # OCCUPANTS
    # ==============================

    occupant_count: Mapped[
        int
    ] = mapped_column(

        default=1,

        nullable=False,

    )


    # ==============================
    # STATUS
    # ==============================

    status: Mapped[
        str
    ] = mapped_column(

        String(20),

        default="ACTIVE",

        nullable=False,

    )


    # ==============================
    # CREATED
    # ==============================

    created_at: Mapped[
        datetime
    ] = mapped_column(

        DateTime(
            timezone=True
        ),

        server_default=func.now(),

        nullable=False,

    )


    # ==============================
    # ROOM RELATIONSHIP
    # ==============================

    room: Mapped[
        "Room"
    ] = relationship(

        back_populates="contracts",

    )


    # ==============================
    # TENANT RELATIONSHIP
    # ==============================

    tenant: Mapped[
        "Tenant"
    ] = relationship(

        back_populates="contracts",

    )


    # ==============================
    # DEPOSIT TRANSACTIONS
    # ==============================

    deposit_transactions: Mapped[
        list["DepositTransaction"]
    ] = relationship(

        back_populates="contract",

    )
