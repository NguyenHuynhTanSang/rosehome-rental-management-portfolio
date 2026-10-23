from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    ForeignKey,
    String,
    Text,
    func,
)

from sqlalchemy.orm import (
    Mapped,
    mapped_column,
    relationship,
)

from backend.app.database import Base


if TYPE_CHECKING:
    from backend.app.models.invoice import Invoice


class Payment(Base):

    __tablename__ = "payments"


    __table_args__ = (

        CheckConstraint(
            "amount > 0",
            name="ck_payment_amount_positive",
        ),

        CheckConstraint(
            "payment_method IN ('CASH', 'BANK_TRANSFER', 'OTHER', 'DEPOSIT')",
            name="ck_payment_method_valid",
        ),

    )


    # ==============================
    # ID
    # ==============================

    id: Mapped[int] = mapped_column(
        primary_key=True
    )


    # ==============================
    # INVOICE
    # ==============================

    invoice_id: Mapped[int] = mapped_column(

        ForeignKey(
            "invoices.id",
            ondelete="RESTRICT",
        ),

        nullable=False,
        index=True,

    )


    # ==============================
    # AMOUNT
    # ==============================

    amount: Mapped[int] = mapped_column(

        BigInteger,

        nullable=False,

    )


    # ==============================
    # PAYMENT METHOD
    # ==============================

    payment_method: Mapped[str] = mapped_column(

        String(30),

        default="CASH",

        nullable=False,

    )


    # ==============================
    # TRANSACTION REFERENCE
    #
    # Ví dụ:
    # ACB123456789
    # FT260826123456
    # ==============================

    transaction_reference: Mapped[
        str | None
    ] = mapped_column(

        String(100),

        nullable=True,
        index=True,

    )


    # ==============================
    # RECEIPT / BILL
    #
    # File thật sẽ nằm trên R2.
    # Neon chỉ giữ key + tên file.
    # ==============================

    receipt_file_key: Mapped[
        str | None
    ] = mapped_column(

        String(500),

        nullable=True,

    )


    receipt_original_name: Mapped[
        str | None
    ] = mapped_column(

        String(255),

        nullable=True,

    )


    # ==============================
    # CONFIRMED BY
    # ==============================

    confirmed_by: Mapped[
        str | None
    ] = mapped_column(

        String(255),

        nullable=True,

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
    # PAID AT
    # ==============================

    paid_at: Mapped[
        datetime
    ] = mapped_column(

        DateTime(
            timezone=True
        ),

        server_default=func.now(),

        nullable=False,

    )


    # ==============================
    # RELATIONSHIP
    # ==============================

    invoice: Mapped[
        "Invoice"
    ] = relationship(

        back_populates="payments"

    )