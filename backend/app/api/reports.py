from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from backend.app.auth_dependencies import require_admin
from backend.app.dependencies import get_db
from backend.app.models.invoice import Invoice
from backend.app.models.payment import Payment
from backend.app.models.room import Room
from backend.app.schemas.report import (
    DebtItemResponse,
    DebtSummaryResponse,
)


router = APIRouter(
    prefix="/reports",
    tags=["Reports"],
    dependencies=[
        Depends(require_admin),
    ],
)


# ==============================
# XEM TỔNG HỢP CÔNG NỢ
# ==============================

@router.get(
    "/debts",
    response_model=DebtSummaryResponse,
    summary="View Outstanding Debts"
)
def get_debt_report(
    db: Annotated[
        Session,
        Depends(get_db)
    ]
):
    # ==============================
    # LẤY CÁC HÓA ĐƠN CÒN NỢ
    # ==============================

    stmt = (
        select(
            Invoice.id.label("invoice_id"),

            Room.id.label("room_id"),
            Room.room_code.label("room_code"),

            Invoice.year,
            Invoice.month,

            Invoice.total_amount.label(
                "invoice_total"
            ),

            func.coalesce(
                func.sum(Payment.amount),
                0
            ).label("total_paid"),

            Invoice.payment_status
        )
        .join(
            Room,
            Room.id == Invoice.room_id
        )
        .outerjoin(
            Payment,
            Payment.invoice_id == Invoice.id
        )
        .where(
            Invoice.status == "ISSUED",
            Invoice.payment_status.in_(
                [
                    "UNPAID",
                    "PARTIALLY_PAID"
                ]
            )
        )
        .group_by(
            Invoice.id,
            Room.id,
            Room.room_code
        )
        .order_by(
            Invoice.year,
            Invoice.month,
            Room.room_code
        )
    )

    rows = db.execute(
        stmt
    ).all()

    items = []
    total_debt = 0

    # ==============================
    # TÍNH CÔNG NỢ TỪNG HÓA ĐƠN
    # ==============================

    for row in rows:

        total_paid = int(
            row.total_paid
        )

        remaining = (
            row.invoice_total
            - total_paid
        )

        # Bảo vệ trường hợp dữ liệu bất thường
        if remaining < 0:
            remaining = 0

        total_debt += remaining

        items.append(
            DebtItemResponse(
                invoice_id=row.invoice_id,

                room_id=row.room_id,
                room_code=row.room_code,

                year=row.year,
                month=row.month,

                invoice_total=row.invoice_total,
                total_paid=total_paid,
                remaining_amount=remaining,

                payment_status=row.payment_status
            )
        )

    # ==============================
    # TRẢ VỀ TỔNG HỢP CÔNG NỢ
    # ==============================

    return DebtSummaryResponse(
        total_debt=total_debt,
        debt_invoice_count=len(items),
        items=items
    )

from fastapi import (
    APIRouter,
    Depends,
    Query,
)

from sqlalchemy import (
    distinct,
    func,
    select,
)

from sqlalchemy.orm import Session


from backend.app.dependencies import (
    get_db,
)

from backend.app.models.invoice import (
    Invoice,
)

from backend.app.models.meter_reading import (
    MeterReading,
)

from backend.app.models.payment import (
    Payment,
)

from backend.app.models.room import (
    Room,
)

from backend.app.schemas.report import (
    DebtItemResponse,
    DebtSummaryResponse,
    MonthlyProgressResponse,
    MonthlyProgressStepResponse,
)


router = APIRouter(
    prefix="/reports",
    tags=["Reports"],
    dependencies=[
        Depends(require_admin),
    ],
)


# =========================================================
# HELPER
# =========================================================

def build_progress_step(
    completed: int,
    total: int,
) -> MonthlyProgressStepResponse:

    if total <= 0:

        percentage = 0

    else:

        percentage = round(
            completed
            /
            total
            *
            100
        )


    return MonthlyProgressStepResponse(
        completed=completed,
        total=total,
        percentage=percentage,
    )


# =========================================================
# XEM TỔNG HỢP CÔNG NỢ
# =========================================================

@router.get(
    "/debts",
    response_model=DebtSummaryResponse,
    summary="View Outstanding Debts",
)
def get_debt_report(
    db: Annotated[
        Session,
        Depends(get_db),
    ],
):

    # =====================================================
    # LẤY CÁC HÓA ĐƠN CÒN NỢ
    # =====================================================

    stmt = (

        select(

            Invoice.id.label(
                "invoice_id"
            ),

            Room.id.label(
                "room_id"
            ),

            Room.room_code.label(
                "room_code"
            ),

            Invoice.year,

            Invoice.month,

            Invoice.total_amount.label(
                "invoice_total"
            ),

            func.coalesce(
                func.sum(
                    Payment.amount
                ),
                0,
            ).label(
                "total_paid"
            ),

            Invoice.payment_status,

        )

        .join(
            Room,
            Room.id
            == Invoice.room_id,
        )

        .outerjoin(
            Payment,
            Payment.invoice_id
            == Invoice.id,
        )

        .where(
            Invoice.status
            == "ISSUED",

            Invoice.payment_status.in_(
                [
                    "UNPAID",
                    "PARTIALLY_PAID",
                ]
            ),
        )

        .group_by(
            Invoice.id,
            Room.id,
            Room.room_code,
        )

        .order_by(
            Invoice.year,
            Invoice.month,
            Room.room_code,
        )

    )


    rows = db.execute(
        stmt
    ).all()


    items = []

    total_debt = 0


    # =====================================================
    # TÍNH CÔNG NỢ TỪNG HÓA ĐƠN
    # =====================================================

    for row in rows:

        total_paid = int(
            row.total_paid
        )


        remaining = (
            row.invoice_total
            -
            total_paid
        )


        if remaining < 0:

            remaining = 0


        total_debt += (
            remaining
        )


        items.append(

            DebtItemResponse(

                invoice_id=
                    row.invoice_id,

                room_id=
                    row.room_id,

                room_code=
                    row.room_code,

                year=
                    row.year,

                month=
                    row.month,

                invoice_total=
                    row.invoice_total,

                total_paid=
                    total_paid,

                remaining_amount=
                    remaining,

                payment_status=
                    row.payment_status,

            )

        )


    return DebtSummaryResponse(

        total_debt=
            total_debt,

        debt_invoice_count=
            len(items),

        items=
            items,

    )


# =========================================================
# TIẾN ĐỘ CÔNG VIỆC THEO THÁNG
# =========================================================

@router.get(
    "/monthly-progress",
    response_model=MonthlyProgressResponse,
    summary="View Monthly Progress",
)
def get_monthly_progress(

    db: Annotated[
        Session,
        Depends(get_db),
    ],

    year: int = Query(
        ge=2000,
        le=2100,
    ),

    month: int = Query(
        ge=1,
        le=12,
    ),

):

    # =====================================================
    # PHÒNG CẦN QUẢN LÝ TRONG THÁNG
    #
    # Hiện tại lấy các phòng đang OCCUPIED.
    # Phòng VACANT không cần meter/invoice.
    # =====================================================

    occupied_room_ids = list(

        db.scalars(

            select(
                Room.id
            )

            .where(
                Room.status
                == "OCCUPIED"
            )

        ).all()

    )


    target_room_count = len(
        occupied_room_ids
    )


    # Nếu không có phòng đang thuê
    if target_room_count == 0:

        empty_step = (
            MonthlyProgressStepResponse(
                completed=0,
                total=0,
                percentage=0,
            )
        )


        return MonthlyProgressResponse(

            year=year,

            month=month,

            target_room_count=0,

            meter_readings=
                empty_step,

            invoices_created=
                empty_step,

            invoices_issued=
                empty_step,

            invoices_paid=
                empty_step,

        )


    # =====================================================
    # 1. ĐÃ NHẬP CHỈ SỐ ĐIỆN
    # =====================================================

    meter_count = db.scalar(

        select(
            func.count(
                distinct(
                    MeterReading.room_id
                )
            )
        )

        .where(
            MeterReading.year
            == year,

            MeterReading.month
            == month,

            MeterReading.room_id.in_(
                occupied_room_ids
            ),
        )

    )


    meter_count = int(
        meter_count
        or 0
    )


    # =====================================================
    # 2. ĐÃ TẠO HÓA ĐƠN
    #
    # DRAFT + ISSUED đều tính là đã tạo.
    # CANCELLED không tính.
    # distinct room_id tránh invoice replacement/version
    # làm tăng số lượng.
    # =====================================================

    invoice_created_count = db.scalar(

        select(
            func.count(
                distinct(
                    Invoice.room_id
                )
            )
        )

        .where(
            Invoice.year
            == year,

            Invoice.month
            == month,

            Invoice.room_id.in_(
                occupied_room_ids
            ),

            Invoice.status
            != "CANCELLED",
        )

    )


    invoice_created_count = int(
        invoice_created_count
        or 0
    )


    # =====================================================
    # 3. ĐÃ PHÁT HÀNH
    # =====================================================

    invoice_issued_count = db.scalar(

        select(
            func.count(
                distinct(
                    Invoice.room_id
                )
            )
        )

        .where(
            Invoice.year
            == year,

            Invoice.month
            == month,

            Invoice.room_id.in_(
                occupied_room_ids
            ),

            Invoice.status
            == "ISSUED",
        )

    )


    invoice_issued_count = int(
        invoice_issued_count
        or 0
    )


    # =====================================================
    # 4. ĐÃ THANH TOÁN ĐỦ
    # =====================================================

    invoice_paid_count = db.scalar(

        select(
            func.count(
                distinct(
                    Invoice.room_id
                )
            )
        )

        .where(
            Invoice.year
            == year,

            Invoice.month
            == month,

            Invoice.room_id.in_(
                occupied_room_ids
            ),

            Invoice.status
            == "ISSUED",

            Invoice.payment_status
            == "PAID",
        )

    )


    invoice_paid_count = int(
        invoice_paid_count
        or 0
    )


    # =====================================================
    # RESPONSE
    # =====================================================

    return MonthlyProgressResponse(

        year=
            year,

        month=
            month,

        target_room_count=
            target_room_count,

        meter_readings=
            build_progress_step(
                meter_count,
                target_room_count,
            ),

        invoices_created=
            build_progress_step(
                invoice_created_count,
                target_room_count,
            ),

        invoices_issued=
            build_progress_step(
                invoice_issued_count,
                target_room_count,
            ),

        invoices_paid=
            build_progress_step(
                invoice_paid_count,
                target_room_count,
            ),

    )