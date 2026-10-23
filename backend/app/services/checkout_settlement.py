"""Phase A preparation: read-only preview, followed by one atomic financial transaction."""
import hashlib
import json
from calendar import monthrange
from datetime import date, datetime, timezone

from fastapi import HTTPException
from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError

from backend.app.models.checkout_settlement import CheckoutSettlement
from backend.app.models.contract import Contract
from backend.app.models.deposit_transaction import DepositTransaction
from backend.app.models.invoice import Invoice
from backend.app.models.payment import Payment
from backend.app.models.invoice_item import InvoiceItem
from backend.app.models.meter_reading import MeterReading
from backend.app.models.room import Room
from backend.app.models.room_fee_setting import RoomFeeSetting
from backend.app.schemas.checkout_settlement import CheckoutRequest, CheckoutSnapshot
from backend.app.schemas.invoice import InvoiceCancelRequest
from backend.app.services.audit_service import record_audit_log
from backend.app.services.checkout_rent import prorated_rent

BASELINE_ERROR = "Không xác định được mốc điện cuối đã được đưa vào hóa đơn. Vui lòng kiểm tra lịch sử hóa đơn trước khi quyết toán."


class PreparedCheckoutConflict(HTTPException):
    """Expected per-room business conflict; single generation still returns HTTP 409."""
    def __init__(self):
        super().__init__(409, "Phòng đang có quyết toán trả phòng đã chuẩn bị; bỏ qua tạo hóa đơn kỳ mới.")


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, default=str, ensure_ascii=True).encode()).hexdigest()


def request_values(data):
    return data.model_dump(exclude={"preview_token", "confirmed"}, mode="json")


def snapshot_values(snapshot):
    return CheckoutSnapshot.model_validate(snapshot).model_dump(mode="json")


def get_existing(db, contract_id):
    return db.scalar(select(CheckoutSettlement).where(CheckoutSettlement.contract_id == contract_id))


def current_deposit_balance(db, contract_id):
    transactions = db.scalars(
        select(DepositTransaction)
        .where(DepositTransaction.contract_id == contract_id)
        .order_by(
            DepositTransaction.created_at,
            DepositTransaction.id,
        )
    ).all()

    balance = 0

    for transaction in transactions:
        if transaction.transaction_type == "COLLECT":
            balance += transaction.amount
        elif transaction.transaction_type in {
            "REFUND",
            "DEDUCTION",
            "FORFEIT",
        }:
            balance -= transaction.amount
        else:
            raise HTTPException(
                409,
                "Lịch sử tiền cọc có loại giao dịch không xác định. "
                "Cần đối soát trước khi quyết toán.",
            )

    if balance < 0:
        raise HTTPException(
            409,
            "Số dư tiền cọc âm. Cần đối soát trước khi quyết toán.",
        )

    return balance


def load_context(db, contract_id, room_id, checkout_date, *, lock=False):
    query = select(Contract).where(Contract.id == contract_id)
    contract = db.scalar(query.with_for_update() if lock else query)
    if contract is None:
        raise HTTPException(404, "Contract not found")
    if contract.room_id != room_id:
        raise HTTPException(409, "Hợp đồng không thuộc phòng đã chọn.")
    if contract.status != "ACTIVE":
        raise HTTPException(409, "Hợp đồng không còn hoạt động.")
    if checkout_date < contract.start_date or (contract.end_date and checkout_date > contract.end_date):
        raise HTTPException(400, "Ngày trả phòng phải nằm trong thời hạn hợp đồng.")
    query = select(Room).where(Room.id == room_id)
    room = db.scalar(query.with_for_update() if lock else query)
    if room is None:
        raise HTTPException(404, "Room not found")
    contracts = db.scalars(select(Contract).where(Contract.room_id == room_id)).all()
    first = date(checkout_date.year, checkout_date.month, 1)
    last = date(checkout_date.year, checkout_date.month, monthrange(checkout_date.year, checkout_date.month)[1])
    if any(c.id != contract.id and c.start_date <= last and (c.end_date is None or c.end_date >= first) for c in contracts):
        raise HTTPException(409, "Nhiều hợp đồng giao với kỳ này. Không thể tự gán hóa đơn cho hợp đồng.")
    query = select(Invoice).where(Invoice.room_id == room_id).order_by(Invoice.id)
    invoices = list(db.scalars(query.with_for_update() if lock else query).all())
    # Lock the source meters too: editing a meter must not race a preview confirmation.
    query = select(MeterReading).where(MeterReading.room_id == room_id).order_by(MeterReading.id)
    meters = list(db.scalars(query.with_for_update() if lock else query).all())
    query = select(RoomFeeSetting).where(RoomFeeSetting.room_id == room_id)
    fee = db.scalar(query.with_for_update() if lock else query)
    if fee is None:
        raise HTTPException(400, "Chưa có thiết lập phí phòng.")
    history = [i for i in invoices if (i.year, i.month) == (checkout_date.year, checkout_date.month)]
    target = max(history, key=lambda i: i.version, default=None)
    active = [i for i in history if i.status != "CANCELLED"]
    if len(active) > 1 or (active and active[0] is not target):
        raise HTTPException(409, "Lịch sử phiên bản hóa đơn không nhất quán.")
    return contract, contracts, invoices, meters, fee, target


def electric_baseline(contract, contracts, invoices, meters, checkout_date):
    meter_by_id = {m.id: m for m in meters}
    intervals = []
    active_periods = set()
    for inv in invoices:
        if inv.status == "CANCELLED":
            continue
        electric = [item for item in inv.items if item.item_type == "ELECTRICITY"]
        if not electric or (inv.year, inv.month) < (contract.start_date.year, contract.start_date.month):
            continue
        if (inv.year, inv.month) > (checkout_date.year, checkout_date.month):
            raise HTTPException(409, BASELINE_ERROR)
        period = (inv.year, inv.month)
        if period in active_periods or len(electric) != 1:
            raise HTTPException(409, BASELINE_ERROR)
        active_periods.add(period)
        if inv.electricity_transition_new_reading is not None:
            old, new = inv.electricity_transition_old_reading, inv.electricity_transition_new_reading
            source_period = period
            if inv.meter_reading_id is not None or inv.electricity_period_year is not None:
                raise HTTPException(409, BASELINE_ERROR)
        else:
            meter = meter_by_id.get(inv.meter_reading_id)
            if meter is None and inv.electricity_period_year is not None:
                candidates = [m for m in meters if (m.year, m.month) == (inv.electricity_period_year, inv.electricity_period_month)]
                meter = candidates[0] if len(candidates) == 1 else None
            if meter is None or (meter.year, meter.month) != (inv.electricity_period_year, inv.electricity_period_month):
                raise HTTPException(409, BASELINE_ERROR)
            old, new = meter.old_reading, meter.new_reading
            source_period = (meter.year, meter.month)
        if old is None or new is None or old < 0 or new < old:
            raise HTTPException(409, BASELINE_ERROR)
        first = date(*source_period, 1)
        last = date(*source_period, monthrange(*source_period)[1])
        if (source_period < (contract.start_date.year, contract.start_date.month)
                or source_period > (checkout_date.year, checkout_date.month)
                or any(c.id != contract.id and c.start_date <= last and (c.end_date is None or c.end_date >= first) for c in contracts)):
            raise HTTPException(409, BASELINE_ERROR)
        item = electric[0]
        if item.quantity != new - old or item.unit_price is None or item.unit_price < 0 or item.amount != (new - old) * item.unit_price:
            raise HTTPException(409, BASELINE_ERROR)
        intervals.append((source_period, old, new, inv))
    if not intervals:
        raise HTTPException(409, BASELINE_ERROR)
    intervals.sort(key=lambda row: (row[0], row[1], row[2], row[3].id))
    end = contract.move_in_electric_reading

    # Legacy contracts may predate move-in meter capture.
    # The first trustworthy billed interval can establish the
    # start of the chain, but every later interval must remain
    # perfectly continuous.
    if end is None:
        end = intervals[0][1]

    for _, old, new, inv in intervals:
        if old != end:
            raise HTTPException(409, BASELINE_ERROR)
        end = new

    return end, intervals[-1][3]


def preview(db, contract_id, data, *, lock=False):
    contract, contracts, invoices, meters, fee, target = load_context(
        db, contract_id, data.room_id, data.checkout_date, lock=lock)
    if get_existing(db, contract_id):
        raise HTTPException(409, "Quyết toán đã được chuẩn bị. Hãy mở lại snapshot và hóa đơn để review.")
    if (target.id if target else None) != data.invoice_id:
        raise HTTPException(409, "Hóa đơn của kỳ đã thay đổi. Hãy tải lại và xác nhận đúng phiên bản.")
    target_paid = (
        sum(payment.amount for payment in target.payments)
        if target
        else 0
    )

    target_fully_paid = bool(
        target
        and target.status == "ISSUED"
        and target.payment_status == "PAID"
        and target.total_amount > 0
        and target_paid == target.total_amount
    )

    if (
        target
        and target_paid > 0
        and not target_fully_paid
    ):
        raise HTTPException(
            409,
            "Hóa đơn đang có thanh toán một phần hoặc trạng thái thanh toán không khớp. "
            "Cần đối soát trước khi quyết toán."
        )

    if (
        target
        and target.electricity_transition_new_reading is not None
        and not target_fully_paid
    ):
        # An unpaid transition invoice would have to be rewritten.
        # Keep the conservative guard for that case.
        raise HTTPException(
            409,
            "Hóa đơn cần thay thế chứa điện chuyển tiếp. "
            "Cần kiểm tra riêng trước khi quyết toán."
        )

    baseline, baseline_invoice = electric_baseline(contract, contracts, invoices, meters, data.checkout_date)
    if data.move_out_electric_reading < baseline:
        raise HTTPException(400, "Chỉ số trả phòng không được nhỏ hơn mốc điện đã được đưa vào hóa đơn.")
    start = end = None
    if data.rent_mode == "FULL_MONTH":
        rent = contract.monthly_rent
        start = date(data.checkout_date.year, data.checkout_date.month, 1)
        end = date(start.year, start.month, monthrange(start.year, start.month)[1])
    elif data.rent_mode == "PRORATED":
        start, end = data.rent_period_start, data.rent_period_end
        if start < contract.start_date or end > data.checkout_date or (start.year, start.month) != (data.checkout_date.year, data.checkout_date.month):
            raise HTTPException(400, "Khoảng tính ngày phải thuộc tháng trả phòng và nằm trong thời gian thuê.")
        try:
            rent = prorated_rent(contract.monthly_rent, start, end)
        except ValueError as exc:
            raise HTTPException(400, str(exc)) from exc
    else:
        rent = data.custom_rent_amount if data.rent_mode == "CUSTOM" else 0

    target_item_types = (
        {item.item_type for item in target.items}
        if target
        else set()
    )

    # Fully-paid source invoices stay untouched.
    # Rent already paid there is not charged again.
    if (
        target_fully_paid
        and "RENT" in target_item_types
    ):
        rent = 0

    consumed = data.move_out_electric_reading - baseline

    carried = (
        sum(
            item.amount
            for item in target.items
            if item.item_type == "ELECTRICITY"
        )
        if (
            target
            and not target_fully_paid
            and data.include_electricity
        )
        else 0
    )
    # CANCELLED alone is not valid billing evidence and must not be carried twice.
    if target and target.status == "CANCELLED":
        raise HTTPException(409, "Hóa đơn mới nhất đã hủy. Hãy kiểm tra lịch sử và tạo replacement trước khi quyết toán.")
    fields = dict(
        contract_id=contract.id, source_invoice_id=target.id if target else None,
        baseline_invoice_id=baseline_invoice.id, checkout_date=data.checkout_date,
        checkout_type=data.checkout_type,
        move_out_electric_reading=data.move_out_electric_reading,
        electricity_old_reading=baseline, electricity_new_reading=data.move_out_electric_reading,
        electricity_consumption=consumed, electricity_rate=fee.electricity_rate,
        electricity_enabled=data.include_electricity,
        electricity_amount=consumed * fee.electricity_rate if data.include_electricity else 0,
        carried_electricity_amount=carried, rent_mode=data.rent_mode, rent_amount=rent,
        rent_period_start=start, rent_period_end=end,
        # Water and management here are explicit FINAL
        # checkout-period charges selected by the admin.
        # A paid historical invoice must not suppress them,
        # because that invoice proves payment only for its
        # own billed period.
        water_amount=(
            fee.water_fee
            if data.include_water
            else 0
        ),
        management_amount=(
            fee.management_fee
            if data.include_management
            else 0
        ),
        other_amount=data.other_amount, reason=data.reason,
    )
    fields["total_amount"] = sum(fields[k] for k in (
        "electricity_amount", "carried_electricity_amount", "rent_amount", "water_amount", "management_amount", "other_amount"))

    deposit_balance = current_deposit_balance(
        db,
        contract.id,
    )

    if data.checkout_type == "EARLY":
        deposit_forfeit = deposit_balance
        deposit_offset = 0
        deposit_refund = 0
        tenant_due = fields["total_amount"]
    else:
        deposit_forfeit = 0
        deposit_offset = min(
            deposit_balance,
            fields["total_amount"],
        )
        deposit_refund = (
            deposit_balance
            - deposit_offset
        )
        tenant_due = (
            fields["total_amount"]
            - deposit_offset
        )

    fields.update(
        deposit_balance_at_prepare=deposit_balance,
        deposit_forfeit_amount=deposit_forfeit,
        deposit_offset_amount=deposit_offset,
        deposit_refund_amount=deposit_refund,
        tenant_due_after_deposit=tenant_due,
    )

    if any(fields[k] < 0 or fields[k] > 9007199254740991 for k in ("total_amount", "electricity_rate", "rent_amount")):
        raise HTTPException(400, "Số tiền nằm ngoài giới hạn xử lý an toàn.")
    invoice_state = [dict(id=i.id, status=i.status, version=i.version, paid=sum(p.amount for p in i.payments),
                          total=i.total_amount, items=[(it.id, it.item_type, it.description, it.quantity, it.unit_price, it.amount) for it in i.items])
                     for i in invoices]
    token = digest(dict(fields=fields, request=request_values(data), invoices=invoice_state))
    return dict(
        snapshot=fields,
        preview_token=token,
        action=(
            "PRESERVE"
            if target_fully_paid
            else "REPLACE"
            if target and target.status == "ISSUED"
            else "UPDATE"
            if target
            else "CREATE"
        ),
        invoice_id=target.id if target else None,
        invoice_version=target.version if target else None,
                previous_items=[dict(type=it.item_type, amount=it.amount, description=it.description) for it in target.items] if target else [])


def prepare(db, contract_id, data, user, request):
    # Import only here to avoid router/service dependency cycles.
    from backend.app.api.invoices import cancel_invoice_in_transaction, create_replacement_invoice_in_transaction
    try:
        # Same serialization point as contract/deposit updates. No external calls in this transaction.
        contract = db.scalar(select(Contract).where(Contract.id == contract_id).with_for_update())
        if contract is None:
            raise HTTPException(404, "Contract not found")
        if contract.room_id != data.room_id:
            raise HTTPException(409, "Hợp đồng không thuộc phòng đã chọn.")
        request_hash = digest(request_values(data))
        existing = get_existing(db, contract_id)
        if existing:
            if existing.request_hash != request_hash:
                raise HTTPException(409, "Đã có snapshot quyết toán khác. Hãy mở bản đã lưu để review.")
            return existing
        result = preview(db, contract_id, data, lock=True)
        if result["preview_token"] != data.preview_token:
            raise HTTPException(409, "Dữ liệu đã thay đổi sau preview. Hãy tải lại preview trước khi xác nhận.")
        source_target = (
            db.get(
                Invoice,
                data.invoice_id,
            )
            if data.invoice_id
            else None
        )

        target = source_target

        target_paid = (
            sum(
                payment.amount
                for payment in source_target.payments
            )
            if source_target
            else 0
        )

        target_fully_paid = bool(
            source_target
            and source_target.status == "ISSUED"
            and source_target.payment_status == "PAID"
            and source_target.total_amount > 0
            and target_paid == source_target.total_amount
        )

        if target_fully_paid:
            # Paid invoice remains immutable financial history.
            # Checkout becomes a separate invoice in the same month.
            target = Invoice(
                room_id=contract.room_id,
                year=data.checkout_date.year,
                month=data.checkout_date.month,
                version=source_target.version + 1,
                status="DRAFT",
                payment_status="UNPAID",
                total_amount=0,
            )
            db.add(target)

        elif (
            target
            and target.status == "ISSUED"
        ):
            cancel_invoice_in_transaction(
                target.id,
                InvoiceCancelRequest(
                    reason=data.reason
                ),
                request,
                db,
                user,
                commit=False,
            )

            target = create_replacement_invoice_in_transaction(
                target.id,
                request,
                db,
                user,
                commit=False,
            )

        elif target is None:
            target = Invoice(
                room_id=contract.room_id,
                year=data.checkout_date.year,
                month=data.checkout_date.month,
                version=1,
                status="DRAFT",
                payment_status="UNPAID",
                total_amount=0,
            )
            db.add(target)

        old_items = (
            [
                dict(
                    type=item.item_type,
                    amount=item.amount,
                )
                for item in source_target.items
            ]
            if source_target
            else []
        )

        s = result["snapshot"]
        items = []
        def add(kind, description, amount, quantity=None, unit=None, unit_price=None):
            if amount:
                items.append(InvoiceItem(item_type=kind, description=description, amount=amount,
                                         quantity=quantity, unit=unit, unit_price=unit_price))
        if s["electricity_enabled"]:
            # A single item works with existing invoice print/export totals. The settlement
            # stores the carried charge and final interval separately as the financial source.
            description = (f"Điện cuối {s['electricity_old_reading']} → {s['electricity_new_reading']} "
                           f"({s['electricity_consumption']} kWh × {s['electricity_rate']}); "
                           f"điện giữ lại từ HĐ cũ: {s['carried_electricity_amount']} đ")
            amount = s["electricity_amount"] + s["carried_electricity_amount"]
            add("ELECTRICITY", description, amount,
                s["electricity_consumption"] if not s["carried_electricity_amount"] else None,
                "kWh" if not s["carried_electricity_amount"] else None,
                s["electricity_rate"] if not s["carried_electricity_amount"] else None)
        add("RENT", f"Tiền phòng quyết toán ({s['rent_mode']})", s["rent_amount"])
        add("WATER", "Tiền nước", s["water_amount"])
        add("MANAGEMENT", "Phí quản lý", s["management_amount"])
        add("OTHER", data.reason[:150], s["other_amount"])
        target.items = items
        target.total_amount = s["total_amount"]
        target.note = "Hóa đơn quyết toán trả phòng. " + data.reason
        db.flush()
        settlement = CheckoutSettlement(**s, invoice_id=target.id, status="PREPARED", request_hash=request_hash)
        db.add(settlement)
        db.flush()
        record_audit_log(db=db, user=user, action="PREPARE_CHECKOUT_SETTLEMENT", entity_type="CHECKOUT_SETTLEMENT",
                         entity_id=settlement.id, description=f"Chuẩn bị quyết toán hợp đồng #{contract.id}",
                         details=dict(snapshot=snapshot_values(settlement), previous_items=old_items), request=request)
        db.commit()
        db.refresh(settlement)
        return settlement
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(409, "Quyết toán hoặc phiên bản hóa đơn đã tồn tại. Hãy tải lại.") from exc
    except Exception:
        db.rollback()
        raise



def apply_deposit_plan(
    db,
    contract_id,
    data,
    user,
    request,
):
    if getattr(
        data,
        "confirmed",
        False,
    ) is not True:
        raise HTTPException(
            400,
            "Phải xác nhận trước khi thực hiện xử lý tiền cọc.",
        )

    try:
        # ----------------------------------------------------
        # CONTRACT LOCK
        # ----------------------------------------------------
        contract = db.scalar(
            select(Contract)
            .where(
                Contract.id
                == contract_id
            )
            .with_for_update()
        )

        if contract is None:
            raise HTTPException(
                404,
                "Contract not found",
            )

        # ----------------------------------------------------
        # SETTLEMENT LOCK
        # ----------------------------------------------------
        settlement = db.scalar(
            select(CheckoutSettlement)
            .where(
                CheckoutSettlement.contract_id
                == contract_id
            )
            .with_for_update()
        )

        if settlement is None:
            raise HTTPException(
                409,
                "Chưa có quyết toán trả phòng đã chuẩn bị.",
            )

        # Idempotent retry:
        # once APPLIED, never create another financial entry.
        if (
            settlement.deposit_execution_status
            == "APPLIED"
        ):
            db.commit()
            db.refresh(
                settlement
            )

            return settlement

        if (
            settlement.deposit_execution_status
            != "PENDING"
        ):
            raise HTTPException(
                409,
                "Trạng thái xử lý tiền cọc không hợp lệ.",
            )

        if contract.status != "ACTIVE":
            raise HTTPException(
                409,
                "Hợp đồng không còn hoạt động.",
            )

        execution_links = (
            settlement.deposit_forfeit_transaction_id,
            settlement.deposit_deduction_transaction_id,
            settlement.deposit_refund_transaction_id,
            settlement.deposit_payment_id,
            settlement.deposit_processed_at,
        )

        if any(
            value is not None
            for value in execution_links
        ):
            raise HTTPException(
                409,
                (
                    "Quyết toán đang có dữ liệu xử lý cọc "
                    "không hoàn chỉnh. Cần đối soát trước."
                ),
            )

        if (
            settlement.checkout_type
            not in {
                "EARLY",
                "ON_TIME",
            }
        ):
            raise HTTPException(
                409,
                (
                    "Snapshot quyết toán cũ chưa có "
                    "phân loại trả phòng."
                ),
            )

        plan_values = (
            settlement.deposit_balance_at_prepare,
            settlement.deposit_forfeit_amount,
            settlement.deposit_offset_amount,
            settlement.deposit_refund_amount,
            settlement.tenant_due_after_deposit,
        )

        if any(
            value is None
            for value in plan_values
        ):
            raise HTTPException(
                409,
                "Snapshot chưa có kế hoạch xử lý tiền cọc đầy đủ.",
            )

        # ----------------------------------------------------
        # INVOICE LOCK
        # ----------------------------------------------------
        if settlement.invoice_id is None:
            raise HTTPException(
                409,
                "Quyết toán chưa có hóa đơn đích.",
            )

        invoice = db.scalar(
            select(Invoice)
            .where(
                Invoice.id
                == settlement.invoice_id
            )
            .with_for_update()
        )

        if invoice is None:
            raise HTTPException(
                409,
                "Không tìm thấy hóa đơn quyết toán.",
            )

        if invoice.status != "ISSUED":
            raise HTTPException(
                409,
                (
                    "Phải review và phát hành hóa đơn "
                    "quyết toán trước khi xử lý tiền cọc."
                ),
            )

        if (
            invoice.total_amount
            != settlement.total_amount
        ):
            raise HTTPException(
                409,
                (
                    "Tổng tiền hóa đơn không còn khớp "
                    "snapshot quyết toán."
                ),
            )

        # ----------------------------------------------------
        # PAYMENT LOCK
        # ----------------------------------------------------
        payments = list(
            db.scalars(
                select(Payment)
                .where(
                    Payment.invoice_id
                    == invoice.id
                )
                .order_by(
                    Payment.id
                )
                .with_for_update()
            ).all()
        )

        total_paid = sum(
            payment.amount
            for payment in payments
        )

        if (
            total_paid < 0
            or total_paid
            > invoice.total_amount
        ):
            raise HTTPException(
                409,
                (
                    "Lịch sử thanh toán hóa đơn "
                    "không nhất quán."
                ),
            )

        # ON_TIME plan was frozen against the full settlement
        # amount. A payment made before applying deposit would
        # invalidate that frozen disposition.
        if (
            settlement.checkout_type
            == "ON_TIME"
            and total_paid != 0
        ):
            raise HTTPException(
                409,
                (
                    "Hóa đơn quyết toán đã có thanh toán. "
                    "Không thể áp kế hoạch cọc đã freeze. "
                    "Cần đối soát trước."
                ),
            )

        # ----------------------------------------------------
        # DEPOSIT BALANCE CHECK
        # ----------------------------------------------------
        current_balance = (
            current_deposit_balance(
                db,
                contract_id,
            )
        )

        if (
            current_balance
            != settlement.deposit_balance_at_prepare
        ):
            raise HTTPException(
                409,
                (
                    "Số dư tiền cọc đã thay đổi sau khi "
                    "chuẩn bị quyết toán. "
                    "Cần đối soát trước khi thực hiện."
                ),
            )

        forfeit_amount = int(
            settlement.deposit_forfeit_amount
        )

        offset_amount = int(
            settlement.deposit_offset_amount
        )

        refund_amount = int(
            settlement.deposit_refund_amount
        )

        tenant_due = int(
            settlement.tenant_due_after_deposit
        )

        # ----------------------------------------------------
        # VERIFY FROZEN BUSINESS MATH AGAIN
        # ----------------------------------------------------
        if (
            settlement.checkout_type
            == "EARLY"
        ):
            if not (
                forfeit_amount
                == current_balance
                and offset_amount == 0
                and refund_amount == 0
                and tenant_due
                == invoice.total_amount
            ):
                raise HTTPException(
                    409,
                    (
                        "Kế hoạch mất cọc không còn "
                        "khớp snapshot."
                    ),
                )

        else:
            if not (
                forfeit_amount == 0
                and (
                    offset_amount
                    + refund_amount
                    == current_balance
                )
                and offset_amount
                <= invoice.total_amount
                and tenant_due
                == (
                    invoice.total_amount
                    - offset_amount
                )
            ):
                raise HTTPException(
                    409,
                    (
                        "Kế hoạch hoàn/khấu trừ cọc "
                        "không còn khớp snapshot."
                    ),
                )

        forfeit_tx = None
        deduction_tx = None
        refund_tx = None
        deposit_payment = None

        # ----------------------------------------------------
        # EARLY
        #
        # Entire held deposit is forfeited.
        # It DOES NOT pay the checkout invoice.
        # ----------------------------------------------------
        if (
            settlement.checkout_type
            == "EARLY"
        ):
            if forfeit_amount > 0:
                forfeit_tx = DepositTransaction(
                    contract_id=contract.id,
                    transaction_type="FORFEIT",
                    amount=forfeit_amount,
                    note=(
                        "Mất cọc do trả phòng trước hạn. "
                        f"Checkout settlement #{settlement.id}"
                    ),
                )

                db.add(
                    forfeit_tx
                )

                db.flush()

                settlement.deposit_forfeit_transaction_id = (
                    forfeit_tx.id
                )

            # Zero-value invoice has no debt even though
            # there is no Payment row.
            if (
                invoice.total_amount == 0
                and total_paid == 0
            ):
                invoice.payment_status = "PAID"

        # ----------------------------------------------------
        # ON_TIME
        #
        # DEDUCTION reduces held deposit.
        # Payment(DEPOSIT) records that the same amount paid
        # the invoice.
        # Remaining deposit is REFUND.
        # ----------------------------------------------------
        else:
            if offset_amount > 0:
                deduction_tx = DepositTransaction(
                    contract_id=contract.id,
                    transaction_type="DEDUCTION",
                    amount=offset_amount,
                    note=(
                        "Khấu trừ cọc vào hóa đơn quyết toán. "
                        f"Checkout settlement #{settlement.id}"
                    ),
                )

                db.add(
                    deduction_tx
                )

                db.flush()

                deposit_payment = Payment(
                    invoice_id=invoice.id,
                    amount=offset_amount,
                    payment_method="DEPOSIT",
                    transaction_reference=None,
                    confirmed_by=user.email,
                    note=(
                        "Thanh toán bằng tiền cọc từ "
                        f"checkout settlement #{settlement.id}"
                    ),
                )

                db.add(
                    deposit_payment
                )

                db.flush()

                settlement.deposit_deduction_transaction_id = (
                    deduction_tx.id
                )

                settlement.deposit_payment_id = (
                    deposit_payment.id
                )

            new_total_paid = (
                total_paid
                + offset_amount
            )

            if invoice.total_amount == 0:
                invoice.payment_status = "PAID"

            elif (
                new_total_paid
                == invoice.total_amount
            ):
                invoice.payment_status = "PAID"

            elif new_total_paid > 0:
                invoice.payment_status = (
                    "PARTIALLY_PAID"
                )

            else:
                invoice.payment_status = "UNPAID"

            if refund_amount > 0:
                refund_tx = DepositTransaction(
                    contract_id=contract.id,
                    transaction_type="REFUND",
                    amount=refund_amount,
                    note=(
                        "Hoàn phần cọc còn lại sau quyết toán. "
                        f"Checkout settlement #{settlement.id}"
                    ),
                )

                db.add(
                    refund_tx
                )

                db.flush()

                settlement.deposit_refund_transaction_id = (
                    refund_tx.id
                )

        # ----------------------------------------------------
        # FINAL BALANCE MUST BE ZERO
        # ----------------------------------------------------
        final_balance = (
            current_balance
            - forfeit_amount
            - offset_amount
            - refund_amount
        )

        if final_balance != 0:
            raise HTTPException(
                409,
                (
                    "Kế hoạch xử lý cọc không đưa "
                    "số dư về 0."
                ),
            )

        settlement.deposit_execution_status = (
            "APPLIED"
        )

        settlement.deposit_processed_at = (
            datetime.now(
                timezone.utc
            )
        )

        record_audit_log(
            db=db,
            user=user,
            action="APPLY_CHECKOUT_DEPOSIT_PLAN",
            entity_type="CHECKOUT_SETTLEMENT",
            entity_id=settlement.id,
            description=(
                "Thực hiện kế hoạch tiền cọc "
                f"quyết toán hợp đồng #{contract.id}"
            ),
            details={
                "contract_id":
                    contract.id,

                "invoice_id":
                    invoice.id,

                "checkout_type":
                    settlement.checkout_type,

                "deposit_balance_before":
                    current_balance,

                "deposit_forfeit_amount":
                    forfeit_amount,

                "deposit_offset_amount":
                    offset_amount,

                "deposit_refund_amount":
                    refund_amount,

                "tenant_due_after_deposit":
                    tenant_due,

                "forfeit_transaction_id":
                    (
                        forfeit_tx.id
                        if forfeit_tx
                        else None
                    ),

                "deduction_transaction_id":
                    (
                        deduction_tx.id
                        if deduction_tx
                        else None
                    ),

                "refund_transaction_id":
                    (
                        refund_tx.id
                        if refund_tx
                        else None
                    ),

                "deposit_payment_id":
                    (
                        deposit_payment.id
                        if deposit_payment
                        else None
                    ),

                "invoice_payment_status":
                    invoice.payment_status,

                "deposit_balance_after":
                    final_balance,
            },
            request=request,
        )

        db.commit()

        db.refresh(
            settlement
        )

        return settlement

    except IntegrityError as exc:
        db.rollback()

        raise HTTPException(
            409,
            (
                "Xử lý tiền cọc bị xung đột dữ liệu. "
                "Không có giao dịch tài chính nào "
                "được ghi nhận."
            ),
        ) from exc

    except Exception:
        db.rollback()
        raise


def assert_invoice_not_frozen(db, invoice_id):
    if db.scalar(select(CheckoutSettlement.id).where(or_(
        CheckoutSettlement.invoice_id == invoice_id,
        CheckoutSettlement.source_invoice_id == invoice_id,
        CheckoutSettlement.baseline_invoice_id == invoice_id,
    )).limit(1)) is not None:
        raise HTTPException(409, "Hóa đơn thuộc snapshot quyết toán đã lưu; Phase A chỉ cho review/phát hành, không sửa snapshot.")


def assert_contract_not_prepared(db, contract_id):
    if get_existing(db, contract_id):
        raise PreparedCheckoutConflict()
