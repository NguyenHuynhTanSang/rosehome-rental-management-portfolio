from datetime import date
from typing import Annotated, Literal

from fastapi import (
    APIRouter,
    Depends,
    Query,
)

from pydantic import BaseModel

from sqlalchemy import (
    Date,
    String,
    cast,
    func,
    or_,
    select,
)

from sqlalchemy.orm import Session

from backend.app.dependencies import get_db

from backend.app.models.invoice import Invoice
from backend.app.models.payment import Payment
from backend.app.models.room import Room


router = APIRouter(
    prefix="/payments",
    tags=["Payment History"],
)


# =========================================================
# RESPONSE
# =========================================================

class PaymentHistoryItem(BaseModel):
    id: int

    invoice_id: int

    room_id: int
    room_code: str

    invoice_year: int
    invoice_month: int

    # Mã RH cố định của hóa đơn.
    invoice_transfer_reference: str | None

    amount: int

    payment_method: str

    # Mã giao dịch thật do ngân hàng/payment provider tạo.
    transaction_reference: str | None

    note: str | None

    receipt_file_key: str | None
    receipt_original_name: str | None

    confirmed_by: str | None

    paid_at: str


class PaymentHistoryResponse(BaseModel):
    total_count: int

    total_amount: int
    bank_transfer_amount: int
    cash_amount: int
    other_amount: int
    deposit_amount: int

    items: list[PaymentHistoryItem]


# =========================================================
# GLOBAL PAYMENT HISTORY
# =========================================================

@router.get(
    "",
    response_model=PaymentHistoryResponse,
    summary="View Global Payment History",
)
def get_payment_history(

    db: Annotated[
        Session,
        Depends(get_db),
    ],

    room_id: int | None = None,

    year: int | None = None,

    month: int | None = Query(
        default=None,
        ge=1,
        le=12,
    ),

    payment_method: (
        Literal[
            "CASH",
            "BANK_TRANSFER",
            "OTHER",
            "DEPOSIT",
        ]
        | None
    ) = None,

    has_receipt: bool | None = None,

    date_from: date | None = None,

    date_to: date | None = None,

    search: str | None = Query(
        default=None,
        max_length=100,
    ),

    limit: int = Query(
        default=100,
        ge=1,
        le=500,
    ),

    offset: int = Query(
        default=0,
        ge=0,
    ),

):

    # =====================================================
    # FILTERS
    # =====================================================

    filters = []


    if room_id is not None:
        filters.append(
            Room.id == room_id
        )


    if year is not None:
        filters.append(
            Invoice.year == year
        )


    if month is not None:
        filters.append(
            Invoice.month == month
        )


    if payment_method is not None:
        filters.append(
            Payment.payment_method
            == payment_method
        )


    if has_receipt is True:
        filters.append(
            Payment.receipt_file_key
            .is_not(None)
        )

    elif has_receipt is False:
        filters.append(
            Payment.receipt_file_key
            .is_(None)
        )


    if date_from is not None:
        filters.append(
            cast(
                Payment.paid_at,
                Date,
            )
            >= date_from
        )


    if date_to is not None:
        filters.append(
            cast(
                Payment.paid_at,
                Date,
            )
            <= date_to
        )


    # =====================================================
    # SEARCH
    #
    # Supports:
    # - RH transfer reference
    # - room code
    # - invoice ID
    # - payment ID
    # - bank transaction reference
    # - payment note
    # =====================================================

    if (
        search
        and
        search.strip()
    ):

        keyword = (
            f"%{search.strip()}%"
        )

        filters.append(
            or_(
                Invoice
                .transfer_reference
                .ilike(
                    keyword
                ),

                Payment
                .transaction_reference
                .ilike(
                    keyword
                ),

                Room
                .room_code
                .ilike(
                    keyword
                ),

                cast(
                    Invoice.id,
                    String,
                )
                .ilike(
                    keyword
                ),

                cast(
                    Payment.id,
                    String,
                )
                .ilike(
                    keyword
                ),

                Payment
                .note
                .ilike(
                    keyword
                ),
            )
        )


    # =====================================================
    # SUMMARY QUERY
    # =====================================================

    summary_statement = (
        select(
            func.count(
                Payment.id
            ),

            func.coalesce(
                func.sum(
                    Payment.amount
                ),
                0,
            ),

            func.coalesce(
                func.sum(
                    Payment.amount
                ).filter(
                    Payment.payment_method
                    == "BANK_TRANSFER"
                ),
                0,
            ),

            func.coalesce(
                func.sum(
                    Payment.amount
                ).filter(
                    Payment.payment_method
                    == "CASH"
                ),
                0,
            ),

            func.coalesce(
                func.sum(
                    Payment.amount
                ).filter(
                    Payment.payment_method
                    == "OTHER"
                ),
                0,
            ),

            func.coalesce(
                func.sum(
                    Payment.amount
                ).filter(
                    Payment.payment_method
                    == "DEPOSIT"
                ),
                0,
            ),
        )
        .select_from(
            Payment
        )
        .join(
            Invoice,
            Invoice.id
            == Payment.invoice_id,
        )
        .join(
            Room,
            Room.id
            == Invoice.room_id,
        )
    )


    if filters:
        summary_statement = (
            summary_statement.where(
                *filters
            )
        )


    summary = db.execute(
        summary_statement
    ).one()


    total_count = int(
        summary[0]
        or 0
    )

    total_amount = int(
        summary[1]
        or 0
    )

    bank_transfer_amount = int(
        summary[2]
        or 0
    )

    cash_amount = int(
        summary[3]
        or 0
    )

    other_amount = int(
        summary[4]
        or 0
    )

    deposit_amount = int(
        summary[5]
        or 0
    )


    # =====================================================
    # PAYMENT ITEMS QUERY
    # =====================================================

    statement = (
        select(
            Payment,
            Invoice,
            Room,
        )
        .join(
            Invoice,
            Invoice.id
            == Payment.invoice_id,
        )
        .join(
            Room,
            Room.id
            == Invoice.room_id,
        )
    )


    if filters:
        statement = (
            statement.where(
                *filters
            )
        )


    statement = (
        statement
        .order_by(
            Payment.paid_at.desc(),
            Payment.id.desc(),
        )
        .offset(
            offset
        )
        .limit(
            limit
        )
    )


    rows = db.execute(
        statement
    ).all()


    # =====================================================
    # BUILD RESPONSE
    # =====================================================

    items: list[
        PaymentHistoryItem
    ] = []


    for (
        payment,
        invoice,
        room,
    ) in rows:

        items.append(
            PaymentHistoryItem(
                id=
                    payment.id,

                invoice_id=
                    invoice.id,

                room_id=
                    room.id,

                room_code=
                    room.room_code,

                invoice_year=
                    invoice.year,

                invoice_month=
                    invoice.month,

                invoice_transfer_reference=
                    invoice.transfer_reference,

                amount=
                    payment.amount,

                payment_method=
                    payment.payment_method,

                transaction_reference=
                    payment.transaction_reference,

                note=
                    payment.note,

                receipt_file_key=
                    payment.receipt_file_key,

                receipt_original_name=
                    payment.receipt_original_name,

                confirmed_by=
                    payment.confirmed_by,

                paid_at=
                    payment.paid_at.isoformat(),
            )
        )


    return PaymentHistoryResponse(
        total_count=
            total_count,

        total_amount=
            total_amount,

        bank_transfer_amount=
            bank_transfer_amount,

        cash_amount=
            cash_amount,

        other_amount=
            other_amount,

        deposit_amount=
            deposit_amount,

        items=
            items,
    )
