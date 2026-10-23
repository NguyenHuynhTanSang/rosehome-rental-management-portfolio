import re
from backend.app.services.checkout_settlement import PreparedCheckoutConflict, assert_invoice_not_frozen, assert_contract_not_prepared
from calendar import monthrange
from datetime import date, datetime, timezone
from typing import Annotated

from fastapi import (
    APIRouter,
    Body,
    Depends,
    HTTPException,
    Request,
    status,
)

from sqlalchemy import (
    and_,
    or_,
    func,
    select,
)

from sqlalchemy.exc import (
    IntegrityError,
)

from sqlalchemy.orm import Session, selectinload

from backend.app.auth_dependencies import (
    get_current_user,
    require_admin,
)

from backend.app.dependencies import (
    get_db,
)

from backend.app.models.contract import (
    Contract,
)

from backend.app.models.invoice import (
    Invoice,
)

from backend.app.models.invoice_item import (
    InvoiceItem,
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

from backend.app.models.room_fee_setting import (
    RoomFeeSetting,
)

from backend.app.models.user import (
    User,
)

from backend.app.schemas.invoice import (
    InvoiceBulkGenerate,
    InvoiceBulkResult,
    InvoiceCancelRequest,
    InvoiceGenerate,
    InvoiceItemCreate,
    InvoiceItemUpdate,
    InvoiceResponse,
)

from backend.app.services.audit_service import (
    record_audit_log,
)


def build_invoice_transfer_reference(
    invoice: Invoice,
    room: Room,
) -> str:
    """
    Tạo mã RH cố định cho hóa đơn.

    Format:
    RH + YY + MM + ROOM_CODE + I + INVOICE_ID

    Example:
    RH2608P101I25
    """

    room_code = re.sub(
        r"[^A-Z0-9]",
        "",
        room.room_code.upper(),
    )

    if not room_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Room code cannot be used to create transfer reference",
        )

    year_text = (
        f"{invoice.year % 100:02d}"
    )

    month_text = (
        f"{invoice.month:02d}"
    )

    return (
        f"RH{year_text}{month_text}"
        f"{room_code}"
        f"I{invoice.id}"
    )


# =========================================================
# RENT BILLING HELPERS
# =========================================================

def month_serial(
    year: int,
    month: int,
) -> int:
    """
    Chuyển year/month thành một số tháng liên tục
    để tính khoảng cách giữa các kỳ.
    """

    return (
        year * 12
        +
        month
        -
        1
    )


def add_months(
    year: int,
    month: int,
    offset: int,
) -> tuple[int, int]:
    """
    Cộng offset tháng và tự xử lý qua năm mới.
    """

    total = (
        month_serial(
            year,
            month,
        )
        +
        offset
    )

    result_year, zero_based_month = divmod(
        total,
        12,
    )

    return (
        result_year,
        zero_based_month + 1,
    )


def calculate_contract_rent_charge(
    contract: Contract,
    invoice_year: int,
    invoice_month: int,
    monthly_rent: int,
) -> tuple[int, str | None, int]:
    """
    Tính tiền phòng cần đưa vào hóa đơn của tháng hiện tại.

    Ví dụ:
    cycle = 3
    anchor = 08/2026
    monthly_rent = 3.000.000

    08/2026:
        thu 08 + 09 + 10
        => 9.000.000

    09/2026:
        không tạo RENT

    10/2026:
        không tạo RENT

    11/2026:
        thu 11 + 12 + 01
        => 9.000.000

    Nếu hợp đồng kết thúc trước khi đủ chu kỳ,
    chỉ thu các tháng còn nằm trong hợp đồng.
    """

    cycle = (
        contract.rent_billing_cycle_months
    )

    anchor_year = (
        contract.rent_billing_anchor_year
    )

    anchor_month = (
        contract.rent_billing_anchor_month
    )

    current_serial = (
        month_serial(
            invoice_year,
            invoice_month,
        )
    )

    anchor_serial = (
        month_serial(
            anchor_year,
            anchor_month,
        )
    )

    months_from_anchor = (
        current_serial
        -
        anchor_serial
    )

    # Chưa tới tháng bắt đầu chu kỳ.
    if months_from_anchor < 0:
        return (
            0,
            None,
            0,
        )

    # Không phải tháng đến kỳ thu tiền phòng.
    if (
        months_from_anchor
        %
        cycle
        != 0
    ):
        return (
            0,
            None,
            0,
        )

    months_to_charge = (
        cycle
    )

    # Nếu hợp đồng có ngày kết thúc,
    # không thu tiền phòng vượt quá tháng kết thúc hợp đồng.
    if (
        contract.end_date
        is not None
    ):

        end_serial = (
            month_serial(
                contract.end_date.year,
                contract.end_date.month,
            )
        )

        available_months = (
            end_serial
            -
            current_serial
            +
            1
        )

        months_to_charge = min(
            months_to_charge,
            max(
                available_months,
                0,
            ),
        )

    if months_to_charge <= 0:
        return (
            0,
            None,
            0,
        )

    rent_amount = (
        monthly_rent
        *
        months_to_charge
    )

    if (
        months_to_charge == 1
        and
        cycle == 1
    ):

        description = (
            "Tiền phòng"
        )

    else:

        end_year, end_month = (
            add_months(
                invoice_year,
                invoice_month,
                months_to_charge - 1,
            )
        )

        description = (
            f"Tiền phòng "
            f"{invoice_month:02d}/{invoice_year} "
            f"- "
            f"{end_month:02d}/{end_year} "
            f"({months_to_charge} tháng)"
        )

    return (
        rent_amount,
        description,
        months_to_charge,
    )


router = APIRouter(
    prefix="/invoices",
    dependencies=[
        Depends(require_admin),
    ],
)


# =========================================================
# LOAD INVOICE
# =========================================================

def get_invoice_or_404(
    invoice_id: int,
    db: Session,
    *,
    for_update: bool = False,
) -> Invoice:

    statement = (
        select(
            Invoice
        )
        .where(
            Invoice.id
            == invoice_id
        )
    )

    if for_update:

        statement = (
            statement
            .with_for_update()
        )

    invoice = db.scalar(
        statement
    )

    if invoice is None:

        raise HTTPException(
            status_code=
                status.HTTP_404_NOT_FOUND,

            detail=
                "Invoice not found",
        )

    return invoice


def _get_previous_month_period(
    year: int,
    month: int,
) -> tuple[int, int]:

    if month == 1:
        return (
            year - 1,
            12,
        )

    return (
        year,
        month - 1,
    )


def _meter_has_active_invoice(
    db: Session,
    reading_id: int | None,
    room_id: int,
    year: int | None,
    month: int | None,
) -> bool:
    claims = []
    if reading_id is not None:
        claims.append(Invoice.meter_reading_id == reading_id)
    if year is not None and month is not None:
        # Legacy invoices may have no source ID, but still reserve this period.
        claims.append(and_(
            Invoice.room_id == room_id,
            Invoice.electricity_period_year == year,
            Invoice.electricity_period_month == month,
            select(InvoiceItem.id).where(
                InvoiceItem.invoice_id == Invoice.id,
                InvoiceItem.item_type == "ELECTRICITY",
            ).exists(),
        ))
    if not claims:
        return False
    return db.scalar(
        select(Invoice.id)
        .where(Invoice.status != "CANCELLED", or_(*claims))
        .limit(1)
    ) is not None


def _get_invoice_electricity_source(
    db: Session,
    contract: Contract,
    year: int,
    month: int,
) -> tuple[int | None, int | None, MeterReading | None]:
    assert_contract_not_prepared(db, contract.id)
    electricity_year, electricity_month = _get_previous_month_period(year, month)
    period = (electricity_year, electricity_month)
    start_period = (contract.start_date.year, contract.start_date.month)

    if period < start_period:
        return None, None, None
    if period == start_period and contract.move_in_electric_reading is None:
        raise HTTPException(400, (
            f"Thiếu chỉ số điện lúc nhận phòng cho kỳ {electricity_month:02d}/{electricity_year}. "
            "Hãy cập nhật hợp đồng trước khi tạo hóa đơn."
        ))

    # Serialize source claims until commit, including replacement requests.
    reading = db.scalar(
        select(MeterReading)
        .where(
            MeterReading.room_id == contract.room_id,
            MeterReading.year == electricity_year,
            MeterReading.month == electricity_month,
        )
        .with_for_update()
    )
    if reading is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Meter reading for electricity period "
                f"{electricity_month:02d}/{electricity_year} does not exist"
            ),
        )

    if (
        period == start_period
        and contract.move_in_electric_reading is not None
        and reading.old_reading != contract.move_in_electric_reading
    ):
        raise HTTPException(400, (
            f"Chỉ số điện lúc nhận phòng không khớp số cũ của Meter {electricity_month:02d}/{electricity_year}. "
            "Hãy kiểm tra hợp đồng và chỉ số điện trước khi tạo hóa đơn."
        ))

    if _meter_has_active_invoice(
        db, reading.id, reading.room_id, reading.year, reading.month,
    ):
        return None, None, None

    return electricity_year, electricity_month, reading


def _get_transition_source(db: Session, contract: Contract, year: int, month: int, *, lock: bool = True) -> MeterReading | None:
    """Only a safely owned, already billed regular source can seed transition."""
    if lock:
        db.scalar(select(Room).where(Room.id == contract.room_id).with_for_update(key_share=True))
    source_year, source_month = _get_previous_month_period(year, month)
    period = (source_year, source_month)
    start = (contract.start_date.year, contract.start_date.month)
    if period < start or (period == start and contract.move_in_electric_reading is None):
        return None
    statement = select(MeterReading).where(
        MeterReading.room_id == contract.room_id,
        MeterReading.year == source_year, MeterReading.month == source_month,
    )
    reading = db.scalar(statement.with_for_update() if lock else statement)
    if reading is None:
        raise HTTPException(400, "Cannot determine transition source: previous meter reading is missing")
    if period == start and reading.old_reading != contract.move_in_electric_reading:
        return None
    claimed = db.scalar(select(Invoice.id).where(
        Invoice.room_id == contract.room_id, Invoice.status != "CANCELLED",
        or_(Invoice.meter_reading_id == reading.id, and_(
            Invoice.electricity_period_year == source_year,
            Invoice.electricity_period_month == source_month,
        )),
        select(InvoiceItem.id).where(InvoiceItem.invoice_id == Invoice.id,
                                   InvoiceItem.item_type == "ELECTRICITY").exists(),
    ).limit(1))
    if claimed is None:
        return None
    if db.scalar(select(Invoice.id).where(
        Invoice.room_id == contract.room_id, Invoice.status != "CANCELLED",
        Invoice.electricity_transition_new_reading.is_not(None),
    ).limit(1)) is not None:
        raise HTTPException(400, "This room already has an active electricity transition")
    if _has_meter_from_period(db, contract.room_id, year, month):
        raise HTTPException(400, "Cannot apply transition after this or a later meter period has been recorded")
    return reading


def _has_meter_from_period(db: Session, room_id: int, year: int, month: int) -> bool:
    return db.scalar(select(MeterReading.id).where(
        MeterReading.room_id == room_id,
        or_(MeterReading.year > year, and_(MeterReading.year == year, MeterReading.month >= month)),
    ).limit(1)) is not None


def _prepare_transition(db: Session, contract: Contract, year: int, month: int, current: int | None) -> tuple[int | None, int | None]:
    if current is None:
        return None, None
    source = _get_transition_source(db, contract, year, month)
    if source is None:
        raise HTTPException(400, "Room is not eligible for electricity transition; use regular billing")
    if current < source.new_reading:
        raise HTTPException(400, "Transition current reading cannot be less than the already billed reading")
    return source.new_reading, current


def _transition_item(old: int, new: int, rate: int) -> InvoiceItem:
    return InvoiceItem(item_type="ELECTRICITY",
        description=f"Tiền điện chuyển tiếp ({old} → {new})",
        quantity=new-old, unit="kWh", unit_price=rate, amount=(new-old)*rate)


def _transition_meter_without_move_in(db: Session, invoice: Invoice) -> MeterReading | None:
    # Transition is only consulted for this exact month. Later meters use the
    # previous meter chain; they cannot directly depend on this snapshot.
    reading = db.scalar(select(MeterReading).where(
        MeterReading.room_id == invoice.room_id,
        MeterReading.year == invoice.year, MeterReading.month == invoice.month,
    ))
    if reading is None:
        return None
    first = date(invoice.year, invoice.month, 1)
    last = date(invoice.year, invoice.month, monthrange(invoice.year, invoice.month)[1])
    # Match meter creation: latest contract starting in this month with a
    # non-null move-in reading has priority, including coincidental equality.
    move_in = db.scalar(select(Contract.move_in_electric_reading).where(
        Contract.room_id == invoice.room_id,
        Contract.start_date >= first, Contract.start_date <= last,
        Contract.move_in_electric_reading.is_not(None),
    ).order_by(Contract.start_date.desc(), Contract.id.desc()).limit(1))
    if move_in is not None and reading.old_reading == move_in:
        return None
    return reading


def _meter_depends_on_transition(db: Session, invoice: Invoice) -> bool:
    if invoice.status == "CANCELLED" or invoice.electricity_transition_new_reading is None:
        return False
    reading = _transition_meter_without_move_in(db, invoice)
    if reading is None or reading.old_reading != invoice.electricity_transition_new_reading:
        return False
    # Another active version with the same snapshot would retain the baseline.
    if db.scalar(select(Invoice.id).where(
        Invoice.id != invoice.id, Invoice.room_id == invoice.room_id,
        Invoice.year == invoice.year, Invoice.month == invoice.month,
        Invoice.status != "CANCELLED",
        Invoice.electricity_transition_new_reading == reading.old_reading,
    ).limit(1)) is not None:
        return False
    previous = db.scalar(select(MeterReading).where(
        MeterReading.room_id == invoice.room_id,
        or_(MeterReading.year < invoice.year,
            and_(MeterReading.year == invoice.year, MeterReading.month < invoice.month)),
    ).order_by(MeterReading.year.desc(), MeterReading.month.desc()).limit(1))
    # Zero-delta / coincident previous baseline: removal does not change old.
    # Without explicit source history, a matching transition with no proven
    # alternative is conservatively treated as a dependency.
    return previous is None or previous.new_reading != reading.old_reading


def _guard_transition_removal(db: Session, invoice: Invoice) -> None:
    if invoice.electricity_transition_new_reading is None:
        return
    db.scalar(select(Room).where(Room.id == invoice.room_id).with_for_update(key_share=True))
    if _meter_depends_on_transition(db, invoice):
        raise HTTPException(409, "Cannot remove transition used by a recorded meter baseline; review dependent readings first")


@router.get("/transition-preview", tags=["Invoices - Create"])
def preview_transitions(year: int, month: int, db: Annotated[Session, Depends(get_db)]):
    if not 2020 <= year <= 2100 or not 1 <= month <= 12:
        raise HTTPException(400, "Invalid invoice period")
    first = date(year, month, 1)
    last = date(year, month, monthrange(year, month)[1])
    contracts = db.scalars(select(Contract).where(
        Contract.start_date <= last, or_(Contract.end_date.is_(None), Contract.end_date >= first),
    ).order_by(Contract.room_id, Contract.start_date.desc(), Contract.id.desc())).all()
    seen = set()
    candidates, warnings = [], []
    for contract in contracts:
        if contract.room_id in seen:
            continue
        seen.add(contract.room_id)
        room = db.get(Room, contract.room_id)
        if room is None or db.scalar(select(Invoice.id).where(
            Invoice.room_id == room.id, Invoice.year == year, Invoice.month == month,
        ).limit(1)) is not None:
            continue
        try:
            source = _get_transition_source(db, contract, year, month, lock=False)
            if source is None:
                continue
            fees = db.scalar(select(RoomFeeSetting).where(RoomFeeSetting.room_id == room.id))
            if fees is None:
                raise HTTPException(400, "Room fee settings missing")
            candidates.append(dict(room_id=room.id, room_code=room.room_code,
                old_reading=source.new_reading, electricity_rate=fees.electricity_rate))
        except HTTPException as exc:
            warnings.append(f"{room.room_code}: {exc.detail}")
    return dict(candidates=candidates, warnings=warnings)


@router.post(
    "/generate",
    response_model=InvoiceResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Invoices - Create"],
    summary="Create One Invoice",
)
def generate_invoice(
    data: InvoiceGenerate,
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    room = db.scalar(select(Room).where(Room.id == data.room_id).with_for_update(key_share=True))

    if room is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found",
        )

    first_day = date(data.year, data.month, 1)

    last_day = date(
        data.year,
        data.month,
        monthrange(data.year, data.month)[1],
    )

    contract = db.scalar(
        select(Contract)
        .where(
            Contract.room_id == data.room_id,
            Contract.start_date <= last_day,
            (
                Contract.end_date.is_(None)
                |
                (Contract.end_date >= first_day)
            ),
        )
        .order_by(Contract.start_date.desc(), Contract.id.desc())
        .limit(1)
    )

    if contract is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No contract found for this room and month",
        )

    monthly_rent = (
        data.monthly_rent
        if data.monthly_rent is not None
        else contract.monthly_rent
    )

    (
        rent_amount,
        rent_description,
        rent_month_count,
    ) = calculate_contract_rent_charge(
        contract=contract,
        invoice_year=data.year,
        invoice_month=data.month,
        monthly_rent=monthly_rent,
    )

    existing_invoice = db.scalar(
        select(Invoice).where(
            Invoice.room_id == data.room_id,
            Invoice.year == data.year,
            Invoice.month == data.month,
        )
    )

    if existing_invoice:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invoice for this room and month already exists",
        )

    transition_old, transition_new = _prepare_transition(
        db, contract, data.year, data.month, data.electricity_transition_new_reading,
    )

    (
        electricity_period_year,
        electricity_period_month,
        meter_reading,
    ) = _get_invoice_electricity_source(
        db, contract, data.year, data.month,
    )

    fee_setting = db.scalar(
        select(RoomFeeSetting).where(
            RoomFeeSetting.room_id == data.room_id
        )
    )

    if fee_setting is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Room fee settings not found",
        )

    electricity_rate = (
        data.electricity_rate
        if data.electricity_rate is not None
        else fee_setting.electricity_rate
    )

    water_fee = (
        data.water_fee
        if data.water_fee is not None
        else fee_setting.water_fee
    )

    management_fee = (
        data.management_fee
        if data.management_fee is not None
        else fee_setting.management_fee
    )

    electricity_amount = (
        (
            meter_reading.consumption
            *
            electricity_rate
        )
        if meter_reading is not None
        else 0
    )

    invoice = Invoice(
        room_id=data.room_id,

        meter_reading_id=(
            meter_reading.id
            if meter_reading is not None
            else None
        ),

        year=data.year,
        month=data.month,

        electricity_period_year=(
            electricity_period_year
            if meter_reading is not None
            else None
        ),
        electricity_period_month=(
            electricity_period_month
            if meter_reading is not None
            else None
        ),

        electricity_transition_old_reading=transition_old,
        electricity_transition_new_reading=transition_new,
        version=1,
        status="DRAFT",
        total_amount=0,
        note=data.note,
    )

    items = [
        InvoiceItem(
            item_type="WATER",
            description="Tiền nước",
            amount=water_fee,
        ),
        InvoiceItem(
            item_type="MANAGEMENT",
            description="Phí quản lý",
            amount=management_fee,
        ),
    ]

    if transition_new is not None:
        items.insert(0, _transition_item(transition_old, transition_new, electricity_rate))

    if meter_reading is not None:

        items.insert(
            0,
            InvoiceItem(
                item_type="ELECTRICITY",
                description=(
                    "Tiền điện kỳ "
                    f"{electricity_period_month:02d}/"
                    f"{electricity_period_year}"
                ),
                quantity=meter_reading.consumption,
                unit="kWh",
                unit_price=electricity_rate,
                amount=electricity_amount,
            ),
        )

    # Chỉ thêm tiền phòng vào đúng tháng đến kỳ.
    # Ví dụ cycle 3, anchor 08/2026:
    # 08 có RENT 08-10, 09/10 không có RENT, 11 có RENT 11-01.
    if (
        rent_month_count > 0
        and
        rent_description is not None
    ):

        items.insert(
            0,
            InvoiceItem(
                item_type="RENT",
                description=rent_description,
                quantity=rent_month_count,
                unit="tháng",
                unit_price=monthly_rent,
                amount=rent_amount,
            ),
        )

    if data.deposit_amount > 0:
        items.append(
            InvoiceItem(
                item_type="DEPOSIT",
                description="Tiền cọc",
                amount=data.deposit_amount,
            )
        )

    for extra in data.extra_items:
        items.append(
            InvoiceItem(
                item_type="OTHER",
                description=extra.description,
                amount=extra.amount,
            )
        )

    if data.discount_amount > 0:
        items.append(
            InvoiceItem(
                item_type="DISCOUNT",
                description="Giảm trừ",
                amount=-data.discount_amount,
            )
        )

    invoice.items = items
    invoice.total_amount = sum(
        item.amount
        for item in items
    )

    if invoice.total_amount < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invoice total cannot be negative",
        )

    try:
        db.add(invoice)
        db.flush()

        record_audit_log(
            db=db,
            user=current_user,
            action="CREATE_INVOICE",
            entity_type="INVOICE",
            entity_id=invoice.id,
            description=(
                f"Tạo hóa đơn #{invoice.id} "
                f"tháng {invoice.month}/{invoice.year} "
                f"cho phòng {room.room_code}"
            ),
            details={
                "invoice_id": invoice.id,
                "room_id": room.id,
                "room_code": room.room_code,
                "year": invoice.year,
                "month": invoice.month,
                "version": invoice.version,
                "total_amount": invoice.total_amount,
                "status": invoice.status,
                "item_count": len(items),
                "electricity_transition_old_reading": transition_old,
                "electricity_transition_new_reading": transition_new,
                "rent_billing_cycle_months": (
                    contract.rent_billing_cycle_months
                ),
                "rent_billing_anchor_year": (
                    contract.rent_billing_anchor_year
                ),
                "rent_billing_anchor_month": (
                    contract.rent_billing_anchor_month
                ),
                "rent_included": (
                    rent_month_count > 0
                ),
                "rent_month_count": rent_month_count,
                "rent_amount": rent_amount,
            },
            request=request,
        )

        db.commit()
        db.refresh(invoice)

    except IntegrityError as exc:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Invoice for this room and month "
                "already exists or invoice data conflicts."
            ),
        ) from exc

    except Exception:
        db.rollback()
        raise

    return invoice


@router.post(
    "/generate-bulk",
    response_model=InvoiceBulkResult,
    status_code=status.HTTP_201_CREATED,
    tags=["Invoices - Create"],
    summary="Create Monthly Invoices in Bulk",
)
def generate_bulk_invoices(
    data: InvoiceBulkGenerate,
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    transitions = {item.room_id: item.current_reading for item in data.transition_readings}
    if len(transitions) != len(data.transition_readings):
        raise HTTPException(400, "Duplicate transition room_id")
    first_day = date(
        data.year,
        data.month,
        1,
    )

    last_day = date(
        data.year,
        data.month,
        monthrange(data.year, data.month)[1],
    )

    contracts = db.scalars(
        select(Contract)
        .where(
            Contract.start_date <= last_day,
            (
                Contract.end_date.is_(None)
                |
                (Contract.end_date >= first_day)
            ),
        )
        .order_by(Contract.room_id, Contract.start_date.desc(), Contract.id.desc())
    ).all()

    eligible_ids = {contract.room_id for contract in contracts}
    if set(transitions) - eligible_ids:
        raise HTTPException(400, "Transition room has no eligible contract in this period")
    created_invoices = []
    skipped_rooms = []
    seen_room_ids = set()

    try:
        for contract in contracts:
            # Match single generation: use the latest contract in this month.
            if contract.room_id in seen_room_ids:
                continue
            seen_room_ids.add(contract.room_id)

            room = db.scalar(select(Room).where(Room.id == contract.room_id).with_for_update(key_share=True))

            if room is None:
                continue

            existing_invoice = db.scalar(
                select(Invoice).where(
                    Invoice.room_id == room.id,
                    Invoice.year == data.year,
                    Invoice.month == data.month,
                )
            )

            if existing_invoice:
                skipped_rooms.append(
                    (
                        f"{room.room_code}: invoice history already exists; "
                        "use replacement flow if the previous invoice was cancelled"
                    )
                )
                continue

            try:
                transition_old, transition_new = _prepare_transition(
                    db, contract, data.year, data.month, transitions.get(room.id),
                )
                (
                    electricity_period_year,
                    electricity_period_month,
                    meter_reading,
                ) = _get_invoice_electricity_source(
                    db, contract, data.year, data.month,
                )
            except PreparedCheckoutConflict as exc:
                skipped_rooms.append(f"{room.room_code}: {exc.detail}")
                continue
            except HTTPException as exc:
                if exc.status_code != status.HTTP_400_BAD_REQUEST:
                    raise
                skipped_rooms.append(f"{room.room_code}: {exc.detail}")
                continue

            fee_setting = db.scalar(
                select(RoomFeeSetting).where(
                    RoomFeeSetting.room_id == room.id
                )
            )

            if fee_setting is None:
                skipped_rooms.append(
                    f"{room.room_code}: fee settings missing"
                )
                continue

            electricity_amount = (
                (
                    meter_reading.consumption
                    *
                    fee_setting.electricity_rate
                )
                if meter_reading is not None
                else 0
            )

            (
                rent_amount,
                rent_description,
                rent_month_count,
            ) = calculate_contract_rent_charge(
                contract=contract,
                invoice_year=data.year,
                invoice_month=data.month,
                monthly_rent=contract.monthly_rent,
            )

            invoice = Invoice(
                room_id=room.id,

                meter_reading_id=(
                    meter_reading.id
                    if meter_reading is not None
                    else None
                ),

                year=data.year,
                month=data.month,

                electricity_period_year=(
                    electricity_period_year
                    if meter_reading is not None
                    else None
                ),
                electricity_period_month=(
                    electricity_period_month
                    if meter_reading is not None
                    else None
                ),

                electricity_transition_old_reading=transition_old,
                electricity_transition_new_reading=transition_new,
                version=1,
                status="DRAFT",
                payment_status="UNPAID",
                total_amount=0,
                note=f"Hóa đơn tháng {data.month}/{data.year}",
            )

            invoice.items = [
                InvoiceItem(
                    item_type="WATER",
                    description="Tiền nước",
                    amount=fee_setting.water_fee,
                ),
                InvoiceItem(
                    item_type="MANAGEMENT",
                    description="Phí quản lý",
                    amount=fee_setting.management_fee,
                ),
            ]

            if transition_new is not None:
                invoice.items.insert(0, _transition_item(transition_old, transition_new, fee_setting.electricity_rate))

            if meter_reading is not None:

                invoice.items.insert(
                    0,
                    InvoiceItem(
                        item_type="ELECTRICITY",
                        description=(
                            "Tiền điện kỳ "
                            f"{electricity_period_month:02d}/"
                            f"{electricity_period_year}"
                        ),
                        quantity=meter_reading.consumption,
                        unit="kWh",
                        unit_price=fee_setting.electricity_rate,
                        amount=electricity_amount,
                    ),
                )

            if (
                rent_month_count > 0
                and
                rent_description is not None
            ):

                invoice.items.insert(
                    0,
                    InvoiceItem(
                        item_type="RENT",
                        description=rent_description,
                        quantity=rent_month_count,
                        unit="tháng",
                        unit_price=contract.monthly_rent,
                        amount=rent_amount,
                    ),
                )

            invoice.total_amount = sum(
                item.amount
                for item in invoice.items
            )

            db.add(invoice)
            db.flush()

            created_invoices.append(invoice)

        invoice_ids = [
            invoice.id
            for invoice in created_invoices
        ]

        record_audit_log(
            db=db,
            user=current_user,
            action="CREATE_INVOICES_BULK",
            entity_type="INVOICE_BATCH",
            entity_id=None,
            description=(
                f"Tạo {len(created_invoices)} "
                f"hóa đơn tháng "
                f"{data.month}/{data.year}"
            ),
            details={
                "year": data.year,
                "month": data.month,
                "created_count": len(created_invoices),
                "skipped_count": len(skipped_rooms),
                "created_invoice_ids": invoice_ids,
            },
            request=request,
        )

        db.commit()

        return InvoiceBulkResult(
            created_count=len(created_invoices),
            skipped_count=len(skipped_rooms),
            created_invoice_ids=invoice_ids,
            skipped_rooms=skipped_rooms,
        )

    except IntegrityError as exc:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Bulk invoice generation conflicted with "
                "existing invoice data. Please reload and try again."
            ),
        ) from exc

    except Exception:
        db.rollback()
        raise


@router.post(
    "/{invoice_id}/items",
    response_model=InvoiceResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Invoices - Edit"],
    summary="Add Invoice Item",
)
def add_invoice_item(
    invoice_id: int,
    data: InvoiceItemCreate,
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    invoice = get_invoice_or_404(
        invoice_id,
        db,
        for_update=True,
    )
    assert_invoice_not_frozen(db, invoice_id)

    if invoice.status != "DRAFT":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only DRAFT invoices can be edited",
        )

    previous_total = invoice.total_amount

    amount = data.amount

    if data.item_type == "DISCOUNT":
        amount = -amount

    item = InvoiceItem(
        invoice_id=invoice.id,
        item_type=data.item_type,
        description=data.description,
        amount=amount,
    )

    db.add(item)
    invoice.total_amount += amount

    if invoice.total_amount < 0:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invoice total cannot be negative",
        )

    try:
        db.flush()

        record_audit_log(
            db=db,
            user=current_user,
            action="ADD_INVOICE_ITEM",
            entity_type="INVOICE_ITEM",
            entity_id=item.id,
            description=(
                f"Thêm khoản phí vào hóa đơn #{invoice.id}"
            ),
            details={
                "invoice_id": invoice.id,
                "item_id": item.id,
                "item_type": item.item_type,
                "amount": item.amount,
                "previous_invoice_total": previous_total,
                "new_invoice_total": invoice.total_amount,
            },
            request=request,
        )

        db.commit()
        db.refresh(invoice)

    except IntegrityError as exc:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail='Invoice item could not be added because the data conflicts.',
        ) from exc

    except Exception:
        db.rollback()
        raise

    return invoice


@router.patch(
    "/{invoice_id}/items/{item_id}",
    response_model=InvoiceResponse,
    tags=["Invoices - Edit"],
    summary="Edit Invoice Item",
)
def update_invoice_item(
    invoice_id: int,
    item_id: int,
    data: InvoiceItemUpdate,
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    invoice = get_invoice_or_404(
        invoice_id,
        db,
        for_update=True,
    )
    assert_invoice_not_frozen(db, invoice_id)

    if invoice.status != "DRAFT":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only DRAFT invoices can be edited",
        )

    item = db.scalar(
        select(
            InvoiceItem
        )
        .where(
            InvoiceItem.id
            == item_id,

            InvoiceItem.invoice_id
            == invoice_id,
        )
    )

    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice item not found",
        )

    if item.item_type == "ELECTRICITY" and invoice.electricity_transition_new_reading is not None:
        raise HTTPException(400, "Transition electricity is an immutable snapshot; cancel/delete and recreate before recording the next meter")

    previous_total = invoice.total_amount

    previous_item = {
        "item_type": item.item_type,
        "quantity": item.quantity,
        "unit": item.unit,
        "unit_price": item.unit_price,
        "amount": item.amount,
    }

    update_data = data.model_dump(
        exclude_unset=True
    )

    for field, value in update_data.items():
        setattr(item, field, value)

    if (
        item.item_type == "ELECTRICITY"
        and "amount" not in update_data
        and item.quantity is not None
        and item.unit_price is not None
    ):
        item.amount = (
            item.quantity
            *
            item.unit_price
        )

    if (
        item.item_type != "DISCOUNT"
        and item.amount < 0
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Amount cannot be negative",
        )

    invoice.total_amount = sum(
        invoice_item.amount
        for invoice_item in invoice.items
    )

    if invoice.total_amount < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invoice total cannot be negative",
        )

    current_item = {
        "item_type": item.item_type,
        "quantity": item.quantity,
        "unit": item.unit,
        "unit_price": item.unit_price,
        "amount": item.amount,
    }

    try:
        record_audit_log(
            db=db,
            user=current_user,
            action="UPDATE_INVOICE_ITEM",
            entity_type="INVOICE_ITEM",
            entity_id=item.id,
            description=(
                f"Cập nhật khoản phí của hóa đơn #{invoice.id}"
            ),
            details={
                "invoice_id": invoice.id,
                "item_id": item.id,
                "before": previous_item,
                "after": current_item,
                "previous_invoice_total": previous_total,
                "new_invoice_total": invoice.total_amount,
            },
            request=request,
        )

        db.commit()
        db.refresh(invoice)

    except IntegrityError as exc:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail='Invoice item could not be updated because the data conflicts.',
        ) from exc

    except Exception:
        db.rollback()
        raise

    return invoice


@router.delete(
    "/{invoice_id}/items/{item_id}",
    response_model=InvoiceResponse,
    tags=["Invoices - Edit"],
    summary="Delete Invoice Item",
)
def delete_invoice_item(
    invoice_id: int,
    item_id: int,
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    invoice = get_invoice_or_404(
        invoice_id,
        db,
        for_update=True,
    )
    assert_invoice_not_frozen(db, invoice_id)

    if invoice.status != "DRAFT":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only DRAFT invoices can be edited",
        )

    item = db.scalar(
        select(
            InvoiceItem
        )
        .where(
            InvoiceItem.id
            == item_id,

            InvoiceItem.invoice_id
            == invoice_id,
        )
    )

    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice item not found",
        )

    if item.item_type == "ELECTRICITY" and invoice.electricity_transition_new_reading is not None:
        raise HTTPException(400, "Transition electricity is an immutable snapshot; cancel/delete and recreate before recording the next meter")

    previous_total = invoice.total_amount
    deleted_item_type = item.item_type
    deleted_item_amount = item.amount

    invoice.total_amount -= item.amount

    if invoice.total_amount < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invoice total cannot be negative",
        )

    try:
        record_audit_log(
            db=db,
            user=current_user,
            action="DELETE_INVOICE_ITEM",
            entity_type="INVOICE_ITEM",
            entity_id=item.id,
            description=(
                f"Xóa khoản phí khỏi hóa đơn #{invoice.id}"
            ),
            details={
                "invoice_id": invoice.id,
                "item_id": item.id,
                "item_type": deleted_item_type,
                "amount": deleted_item_amount,
                "previous_invoice_total": previous_total,
                "new_invoice_total": invoice.total_amount,
            },
            request=request,
        )

        db.delete(item)
        db.commit()
        db.expire(invoice)

    except IntegrityError as exc:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail='Invoice item could not be deleted because the data conflicts.',
        ) from exc

    except Exception:
        db.rollback()
        raise

    return invoice


# =========================================================
# BULK ISSUE INVOICES
# =========================================================

@router.post(
    "/issue-bulk",
    tags=["Invoices - Lifecycle"],
    summary="Issue Selected Draft Invoices in Bulk",
)
def issue_invoices_bulk(
    invoice_ids: Annotated[
        list[int],
        Body(embed=True),
    ],
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """
    Phát hành nhiều hóa đơn nháp đã được admin chọn.

    - Chỉ hóa đơn DRAFT hợp lệ mới được phát hành.
    - Hóa đơn không tồn tại / không còn DRAFT / dữ liệu không hợp lệ
      sẽ được bỏ qua và trả lý do về frontend.
    - Toàn bộ thay đổi hợp lệ được commit cùng một transaction.
    """

    unique_invoice_ids = list(
        dict.fromkeys(
            invoice_ids
        )
    )

    if not unique_invoice_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please select at least one invoice to issue",
        )

    if len(unique_invoice_ids) > 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A maximum of 100 invoices can be issued at once",
        )

    invoices = db.scalars(
        select(Invoice)
        .where(
            Invoice.id.in_(
                unique_invoice_ids
            )
        )
        .with_for_update()
    ).all()

    invoice_map = {
        invoice.id: invoice
        for invoice in invoices
    }

    issued_invoice_ids: list[int] = []
    skipped_invoices: list[dict[str, object]] = []

    try:
        for invoice_id in unique_invoice_ids:

            invoice = invoice_map.get(
                invoice_id
            )

            if invoice is None:
                skipped_invoices.append(
                    {
                        "invoice_id": invoice_id,
                        "reason": "Không tìm thấy hóa đơn.",
                    }
                )
                continue

            if invoice.status != "DRAFT":
                skipped_invoices.append(
                    {
                        "invoice_id": invoice.id,
                        "reason": (
                            "Hóa đơn không còn ở trạng thái Nháp."
                        ),
                    }
                )
                continue

            if invoice.total_amount < 0:
                skipped_invoices.append(
                    {
                        "invoice_id": invoice.id,
                        "reason": "Tổng tiền hóa đơn không hợp lệ.",
                    }
                )
                continue

            room = db.get(
                Room,
                invoice.room_id,
            )

            if room is None:
                skipped_invoices.append(
                    {
                        "invoice_id": invoice.id,
                        "reason": "Không tìm thấy phòng của hóa đơn.",
                    }
                )
                continue

            # Giữ đúng rule của route phát hành đơn:
            # mã RH chỉ được tạo một lần khi hóa đơn được phát hành.
            if not invoice.transfer_reference:
                invoice.transfer_reference = (
                    build_invoice_transfer_reference(
                        invoice,
                        room,
                    )
                )

            invoice.status = "ISSUED"

            record_audit_log(
                db=db,
                user=current_user,
                action="ISSUE_INVOICE",
                entity_type="INVOICE",
                entity_id=invoice.id,
                description=(
                    f"Phát hành hóa đơn #{invoice.id} "
                    f"qua thao tác hàng loạt"
                ),
                details={
                    "invoice_id": invoice.id,
                    "room_id": invoice.room_id,
                    "room_code": room.room_code,
                    "year": invoice.year,
                    "month": invoice.month,
                    "version": invoice.version,
                    "total_amount": invoice.total_amount,
                    "transfer_reference": (
                        invoice.transfer_reference
                    ),
                    "previous_status": "DRAFT",
                    "new_status": "ISSUED",
                    "bulk_issue": True,
                },
                request=request,
            )

            issued_invoice_ids.append(
                invoice.id
            )

        db.commit()

    except IntegrityError as exc:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Bulk invoice issuing conflicted with existing data. "
                "No selected invoice was issued."
            ),
        ) from exc

    except Exception:
        db.rollback()
        raise

    return {
        "issued_count": len(
            issued_invoice_ids
        ),
        "skipped_count": len(
            skipped_invoices
        ),
        "issued_invoice_ids": issued_invoice_ids,
        "skipped_invoices": skipped_invoices,
    }



# =========================================================
# DELETE DRAFT INVOICE
# =========================================================

@router.delete(
    "/{invoice_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["Invoices - Edit"],
    summary="Delete Draft Invoice",
)
def delete_draft_invoice(
    invoice_id: int,
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    """
    Xóa hẳn một hóa đơn NHÁP bị tạo sai.

    Chỉ cho phép khi:
    - status == DRAFT
    - chưa có bất kỳ payment nào

    Hóa đơn đã ISSUED/CANCELLED phải dùng lifecycle hiện có
    (cancel/replacement), không được hard-delete để giữ lịch sử.
    """

    invoice = get_invoice_or_404(
        invoice_id,
        db,
        for_update=True,
    )
    assert_invoice_not_frozen(db, invoice_id)

    _guard_transition_removal(db, invoice)

    if invoice.status != "DRAFT":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only DRAFT invoices can be deleted",
        )

    payment_count = int(
        db.scalar(
            select(
                func.count(Payment.id)
            ).where(
                Payment.invoice_id == invoice.id
            )
        )
        or 0
    )

    if payment_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Invoice with payment history cannot be deleted. "
                "Please resolve the payment first."
            ),
        )

    # DRAFT bình thường chưa bao giờ có mã RH.
    # Chặn thêm để tránh hard-delete dữ liệu bất thường
    # đã từng đi qua bước phát hành.
    if invoice.transfer_reference:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Invoice already has a transfer reference and "
                "cannot be hard-deleted."
            ),
        )

    room = db.get(
        Room,
        invoice.room_id,
    )

    room_code = (
        room.room_code
        if room is not None
        else None
    )

    deleted_item_count = len(
        invoice.items
    )

    deleted_invoice_snapshot = {
        "invoice_id": invoice.id,
        "room_id": invoice.room_id,
        "room_code": room_code,
        "year": invoice.year,
        "month": invoice.month,
        "version": invoice.version,
        "status": invoice.status,
        "payment_status": invoice.payment_status,
        "total_amount": invoice.total_amount,
        "item_count": deleted_item_count,
        "replaces_invoice_id": invoice.replaces_invoice_id,
    }

    try:
        # Audit log được ghi trước khi xóa để vẫn giữ lịch sử
        # thao tác quản trị sau khi invoice không còn trong DB.
        record_audit_log(
            db=db,
            user=current_user,
            action="DELETE_DRAFT_INVOICE",
            entity_type="INVOICE",
            entity_id=invoice.id,
            description=(
                f"Xóa hóa đơn nháp #{invoice.id} "
                f"tháng {invoice.month}/{invoice.year}"
                + (
                    f" của phòng {room_code}"
                    if room_code
                    else ""
                )
            ),
            details=deleted_invoice_snapshot,
            request=request,
        )

        # Invoice.items đang dùng cascade="all, delete-orphan",
        # nên các invoice items của DRAFT sẽ được xóa cùng invoice.
        db.delete(invoice)
        db.commit()

    except IntegrityError as exc:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Draft invoice could not be deleted because "
                "related data still depends on it."
            ),
        ) from exc

    except Exception:
        db.rollback()
        raise

    return None



@router.post(
    "/{invoice_id}/issue",
    response_model=InvoiceResponse,
    tags=["Invoices - Lifecycle"],
    summary="Issue / Finalize Invoice",
)
def issue_invoice(
    invoice_id: int,
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    invoice = get_invoice_or_404(
        invoice_id,
        db,
        for_update=True,
    )

    if invoice.status != "DRAFT":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only DRAFT invoices can be issued",
        )

    if invoice.total_amount < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invoice total is invalid",
        )

    room = db.get(
        Room,
        invoice.room_id,
    )

    if room is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found",
        )

    # Tạo mã RH đúng một lần khi phát hành.
    # Sau khi đã lưu, mã này không được sinh lại từ room_code.
    if not invoice.transfer_reference:
        invoice.transfer_reference = (
            build_invoice_transfer_reference(
                invoice,
                room,
            )
        )

    invoice.status = "ISSUED"

    try:
        record_audit_log(
            db=db,
            user=current_user,
            action="ISSUE_INVOICE",
            entity_type="INVOICE",
            entity_id=invoice.id,
            description=f"Phát hành hóa đơn #{invoice.id}",
            details={
                "invoice_id": invoice.id,
                "room_id": invoice.room_id,
                "room_code": room.room_code,
                "year": invoice.year,
                "month": invoice.month,
                "version": invoice.version,
                "total_amount": invoice.total_amount,
                "transfer_reference": invoice.transfer_reference,
                "previous_status": "DRAFT",
                "new_status": "ISSUED",
            },
            request=request,
        )

        db.commit()
        db.refresh(invoice)

    except IntegrityError as exc:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail='Invoice could not be issued because the data conflicts.',
        ) from exc

    except Exception:
        db.rollback()
        raise

    return invoice


@router.post(
    "/{invoice_id}/cancel",
    response_model=InvoiceResponse,
    tags=["Invoices - Lifecycle"],
    summary="Cancel Invoice",
)
def cancel_invoice(
    invoice_id: int,
    data: InvoiceCancelRequest,
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    return cancel_invoice_in_transaction(invoice_id, data, request, db, current_user)


def cancel_invoice_in_transaction(
    invoice_id: int,
    data: InvoiceCancelRequest,
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    *,
    commit: bool = True,
):
    invoice = get_invoice_or_404(
        invoice_id,
        db,
        for_update=True,
    )
    assert_invoice_not_frozen(db, invoice_id)

    _guard_transition_removal(db, invoice)

    if invoice.status != "ISSUED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only ISSUED invoices can be cancelled",
        )

    total_paid = int(
        db.scalar(
            select(
                func.coalesce(
                    func.sum(Payment.amount),
                    0,
                )
            ).where(
                Payment.invoice_id == invoice.id
            )
        )
        or 0
    )

    if total_paid > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Paid invoices cannot be cancelled directly. "
                "A refund or adjustment is required."
            ),
        )

    invoice.status = "CANCELLED"
    invoice.cancelled_reason = data.reason
    invoice.cancelled_at = datetime.now(timezone.utc)

    try:
        record_audit_log(
            db=db,
            user=current_user,
            action="CANCEL_INVOICE",
            entity_type="INVOICE",
            entity_id=invoice.id,
            description=f"Hủy hóa đơn #{invoice.id}",
            details={
                "invoice_id": invoice.id,
                "room_id": invoice.room_id,
                "year": invoice.year,
                "month": invoice.month,
                "version": invoice.version,
                "total_amount": invoice.total_amount,
                "total_paid": total_paid,
                "previous_status": "ISSUED",
                "new_status": "CANCELLED",
            },
            request=request,
        )

        if commit:
            db.commit()
            db.refresh(invoice)

    except IntegrityError as exc:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail='Invoice could not be cancelled because the data conflicts.',
        ) from exc

    except Exception:
        db.rollback()
        raise

    return invoice


@router.post(
    "/{invoice_id}/replacement",
    response_model=InvoiceResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Invoices - Lifecycle"],
    summary="Create Replacement Invoice",
)
def create_replacement_invoice(
    invoice_id: int,
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
):
    return create_replacement_invoice_in_transaction(invoice_id, request, db, current_user)


def create_replacement_invoice_in_transaction(
    invoice_id: int,
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    *,
    commit: bool = True,
):
    original = get_invoice_or_404(
        invoice_id,
        db,
        for_update=True,
    )
    assert_invoice_not_frozen(db, invoice_id)

    if original.status != "CANCELLED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only CANCELLED invoices can be replaced",
        )

    existing_replacement = db.scalar(
        select(Invoice).where(
            Invoice.replaces_invoice_id == original.id
        )
    )

    if existing_replacement:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Replacement invoice already exists",
        )

    is_transition = original.electricity_transition_new_reading is not None
    if is_transition:
        db.scalar(select(Room).where(Room.id == original.room_id).with_for_update(key_share=True))
        if db.scalar(select(Invoice.id).where(
            Invoice.room_id == original.room_id, Invoice.status != "CANCELLED",
            Invoice.electricity_transition_new_reading.is_not(None),
        ).limit(1)) is not None:
            raise HTTPException(409, "Transition replacement conflicts with an active transition")
        reading = _transition_meter_without_move_in(db, original)
        # Restoring a snapshot is safe when the existing meter already matches
        # it (or uses move-in). Reject only a change to an established baseline.
        if reading is not None and reading.old_reading != original.electricity_transition_new_reading:
            raise HTTPException(409, "Transition replacement would change a recorded meter baseline")

    reading = None
    has_electricity = any(
        item.item_type == "ELECTRICITY" for item in original.items
    )
    if original.meter_reading_id is not None:
        reading = db.scalar(
            select(MeterReading)
            .where(MeterReading.id == original.meter_reading_id)
            .with_for_update()
        )
        if reading is None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Replacement electricity source is missing",
            )
    elif has_electricity and not is_transition:
        # A legacy source may be absent. Serialize replacements and meter
        # creation on the room without blocking invoice FK key-share locks.
        db.scalar(
            select(Room).where(Room.id == original.room_id)
            .with_for_update(key_share=True)
        )
        reading = db.scalar(
            select(MeterReading).where(
                MeterReading.room_id == original.room_id,
                MeterReading.year == original.electricity_period_year,
                MeterReading.month == original.electricity_period_month,
            ).with_for_update()
        )

    if not is_transition and (original.meter_reading_id is not None or has_electricity) and (
        _meter_has_active_invoice(
            db,
            reading.id if reading is not None else None,
            original.room_id,
            original.electricity_period_year,
            original.electricity_period_month,
        )
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Replacement electricity source is already billed",
        )

    replacement = Invoice(
        room_id=original.room_id,

        meter_reading_id=(
            original.meter_reading_id
        ),

        year=original.year,
        month=original.month,

        electricity_period_year=(
            original.electricity_period_year
        ),
        electricity_period_month=(
            original.electricity_period_month
        ),

        electricity_transition_old_reading=original.electricity_transition_old_reading,
        electricity_transition_new_reading=original.electricity_transition_new_reading,
        version=original.version + 1,
        replaces_invoice_id=original.id,
        status="DRAFT",
        total_amount=original.total_amount,
        note=f"Replacement for invoice #{original.id}",
    )

    replacement.items = [
        InvoiceItem(
            item_type=item.item_type,
            description=item.description,
            quantity=item.quantity,
            unit=item.unit,
            unit_price=item.unit_price,
            amount=item.amount,
        )
        for item in original.items
    ]

    try:
        db.add(replacement)
        db.flush()

        record_audit_log(
            db=db,
            user=current_user,
            action="CREATE_REPLACEMENT_INVOICE",
            entity_type="INVOICE",
            entity_id=replacement.id,
            description=(
                f"Tạo hóa đơn thay thế #{replacement.id} "
                f"cho hóa đơn #{original.id}"
            ),
            details={
                "original_invoice_id": original.id,
                "replacement_invoice_id": replacement.id,
                "room_id": replacement.room_id,
                "year": replacement.year,
                "month": replacement.month,
                "old_version": original.version,
                "new_version": replacement.version,
                "total_amount": replacement.total_amount,
                "status": replacement.status,
            },
            request=request,
        )

        if commit:
            db.commit()
            db.refresh(replacement)

    except IntegrityError as exc:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail='Replacement invoice already exists or the data conflicts.',
        ) from exc

    except Exception:
        db.rollback()
        raise

    return replacement


@router.get(
    "/checkout-history",
    response_model=list[InvoiceResponse],
    tags=["Invoices - View"],
    summary="View Checkout Invoices Across All Periods",
)
def get_checkout_invoice_history(
    db: Annotated[Session, Depends(get_db)],
):
    # Read-only history. Only actual checkout documents are included;
    # normal monthly invoices (even cancelled ones) are never reclassified.
    # The router already requires admin authentication.
    return db.scalars(
        select(Invoice)
        .where(Invoice.checkout_settlement.has())
        .options(selectinload(Invoice.checkout_settlement))
        .order_by(Invoice.year.desc(), Invoice.month.desc(), Invoice.id.desc())
    ).all()


@router.get(
    "/{invoice_id}",
    response_model=InvoiceResponse,
    tags=["Invoices - View"],
    summary="View Invoice Details",
)
def get_invoice(
    invoice_id: int,
    db: Annotated[Session, Depends(get_db)],
):
    invoice = get_invoice_or_404(
        invoice_id,
        db,
    )

    return invoice


@router.get(
    "/history/{room_id}/{year}/{month}",
    response_model=list[InvoiceResponse],
    tags=["Invoices - View"],
    summary="View Invoice Version History",
)
def get_invoice_history(
    room_id: int,
    year: int,
    month: int,
    db: Annotated[Session, Depends(get_db)],
):
    if (
        month < 1
        or month > 12
        or year < 2020
        or year > 2100
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid invoice period",
        )

    invoices = db.scalars(
        select(Invoice)
        .where(
            Invoice.room_id == room_id,
            Invoice.year == year,
            Invoice.month == month,
        )
        .order_by(Invoice.version)
    ).all()

    return invoices
