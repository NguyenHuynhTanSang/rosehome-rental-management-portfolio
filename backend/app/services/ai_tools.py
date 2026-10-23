from backend.app.models.deposit_transaction import (
    DepositTransaction,
)
from datetime import (
    date,
    timedelta,
)

from sqlalchemy import (
    distinct,
    func,
    select,
)

from sqlalchemy.orm import (
    Session,
)


from backend.app.models.contract import (
    Contract,
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


# =========================================================
# HELPERS
# =========================================================

def build_progress(
    completed: int,
    total: int,
) -> dict:

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


    return {
        "completed":
            completed,

        "total":
            total,

        "percentage":
            percentage,
    }


def validate_year_month(
    year: int,
    month: int,
) -> None:

    if (
        year < 2000
        or
        year > 2100
    ):

        raise ValueError(
            "Year must be between 2000 and 2100."
        )


    if (
        month < 1
        or
        month > 12
    ):

        raise ValueError(
            "Month must be between 1 and 12."
        )


# =========================================================
# 1. PROPERTY SUMMARY
# =========================================================

def get_property_summary(
    db: Session,
) -> dict:

    """
    Tổng quan tình trạng phòng và hợp đồng.

    Không trả thông tin cá nhân của khách thuê.
    """


    total_rooms = int(
        db.scalar(
            select(
                func.count(
                    Room.id
                )
            )
        )
        or 0
    )


    occupied_rooms = int(
        db.scalar(
            select(
                func.count(
                    Room.id
                )
            )
            .where(
                Room.status
                == "OCCUPIED"
            )
        )
        or 0
    )


    vacant_rooms = int(
        db.scalar(
            select(
                func.count(
                    Room.id
                )
            )
            .where(
                Room.status
                == "VACANT"
            )
        )
        or 0
    )


    active_contracts = int(
        db.scalar(
            select(
                func.count(
                    Contract.id
                )
            )
            .where(
                Contract.status
                == "ACTIVE"
            )
        )
        or 0
    )


    vacant_room_codes = list(
        db.scalars(
            select(
                Room.room_code
            )
            .where(
                Room.status
                == "VACANT"
            )
            .order_by(
                Room.room_code
            )
        ).all()
    )


    occupancy_rate = (

        round(
            occupied_rooms
            /
            total_rooms
            *
            100
        )

        if total_rooms > 0

        else 0

    )


    return {

        "total_rooms":
            total_rooms,

        "occupied_rooms":
            occupied_rooms,

        "vacant_rooms":
            vacant_rooms,

        "occupancy_rate":
            occupancy_rate,

        "active_contracts":
            active_contracts,

        "vacant_room_codes":
            vacant_room_codes,

    }


# =========================================================
# 2. DEBT REPORT
# =========================================================

def get_debt_report(
    db: Session,
) -> dict:

    """
    Lấy toàn bộ hóa đơn ISSUED
    chưa được thanh toán đủ.

    Không trả thông tin khách thuê.
    """


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


    for row in rows:

        total_paid = int(
            row.total_paid
            or 0
        )


        invoice_total = int(
            row.invoice_total
            or 0
        )


        remaining_amount = max(
            0,
            invoice_total
            -
            total_paid,
        )


        total_debt += (
            remaining_amount
        )


        items.append(
            {

                "invoice_id":
                    row.invoice_id,

                "room_id":
                    row.room_id,

                "room_code":
                    row.room_code,

                "year":
                    row.year,

                "month":
                    row.month,

                "invoice_total":
                    invoice_total,

                "total_paid":
                    total_paid,

                "remaining_amount":
                    remaining_amount,

                "payment_status":
                    row.payment_status,

            }
        )


    debt_room_count = len(
        {
            item["room_id"]
            for item in items
        }
    )


    return {

        "total_debt":
            total_debt,

        "debt_invoice_count":
            len(
                items
            ),

        "debt_room_count":
            debt_room_count,

        "items":
            items,

    }


# =========================================================
# 3. MONTHLY REVENUE
# =========================================================

def get_monthly_revenue(
    db: Session,
    year: int,
    month: int,
) -> dict:

    """
    Tổng tiền thực tế đã nhận trong tháng,
    dựa trên Payment.paid_at.
    """


    validate_year_month(
        year,
        month,
    )


    filters = [

        func.extract(
            "year",
            Payment.paid_at,
        )
        == year,

        func.extract(
            "month",
            Payment.paid_at,
        )
        == month,

    ]


    total_amount = int(
        db.scalar(
            select(
                func.coalesce(
                    func.sum(
                        Payment.amount
                    ),
                    0,
                )
            )
            .where(
                *filters
            )
        )
        or 0
    )


    payment_count = int(
        db.scalar(
            select(
                func.count(
                    Payment.id
                )
            )
            .where(
                *filters
            )
        )
        or 0
    )


    bank_transfer_amount = int(
        db.scalar(
            select(
                func.coalesce(
                    func.sum(
                        Payment.amount
                    ),
                    0,
                )
            )
            .where(
                *filters,

                Payment.payment_method
                == "BANK_TRANSFER",
            )
        )
        or 0
    )


    cash_amount = int(
        db.scalar(
            select(
                func.coalesce(
                    func.sum(
                        Payment.amount
                    ),
                    0,
                )
            )
            .where(
                *filters,

                Payment.payment_method
                == "CASH",
            )
        )
        or 0
    )


    other_amount = int(
        db.scalar(
            select(
                func.coalesce(
                    func.sum(
                        Payment.amount
                    ),
                    0,
                )
            )
            .where(
                *filters,

                Payment.payment_method
                == "OTHER",
            )
        )
        or 0
    )


    return {

        "year":
            year,

        "month":
            month,

        "total_amount":
            total_amount,

        "payment_count":
            payment_count,

        "bank_transfer_amount":
            bank_transfer_amount,

        "cash_amount":
            cash_amount,

        "other_amount":
            other_amount,

    }


# =========================================================
# 4. EXPIRING CONTRACTS
# =========================================================

def get_expiring_contracts(
    db: Session,
    days: int = 30,
) -> dict:

    """
    Lấy hợp đồng ACTIVE
    sẽ hết hạn trong N ngày tới.
    """


    safe_days = max(
        1,
        min(
            int(
                days
            ),
            365,
        ),
    )


    today = date.today()


    deadline = (
        today
        +
        timedelta(
            days=safe_days
        )
    )


    stmt = (

        select(

            Contract.id.label(
                "contract_id"
            ),

            Contract.room_id,

            Room.room_code,

            Contract.start_date,

            Contract.end_date,

        )

        .join(
            Room,
            Room.id
            == Contract.room_id,
        )

        .where(
            Contract.status
            == "ACTIVE",

            Contract.end_date
            .is_not(
                None
            ),

            Contract.end_date
            >= today,

            Contract.end_date
            <= deadline,
        )

        .order_by(
            Contract.end_date,
            Room.room_code,
        )

    )


    rows = db.execute(
        stmt
    ).all()


    items = []


    for row in rows:

        days_remaining = (

            (
                row.end_date
                -
                today
            ).days

            if row.end_date

            else None

        )


        items.append(
            {

                "contract_id":
                    row.contract_id,

                "room_id":
                    row.room_id,

                "room_code":
                    row.room_code,

                "start_date":
                    (
                        row.start_date.isoformat()
                        if row.start_date
                        else None
                    ),

                "end_date":
                    (
                        row.end_date.isoformat()
                        if row.end_date
                        else None
                    ),

                "days_remaining":
                    days_remaining,

            }
        )


    return {

        "days_window":
            safe_days,

        "contract_count":
            len(
                items
            ),

        "items":
            items,

    }


# =========================================================
# 5. MONTHLY PROGRESS
# =========================================================

def get_meter_progress(
    db: Session,
    year: int,
    month: int,
) -> dict:

    """
    Tiến độ công việc tháng:

    - Nhập chỉ số điện
    - Tạo hóa đơn
    - Phát hành hóa đơn
    - Thanh toán đủ

    Trả thêm danh sách phòng chưa hoàn thành
    từng bước để AI có thể hướng dẫn admin.
    """


    validate_year_month(
        year,
        month,
    )


    occupied_rooms = db.execute(

        select(
            Room.id,
            Room.room_code,
        )

        .where(
            Room.status
            == "OCCUPIED"
        )

        .order_by(
            Room.room_code
        )

    ).all()


    occupied_room_ids = [

        row.id

        for row
        in occupied_rooms

    ]


    room_code_map = {

        row.id:
            row.room_code

        for row
        in occupied_rooms

    }


    target_room_count = len(
        occupied_room_ids
    )


    if (
        target_room_count
        == 0
    ):

        return {

            "year":
                year,

            "month":
                month,

            "target_room_count":
                0,

            "meter_readings":
                {
                    **build_progress(
                        0,
                        0,
                    ),

                    "missing_rooms":
                        [],
                },

            "invoices_created":
                {
                    **build_progress(
                        0,
                        0,
                    ),

                    "missing_rooms":
                        [],
                },

            "invoices_issued":
                {
                    **build_progress(
                        0,
                        0,
                    ),

                    "missing_rooms":
                        [],
                },

            "invoices_paid":
                {
                    **build_progress(
                        0,
                        0,
                    ),

                    "missing_rooms":
                        [],
                },

        }


    # =====================================================
    # METER READINGS
    # =====================================================

    entered_meter_room_ids = set(

        db.scalars(

            select(
                distinct(
                    MeterReading.room_id
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

        ).all()

    )


    meter_missing_room_ids = (

        set(
            occupied_room_ids
        )
        -
        entered_meter_room_ids

    )


    meter_missing_rooms = sorted(

        room_code_map[
            room_id
        ]

        for room_id
        in meter_missing_room_ids

    )


    # =====================================================
    # INVOICES CREATED
    # =====================================================

    created_invoice_room_ids = set(

        db.scalars(

            select(
                distinct(
                    Invoice.room_id
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

        ).all()

    )


    created_missing_room_ids = (

        set(
            occupied_room_ids
        )
        -
        created_invoice_room_ids

    )


    created_missing_rooms = sorted(

        room_code_map[
            room_id
        ]

        for room_id
        in created_missing_room_ids

    )


    # =====================================================
    # INVOICES ISSUED
    # =====================================================

    issued_invoice_room_ids = set(

        db.scalars(

            select(
                distinct(
                    Invoice.room_id
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

        ).all()

    )


    issued_missing_room_ids = (

        set(
            occupied_room_ids
        )
        -
        issued_invoice_room_ids

    )


    issued_missing_rooms = sorted(

        room_code_map[
            room_id
        ]

        for room_id
        in issued_missing_room_ids

    )


    # =====================================================
    # INVOICES PAID
    # =====================================================

    paid_invoice_room_ids = set(

        db.scalars(

            select(
                distinct(
                    Invoice.room_id
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

        ).all()

    )


    paid_missing_room_ids = (

        set(
            occupied_room_ids
        )
        -
        paid_invoice_room_ids

    )


    paid_missing_rooms = sorted(

        room_code_map[
            room_id
        ]

        for room_id
        in paid_missing_room_ids

    )


    return {

        "year":
            year,

        "month":
            month,

        "target_room_count":
            target_room_count,

        "meter_readings":
            {
                **build_progress(
                    len(
                        entered_meter_room_ids
                    ),
                    target_room_count,
                ),

                "missing_rooms":
                    meter_missing_rooms,
            },

        "invoices_created":
            {
                **build_progress(
                    len(
                        created_invoice_room_ids
                    ),
                    target_room_count,
                ),

                "missing_rooms":
                    created_missing_rooms,
            },

        "invoices_issued":
            {
                **build_progress(
                    len(
                        issued_invoice_room_ids
                    ),
                    target_room_count,
                ),

                "missing_rooms":
                    issued_missing_rooms,
            },

        "invoices_paid":
            {
                **build_progress(
                    len(
                        paid_invoice_room_ids
                    ),
                    target_room_count,
                ),

                "missing_rooms":
                    paid_missing_rooms,
            },

    }


# =========================================================
# 6. RECENT PAYMENTS
# =========================================================

def get_recent_payments(
    db: Session,
    limit: int = 10,
) -> dict:

    """
    Lấy các giao dịch thanh toán gần nhất.

    Không trả transaction reference,
    receipt hoặc thông tin cá nhân khách thuê.
    """


    safe_limit = max(
        1,
        min(
            int(
                limit
            ),
            20,
        ),
    )


    stmt = (

        select(

            Payment.id.label(
                "payment_id"
            ),

            Payment.invoice_id,

            Room.id.label(
                "room_id"
            ),

            Room.room_code,

            Payment.amount,

            Payment.payment_method,

            Payment.paid_at,

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

        .order_by(
            Payment.paid_at.desc(),
            Payment.id.desc(),
        )

        .limit(
            safe_limit
        )

    )


    rows = db.execute(
        stmt
    ).all()


    items = []


    for row in rows:

        items.append(
            {

                "payment_id":
                    row.payment_id,

                "invoice_id":
                    row.invoice_id,

                "room_id":
                    row.room_id,

                "room_code":
                    row.room_code,

                "amount":
                    int(
                        row.amount
                        or 0
                    ),

                "payment_method":
                    row.payment_method,

                "paid_at":
                    (
                        row.paid_at.isoformat()
                        if row.paid_at
                        else None
                    ),

            }
        )


    return {

        "count":
            len(
                items
            ),

        "items":
            items,

    }


# =========================================================
# 7. ATTENTION ITEMS
# =========================================================

def get_attention_items(
    db: Session,
) -> dict:

    """
    Tổng hợp các việc admin nên chú ý ngay:

    - Công nợ chưa thanh toán
    - Phòng chưa nhập điện tháng hiện tại
    - Phòng chưa tạo hóa đơn tháng hiện tại
    - Hóa đơn DRAFT chưa phát hành
    - Hợp đồng ACTIVE đã quá hạn
    - Hợp đồng ACTIVE sắp hết hạn trong 30 ngày

    Tool chỉ đọc dữ liệu.
    """


    today = date.today()

    year = today.year

    month = today.month


    attention_items = []


    # =====================================================
    # A. DEBTS
    # =====================================================

    debt_report = (
        get_debt_report(
            db
        )
    )


    if (
        debt_report[
            "debt_invoice_count"
        ]
        > 0
    ):

        attention_items.append(
            {

                "type":
                    "OUTSTANDING_DEBT",

                "priority":
                    "HIGH",

                "title":
                    "Công nợ chưa thanh toán",

                "count":
                    debt_report[
                        "debt_invoice_count"
                    ],

                "total_amount":
                    debt_report[
                        "total_debt"
                    ],

                "items":
                    [
                        {
                            "invoice_id":
                                item[
                                    "invoice_id"
                                ],

                            "room_code":
                                item[
                                    "room_code"
                                ],

                            "year":
                                item[
                                    "year"
                                ],

                            "month":
                                item[
                                    "month"
                                ],

                            "remaining_amount":
                                item[
                                    "remaining_amount"
                                ],

                            "payment_status":
                                item[
                                    "payment_status"
                                ],
                        }

                        for item
                        in debt_report[
                            "items"
                        ]
                    ],

            }
        )


    # =====================================================
    # B. MONTHLY PROGRESS
    # =====================================================

    progress = (
        get_meter_progress(
            db=db,
            year=year,
            month=month,
        )
    )


    meter_missing_rooms = (
        progress[
            "meter_readings"
        ][
            "missing_rooms"
        ]
    )


    if meter_missing_rooms:

        attention_items.append(
            {

                "type":
                    "MISSING_METER_READING",

                "priority":
                    "HIGH",

                "title":
                    (
                        "Chưa nhập chỉ số điện "
                        "tháng hiện tại"
                    ),

                "count":
                    len(
                        meter_missing_rooms
                    ),

                "year":
                    year,

                "month":
                    month,

                "rooms":
                    meter_missing_rooms,

            }
        )


    invoice_missing_rooms = (
        progress[
            "invoices_created"
        ][
            "missing_rooms"
        ]
    )


    if invoice_missing_rooms:

        attention_items.append(
            {

                "type":
                    "MISSING_INVOICE",

                "priority":
                    "MEDIUM",

                "title":
                    (
                        "Chưa tạo hóa đơn "
                        "tháng hiện tại"
                    ),

                "count":
                    len(
                        invoice_missing_rooms
                    ),

                "year":
                    year,

                "month":
                    month,

                "rooms":
                    invoice_missing_rooms,

            }
        )


    # =====================================================
    # C. DRAFT INVOICES
    # =====================================================

    draft_rows = db.execute(

        select(
            Invoice.id,
            Room.room_code,
        )

        .join(
            Room,
            Room.id
            == Invoice.room_id,
        )

        .where(
            Invoice.year
            == year,

            Invoice.month
            == month,

            Invoice.status
            == "DRAFT",
        )

        .order_by(
            Room.room_code,
            Invoice.id,
        )

    ).all()


    if draft_rows:

        attention_items.append(
            {

                "type":
                    "DRAFT_INVOICE",

                "priority":
                    "MEDIUM",

                "title":
                    (
                        "Hóa đơn đã tạo "
                        "nhưng chưa phát hành"
                    ),

                "count":
                    len(
                        draft_rows
                    ),

                "year":
                    year,

                "month":
                    month,

                "items":
                    [
                        {
                            "invoice_id":
                                row.id,

                            "room_code":
                                row.room_code,
                        }

                        for row
                        in draft_rows
                    ],

            }
        )


    # =====================================================
    # D. OVERDUE ACTIVE CONTRACTS
    # =====================================================

    overdue_contract_rows = db.execute(

        select(
            Contract.id.label(
                "contract_id"
            ),
            Room.room_code,
            Contract.end_date,
        )

        .join(
            Room,
            Room.id
            == Contract.room_id,
        )

        .where(
            Contract.status
            == "ACTIVE",

            Contract.end_date
            .is_not(
                None
            ),

            Contract.end_date
            < today,
        )

        .order_by(
            Contract.end_date,
            Room.room_code,
        )

    ).all()


    if overdue_contract_rows:

        attention_items.append(
            {

                "type":
                    "OVERDUE_CONTRACT",

                "priority":
                    "HIGH",

                "title":
                    (
                        "Hợp đồng ACTIVE "
                        "đã quá ngày kết thúc"
                    ),

                "count":
                    len(
                        overdue_contract_rows
                    ),

                "items":
                    [
                        {
                            "contract_id":
                                row.contract_id,

                            "room_code":
                                row.room_code,

                            "end_date":
                                (
                                    row.end_date.isoformat()
                                    if row.end_date
                                    else None
                                ),

                            "days_overdue":
                                (
                                    (
                                        today
                                        -
                                        row.end_date
                                    ).days
                                    if row.end_date
                                    else None
                                ),
                        }

                        for row
                        in overdue_contract_rows
                    ],

            }
        )


    # =====================================================
    # E. CONTRACTS EXPIRING IN 30 DAYS
    # =====================================================

    expiring_contracts = (
        get_expiring_contracts(
            db=db,
            days=30,
        )
    )


    if (
        expiring_contracts[
            "contract_count"
        ]
        > 0
    ):

        attention_items.append(
            {

                "type":
                    "EXPIRING_CONTRACT",

                "priority":
                    "MEDIUM",

                "title":
                    (
                        "Hợp đồng sắp hết hạn "
                        "trong 30 ngày"
                    ),

                "count":
                    expiring_contracts[
                        "contract_count"
                    ],

                "items":
                    expiring_contracts[
                        "items"
                    ],

            }
        )


    # =====================================================
    # SUMMARY COUNTS
    # =====================================================

    high_priority_count = sum(

        int(
            item.get(
                "count",
                0,
            )
        )

        for item
        in attention_items

        if item.get(
            "priority"
        )
        == "HIGH"

    )


    medium_priority_count = sum(

        int(
            item.get(
                "count",
                0,
            )
        )

        for item
        in attention_items

        if item.get(
            "priority"
        )
        == "MEDIUM"

    )


    total_attention_count = (

        high_priority_count
        +
        medium_priority_count

    )


    return {

        "date":
            today.isoformat(),

        "year":
            year,

        "month":
            month,

        "has_attention_items":
            total_attention_count
            > 0,

        "total_attention_count":
            total_attention_count,

        "high_priority_count":
            high_priority_count,

        "medium_priority_count":
            medium_priority_count,

        "categories":
            attention_items,

    }


# =========================================================
# 8. ROOM DETAIL
# =========================================================

def get_room_detail(
    db: Session,
    room_code: str,
) -> dict:

    """
    Tổng hợp tình trạng vận hành của một phòng.

    Bao gồm:
    - trạng thái phòng
    - tầng
    - hợp đồng ACTIVE
    - tiền thuê
    - tiền cọc
    - chỉ số điện gần nhất
    - tình trạng điện tháng hiện tại
    - hóa đơn gần nhất
    - số tiền đã trả / còn nợ
    - tình trạng hóa đơn tháng hiện tại

    Không trả:
    - tên khách thuê
    - CCCD
    - số điện thoại
    - email
    """


    clean_room_code = (
        room_code
        .strip()
        .upper()
    )


    if not clean_room_code:

        raise ValueError(
            "Mã phòng không được để trống."
        )


    # =====================================================
    # ROOM
    # =====================================================

    room = db.scalar(

        select(
            Room
        )

        .where(
            func.upper(
                Room.room_code
            )
            == clean_room_code
        )

    )


    if room is None:

        return {

            "found":
                False,

            "room_code":
                clean_room_code,

            "message":
                (
                    "Không tìm thấy phòng "
                    f"{clean_room_code}."
                ),

        }


    today = date.today()

    current_year = (
        today.year
    )

    current_month = (
        today.month
    )


    # =====================================================
    # FLOOR
    # =====================================================

    if room.floor is None:

        floor_label = None

    elif room.floor == 0:

        floor_label = (
            "Tầng trệt"
        )

    else:

        floor_label = (
            f"Tầng {room.floor}"
        )


    # =====================================================
    # ACTIVE CONTRACT
    # =====================================================

    active_contract = db.scalar(

        select(
            Contract
        )

        .where(
            Contract.room_id
            == room.id,

            Contract.status
            == "ACTIVE",
        )

        .order_by(
            Contract.start_date.desc(),
            Contract.id.desc(),
        )

    )


    contract_data = None


    if active_contract is not None:

        days_remaining = None

        days_overdue = None


        if (
            active_contract.end_date
            is not None
        ):

            difference = (
                active_contract.end_date
                -
                today
            ).days


            if difference >= 0:

                days_remaining = (
                    difference
                )

            else:

                days_overdue = (
                    abs(
                        difference
                    )
                )


        # =================================================
        # DEPOSIT BALANCE
        # =================================================

        deposit_transactions = list(

            db.scalars(

                select(
                    DepositTransaction
                )

                .where(
                    DepositTransaction.contract_id
                    == active_contract.id
                )

                .order_by(
                    DepositTransaction.id
                )

            ).all()

        )


        deposit_balance = 0


        for transaction in (
            deposit_transactions
        ):

            amount = int(
                transaction.amount
                or 0
            )


            if (
                transaction.transaction_type
                == "COLLECT"
            ):

                deposit_balance += (
                    amount
                )


            elif (
                transaction.transaction_type
                in {
                    "REFUND",
                    "DEDUCTION",
                    "FORFEIT",
                }
            ):

                deposit_balance -= (
                    amount
                )


        contract_data = {

            "contract_id":
                active_contract.id,

            "status":
                active_contract.status,

            "start_date":
                active_contract
                .start_date
                .isoformat(),

            "end_date":
                (
                    active_contract
                    .end_date
                    .isoformat()

                    if active_contract
                    .end_date

                    else None
                ),

            "monthly_rent":
                int(
                    active_contract.monthly_rent
                    or 0
                ),

            "deposit_required":
                int(
                    active_contract.deposit_required
                    or 0
                ),

            "deposit_balance":
                deposit_balance,

            "occupant_count":
                active_contract.occupant_count,

            "days_remaining":
                days_remaining,

            "days_overdue":
                days_overdue,

        }


    # =====================================================
    # LATEST METER READING
    # =====================================================

    latest_meter = db.scalar(

        select(
            MeterReading
        )

        .where(
            MeterReading.room_id
            == room.id
        )

        .order_by(
            MeterReading.year.desc(),
            MeterReading.month.desc(),
            MeterReading.id.desc(),
        )

    )


    latest_meter_data = None


    if latest_meter is not None:

        latest_meter_data = {

            "year":
                latest_meter.year,

            "month":
                latest_meter.month,

            "old_reading":
                latest_meter.old_reading,

            "new_reading":
                latest_meter.new_reading,

            "consumption":
                latest_meter.consumption,

        }


    # =====================================================
    # CURRENT MONTH METER
    # =====================================================

    current_meter = db.scalar(

        select(
            MeterReading
        )

        .where(
            MeterReading.room_id
            == room.id,

            MeterReading.year
            == current_year,

            MeterReading.month
            == current_month,
        )

    )


    current_month_meter = {

        "year":
            current_year,

        "month":
            current_month,

        "entered":
            (
                current_meter
                is not None
            ),

        "consumption":
            (
                current_meter.consumption

                if current_meter
                is not None

                else None
            ),

    }


    # =====================================================
    # LATEST INVOICE
    #
    # CANCELLED không dùng làm hóa đơn hiện hành.
    # Version cao nhất được ưu tiên.
    # =====================================================

    latest_invoice = db.scalar(

        select(
            Invoice
        )

        .where(
            Invoice.room_id
            == room.id,

            Invoice.status
            != "CANCELLED",
        )

        .order_by(
            Invoice.year.desc(),
            Invoice.month.desc(),
            Invoice.version.desc(),
            Invoice.id.desc(),
        )

    )


    latest_invoice_data = None


    if latest_invoice is not None:

        total_paid = int(

            db.scalar(

                select(
                    func.coalesce(
                        func.sum(
                            Payment.amount
                        ),
                        0,
                    )
                )

                .where(
                    Payment.invoice_id
                    == latest_invoice.id
                )

            )

            or 0

        )


        total_amount = int(
            latest_invoice.total_amount
            or 0
        )


        remaining_amount = max(

            0,

            total_amount
            -
            total_paid,

        )


        latest_invoice_data = {

            "invoice_id":
                latest_invoice.id,

            "year":
                latest_invoice.year,

            "month":
                latest_invoice.month,

            "version":
                latest_invoice.version,

            "status":
                latest_invoice.status,

            "payment_status":
                latest_invoice.payment_status,

            "total_amount":
                total_amount,

            "total_paid":
                total_paid,

            "remaining_amount":
                remaining_amount,

        }


    # =====================================================
    # CURRENT MONTH INVOICE
    # =====================================================

    current_invoice = db.scalar(

        select(
            Invoice
        )

        .where(
            Invoice.room_id
            == room.id,

            Invoice.year
            == current_year,

            Invoice.month
            == current_month,

            Invoice.status
            != "CANCELLED",
        )

        .order_by(
            Invoice.version.desc(),
            Invoice.id.desc(),
        )

    )


    current_month_invoice = {

        "year":
            current_year,

        "month":
            current_month,

        "created":
            (
                current_invoice
                is not None
            ),

        "invoice_id":
            (
                current_invoice.id

                if current_invoice
                is not None

                else None
            ),

        "status":
            (
                current_invoice.status

                if current_invoice
                is not None

                else None
            ),

        "payment_status":
            (
                current_invoice.payment_status

                if current_invoice
                is not None

                else None
            ),

    }


    # =====================================================
    # OUTSTANDING DEBT OF ROOM
    # =====================================================

    debt_rows = db.execute(

        select(

            Invoice.id.label(
                "invoice_id"
            ),

            Invoice.year,

            Invoice.month,

            Invoice.total_amount,

            func.coalesce(
                func.sum(
                    Payment.amount
                ),
                0,
            ).label(
                "total_paid"
            ),

        )

        .outerjoin(
            Payment,
            Payment.invoice_id
            == Invoice.id,
        )

        .where(
            Invoice.room_id
            == room.id,

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
            Invoice.id
        )

        .order_by(
            Invoice.year,
            Invoice.month,
        )

    ).all()


    debt_items = []

    total_debt = 0


    for debt_row in debt_rows:

        invoice_total = int(
            debt_row.total_amount
            or 0
        )


        total_paid = int(
            debt_row.total_paid
            or 0
        )


        remaining = max(
            0,
            invoice_total
            -
            total_paid,
        )


        total_debt += (
            remaining
        )


        debt_items.append(
            {

                "invoice_id":
                    debt_row.invoice_id,

                "year":
                    debt_row.year,

                "month":
                    debt_row.month,

                "remaining_amount":
                    remaining,

            }
        )


    # =====================================================
    # RESPONSE
    # =====================================================

    return {

        "found":
            True,

        "room":
            {

                "room_id":
                    room.id,

                "room_code":
                    room.room_code,

                "floor":
                    room.floor,

                "floor_label":
                    floor_label,

                "status":
                    room.status,

                "description":
                    room.description,

            },

        "active_contract":
            contract_data,

        "latest_meter_reading":
            latest_meter_data,

        "current_month_meter":
            current_month_meter,

        "latest_invoice":
            latest_invoice_data,

        "current_month_invoice":
            current_month_invoice,

        "debt":
            {

                "total_debt":
                    total_debt,

                "invoice_count":
                    len(
                        debt_items
                    ),

                "items":
                    debt_items,

            },

    }
# =========================================================
# TOOL REGISTRY
#
# AI chỉ được gọi các function nằm trong registry này.
# Không cho model tự chạy SQL.
# =========================================================

AI_TOOL_FUNCTIONS = {

    "get_property_summary":
        get_property_summary,

    "get_debt_report":
        get_debt_report,

    "get_monthly_revenue":
        get_monthly_revenue,

    "get_expiring_contracts":
        get_expiring_contracts,

    "get_meter_progress":
        get_meter_progress,

    "get_recent_payments":
        get_recent_payments,

    "get_attention_items":
        get_attention_items,

    "get_room_detail":
        get_room_detail,

}