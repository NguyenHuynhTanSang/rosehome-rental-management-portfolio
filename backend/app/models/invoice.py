from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)

from sqlalchemy.orm import (
    Mapped,
    mapped_column,
    relationship,
)

from backend.app.database import Base


if TYPE_CHECKING:
    from backend.app.models.invoice_item import InvoiceItem
    from backend.app.models.payment import Payment
    from backend.app.models.room import Room


class Invoice(Base):

    __tablename__ = "invoices"


    __table_args__ = (

        UniqueConstraint(
            "room_id",
            "year",
            "month",
            "version",
            name="uq_invoice_room_month_version",
        ),

        UniqueConstraint(
            "replaces_invoice_id",
            name="uq_invoice_replaces_invoice",
        ),

        UniqueConstraint(
            "transfer_reference",
            name="uq_invoice_transfer_reference",
        ),

        CheckConstraint(
            "month >= 1 AND month <= 12",
            name="ck_invoice_month_valid",
        ),

        CheckConstraint(
            "year >= 2020 AND year <= 2100",
            name="ck_invoice_year_valid",
        ),

        CheckConstraint(
            (
                "electricity_period_month IS NULL "
                "OR "
                "(electricity_period_month >= 1 "
                "AND electricity_period_month <= 12)"
            ),
            name="ck_invoice_electricity_period_month_valid",
        ),

        CheckConstraint(
            (
                "electricity_period_year IS NULL "
                "OR "
                "(electricity_period_year >= 2019 "
                "AND electricity_period_year <= 2100)"
            ),
            name="ck_invoice_electricity_period_year_valid",
        ),

        CheckConstraint(
            (
                "(electricity_period_year IS NULL "
                "AND electricity_period_month IS NULL) "
                "OR "
                "(electricity_period_year IS NOT NULL "
                "AND electricity_period_month IS NOT NULL)"
            ),
            name="ck_invoice_electricity_period_pair",
        ),

        CheckConstraint(
            "(electricity_transition_old_reading IS NULL AND electricity_transition_new_reading IS NULL) OR "
            "(electricity_transition_old_reading IS NOT NULL AND electricity_transition_new_reading IS NOT NULL "
            "AND electricity_transition_old_reading >= 0 AND electricity_transition_new_reading >= electricity_transition_old_reading)",
            name="ck_invoice_transition_pair",
        ),
        CheckConstraint(
            "electricity_transition_new_reading IS NULL OR "
            "(meter_reading_id IS NULL AND electricity_period_year IS NULL AND electricity_period_month IS NULL)",
            name="ck_invoice_transition_source",
        ),

        CheckConstraint(
            "version >= 1",
            name="ck_invoice_version_positive",
        ),

        CheckConstraint(
            "total_amount >= 0",
            name="ck_invoice_total_amount_nonnegative",
        ),

        CheckConstraint(
            "status IN ('DRAFT', 'ISSUED', 'CANCELLED')",
            name="ck_invoice_status_valid",
        ),

        CheckConstraint(
            "payment_status IN ('UNPAID', 'PARTIALLY_PAID', 'PAID')",
            name="ck_invoice_payment_status_valid",
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
            "rooms.id",
            ondelete="RESTRICT",
        ),

        nullable=False,
        index=True,

    )


    # ==============================
    # BILL PERIOD
    # ==============================

    year: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )


    month: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )


    # ==============================
    # ELECTRICITY PERIOD
    # ==============================

    electricity_period_year: Mapped[
        int | None
    ] = mapped_column(
        Integer,
        nullable=True,
    )


    electricity_period_month: Mapped[
        int | None
    ] = mapped_column(
        Integer,
        nullable=True,
    )


    # ==============================
    # ELECTRICITY SOURCE
    # ==============================

    meter_reading_id: Mapped[
        int | None
    ] = mapped_column(

        ForeignKey(
            "meter_readings.id",
            ondelete="SET NULL",
        ),

        nullable=True,
        index=True,

    )


    electricity_transition_old_reading: Mapped[int | None] = mapped_column(Integer, nullable=True)
    electricity_transition_new_reading: Mapped[int | None] = mapped_column(Integer, nullable=True)


    # ==============================
    # VERSION
    # ==============================

    version: Mapped[int] = mapped_column(

        Integer,

        nullable=False,

        server_default="1",

    )


    # ==============================
    # REPLACEMENT
    # ==============================

    replaces_invoice_id: Mapped[
        int | None
    ] = mapped_column(

        ForeignKey(
            "invoices.id",
            ondelete="SET NULL",
        ),

        nullable=True,

    )


    # ==============================
    # STATUS
    # ==============================

    status: Mapped[str] = mapped_column(

        String(20),

        default="DRAFT",

        nullable=False,

    )


    payment_status: Mapped[str] = mapped_column(

        String(20),

        default="UNPAID",

        server_default="UNPAID",

        nullable=False,

    )


    # ==============================
    # RH TRANSFER REFERENCE
    # ==============================

    transfer_reference: Mapped[
        str | None
    ] = mapped_column(

        String(100),

        nullable=True,

    )


    # ==============================
    # TOTAL
    # ==============================

    total_amount: Mapped[int] = mapped_column(

        BigInteger,

        default=0,

        nullable=False,

    )


    # ==============================
    # NOTE
    # ==============================

    note: Mapped[
        str | None
    ] = mapped_column(

        Text,

        nullable=True,

    )


    # ==============================
    # CANCEL
    # ==============================

    cancelled_reason: Mapped[
        str | None
    ] = mapped_column(

        Text,

        nullable=True,

    )


    cancelled_at: Mapped[
        datetime | None
    ] = mapped_column(

        DateTime(
            timezone=True
        ),

        nullable=True,

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
    # UPDATED
    # ==============================

    updated_at: Mapped[
        datetime
    ] = mapped_column(

        DateTime(
            timezone=True
        ),

        server_default=func.now(),

        onupdate=func.now(),

        nullable=False,

    )


    # ==============================
    # RELATIONSHIPS
    # ==============================

    room: Mapped[
        "Room"
    ] = relationship(

        back_populates="invoices",

    )


    items: Mapped[
        list["InvoiceItem"]
    ] = relationship(

        back_populates="invoice",

        cascade="all, delete-orphan",

    )


    payments: Mapped[
        list["Payment"]
    ] = relationship(

        back_populates="invoice",

    )
    checkout_settlement = relationship(
        "CheckoutSettlement", foreign_keys="CheckoutSettlement.invoice_id",
        uselist=False, viewonly=True,
    )
