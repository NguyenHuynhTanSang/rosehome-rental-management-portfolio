from datetime import (
    date,
    datetime,
    timezone,
)
from typing import Annotated

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Request,
    status,
)

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

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

from backend.app.models.contract_occupant import (
    ContractOccupant,
)

from backend.app.models.deposit_transaction import (
    DepositTransaction,
)

from backend.app.models.room import (
    Room,
)

from backend.app.models.tenant import (
    Tenant,
)

from backend.app.models.user import (
    User,
)

from backend.app.schemas.contract import (
    ContractCreate,
    ContractEndRequest,
    ContractEndResponse,
    ContractOccupantAdd,
    ContractResponse,
    ContractTenantResponse,
    ContractUpdate,
)

from backend.app.services.audit_service import (
    record_audit_log,
)


router = APIRouter(
    prefix="/contracts",
    tags=["Contracts"],
    dependencies=[
        Depends(require_admin),
    ],
)


# =========================================================
# TÍNH SỐ TIỀN CỌC ĐANG GIỮ
# =========================================================

def calculate_deposit_balance(
    contract_id: int,
    db: Session,
) -> int:

    transactions = db.scalars(
        select(
            DepositTransaction
        )
        .where(
            DepositTransaction.contract_id
            == contract_id
        )
    ).all()


    balance = 0


    for transaction in transactions:

        if (
            transaction.transaction_type
            == "COLLECT"
        ):

            balance += (
                transaction.amount
            )


        elif (
            transaction.transaction_type
            in {
                "REFUND",
                "DEDUCTION",
                "FORFEIT",
            }
        ):

            balance -= (
                transaction.amount
            )


    return balance


# =========================================================
# TẠO HỢP ĐỒNG
# =========================================================

@router.post(
    "",
    response_model=ContractResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Contract",
)
def create_contract(
    data: ContractCreate,

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
    # ROOM
    # =====================================================

    room = db.scalar(
        select(
            Room
        )
        .where(
            Room.id
            == data.room_id
        )
        .with_for_update()
    )


    if room is None:

        raise HTTPException(
            status_code=
                status.HTTP_404_NOT_FOUND,

            detail=
                "Room not found",
        )


    # =====================================================
    # TENANT
    # =====================================================

    tenant = db.scalar(
        select(
            Tenant
        )
        .where(
            Tenant.id
            == data.tenant_id
        )
        .with_for_update()
    )


    if tenant is None:

        raise HTTPException(
            status_code=
                status.HTTP_404_NOT_FOUND,

            detail=
                "Tenant not found",
        )


    # =====================================================
    # DATE VALIDATION
    # =====================================================

    if (
        data.end_date
        is not None
        and
        data.end_date
        < data.start_date
    ):

        raise HTTPException(
            status_code=
                status.HTTP_400_BAD_REQUEST,

            detail=
                (
                    "End date cannot be "
                    "before start date"
                ),
        )


    # =====================================================
    # ROOM MUST NOT HAVE ACTIVE CONTRACT
    # =====================================================

    active_contract = db.scalar(
        select(
            Contract
        )
        .where(
            Contract.room_id
            == data.room_id,

            Contract.status
            == "ACTIVE",
        )
    )


    if active_contract:

        raise HTTPException(
            status_code=
                status.HTTP_400_BAD_REQUEST,

            detail=
                (
                    "Room already has "
                    "an active contract"
                ),
        )


    # =====================================================
    # TENANT MUST NOT BE ACTIVE OCCUPANT ELSEWHERE
    # =====================================================

    active_occupant_membership = db.scalar(
        select(
            ContractOccupant
        )
        .where(
            ContractOccupant.tenant_id
            == data.tenant_id,

            ContractOccupant.is_active
            == True,  # noqa: E712
        )
    )


    if active_occupant_membership:

        raise HTTPException(
            status_code=
                status.HTTP_400_BAD_REQUEST,

            detail=
                (
                    "Tenant is already staying in "
                    "another active contract"
                ),
        )


    # =====================================================
    # TENANT MUST NOT HAVE ACTIVE CONTRACT
    # =====================================================

    active_tenant_contract = db.scalar(
        select(
            Contract
        )
        .where(
            Contract.tenant_id
            == data.tenant_id,

            Contract.status
            == "ACTIVE",
        )
    )


    if active_tenant_contract:

        raise HTTPException(
            status_code=
                status.HTTP_400_BAD_REQUEST,

            detail=
                (
                    "Tenant already has "
                    "an active contract"
                ),
        )


    # =====================================================
    # RENT BILLING
    #
    # Nếu không nhập anchor thì lấy tháng bắt đầu hợp đồng.
    # =====================================================

    rent_billing_cycle_months = (
        data.rent_billing_cycle_months
    )


    rent_billing_anchor_year = (
        data.rent_billing_anchor_year
        if data.rent_billing_anchor_year is not None
        else data.start_date.year
    )


    rent_billing_anchor_month = (
        data.rent_billing_anchor_month
        if data.rent_billing_anchor_month is not None
        else data.start_date.month
    )


    # =====================================================
    # CREATE CONTRACT
    # =====================================================

    contract = Contract(
        room_id=
            data.room_id,

        tenant_id=
            data.tenant_id,

        start_date=
            data.start_date,

        end_date=
            data.end_date,

        move_in_electric_reading=
            data.move_in_electric_reading,

        move_out_electric_reading=
            None,

        monthly_rent=
            data.monthly_rent,

        rent_billing_cycle_months=
            rent_billing_cycle_months,

        rent_billing_anchor_year=
            rent_billing_anchor_year,

        rent_billing_anchor_month=
            rent_billing_anchor_month,

        deposit_required=
            data.deposit_required,

        occupant_count=
            data.occupant_count,

        status=
            "ACTIVE",
    )


    room.status = (
        "OCCUPIED"
    )


    # =====================================================
    # AUDIT + COMMIT
    # =====================================================

    try:

        db.add(
            contract
        )


        # Lấy contract.id trước khi tạo AuditLog.
        db.flush()


        record_audit_log(

            db=
                db,

            user=
                current_user,

            action=
                "CREATE_CONTRACT",

            entity_type=
                "CONTRACT",

            entity_id=
                contract.id,

            description=
                (
                    f"Tạo hợp đồng #{contract.id} "
                    f"cho phòng {room.room_code}"
                ),

            details=
                {

                    "contract_id":
                        contract.id,

                    "room_id":
                        contract.room_id,

                    "room_code":
                        room.room_code,

                    "tenant_id":
                        contract.tenant_id,

                    "start_date":
                        contract.start_date.isoformat(),

                    "end_date":
                        (
                            contract.end_date.isoformat()
                            if contract.end_date
                            else None
                        ),

                    "monthly_rent":
                        contract.monthly_rent,

                    "rent_billing_cycle_months":
                        contract.rent_billing_cycle_months,

                    "rent_billing_anchor_year":
                        contract.rent_billing_anchor_year,

                    "rent_billing_anchor_month":
                        contract.rent_billing_anchor_month,

                    "deposit_required":
                        contract.deposit_required,

                    "occupant_count":
                        contract.occupant_count,

                    "status":
                        contract.status,

                },

            request=
                request,

        )


        db.commit()


        db.refresh(
            contract
        )


    except IntegrityError as exc:

        db.rollback()

        raise HTTPException(
            status_code=
                status.HTTP_409_CONFLICT,

            detail=
                (
                    "Không thể tạo hợp đồng vì "
                    "phòng hoặc khách thuê đã có "
                    "hợp đồng đang hoạt động, "
                    "hoặc dữ liệu hợp đồng không hợp lệ."
                ),
        ) from exc


    except Exception:

        db.rollback()

        raise


    return contract


# =========================================================
# XEM TẤT CẢ HỢP ĐỒNG
#
# READ-ONLY → KHÔNG AUDIT
# =========================================================

@router.get(
    "",
    response_model=list[ContractResponse],
    summary="View All Contracts",
)
def get_contracts(
    db: Annotated[
        Session,
        Depends(get_db),
    ],
):

    contracts = db.scalars(
        select(
            Contract
        )
        .order_by(
            Contract.id
        )
    ).all()


    return contracts


# =========================================================
# XEM HỢP ĐỒNG ACTIVE CỦA PHÒNG
#
# READ-ONLY → KHÔNG AUDIT
# =========================================================

@router.get(
    "/room/{room_id}/active",
    response_model=ContractResponse,
    summary="View Active Contract",
)
def get_active_contract(
    room_id: int,

    db: Annotated[
        Session,
        Depends(get_db),
    ],
):

    contract = db.scalar(
        select(
            Contract
        )
        .where(
            Contract.room_id
            == room_id,

            Contract.status
            == "ACTIVE",
        )
    )


    if contract is None:

        raise HTTPException(
            status_code=
                status.HTTP_404_NOT_FOUND,

            detail=
                "Active contract not found",
        )


    return contract


# =========================================================
# XEM CHI TIẾT HỢP ĐỒNG
#
# READ-ONLY → KHÔNG AUDIT
# =========================================================

@router.get(
    "/{contract_id}",
    response_model=ContractResponse,
    summary="View Contract Details",
)
def get_contract(
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


    return contract


# =========================================================
# SỬA HỢP ĐỒNG
# =========================================================

@router.patch(
    "/{contract_id}",
    response_model=ContractResponse,
    summary="Edit Contract",
)
def update_contract(
    contract_id: int,

    data: ContractUpdate,

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

    contract = db.scalar(
        select(
            Contract
        )
        .where(
            Contract.id
            == contract_id
        )
        .with_for_update()
    )


    if contract is None:

        raise HTTPException(
            status_code=
                status.HTTP_404_NOT_FOUND,

            detail=
                "Contract not found",
        )


    # =====================================================
    # SNAPSHOT BEFORE
    # =====================================================

    before = {

        "room_id":
            contract.room_id,

        "tenant_id":
            contract.tenant_id,

        "start_date":
            contract.start_date.isoformat(),

        "end_date":
            (
                contract.end_date.isoformat()
                if contract.end_date
                else None
            ),

        "move_in_electric_reading": contract.move_in_electric_reading,

        "monthly_rent":
            contract.monthly_rent,

        "rent_billing_cycle_months":
            contract.rent_billing_cycle_months,

        "rent_billing_anchor_year":
            contract.rent_billing_anchor_year,

        "rent_billing_anchor_month":
            contract.rent_billing_anchor_month,

        "deposit_required":
            contract.deposit_required,

        "occupant_count":
            contract.occupant_count,

        "status":
            contract.status,

    }


    update_data = (
        data.model_dump(
            exclude_unset=True
        )
    )


    if "move_in_electric_reading" in update_data:
        baseline = update_data["move_in_electric_reading"]
        if baseline is None:
            raise HTTPException(400, "Move-in electricity reading cannot be cleared")
        if contract.move_out_electric_reading is not None and baseline > contract.move_out_electric_reading:
            raise HTTPException(400, "Move-in electricity reading cannot exceed move-out reading")

    new_room_id = (
        update_data.get(
            "room_id",
            contract.room_id,
        )
    )


    new_tenant_id = (
        update_data.get(
            "tenant_id",
            contract.tenant_id,
        )
    )


    new_start_date = (
        update_data.get(
            "start_date",
            contract.start_date,
        )
    )


    new_end_date = (
        update_data.get(
            "end_date",
            contract.end_date,
        )
    )


    # Không cho các billing field bị PATCH thành null.
    for billing_field in (
        "rent_billing_cycle_months",
        "rent_billing_anchor_year",
        "rent_billing_anchor_month",
    ):

        if (
            billing_field in update_data
            and
            update_data[billing_field] is None
        ):

            raise HTTPException(
                status_code=
                    status.HTTP_400_BAD_REQUEST,

                detail=
                    f"{billing_field} cannot be null",
            )


    new_rent_billing_cycle_months = (
        update_data.get(
            "rent_billing_cycle_months",
            contract.rent_billing_cycle_months,
        )
    )


    new_rent_billing_anchor_year = (
        update_data.get(
            "rent_billing_anchor_year",
            contract.rent_billing_anchor_year,
        )
    )


    new_rent_billing_anchor_month = (
        update_data.get(
            "rent_billing_anchor_month",
            contract.rent_billing_anchor_month,
        )
    )


    # =====================================================
    # DATE VALIDATION
    # =====================================================

    if (
        new_end_date
        is not None
        and
        new_end_date
        < new_start_date
    ):

        raise HTTPException(
            status_code=
                status.HTTP_400_BAD_REQUEST,

            detail=
                (
                    "End date cannot be "
                    "before start date"
                ),
        )


    # =====================================================
    # NEW ROOM
    # =====================================================

    new_room = db.get(
        Room,
        new_room_id,
    )


    if new_room is None:

        raise HTTPException(
            status_code=
                status.HTTP_404_NOT_FOUND,

            detail=
                "Room not found",
        )


    # =====================================================
    # NEW TENANT
    # =====================================================

    new_tenant = db.get(
        Tenant,
        new_tenant_id,
    )


    if new_tenant is None:

        raise HTTPException(
            status_code=
                status.HTTP_404_NOT_FOUND,

            detail=
                "Tenant not found",
        )


    # =====================================================
    # CHECK ROOM CONFLICT
    # =====================================================

    if (
        contract.status
        == "ACTIVE"
        and
        new_room_id
        != contract.room_id
    ):

        conflict = db.scalar(
            select(
                Contract
            )
            .where(
                Contract.room_id
                == new_room_id,

                Contract.status
                == "ACTIVE",

                Contract.id
                != contract_id,
            )
        )


        if conflict:

            raise HTTPException(
                status_code=
                    status.HTTP_400_BAD_REQUEST,

                detail=
                    (
                        "New room already has "
                        "an active contract"
                    ),
            )


    # =====================================================
    # CHECK TENANT CONFLICT
    # =====================================================

    if (
        contract.status
        == "ACTIVE"
        and
        new_tenant_id
        != contract.tenant_id
    ):

        occupant_conflict = db.scalar(
            select(
                ContractOccupant
            )
            .where(
                ContractOccupant.tenant_id
                == new_tenant_id,

                ContractOccupant.is_active
                == True,  # noqa: E712
            )
        )


        if occupant_conflict:

            raise HTTPException(
                status_code=
                    status.HTTP_400_BAD_REQUEST,

                detail=
                    (
                        "New primary tenant is already "
                        "an active occupant. Remove the "
                        "occupant membership first."
                    ),
            )


        tenant_conflict = db.scalar(
            select(
                Contract
            )
            .where(
                Contract.tenant_id
                == new_tenant_id,

                Contract.status
                == "ACTIVE",

                Contract.id
                != contract_id,
            )
        )


        if tenant_conflict:

            raise HTTPException(
                status_code=
                    status.HTTP_400_BAD_REQUEST,

                detail=
                    (
                        "New tenant already has "
                        "an active contract"
                    ),
            )


    old_room = db.get(
        Room,
        contract.room_id,
    )


    # =====================================================
    # UPDATE ROOM STATUS IF MOVING ACTIVE CONTRACT
    # =====================================================

    if (
        contract.status
        == "ACTIVE"
        and
        new_room_id
        != contract.room_id
    ):

        if old_room is not None:

            old_room.status = (
                "VACANT"
            )


        new_room.status = (
            "OCCUPIED"
        )


    # =====================================================
    # APPLY UPDATES
    # =====================================================

    if "room_id" in update_data:

        contract.room_id = (
            new_room_id
        )


    if "tenant_id" in update_data:

        contract.tenant_id = (
            new_tenant_id
        )


    if "start_date" in update_data:

        contract.start_date = (
            new_start_date
        )


    if "end_date" in update_data:

        contract.end_date = (
            new_end_date
        )


    if "move_in_electric_reading" in update_data:
        contract.move_in_electric_reading = update_data["move_in_electric_reading"]

    if "monthly_rent" in update_data:

        contract.monthly_rent = (
            update_data[
                "monthly_rent"
            ]
        )


    if "rent_billing_cycle_months" in update_data:

        contract.rent_billing_cycle_months = (
            new_rent_billing_cycle_months
        )


    if "rent_billing_anchor_year" in update_data:

        contract.rent_billing_anchor_year = (
            new_rent_billing_anchor_year
        )


    if "rent_billing_anchor_month" in update_data:

        contract.rent_billing_anchor_month = (
            new_rent_billing_anchor_month
        )


    if "deposit_required" in update_data:

        contract.deposit_required = (
            update_data[
                "deposit_required"
            ]
        )


    if "occupant_count" in update_data:

        contract.occupant_count = (
            update_data[
                "occupant_count"
            ]
        )


    # =====================================================
    # SNAPSHOT AFTER
    # =====================================================

    after = {

        "room_id":
            contract.room_id,

        "tenant_id":
            contract.tenant_id,

        "start_date":
            contract.start_date.isoformat(),

        "end_date":
            (
                contract.end_date.isoformat()
                if contract.end_date
                else None
            ),

        "move_in_electric_reading": contract.move_in_electric_reading,

        "monthly_rent":
            contract.monthly_rent,

        "rent_billing_cycle_months":
            contract.rent_billing_cycle_months,

        "rent_billing_anchor_year":
            contract.rent_billing_anchor_year,

        "rent_billing_anchor_month":
            contract.rent_billing_anchor_month,

        "deposit_required":
            contract.deposit_required,

        "occupant_count":
            contract.occupant_count,

        "status":
            contract.status,

    }


    # =====================================================
    # AUDIT + COMMIT
    # =====================================================

    try:

        record_audit_log(

            db=
                db,

            user=
                current_user,

            action=
                "UPDATE_CONTRACT",

            entity_type=
                "CONTRACT",

            entity_id=
                contract.id,

            description=
                (
                    f"Cập nhật hợp đồng "
                    f"#{contract.id}"
                ),

            details=
                {

                    "contract_id":
                        contract.id,

                    "changed_fields":
                        sorted(
                            update_data.keys()
                        ),

                    "before":
                        before,

                    "after":
                        after,

                },

            request=
                request,

        )


        db.commit()


        db.refresh(
            contract
        )


    except IntegrityError as exc:

        db.rollback()

        raise HTTPException(
            status_code=
                status.HTTP_409_CONFLICT,

            detail=
                (
                    "Không thể cập nhật hợp đồng vì "
                    "dữ liệu xung đột hoặc không hợp lệ."
                ),
        ) from exc


    except Exception:

        db.rollback()

        raise


    return contract


# =========================================================
# XÓA HỢP ĐỒNG TẠO NHẦM
# =========================================================

@router.delete(
    "/{contract_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete Contract",
)
def delete_contract(
    contract_id: int,

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

    contract = db.scalar(
        select(
            Contract
        )
        .where(
            Contract.id
            == contract_id
        )
        .with_for_update()
    )


    if contract is None:

        raise HTTPException(
            status_code=
                status.HTTP_404_NOT_FOUND,

            detail=
                "Contract not found",
        )


    if (
        contract.status
        != "ACTIVE"
    ):

        raise HTTPException(
            status_code=
                status.HTTP_409_CONFLICT,

            detail=
                (
                    "Không xóa hợp đồng đã kết thúc "
                    "vì cần giữ lịch sử. "
                    "Chỉ hợp đồng ACTIVE tạo nhầm "
                    "mới được xóa."
                ),
        )


    deposit_transaction = db.scalar(
        select(
            DepositTransaction
        )
        .where(
            DepositTransaction.contract_id
            == contract_id
        )
    )


    if deposit_transaction is not None:

        raise HTTPException(
            status_code=
                status.HTTP_409_CONFLICT,

            detail=
                (
                    "Không thể xóa hợp đồng vì đã có "
                    "giao dịch tiền cọc. "
                    "Hãy kết thúc hợp đồng và xử lý "
                    "tiền cọc thay vì xóa."
                ),
        )


    room = db.scalar(
        select(
            Room
        )
        .where(
            Room.id
            == contract.room_id
        )
        .with_for_update()
    )


    # Snapshot trước khi xóa.
    deleted_id = (
        contract.id
    )

    deleted_room_id = (
        contract.room_id
    )

    deleted_tenant_id = (
        contract.tenant_id
    )

    deleted_start_date = (
        contract.start_date
    )

    deleted_end_date = (
        contract.end_date
    )

    deleted_monthly_rent = (
        contract.monthly_rent
    )

    deleted_rent_billing_cycle_months = (
        contract.rent_billing_cycle_months
    )

    deleted_rent_billing_anchor_year = (
        contract.rent_billing_anchor_year
    )

    deleted_rent_billing_anchor_month = (
        contract.rent_billing_anchor_month
    )

    deleted_deposit_required = (
        contract.deposit_required
    )

    deleted_occupant_count = (
        contract.occupant_count
    )

    deleted_room_code = (
        room.room_code
        if room is not None
        else None
    )


    try:

        if room is not None:

            room.status = (
                "VACANT"
            )


        record_audit_log(

            db=
                db,

            user=
                current_user,

            action=
                "DELETE_CONTRACT",

            entity_type=
                "CONTRACT",

            entity_id=
                deleted_id,

            description=
                (
                    f"Xóa hợp đồng tạo nhầm "
                    f"#{deleted_id}"
                ),

            details=
                {

                    "contract_id":
                        deleted_id,

                    "room_id":
                        deleted_room_id,

                    "room_code":
                        deleted_room_code,

                    "tenant_id":
                        deleted_tenant_id,

                    "start_date":
                        deleted_start_date.isoformat(),

                    "end_date":
                        (
                            deleted_end_date.isoformat()
                            if deleted_end_date
                            else None
                        ),

                    "monthly_rent":
                        deleted_monthly_rent,

                    "rent_billing_cycle_months":
                        deleted_rent_billing_cycle_months,

                    "rent_billing_anchor_year":
                        deleted_rent_billing_anchor_year,

                    "rent_billing_anchor_month":
                        deleted_rent_billing_anchor_month,

                    "deposit_required":
                        deleted_deposit_required,

                    "occupant_count":
                        deleted_occupant_count,

                    "previous_status":
                        "ACTIVE",

                },

            request=
                request,

        )


        db.delete(
            contract
        )


        db.commit()


    except IntegrityError as exc:

        db.rollback()

        raise HTTPException(
            status_code=
                status.HTTP_409_CONFLICT,

            detail=
                (
                    "Không thể xóa hợp đồng vì "
                    "đã có dữ liệu liên quan."
                ),
        ) from exc


    except Exception:

        db.rollback()

        raise


    return {

        "message":
            "Contract deleted successfully",

        "contract_id":
            deleted_id,

    }


# =========================================================
# DANH SÁCH KHÁCH ĐANG Ở TRONG HỢP ĐỒNG
#
# tenant_id trên Contract = khách chính
# contract_occupants = người ở cùng
# =========================================================

@router.get(
    "/{contract_id}/tenants",
    response_model=list[ContractTenantResponse],
    summary="View Contract Tenants",
)
def get_contract_tenants(
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


    primary_tenant = db.get(
        Tenant,
        contract.tenant_id,
    )


    result: list[
        ContractTenantResponse
    ] = []


    if primary_tenant is not None:

        result.append(
            ContractTenantResponse(
                id=
                    primary_tenant.id,

                full_name=
                    primary_tenant.full_name,

                phone=
                    primary_tenant.phone,

                email=
                    primary_tenant.email,

                citizen_id=
                    primary_tenant.citizen_id,

                note=
                    primary_tenant.note,

                role=
                    "PRIMARY",
            )
        )


    occupant_rows = db.scalars(
        select(
            ContractOccupant
        )
        .where(
            ContractOccupant.contract_id
            == contract.id,

            ContractOccupant.is_active
            == True,  # noqa: E712
        )
        .order_by(
            ContractOccupant.id
        )
    ).all()


    for occupant_row in occupant_rows:

        tenant = db.get(
            Tenant,
            occupant_row.tenant_id,
        )


        if tenant is None:
            continue


        result.append(
            ContractTenantResponse(
                id=
                    tenant.id,

                full_name=
                    tenant.full_name,

                phone=
                    tenant.phone,

                email=
                    tenant.email,

                citizen_id=
                    tenant.citizen_id,

                note=
                    tenant.note,

                role=
                    "OCCUPANT",
            )
        )


    return result


# =========================================================
# THÊM NGƯỜI Ở CÙNG
# =========================================================

@router.post(
    "/{contract_id}/occupants",
    response_model=ContractTenantResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add Contract Occupant",
)
def add_contract_occupant(
    contract_id: int,

    data: ContractOccupantAdd,

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

    contract = db.scalar(
        select(
            Contract
        )
        .where(
            Contract.id
            == contract_id
        )
        .with_for_update()
    )


    if contract is None:

        raise HTTPException(
            status_code=
                status.HTTP_404_NOT_FOUND,

            detail=
                "Contract not found",
        )


    if (
        contract.status
        != "ACTIVE"
    ):

        raise HTTPException(
            status_code=
                status.HTTP_400_BAD_REQUEST,

            detail=
                "Only ACTIVE contracts can receive occupants",
        )


    tenant = db.scalar(
        select(
            Tenant
        )
        .where(
            Tenant.id
            == data.tenant_id
        )
        .with_for_update()
    )


    if tenant is None:

        raise HTTPException(
            status_code=
                status.HTTP_404_NOT_FOUND,

            detail=
                "Tenant not found",
        )


    if (
        tenant.id
        == contract.tenant_id
    ):

        raise HTTPException(
            status_code=
                status.HTTP_400_BAD_REQUEST,

            detail=
                "Tenant is already the primary tenant",
        )


    primary_contract = db.scalar(
        select(
            Contract
        )
        .where(
            Contract.tenant_id
            == tenant.id,

            Contract.status
            == "ACTIVE",
        )
    )


    if primary_contract is not None:

        raise HTTPException(
            status_code=
                status.HTTP_409_CONFLICT,

            detail=
                (
                    "Tenant is already the primary tenant "
                    "of another active contract"
                ),
        )


    active_membership = db.scalar(
        select(
            ContractOccupant
        )
        .where(
            ContractOccupant.tenant_id
            == tenant.id,

            ContractOccupant.is_active
            == True,  # noqa: E712
        )
    )


    if active_membership is not None:

        if (
            active_membership.contract_id
            == contract.id
        ):

            raise HTTPException(
                status_code=
                    status.HTTP_400_BAD_REQUEST,

                detail=
                    "Tenant is already an occupant of this contract",
            )


        raise HTTPException(
            status_code=
                status.HTTP_409_CONFLICT,

            detail=
                (
                    "Tenant is already staying in "
                    "another active contract"
                ),
        )


    membership = db.scalar(
        select(
            ContractOccupant
        )
        .where(
            ContractOccupant.contract_id
            == contract.id,

            ContractOccupant.tenant_id
            == tenant.id,
        )
        .with_for_update()
    )


    if membership is None:

        membership = (
            ContractOccupant(
                contract_id=
                    contract.id,

                tenant_id=
                    tenant.id,

                is_active=
                    True,
            )
        )


        db.add(
            membership
        )


    else:

        membership.is_active = (
            True
        )

        membership.left_at = (
            None
        )


    # occupant_count vẫn giữ ý nghĩa tổng số người ở.
    # Khi đã tạo hồ sơ thật, bảo đảm count không nhỏ hơn
    # số tenant đang gắn với hợp đồng.
    active_additional_count = len(
        db.scalars(
            select(
                ContractOccupant
            )
            .where(
                ContractOccupant.contract_id
                == contract.id,

                ContractOccupant.is_active
                == True,  # noqa: E712
            )
        ).all()
    )


    # membership mới có thể chưa xuất hiện trong query
    # trước khi flush, nên cộng thêm nếu đang tạo mới/reactivate.
    projected_profile_count = (
        1
        +
        active_additional_count
        +
        (
            0
            if (
                membership.id is not None
                and
                membership.is_active
            )
            else 1
        )
    )


    contract.occupant_count = max(
        contract.occupant_count,
        projected_profile_count,
        2,
    )


    try:

        db.flush()


        # Sau flush tính lại chính xác số hồ sơ ACTIVE.
        active_additional_count = len(
            db.scalars(
                select(
                    ContractOccupant
                )
                .where(
                    ContractOccupant.contract_id
                    == contract.id,

                    ContractOccupant.is_active
                    == True,  # noqa: E712
                )
            ).all()
        )


        contract.occupant_count = max(
            contract.occupant_count,
            1 + active_additional_count,
        )


        record_audit_log(

            db=
                db,

            user=
                current_user,

            action=
                "ADD_CONTRACT_OCCUPANT",

            entity_type=
                "CONTRACT",

            entity_id=
                contract.id,

            description=
                (
                    f"Thêm khách {tenant.full_name} "
                    f"vào hợp đồng #{contract.id}"
                ),

            details=
                {

                    "contract_id":
                        contract.id,

                    "room_id":
                        contract.room_id,

                    "primary_tenant_id":
                        contract.tenant_id,

                    "occupant_tenant_id":
                        tenant.id,

                    "occupant_full_name":
                        tenant.full_name,

                    "occupant_count":
                        contract.occupant_count,

                },

            request=
                request,

        )


        db.commit()


    except IntegrityError as exc:

        db.rollback()

        raise HTTPException(
            status_code=
                status.HTTP_409_CONFLICT,

            detail=
                (
                    "Không thể thêm khách vào hợp đồng vì "
                    "khách đang thuộc một hợp đồng khác "
                    "hoặc dữ liệu bị xung đột."
                ),
        ) from exc


    except Exception:

        db.rollback()

        raise


    return ContractTenantResponse(
        id=
            tenant.id,

        full_name=
            tenant.full_name,

        phone=
            tenant.phone,

        email=
            tenant.email,

        citizen_id=
            tenant.citizen_id,

        note=
            tenant.note,

        role=
            "OCCUPANT",
    )


# =========================================================
# XÓA NGƯỜI Ở CÙNG KHỎI HỢP ĐỒNG
# =========================================================

@router.delete(
    "/{contract_id}/occupants/{tenant_id}",
    status_code=status.HTTP_200_OK,
    summary="Remove Contract Occupant",
)
def remove_contract_occupant(
    contract_id: int,
    tenant_id: int,

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

    contract = db.scalar(
        select(
            Contract
        )
        .where(
            Contract.id
            == contract_id
        )
        .with_for_update()
    )


    if contract is None:

        raise HTTPException(
            status_code=
                status.HTTP_404_NOT_FOUND,

            detail=
                "Contract not found",
        )


    if (
        tenant_id
        == contract.tenant_id
    ):

        raise HTTPException(
            status_code=
                status.HTTP_400_BAD_REQUEST,

            detail=
                (
                    "Primary tenant cannot be removed "
                    "with the occupant endpoint"
                ),
        )


    membership = db.scalar(
        select(
            ContractOccupant
        )
        .where(
            ContractOccupant.contract_id
            == contract.id,

            ContractOccupant.tenant_id
            == tenant_id,

            ContractOccupant.is_active
            == True,  # noqa: E712
        )
        .with_for_update()
    )


    if membership is None:

        raise HTTPException(
            status_code=
                status.HTTP_404_NOT_FOUND,

            detail=
                "Active occupant not found",
        )


    tenant = db.get(
        Tenant,
        tenant_id,
    )


    membership.is_active = (
        False
    )

    membership.left_at = (
        datetime.now(
            timezone.utc
        )
    )


    try:

        db.flush()


        active_additional_count = len(
            db.scalars(
                select(
                    ContractOccupant
                )
                .where(
                    ContractOccupant.contract_id
                    == contract.id,

                    ContractOccupant.is_active
                    == True,  # noqa: E712
                )
            ).all()
        )


        # Khi đã dùng hồ sơ tenant thật, count tối thiểu
        # bằng số profile đang gắn. Không ép giảm nếu admin
        # đang khai báo thêm người chưa có hồ sơ.
        contract.occupant_count = max(
            contract.occupant_count,
            1 + active_additional_count,
        )


        record_audit_log(

            db=
                db,

            user=
                current_user,

            action=
                "REMOVE_CONTRACT_OCCUPANT",

            entity_type=
                "CONTRACT",

            entity_id=
                contract.id,

            description=
                (
                    f"Xóa khách "
                    f"{tenant.full_name if tenant else tenant_id} "
                    f"khỏi hợp đồng #{contract.id}"
                ),

            details=
                {

                    "contract_id":
                        contract.id,

                    "room_id":
                        contract.room_id,

                    "occupant_tenant_id":
                        tenant_id,

                    "occupant_full_name":
                        (
                            tenant.full_name
                            if tenant
                            else None
                        ),

                    "remaining_profile_count":
                        1 + active_additional_count,

                },

            request=
                request,

        )


        db.commit()


    except Exception:

        db.rollback()

        raise


    return {

        "message":
            "Contract occupant removed successfully",

        "contract_id":
            contract.id,

        "tenant_id":
            tenant_id,

    }


# =========================================================
# KẾT THÚC HỢP ĐỒNG / TRẢ PHÒNG
# =========================================================

@router.post(
    "/{contract_id}/end",
    response_model=ContractEndResponse,
    summary="End Contract / Checkout",
)
def end_contract(
    contract_id: int,

    data: ContractEndRequest,

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

    contract = db.scalar(
        select(
            Contract
        )
        .where(
            Contract.id
            == contract_id
        )
        .with_for_update()
    )


    if contract is None:

        raise HTTPException(
            status_code=
                status.HTTP_404_NOT_FOUND,

            detail=
                "Contract not found",
        )


    if (
        contract.status
        != "ACTIVE"
    ):

        raise HTTPException(
            status_code=
                status.HTTP_400_BAD_REQUEST,

            detail=
                (
                    "Only ACTIVE contracts "
                    "can be ended"
                ),
        )


    room = db.scalar(
        select(
            Room
        )
        .where(
            Room.id
            == contract.room_id
        )
        .with_for_update()
    )


    if room is None:

        raise HTTPException(
            status_code=
                status.HTTP_404_NOT_FOUND,

            detail=
                "Room not found",
        )


    actual_end_date = (

        data.end_date
        if data.end_date is not None
        else date.today()

    )


    if (
        actual_end_date
        < contract.start_date
    ):

        raise HTTPException(
            status_code=
                status.HTTP_400_BAD_REQUEST,

            detail=
                (
                    "End date cannot be before "
                    "contract start date"
                ),
        )


    if (
        contract.move_in_electric_reading
        is not None
    ):

        if (
            data.move_out_electric_reading
            is None
        ):

            raise HTTPException(
                status_code=
                    status.HTTP_400_BAD_REQUEST,

                detail=
                    (
                        "Move-out electric reading "
                        "is required for this contract"
                    ),
            )


        if (
            data.move_out_electric_reading
            <
            contract.move_in_electric_reading
        ):

            raise HTTPException(
                status_code=
                    status.HTTP_400_BAD_REQUEST,

                detail=
                    (
                        "Move-out electric reading cannot "
                        "be less than move-in electric reading"
                    ),
            )


    deposit_balance = (
        calculate_deposit_balance(
            contract.id,
            db,
        )
    )


    # =====================================================
    # CHECKOUT SETTLEMENT FINALIZATION GUARD
    #
    # Legacy contracts without a prepared checkout keep
    # the previous allow_unsettled_deposit behavior.
    #
    # Once a checkout settlement exists, it becomes the
    # financial source of truth and cannot be bypassed.
    # =====================================================

    from backend.app.models.checkout_settlement import (
        CheckoutSettlement,
    )

    from backend.app.models.invoice import (
        Invoice,
    )

    from backend.app.models.payment import (
        Payment,
    )


    checkout_settlement = db.scalar(
        select(
            CheckoutSettlement
        )
        .where(
            CheckoutSettlement.contract_id
            == contract.id
        )
        .with_for_update()
    )


    checkout_invoice = None
    checkout_total_paid = None


    if checkout_settlement is not None:

        if data.allow_unsettled_deposit:

            raise HTTPException(
                status_code=
                    status.HTTP_409_CONFLICT,

                detail=(
                    "Checkout settlement cannot bypass "
                    "deposit or payment finalization."
                ),
            )


        if (
            checkout_settlement
            .deposit_execution_status
            != "APPLIED"
        ):

            raise HTTPException(
                status_code=
                    status.HTTP_409_CONFLICT,

                detail=(
                    "Checkout deposit plan has not been "
                    "applied yet."
                ),
            )


        if deposit_balance != 0:

            raise HTTPException(
                status_code=
                    status.HTTP_409_CONFLICT,

                detail=(
                    "Checkout deposit balance must be 0 "
                    "before ending the contract. "
                    f"Current balance: {deposit_balance}"
                ),
            )


        if (
            actual_end_date
            != checkout_settlement.checkout_date
        ):

            raise HTTPException(
                status_code=
                    status.HTTP_409_CONFLICT,

                detail=(
                    "End date must match the prepared "
                    "checkout date."
                ),
            )


        if (
            data.move_out_electric_reading
            != checkout_settlement
            .move_out_electric_reading
        ):

            raise HTTPException(
                status_code=
                    status.HTTP_409_CONFLICT,

                detail=(
                    "Move-out electric reading must match "
                    "the prepared checkout snapshot."
                ),
            )


        if checkout_settlement.invoice_id is None:

            raise HTTPException(
                status_code=
                    status.HTTP_409_CONFLICT,

                detail=(
                    "Prepared checkout has no settlement "
                    "invoice."
                ),
            )


        checkout_invoice = db.scalar(
            select(
                Invoice
            )
            .where(
                Invoice.id
                == checkout_settlement.invoice_id
            )
            .with_for_update()
        )


        if checkout_invoice is None:

            raise HTTPException(
                status_code=
                    status.HTTP_409_CONFLICT,

                detail=(
                    "Checkout settlement invoice "
                    "was not found."
                ),
            )


        if (
            checkout_invoice.total_amount
            != checkout_settlement.total_amount
        ):

            raise HTTPException(
                status_code=
                    status.HTTP_409_CONFLICT,

                detail=(
                    "Checkout invoice total no longer "
                    "matches the prepared snapshot."
                ),
            )


        if checkout_invoice.status != "ISSUED":

            raise HTTPException(
                status_code=
                    status.HTTP_409_CONFLICT,

                detail=(
                    "Checkout invoice must be ISSUED "
                    "before ending the contract."
                ),
            )


        checkout_payments = list(
            db.scalars(
                select(
                    Payment
                )
                .where(
                    Payment.invoice_id
                    == checkout_invoice.id
                )
                .order_by(
                    Payment.id
                )
                .with_for_update()
            ).all()
        )


        checkout_total_paid = sum(
            payment.amount
            for payment in checkout_payments
        )


        if (
            checkout_total_paid
            != checkout_invoice.total_amount
            or checkout_invoice.payment_status
            != "PAID"
        ):

            remaining = (
                checkout_invoice.total_amount
                - checkout_total_paid
            )

            raise HTTPException(
                status_code=
                    status.HTTP_409_CONFLICT,

                detail=(
                    "Checkout invoice must be fully paid "
                    "before ending the contract. "
                    f"Remaining balance: {remaining}"
                ),
            )


    elif (
        deposit_balance
        != 0
        and
        not data.allow_unsettled_deposit
    ):

        raise HTTPException(
            status_code=
                status.HTTP_400_BAD_REQUEST,

            detail=
                (
                    "Deposit has not been fully settled. "
                    f"Current balance: {deposit_balance}"
                ),
        )


    previous_end_date = (
        contract.end_date
    )


    contract.move_out_electric_reading = (
        data.move_out_electric_reading
    )


    contract.status = (
        "ENDED"
    )

    contract.end_date = (
        actual_end_date
    )

    room.status = (
        "VACANT"
    )


    active_occupants = db.scalars(
        select(
            ContractOccupant
        )
        .where(
            ContractOccupant.contract_id
            == contract.id,

            ContractOccupant.is_active
            == True,  # noqa: E712
        )
        .with_for_update()
    ).all()


    occupant_left_at = (
        datetime.now(
            timezone.utc
        )
    )


    for occupant in active_occupants:

        occupant.is_active = (
            False
        )

        occupant.left_at = (
            occupant_left_at
        )


    # =====================================================
    # AUDIT + COMMIT
    # =====================================================

    try:

        record_audit_log(

            db=
                db,

            user=
                current_user,

            action=
                "END_CONTRACT",

            entity_type=
                "CONTRACT",

            entity_id=
                contract.id,

            description=
                (
                    f"Kết thúc hợp đồng "
                    f"#{contract.id} "
                    f"của phòng {room.room_code}"
                ),

            details=
                {

                    "contract_id":
                        contract.id,

                    "room_id":
                        contract.room_id,

                    "room_code":
                        room.room_code,

                    "tenant_id":
                        contract.tenant_id,

                    "start_date":
                        contract.start_date.isoformat(),

                    "previous_end_date":
                        (
                            previous_end_date.isoformat()
                            if previous_end_date
                            else None
                        ),

                    "actual_end_date":
                        actual_end_date.isoformat(),

                    "monthly_rent":
                        contract.monthly_rent,

                    "rent_billing_cycle_months":
                        contract.rent_billing_cycle_months,

                    "rent_billing_anchor_year":
                        contract.rent_billing_anchor_year,

                    "rent_billing_anchor_month":
                        contract.rent_billing_anchor_month,

                    "deposit_required":
                        contract.deposit_required,

                    "deposit_balance":
                        deposit_balance,

                    "allow_unsettled_deposit":
                        data.allow_unsettled_deposit,

                    "checkout_settlement_id":
                        (
                            checkout_settlement.id
                            if checkout_settlement
                            else None
                        ),

                    "checkout_type":
                        (
                            checkout_settlement.checkout_type
                            if checkout_settlement
                            else None
                        ),

                    "checkout_deposit_execution_status":
                        (
                            checkout_settlement
                            .deposit_execution_status
                            if checkout_settlement
                            else None
                        ),

                    "checkout_invoice_id":
                        (
                            checkout_invoice.id
                            if checkout_invoice
                            else None
                        ),

                    "checkout_invoice_payment_status":
                        (
                            checkout_invoice.payment_status
                            if checkout_invoice
                            else None
                        ),

                    "checkout_total_paid":
                        checkout_total_paid,

                    "previous_status":
                        "ACTIVE",

                    "new_status":
                        "ENDED",

                    "room_previous_status":
                        "OCCUPIED",

                    "room_new_status":
                        "VACANT",

                    "ended_occupant_tenant_ids":
                        [
                            occupant.tenant_id
                            for occupant in active_occupants
                        ],

                },

            request=
                request,

        )


        db.commit()


        db.refresh(
            contract
        )


    except Exception:

        db.rollback()

        raise


    return ContractEndResponse(

        id=
            contract.id,

        room_id=
            contract.room_id,

        tenant_id=
            contract.tenant_id,

        start_date=
            contract.start_date,

        end_date=
            contract.end_date,

        move_in_electric_reading=
            contract.move_in_electric_reading,

        move_out_electric_reading=
            contract.move_out_electric_reading,

        monthly_rent=
            contract.monthly_rent,

        rent_billing_cycle_months=
            contract.rent_billing_cycle_months,

        rent_billing_anchor_year=
            contract.rent_billing_anchor_year,

        rent_billing_anchor_month=
            contract.rent_billing_anchor_month,

        deposit_required=
            contract.deposit_required,

        occupant_count=
            contract.occupant_count,

        status=
            contract.status,

        deposit_balance=
            deposit_balance,

    )
