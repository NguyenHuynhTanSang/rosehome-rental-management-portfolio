from typing import Annotated

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Request,
    status,
)

from sqlalchemy import (
    select,
)

from sqlalchemy.orm import (
    Session,
)


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

from backend.app.models.deposit_transaction import (
    DepositTransaction,
)

from backend.app.models.user import (
    User,
)

from backend.app.schemas.deposit import (
    DepositSummaryResponse,
    DepositTransactionCreate,
    DepositTransactionResponse,
)

from backend.app.services.audit_service import (
    record_audit_log,
)


router = APIRouter(
    prefix="/contracts",
    tags=["Deposits"],
    dependencies=[
        Depends(require_admin),
    ],
)


# =========================================================
# ACTION MAP
# =========================================================

DEPOSIT_AUDIT_ACTIONS = {

    "COLLECT":
        "COLLECT_DEPOSIT",

    "REFUND":
        "REFUND_DEPOSIT",

    "DEDUCTION":
        "DEDUCT_DEPOSIT",

}


# =========================================================
# TÍNH TOÁN TIỀN CỌC
# =========================================================

def get_deposit_values(
    contract_id: int,
    db: Session,
) -> tuple[
    int,
    int,
    int,
    int,
    int,
]:
    transactions = db.scalars(
        select(DepositTransaction)
        .where(
            DepositTransaction.contract_id
            == contract_id
        )
        .order_by(
            DepositTransaction.created_at,
            DepositTransaction.id,
        )
    ).all()

    collected = sum(
        item.amount
        for item in transactions
        if item.transaction_type == "COLLECT"
    )

    refunded = sum(
        item.amount
        for item in transactions
        if item.transaction_type == "REFUND"
    )

    deducted = sum(
        item.amount
        for item in transactions
        if item.transaction_type == "DEDUCTION"
    )

    forfeited = sum(
        item.amount
        for item in transactions
        if item.transaction_type == "FORFEIT"
    )

    balance = (
        collected
        - refunded
        - deducted
        - forfeited
    )

    return (
        collected,
        refunded,
        deducted,
        forfeited,
        balance,
    )


# =========================================================
# THÊM GIAO DỊCH TIỀN CỌC
# =========================================================

@router.post(
    "/{contract_id}/deposits",
    response_model=DepositTransactionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add Deposit Transaction",
)
def create_deposit_transaction(
    contract_id: int,

    data: DepositTransactionCreate,

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
    # CONTRACT
    # =====================================================

    # Khóa contract trong transaction hiện tại để
    # các giao dịch cọc cùng contract không thể
    # đồng thời đọc chung một số dư cũ.
    db.execute(
        select(
            Contract.id
        )
        .where(
            Contract.id
            == contract_id
        )
        .with_for_update()
    )

    contract = db.get(
        Contract,
        contract_id,
    )


    if contract is None:

        raise HTTPException(
            status_code=
                status.HTTP_404_NOT_FOUND,

            detail=
                "Contract not found",
        )


    # =====================================================
    # CURRENT DEPOSIT VALUES
    # =====================================================

    (
        collected,
        refunded,
        deducted,
        forfeited,
        current_balance,
    ) = get_deposit_values(
        contract_id,
        db,
    )


    # =====================================================
    # VALIDATE REFUND / DEDUCTION
    # =====================================================

    if (
        data.transaction_type
        in {
            "REFUND",
            "DEDUCTION",
        }
        and
        data.amount
        >
        current_balance
    ):

        raise HTTPException(
            status_code=
                status.HTTP_400_BAD_REQUEST,

            detail=
                (
                    "Amount exceeds current "
                    f"deposit balance: {current_balance}"
                ),
        )


    # =====================================================
    # CREATE TRANSACTION
    # =====================================================

    transaction = DepositTransaction(

        contract_id=
            contract_id,

        transaction_type=
            data.transaction_type,

        amount=
            data.amount,

        note=
            data.note,

    )


    db.add(
        transaction
    )


    # Flush để transaction có ID
    # trước khi tạo Audit Log.
    db.flush()


    # =====================================================
    # CALCULATE NEW BALANCE
    # =====================================================

    if (
        data.transaction_type
        == "COLLECT"
    ):

        new_balance = (
            current_balance
            +
            data.amount
        )


    elif (
        data.transaction_type
        in {
            "REFUND",
            "DEDUCTION",
        }
    ):

        new_balance = (
            current_balance
            -
            data.amount
        )


    else:

        # Schema bình thường đã validate,
        # nhưng giữ lớp bảo vệ này ở backend.
        raise HTTPException(
            status_code=
                status.HTTP_400_BAD_REQUEST,

            detail=
                (
                    "Invalid deposit "
                    "transaction type"
                ),
        )


    # =====================================================
    # AUDIT ACTION
    # =====================================================

    audit_action = (
        DEPOSIT_AUDIT_ACTIONS.get(
            data.transaction_type
        )
    )


    if audit_action is None:

        raise HTTPException(
            status_code=
                status.HTTP_400_BAD_REQUEST,

            detail=
                (
                    "Invalid deposit "
                    "transaction type"
                ),
        )


    # =====================================================
    # HUMAN DESCRIPTION
    # =====================================================

    if (
        data.transaction_type
        == "COLLECT"
    ):

        description = (
            f"Thu {data.amount:,} đ tiền cọc "
            f"cho hợp đồng #{contract.id}"
        )


    elif (
        data.transaction_type
        == "REFUND"
    ):

        description = (
            f"Hoàn {data.amount:,} đ tiền cọc "
            f"cho hợp đồng #{contract.id}"
        )


    else:

        description = (
            f"Khấu trừ {data.amount:,} đ tiền cọc "
            f"của hợp đồng #{contract.id}"
        )


    # =====================================================
    # AUDIT LOG
    # =====================================================

    record_audit_log(

        db=
            db,

        user=
            current_user,

        action=
            audit_action,

        entity_type=
            "DEPOSIT_TRANSACTION",

        entity_id=
            transaction.id,

        description=
            description,

        details=
            {

                "contract_id":
                    contract.id,

                "room_id":
                    contract.room_id,

                "deposit_transaction_id":
                    transaction.id,

                "transaction_type":
                    data.transaction_type,

                "amount":
                    data.amount,

                "deposit_required":
                    contract.deposit_required,

                "previous_balance":
                    current_balance,

                "new_balance":
                    new_balance,

                "total_collected_before":
                    collected,

                "total_refunded_before":
                    refunded,

                "total_deducted_before":
                    deducted,

                "total_forfeited_before":
                    forfeited,

            },

        request=
            request,

    )


    # =====================================================
    # COMMIT BUSINESS DATA + AUDIT TOGETHER
    # =====================================================

    try:

        db.commit()


        db.refresh(
            transaction
        )


    except Exception:

        db.rollback()

        raise


    return transaction


# =========================================================
# XEM LỊCH SỬ TIỀN CỌC
#
# READ-ONLY → KHÔNG AUDIT
# =========================================================

@router.get(
    "/{contract_id}/deposits",
    response_model=list[
        DepositTransactionResponse
    ],
    summary="View Deposit History",
)
def get_deposit_transactions(
    contract_id: int,

    db: Annotated[
        Session,
        Depends(get_db),
    ],
):

    contract = db.get(
        Contract,
        contract_id,
    )


    if contract is None:

        raise HTTPException(
            status_code=
                status.HTTP_404_NOT_FOUND,

            detail=
                "Contract not found",
        )


    return db.scalars(

        select(
            DepositTransaction
        )

        .where(
            DepositTransaction.contract_id
            == contract_id
        )

        .order_by(
            DepositTransaction.created_at,
            DepositTransaction.id,
        )

    ).all()


# =========================================================
# XEM TỔNG HỢP TIỀN CỌC
#
# READ-ONLY → KHÔNG AUDIT
# =========================================================

@router.get(
    "/{contract_id}/deposit-summary",
    response_model=DepositSummaryResponse,
    summary="View Deposit Summary",
)
def get_deposit_summary(
    contract_id: int,

    db: Annotated[
        Session,
        Depends(get_db),
    ],
):

    contract = db.get(
        Contract,
        contract_id,
    )


    if contract is None:

        raise HTTPException(
            status_code=
                status.HTTP_404_NOT_FOUND,

            detail=
                "Contract not found",
        )


    (
        collected,
        refunded,
        deducted,
        forfeited,
        balance,
    ) = get_deposit_values(
        contract_id,
        db,
    )


    return DepositSummaryResponse(

        contract_id=
            contract.id,

        required_amount=
            contract.deposit_required,

        total_collected=
            collected,

        total_refunded=
            refunded,

        total_deducted=
            deducted,

        total_forfeited=
            forfeited,

        current_balance=
            balance,

    )