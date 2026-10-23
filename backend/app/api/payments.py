from pathlib import Path
from typing import Annotated
from uuid import uuid4

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    Request,
    UploadFile,
    status,
)

from pydantic import BaseModel

from sqlalchemy import (
    func,
    select,
)

from sqlalchemy.orm import Session


from backend.app.auth_dependencies import (
    get_current_user,
    require_admin,
)

from backend.app.dependencies import (
    get_db,
)

from backend.app.models.checkout_settlement import (
    CheckoutSettlement,
)

from backend.app.models.contract import (
    Contract,
)

from backend.app.models.invoice import (
    Invoice,
)

from backend.app.models.payment import (
    Payment,
)

from backend.app.models.user import (
    User,
)

from backend.app.schemas.payment import (
    PaymentCreate,
    PaymentResponse,
    PaymentUpdate,
)

from backend.app.services.audit_service import (
    record_audit_log,
)

from backend.app.services.checkout_settlement import (
    assert_invoice_not_frozen,
)

from backend.app.services.file_security import (
    validate_receipt_image,
)

from backend.app.services.r2_storage import (
    create_presigned_url,
    delete_object,
    upload_bytes,
)


router = APIRouter(
    prefix="/invoices",
    tags=["Payments"],
)


# =========================================================
# RECEIPT CONFIG
# =========================================================

MAX_RECEIPT_SIZE = (
    5 * 1024 * 1024
)


ALLOWED_RECEIPT_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
}


ALLOWED_RECEIPT_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
}


NORMALIZED_RECEIPT_EXTENSIONS = {

    ".jpg":
        ".jpg",

    ".jpeg":
        ".jpg",

    ".png":
        ".png",

    ".webp":
        ".webp",

}


# =========================================================
# RECEIPT URL RESPONSE
# =========================================================

class ReceiptUrlResponse(
    BaseModel
):

    url: str

    expires_in: int


# =========================================================
# ORIGINAL FILENAME
# =========================================================

def clean_original_filename(
    filename: str | None,
) -> str:

    raw_name = (
        filename
        or "receipt"
    )


    raw_name = raw_name.replace(
        "\\",
        "/",
    )


    clean_name = (
        Path(
            raw_name
        )
        .name
        .strip()
    )


    clean_name = "".join(

        char

        for char in clean_name

        if (
            char.isprintable()
            and
            char not in "\r\n\t"
        )

    )


    if not clean_name:

        clean_name = (
            "receipt"
        )


    return clean_name[:255]


# =========================================================
# READ + VALIDATE RECEIPT
# =========================================================

async def read_and_validate_receipt(
    file: UploadFile,
):

    original_name = (
        clean_original_filename(
            file.filename
        )
    )


    suffix = (

        Path(
            original_name
        )
        .suffix
        .lower()

    )


    # =====================================================
    # EXTENSION
    # =====================================================

    if (
        suffix
        not in
        ALLOWED_RECEIPT_EXTENSIONS
    ):

        raise HTTPException(
            status_code=
                status.HTTP_400_BAD_REQUEST,

            detail=
                (
                    "Only JPG, PNG and "
                    "WEBP receipts are allowed"
                ),
        )


    # =====================================================
    # MIME
    # =====================================================

    if (
        file.content_type
        not in
        ALLOWED_RECEIPT_TYPES
    ):

        raise HTTPException(
            status_code=
                status.HTTP_400_BAD_REQUEST,

            detail=
                "Invalid receipt content type",
        )


    # =====================================================
    # READ
    # =====================================================

    try:

        contents = await file.read(
            MAX_RECEIPT_SIZE + 1
        )

    finally:

        await file.close()


    if not contents:

        raise HTTPException(
            status_code=
                status.HTTP_400_BAD_REQUEST,

            detail=
                "Receipt file is empty",
        )


    if (
        len(contents)
        >
        MAX_RECEIPT_SIZE
    ):

        raise HTTPException(
            status_code=
                status.HTTP_413_CONTENT_TOO_LARGE,

            detail=
                (
                    "Receipt file must be "
                    "5 MB or smaller"
                ),
        )


    # =====================================================
    # MAGIC BYTES + PILLOW
    # =====================================================

    try:

        detected_image = (
            validate_receipt_image(

                data=
                    contents,

                declared_content_type=
                    file.content_type,

            )
        )

    except ValueError as exc:

        raise HTTPException(
            status_code=
                status.HTTP_400_BAD_REQUEST,

            detail=
                str(exc),
        ) from exc


    # =====================================================
    # EXTENSION MUST MATCH REAL FORMAT
    # =====================================================

    normalized_extension = (
        NORMALIZED_RECEIPT_EXTENSIONS[
            suffix
        ]
    )


    if (
        normalized_extension
        != detected_image.extension
    ):

        raise HTTPException(
            status_code=
                status.HTTP_400_BAD_REQUEST,

            detail=
                (
                    "File extension does not "
                    "match image content"
                ),
        )


    return (
        contents,
        original_name,
        detected_image,
    )


# =========================================================
# TOTAL PAID
# =========================================================

def get_total_paid(
    invoice_id: int,
    db: Session,
) -> int:

    total = db.scalar(

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
            == invoice_id
        )

    )


    return int(
        total
        or 0
    )


# =========================================================
# GET INVOICE
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


# =========================================================
# GET PAYMENT BELONGING TO INVOICE
# =========================================================

def get_payment_or_404(
    invoice_id: int,
    payment_id: int,
    db: Session,
    *,
    for_update: bool = False,
) -> Payment:

    statement = (

        select(
            Payment
        )

        .where(

            Payment.id
            == payment_id,

            Payment.invoice_id
            == invoice_id,

        )

    )


    if for_update:

        statement = (
            statement
            .with_for_update()
        )


    payment = db.scalar(
        statement
    )


    if payment is None:

        raise HTTPException(
            status_code=
                status.HTTP_404_NOT_FOUND,

            detail=
                "Payment not found",
        )


    return payment


# =========================================================
# BUILD RECEIPT FILE KEY
# =========================================================

def build_receipt_file_key(
    invoice: Invoice,
    payment: Payment,
    extension: str,
) -> str:

    unique_name = (

        f"{uuid4().hex}"
        f"{extension}"

    )


    return (

        f"receipts/"
        f"{invoice.year}/"
        f"{invoice.month:02d}/"
        f"invoice-{invoice.id}/"
        f"payment-{payment.id}/"
        f"{unique_name}"

    )


# =========================================================
# VOID PAYMENT REQUEST
# =========================================================

class PaymentVoidRequest(
    BaseModel
):
    reason: str


# =========================================================
# ADD PAYMENT
# =========================================================

@router.post(
    "/{invoice_id}/payments",
    response_model=PaymentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add Payment",
)
def create_payment(
    invoice_id: int,

    data: PaymentCreate,

    request: Request,

    db: Annotated[
        Session,
        Depends(get_db),
    ],

    current_user: Annotated[
        User,
        Depends(get_current_user),
    ],
):

    # =====================================================
    # LOCK INVOICE
    # =====================================================

    invoice = get_invoice_or_404(

        invoice_id,
        db,

        for_update=True,

    )


    # =====================================================
    # ISSUED ONLY
    # =====================================================

    if (
        invoice.status
        != "ISSUED"
    ):

        db.rollback()

        raise HTTPException(
            status_code=
                status.HTTP_400_BAD_REQUEST,

            detail=
                (
                    "Only ISSUED invoices "
                    "can receive payments"
                ),
        )


    # =====================================================
    # TOTAL
    # =====================================================

    total_paid = get_total_paid(
        invoice.id,
        db,
    )


    remaining = (

        invoice.total_amount
        -
        total_paid

    )


    if remaining <= 0:

        db.rollback()

        raise HTTPException(
            status_code=
                status.HTTP_400_BAD_REQUEST,

            detail=
                (
                    "Invoice is already "
                    "fully paid"
                ),
        )


    if (
        data.amount
        >
        remaining
    ):

        db.rollback()

        raise HTTPException(
            status_code=
                status.HTTP_400_BAD_REQUEST,

            detail=
                (
                    "Payment exceeds "
                    f"remaining balance: {remaining}"
                ),
        )


    # =====================================================
    # CREATE
    # =====================================================

    try:

        payment = Payment(

            invoice_id=
                invoice.id,

            amount=
                data.amount,

            payment_method=
                data.payment_method,

            transaction_reference=
                data.transaction_reference,

            confirmed_by=
                current_user.email,

            note=
                data.note,

        )


        db.add(
            payment
        )


        db.flush()


        new_total_paid = (

            total_paid
            +
            data.amount

        )


        if (
            new_total_paid
            ==
            invoice.total_amount
        ):

            invoice.payment_status = (
                "PAID"
            )


        elif new_total_paid > 0:

            invoice.payment_status = (
                "PARTIALLY_PAID"
            )


        else:

            invoice.payment_status = (
                "UNPAID"
            )


        # =================================================
        # AUDIT
        # =================================================

        record_audit_log(

            db=
                db,

            user=
                current_user,

            action=
                "CREATE_PAYMENT",

            entity_type=
                "PAYMENT",

            entity_id=
                payment.id,

            description=
                (
                    "Ghi nhận thanh toán "
                    f"{data.amount:,} đ "
                    f"cho hóa đơn #{invoice.id}"
                ),

            details=
                {

                    "invoice_id":
                        invoice.id,

                    "payment_id":
                        payment.id,

                    "amount":
                        data.amount,

                    "payment_method":
                        data.payment_method,

                    "transaction_reference":
                        data.transaction_reference,

                    "invoice_total":
                        invoice.total_amount,

                    "previous_total_paid":
                        total_paid,

                    "new_total_paid":
                        new_total_paid,

                    "remaining_after_payment":
                        max(
                            0,
                            invoice.total_amount
                            -
                            new_total_paid,
                        ),

                    "new_payment_status":
                        invoice.payment_status,

                },

            request=
                request,

        )


        db.commit()


        db.refresh(
            payment
        )


    except Exception:

        db.rollback()

        raise


    return payment


# =========================================================
# PAYMENT HISTORY
# =========================================================

@router.get(
    "/{invoice_id}/payments",
    response_model=list[PaymentResponse],
    summary="View Payment History",
)
def get_invoice_payments(
    invoice_id: int,

    db: Annotated[
        Session,
        Depends(get_db),
    ],
):

    get_invoice_or_404(
        invoice_id,
        db,
    )


    payments = db.scalars(

        select(
            Payment
        )

        .where(
            Payment.invoice_id
            == invoice_id
        )

        .order_by(
            Payment.paid_at,
            Payment.id,
        )

    ).all()


    return payments


# =========================================================
# UPDATE PAYMENT INFO
#
# Chỉ cho sửa thông tin bổ sung:
# - transaction_reference
# - note
#
# Không sửa:
# - amount
# - invoice_id
# - paid_at
# - payment_status
# =========================================================

@router.patch(
    "/{invoice_id}/payments/{payment_id}",
    response_model=PaymentResponse,
    summary="Update Payment Information",
)
def update_payment_info(
    invoice_id: int,
    payment_id: int,

    data: PaymentUpdate,

    request: Request,

    db: Annotated[
        Session,
        Depends(get_db),
    ],

    current_user: Annotated[
        User,
        Depends(get_current_user),
    ],
):

    # =====================================================
    # REQUIRE AT LEAST ONE FIELD
    # =====================================================

    fields_set = (
        data.model_fields_set
    )


    if not fields_set:

        raise HTTPException(
            status_code=
                status.HTTP_400_BAD_REQUEST,

            detail=
                "No payment information provided",
        )


    # =====================================================
    # LOCK PAYMENT
    # =====================================================

    payment = get_payment_or_404(

        invoice_id,
        payment_id,
        db,

        for_update=True,

    )


    old_transaction_reference = (
        payment.transaction_reference
    )


    old_note = (
        payment.note
    )


    # =====================================================
    # APPLY ONLY PROVIDED FIELDS
    # =====================================================

    if (
        "transaction_reference"
        in fields_set
    ):

        payment.transaction_reference = (
            data.transaction_reference
        )


    if (
        "note"
        in fields_set
    ):

        payment.note = (
            data.note
        )


    new_transaction_reference = (
        payment.transaction_reference
    )


    new_note = (
        payment.note
    )


    # =====================================================
    # NO REAL CHANGE
    # =====================================================

    if (
        old_transaction_reference
        ==
        new_transaction_reference
        and
        old_note
        ==
        new_note
    ):

        db.commit()

        db.refresh(
            payment
        )

        return payment


    # =====================================================
    # SAVE + AUDIT
    # =====================================================

    try:

        record_audit_log(

            db=
                db,

            user=
                current_user,

            action=
                "UPDATE_PAYMENT_INFO",

            entity_type=
                "PAYMENT",

            entity_id=
                payment.id,

            description=
                (
                    "Cập nhật thông tin "
                    f"Payment #{payment.id}"
                ),

            details=
                {

                    "invoice_id":
                        invoice_id,

                    "payment_id":
                        payment.id,

                    "old_transaction_reference":
                        old_transaction_reference,

                    "new_transaction_reference":
                        new_transaction_reference,

                    "old_note":
                        old_note,

                    "new_note":
                        new_note,

                },

            request=
                request,

        )


        db.commit()


        db.refresh(
            payment
        )


    except Exception:

        db.rollback()

        raise


    return payment


# =========================================================
# UPLOAD RECEIPT
# =========================================================

# =========================================================
# VOID MANUAL PAYMENT
#
# D?ng khi admin ghi nh?n nh?m m?t kho?n thanh to?n th?t.
#
# Kh?ng ?p d?ng cho:
# - payment DEPOSIT do checkout t?o
# - payment ?ang c? ch?ng t?
# - payment c?a checkout ?? k?t th?c
#
# Payment b? lo?i kh?i s? ti?n ?? thu nh?ng Audit Log v?n
# gi? ??y ?? d?u v?t thao t?c.
# =========================================================

@router.post(
    "/{invoice_id}/payments/{payment_id}/void",
    summary="Void Manual Payment",
)
def void_payment(
    invoice_id: int,
    payment_id: int,

    data: PaymentVoidRequest,

    request: Request,

    db: Annotated[
        Session,
        Depends(get_db),
    ],

    current_user: Annotated[
        User,
        Depends(require_admin),
    ],
):
    reason = (
        data.reason
        .strip()
    )

    if len(reason) < 3:
        raise HTTPException(
            status_code=
                status.HTTP_400_BAD_REQUEST,
            detail=(
                "Void reason must contain "
                "at least 3 characters"
            ),
        )

    if len(reason) > 500:
        raise HTTPException(
            status_code=
                status.HTTP_400_BAD_REQUEST,
            detail=(
                "Void reason must not exceed "
                "500 characters"
            ),
        )


    # =====================================================
    # LOCK INVOICE
    # =====================================================

    invoice = get_invoice_or_404(
        invoice_id,
        db,
        for_update=True,
    )

    # Kh?ng cho s?a l?ch s? ti?n n?u h?a ??n ?? ???c
    # ??ng b?ng trong snapshot quy?t to?n.
    assert_invoice_not_frozen(
        db,
        invoice.id,
    )

    if invoice.status != "ISSUED":
        raise HTTPException(
            status_code=
                status.HTTP_400_BAD_REQUEST,
            detail=(
                "Only ISSUED invoices can have "
                "a payment voided"
            ),
        )


    # =====================================================
    # LOCK PAYMENT
    # =====================================================

    payment = db.scalar(
        select(Payment)
        .where(
            Payment.id == payment_id,
            Payment.invoice_id == invoice.id,
        )
        .with_for_update()
    )

    if payment is None:
        raise HTTPException(
            status_code=
                status.HTTP_404_NOT_FOUND,
            detail="Payment not found",
        )


    # =====================================================
    # INTERNAL DEPOSIT PAYMENT IS IMMUTABLE MANUALLY
    # =====================================================

    if payment.payment_method == "DEPOSIT":
        raise HTTPException(
            status_code=
                status.HTTP_409_CONFLICT,
            detail=(
                "Checkout deposit payments "
                "cannot be voided manually"
            ),
        )

    linked_deposit_payment = db.scalar(
        select(
            CheckoutSettlement.id
        )
        .where(
            CheckoutSettlement.deposit_payment_id
            == payment.id
        )
        .limit(1)
    )

    if linked_deposit_payment is not None:
        raise HTTPException(
            status_code=
                status.HTTP_409_CONFLICT,
            detail=(
                "This payment is linked to "
                "checkout deposit execution"
            ),
        )


    # =====================================================
    # RECEIPT MUST BE REMOVED FIRST
    # =====================================================

    if payment.receipt_file_key:
        raise HTTPException(
            status_code=
                status.HTTP_409_CONFLICT,
            detail=(
                "Delete the payment receipt "
                "before voiding this payment"
            ),
        )


    # =====================================================
    # COMPLETED CHECKOUT MUST STAY FINANCIALLY FROZEN
    # =====================================================

    settlement = db.scalar(
        select(
            CheckoutSettlement
        )
        .where(
            CheckoutSettlement.invoice_id
            == invoice.id
        )
        .limit(1)
    )

    if settlement is not None:
        contract = db.get(
            Contract,
            settlement.contract_id,
        )

        if (
            contract is not None
            and
            contract.status == "ENDED"
        ):
            raise HTTPException(
                status_code=
                    status.HTTP_409_CONFLICT,
                detail=(
                    "Payments of a completed "
                    "checkout cannot be voided"
                ),
            )


    # =====================================================
    # RECALCULATE PAYMENT STATUS
    # =====================================================

    previous_total_paid = int(
        get_total_paid(
            invoice.id,
            db,
        )
        or 0
    )

    payment_amount = int(
        payment.amount
    )

    new_total_paid = (
        previous_total_paid
        -
        payment_amount
    )

    if new_total_paid < 0:
        raise HTTPException(
            status_code=
                status.HTTP_409_CONFLICT,
            detail=(
                "Payment history is inconsistent"
            ),
        )

    previous_payment_status = (
        invoice.payment_status
    )

    if (
        new_total_paid
        ==
        invoice.total_amount
    ):
        invoice.payment_status = (
            "PAID"
        )

    elif new_total_paid > 0:
        invoice.payment_status = (
            "PARTIALLY_PAID"
        )

    else:
        invoice.payment_status = (
            "UNPAID"
        )


    # =====================================================
    # AUDIT SNAPSHOT
    # =====================================================

    payment_snapshot = {
        "payment_id":
            payment.id,

        "invoice_id":
            invoice.id,

        "amount":
            payment_amount,

        "payment_method":
            payment.payment_method,

        "transaction_reference":
            payment.transaction_reference,

        "note":
            payment.note,

        "paid_at":
            (
                payment.paid_at.isoformat()
                if payment.paid_at
                else None
            ),

        "confirmed_by":
            payment.confirmed_by,
    }


    try:
        # Audit ???c flush tr??c khi Payment b? delete,
        # nh?ng c?ng transaction v?i thao t?c h?y.
        record_audit_log(
            db=db,

            user=current_user,

            action=
                "VOID_PAYMENT",

            entity_type=
                "PAYMENT",

            entity_id=
                payment.id,

            description=(
                "H\u1ee7y ghi nh\u1eadn thanh to\u00e1n "
                f"#{payment.id}"
            ),

            details={
                "reason":
                    reason,

                "payment":
                    payment_snapshot,

                "invoice_total":
                    invoice.total_amount,

                "previous_total_paid":
                    previous_total_paid,

                "new_total_paid":
                    new_total_paid,

                "previous_payment_status":
                    previous_payment_status,

                "new_payment_status":
                    invoice.payment_status,
            },

            request=request,
        )

        db.delete(
            payment
        )

        db.commit()

        db.refresh(
            invoice
        )

    except Exception:
        db.rollback()
        raise


    return {
        "payment_id":
            payment_id,

        "invoice_id":
            invoice.id,

        "voided":
            True,

        "reason":
            reason,

        "total_paid":
            new_total_paid,

        "payment_status":
            invoice.payment_status,
    }



@router.post(
    "/{invoice_id}/payments/{payment_id}/receipt",
    response_model=PaymentResponse,
    summary="Upload Payment Receipt",
)
async def upload_payment_receipt(
    invoice_id: int,
    payment_id: int,

    request: Request,

    db: Annotated[
        Session,
        Depends(get_db),
    ],

    current_user: Annotated[
        User,
        Depends(get_current_user),
    ],

    file: UploadFile = File(...),
):

    (
        contents,
        original_name,
        detected_image,
    ) = await read_and_validate_receipt(
        file
    )


    payment = get_payment_or_404(

        invoice_id,
        payment_id,
        db,

        for_update=True,

    )


    # =====================================================
    # ONE RECEIPT ONLY
    # =====================================================

    if payment.receipt_file_key:

        db.rollback()

        raise HTTPException(
            status_code=
                status.HTTP_409_CONFLICT,

            detail=
                (
                    "This payment already "
                    "has a receipt"
                ),
        )


    invoice = get_invoice_or_404(
        invoice_id,
        db,
    )


    file_key = build_receipt_file_key(

        invoice,
        payment,
        detected_image.extension,

    )


    # =====================================================
    # R2
    # =====================================================

    try:

        upload_bytes(

            file_key=
                file_key,

            data=
                contents,

            content_type=
                detected_image.mime_type,

        )

    except Exception as exc:

        db.rollback()


        print(
            "R2 receipt upload failed:",
            type(exc).__name__,
        )


        raise HTTPException(
            status_code=
                status.HTTP_502_BAD_GATEWAY,

            detail=
                (
                    "Could not upload "
                    "receipt to storage"
                ),
        ) from exc


    # =====================================================
    # DB
    # =====================================================

    try:

        payment.receipt_file_key = (
            file_key
        )


        payment.receipt_original_name = (
            original_name
        )


        payment.confirmed_by = (
            current_user.email
        )


        record_audit_log(

            db=
                db,

            user=
                current_user,

            action=
                "UPLOAD_PAYMENT_RECEIPT",

            entity_type=
                "PAYMENT",

            entity_id=
                payment.id,

            description=
                (
                    "Tải chứng từ thanh toán "
                    f"cho Payment #{payment.id}"
                ),

            details=
                {

                    "invoice_id":
                        invoice.id,

                    "payment_id":
                        payment.id,

                    "file_type":
                        detected_image.mime_type,

                    "file_size":
                        len(contents),

                },

            request=
                request,

        )


        db.commit()


        db.refresh(
            payment
        )


    except Exception as exc:

        db.rollback()


        try:

            delete_object(
                file_key
            )

        except Exception as cleanup_exc:

            print(
                "R2 cleanup failed:",
                type(cleanup_exc).__name__,
            )


        raise HTTPException(
            status_code=
                status.HTTP_500_INTERNAL_SERVER_ERROR,

            detail=
                (
                    "Receipt uploaded but "
                    "database update failed"
                ),
        ) from exc


    return payment


# =========================================================
# REPLACE RECEIPT
#
# Upload file mới
# → DB chuyển sang file mới
# → commit
# → mới xóa file cũ
#
# Nếu upload file mới lỗi:
# file cũ vẫn còn nguyên.
# =========================================================

@router.post(
    "/{invoice_id}/payments/{payment_id}/receipt/replace",
    response_model=PaymentResponse,
    summary="Replace Payment Receipt",
)
async def replace_payment_receipt(
    invoice_id: int,
    payment_id: int,

    request: Request,

    db: Annotated[
        Session,
        Depends(get_db),
    ],

    current_user: Annotated[
        User,
        Depends(get_current_user),
    ],

    file: UploadFile = File(...),
):

    (
        contents,
        original_name,
        detected_image,
    ) = await read_and_validate_receipt(
        file
    )


    # =====================================================
    # LOCK PAYMENT
    # =====================================================

    payment = get_payment_or_404(

        invoice_id,
        payment_id,
        db,

        for_update=True,

    )


    if not payment.receipt_file_key:

        db.rollback()

        raise HTTPException(
            status_code=
                status.HTTP_404_NOT_FOUND,

            detail=
                (
                    "This payment has "
                    "no receipt to replace"
                ),
        )


    invoice = get_invoice_or_404(
        invoice_id,
        db,
    )


    old_file_key = (
        payment.receipt_file_key
    )


    new_file_key = build_receipt_file_key(

        invoice,
        payment,
        detected_image.extension,

    )


    # =====================================================
    # UPLOAD NEW FILE FIRST
    # =====================================================

    try:

        upload_bytes(

            file_key=
                new_file_key,

            data=
                contents,

            content_type=
                detected_image.mime_type,

        )

    except Exception as exc:

        db.rollback()


        print(
            "R2 replacement upload failed:",
            type(exc).__name__,
        )


        raise HTTPException(
            status_code=
                status.HTTP_502_BAD_GATEWAY,

            detail=
                (
                    "Could not upload "
                    "new receipt"
                ),
        ) from exc


    # =====================================================
    # UPDATE DATABASE
    # =====================================================

    try:

        payment.receipt_file_key = (
            new_file_key
        )


        payment.receipt_original_name = (
            original_name
        )


        payment.confirmed_by = (
            current_user.email
        )


        record_audit_log(

            db=
                db,

            user=
                current_user,

            action=
                "REPLACE_PAYMENT_RECEIPT",

            entity_type=
                "PAYMENT",

            entity_id=
                payment.id,

            description=
                (
                    "Thay chứng từ thanh toán "
                    f"của Payment #{payment.id}"
                ),

            details=
                {

                    "invoice_id":
                        invoice.id,

                    "payment_id":
                        payment.id,

                    "file_type":
                        detected_image.mime_type,

                    "file_size":
                        len(contents),

                },

            request=
                request,

        )


        db.commit()


        db.refresh(
            payment
        )


    except Exception as exc:

        db.rollback()


        # DB chưa đổi được
        # → xóa file mới
        # → giữ file cũ.
        try:

            delete_object(
                new_file_key
            )

        except Exception as cleanup_exc:

            print(
                "R2 replacement cleanup failed:",
                type(cleanup_exc).__name__,
            )


        raise HTTPException(
            status_code=
                status.HTTP_500_INTERNAL_SERVER_ERROR,

            detail=
                (
                    "New receipt uploaded but "
                    "database update failed"
                ),
        ) from exc


    # =====================================================
    # CLEAN OLD FILE AFTER COMMIT
    # =====================================================

    try:

        delete_object(
            old_file_key
        )

    except Exception as cleanup_exc:

        # DB đang trỏ đúng file mới.
        # File cũ chỉ trở thành orphan private object.
        print(
            "R2 old receipt cleanup failed:",
            type(cleanup_exc).__name__,
        )


    return payment


# =========================================================
# VIEW RECEIPT
# =========================================================

@router.get(
    "/{invoice_id}/payments/{payment_id}/receipt",
    response_model=ReceiptUrlResponse,
    summary="View Payment Receipt",
)
def get_payment_receipt(
    invoice_id: int,
    payment_id: int,

    db: Annotated[
        Session,
        Depends(get_db),
    ],

    _current_user: Annotated[
        User,
        Depends(get_current_user),
    ],
):

    payment = get_payment_or_404(
        invoice_id,
        payment_id,
        db,
    )


    if not payment.receipt_file_key:

        raise HTTPException(
            status_code=
                status.HTTP_404_NOT_FOUND,

            detail=
                (
                    "This payment has "
                    "no receipt"
                ),
        )


    expires_in = 300


    try:

        url = create_presigned_url(

            payment.receipt_file_key,

            expires_in=
                expires_in,

        )

    except Exception as exc:

        print(
            "R2 presigned URL failed:",
            type(exc).__name__,
        )


        raise HTTPException(
            status_code=
                status.HTTP_502_BAD_GATEWAY,

            detail=
                (
                    "Could not create "
                    "receipt URL"
                ),
        ) from exc


    return ReceiptUrlResponse(

        url=
            url,

        expires_in=
            expires_in,

    )


# =========================================================
# DELETE RECEIPT
# =========================================================

@router.delete(
    "/{invoice_id}/payments/{payment_id}/receipt",
    response_model=PaymentResponse,
    summary="Delete Payment Receipt",
)
def delete_payment_receipt(
    invoice_id: int,
    payment_id: int,

    request: Request,

    db: Annotated[
        Session,
        Depends(get_db),
    ],

    current_user: Annotated[
        User,
        Depends(get_current_user),
    ],
):

    payment = get_payment_or_404(

        invoice_id,
        payment_id,
        db,

        for_update=True,

    )


    if not payment.receipt_file_key:

        db.rollback()

        raise HTTPException(
            status_code=
                status.HTTP_404_NOT_FOUND,

            detail=
                (
                    "This payment has "
                    "no receipt"
                ),
        )


    old_file_key = (
        payment.receipt_file_key
    )


    # =====================================================
    # DATABASE FIRST
    # =====================================================

    try:

        payment.receipt_file_key = (
            None
        )


        payment.receipt_original_name = (
            None
        )


        payment.confirmed_by = (
            current_user.email
        )


        record_audit_log(

            db=
                db,

            user=
                current_user,

            action=
                "DELETE_PAYMENT_RECEIPT",

            entity_type=
                "PAYMENT",

            entity_id=
                payment.id,

            description=
                (
                    "Xóa chứng từ thanh toán "
                    f"của Payment #{payment.id}"
                ),

            details=
                {

                    "invoice_id":
                        invoice_id,

                    "payment_id":
                        payment.id,

                },

            request=
                request,

        )


        db.commit()


        db.refresh(
            payment
        )


    except Exception as exc:

        db.rollback()


        raise HTTPException(
            status_code=
                status.HTTP_500_INTERNAL_SERVER_ERROR,

            detail=
                (
                    "Could not update "
                    "receipt information"
                ),
        ) from exc


    # =====================================================
    # R2 CLEANUP
    # =====================================================

    try:

        delete_object(
            old_file_key
        )

    except Exception as exc:

        print(
            "R2 orphan receipt cleanup failed:",
            type(exc).__name__,
        )


    return payment