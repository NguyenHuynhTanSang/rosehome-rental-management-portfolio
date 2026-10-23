from datetime import date, datetime, timedelta
from typing import Annotated
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.app.auth_dependencies import require_admin
from backend.app.dependencies import get_db
from backend.app.models.contract import Contract
from backend.app.models.contract_occupant import ContractOccupant
from backend.app.models.deposit_transaction import DepositTransaction
from backend.app.models.notification import Notification
from backend.app.models.tenant import Tenant
from backend.app.models.user import User
from backend.app.schemas.tenant import (
    TenantCreate,
    TenantResponse,
    TenantUpdate,
)


router = APIRouter(
    prefix="/tenants",
    tags=["Tenants"],
    dependencies=[
        Depends(require_admin),
    ],
)


TENANT_DELETE_RETENTION_DAYS = 30


# ==============================
# THÊM KHÁCH THUÊ
# ==============================

@router.post(
    "",
    response_model=TenantResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add Tenant",
)
def create_tenant(
    data: TenantCreate,
    db: Annotated[Session, Depends(get_db)],
):
    full_name = data.full_name.strip()

    if not full_name:
        raise HTTPException(
            status_code=400,
            detail="Tenant name cannot be empty",
        )

    citizen_id = (
        data.citizen_id.strip()
        if data.citizen_id
        else None
    )

    if citizen_id:
        existing = db.scalar(
            select(Tenant).where(
                Tenant.citizen_id == citizen_id
            )
        )

        if existing:
            raise HTTPException(
                status_code=400,
                detail="Citizen ID already exists",
            )

    tenant = Tenant(
        full_name=full_name,
        phone=(
            data.phone.strip()
            if data.phone
            else None
        ),
        email=(
            data.email.strip()
            if data.email
            else None
        ),
        citizen_id=citizen_id,
        note=(
            data.note.strip()
            if data.note
            else None
        ),
    )

    try:
        db.add(tenant)
        db.commit()
        db.refresh(tenant)

    except Exception:
        db.rollback()
        raise

    return tenant


# ==============================
# XEM DANH SÁCH KHÁCH THUÊ
# ==============================

@router.get(
    "",
    response_model=list[TenantResponse],
    summary="View All Tenants",
)
def get_tenants(
    db: Annotated[Session, Depends(get_db)],
):
    tenants = db.scalars(
        select(Tenant).order_by(
            Tenant.full_name
        )
    ).all()

    return tenants


# ==============================
# XEM CHI TIẾT KHÁCH THUÊ
# ==============================

@router.get(
    "/{tenant_id}",
    response_model=TenantResponse,
    summary="View Tenant Details",
)
def get_tenant(
    tenant_id: int,
    db: Annotated[Session, Depends(get_db)],
):
    tenant = db.get(
        Tenant,
        tenant_id,
    )

    if tenant is None:
        raise HTTPException(
            status_code=404,
            detail="Tenant not found",
        )

    return tenant


# ==============================
# SỬA KHÁCH THUÊ
# ==============================

@router.patch(
    "/{tenant_id}",
    response_model=TenantResponse,
    summary="Edit Tenant",
)
def update_tenant(
    tenant_id: int,
    data: TenantUpdate,
    db: Annotated[Session, Depends(get_db)],
):
    tenant = db.get(
        Tenant,
        tenant_id,
    )

    if tenant is None:
        raise HTTPException(
            status_code=404,
            detail="Tenant not found",
        )

    update_data = data.model_dump(
        exclude_unset=True
    )

    if "full_name" in update_data:
        full_name = (
            update_data["full_name"] or ""
        ).strip()

        if not full_name:
            raise HTTPException(
                status_code=400,
                detail="Tenant name cannot be empty",
            )

        tenant.full_name = full_name

    if "phone" in update_data:
        tenant.phone = (
            update_data["phone"].strip()
            if update_data["phone"]
            else None
        )

    if "email" in update_data:
        tenant.email = (
            update_data["email"].strip()
            if update_data["email"]
            else None
        )

    if "citizen_id" in update_data:
        citizen_id = (
            update_data["citizen_id"].strip()
            if update_data["citizen_id"]
            else None
        )

        if citizen_id:
            existing = db.scalar(
                select(Tenant).where(
                    Tenant.citizen_id == citizen_id,
                    Tenant.id != tenant_id,
                )
            )

            if existing:
                raise HTTPException(
                    status_code=400,
                    detail="Citizen ID already exists",
                )

        tenant.citizen_id = citizen_id

    if "note" in update_data:
        tenant.note = (
            update_data["note"].strip()
            if update_data["note"]
            else None
        )

    try:
        db.commit()
        db.refresh(tenant)

    except Exception:
        db.rollback()
        raise

    return tenant


# ==============================
# XÓA KHÁCH THUÊ
#
# Rule:
# - Chưa từng có lịch sử: xóa ngay.
# - Còn hợp đồng ACTIVE / đang ở cùng ACTIVE: không cho xóa.
# - Đã rời đi: phải đủ 30 ngày kể từ lần rời đi gần nhất.
# - Khi xóa khách chính, xóa lịch sử hợp đồng trực tiếp của khách,
#   giao dịch cọc / thông báo / người ở cùng thuộc các hợp đồng đó.
# - Hóa đơn và thanh toán vẫn được giữ vì đang gắn theo room/invoice,
#   không gắn trực tiếp vào tenant.
# ==============================

@router.delete(
    "/{tenant_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete Tenant",
)
def delete_tenant(
    tenant_id: int,
    db: Annotated[Session, Depends(get_db)],
):
    tenant = db.scalar(
        select(Tenant)
        .where(
            Tenant.id == tenant_id
        )
        .with_for_update()
    )

    if tenant is None:
        raise HTTPException(
            status_code=404,
            detail="Tenant not found",
        )

    primary_contracts = list(
        db.scalars(
            select(Contract)
            .where(
                Contract.tenant_id == tenant_id
            )
            .with_for_update()
        ).all()
    )

    occupant_memberships = list(
        db.scalars(
            select(ContractOccupant)
            .where(
                ContractOccupant.tenant_id == tenant_id
            )
            .with_for_update()
        ).all()
    )

    # ==============================
    # ACTIVE GUARDS
    # ==============================

    active_primary_contract = next(
        (
            contract
            for contract in primary_contracts
            if contract.status == "ACTIVE"
        ),
        None,
    )

    if active_primary_contract is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Không thể xóa khách thuê vì khách đang có "
                f"hợp đồng ACTIVE #{active_primary_contract.id}. "
                "Hãy kết thúc hợp đồng trước."
            ),
        )

    active_occupancy = next(
        (
            membership
            for membership in occupant_memberships
            if membership.is_active
        ),
        None,
    )

    if active_occupancy is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Không thể xóa khách thuê vì khách đang là "
                f"người ở cùng trong hợp đồng #{active_occupancy.contract_id}. "
                "Hãy xóa khách khỏi hợp đồng trước."
            ),
        )

    # ==============================
    # 30-DAY RETENTION
    # ==============================

    departure_dates: list[date] = []

    for contract in primary_contracts:
        if (
            contract.status != "ENDED"
            or contract.end_date is None
        ):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "Không thể xác định thời điểm xóa khách vì "
                    f"hợp đồng #{contract.id} chưa có ngày kết thúc hợp lệ."
                ),
            )

        departure_dates.append(
            contract.end_date
        )

    for membership in occupant_memberships:
        if membership.left_at is None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "Không thể xác định thời điểm xóa khách vì "
                    f"lịch sử người ở cùng của hợp đồng "
                    f"#{membership.contract_id} chưa có ngày rời đi."
                ),
            )

        departure_dates.append(
            membership.left_at.date()
        )

    latest_departure_date = (
        max(departure_dates)
        if departure_dates
        else None
    )

    eligible_delete_date = (
        latest_departure_date
        + timedelta(
            days=TENANT_DELETE_RETENTION_DAYS
        )
        if latest_departure_date is not None
        else None
    )

    today = datetime.now(
        ZoneInfo("Asia/Ho_Chi_Minh")
    ).date()

    if (
        eligible_delete_date is not None
        and today < eligible_delete_date
    ):
        days_remaining = (
            eligible_delete_date
            - today
        ).days

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Chưa thể xóa khách thuê. "
                f"Dữ liệu được giữ {TENANT_DELETE_RETENTION_DAYS} ngày "
                "sau lần rời đi gần nhất. "
                f"Có thể xóa từ {eligible_delete_date.isoformat()} "
                f"(còn {days_remaining} ngày)."
            ),
        )

    primary_contract_ids = [
        contract.id
        for contract in primary_contracts
    ]

    # ==============================
    # LINKED USER ACCOUNTS
    #
    # Nếu tenant đã có tài khoản TENANT thì xóa luôn tài khoản đó.
    # Không tự động xóa ADMIN dù dữ liệu bị cấu hình sai.
    # ==============================

    linked_users = list(
        db.scalars(
            select(User)
            .where(
                User.tenant_id == tenant_id
            )
            .with_for_update()
        ).all()
    )

    linked_admin = next(
        (
            user
            for user in linked_users
            if user.role == "ADMIN"
        ),
        None,
    )

    if linked_admin is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Không thể xóa khách vì hồ sơ đang liên kết "
                "với một tài khoản ADMIN. Hãy kiểm tra lại "
                "liên kết tài khoản trước."
            ),
        )

    deleted_notification_count = 0
    deleted_deposit_count = 0
    deleted_contract_occupant_count = 0
    deleted_contract_count = 0
    deleted_user_count = 0

    try:
        # ==============================
        # DELETE DATA BELONGING TO
        # PRIMARY CONTRACTS
        # ==============================

        for contract in primary_contracts:
            notifications = list(
                db.scalars(
                    select(Notification)
                    .where(
                        Notification.contract_id
                        == contract.id
                    )
                    .with_for_update()
                ).all()
            )

            for notification in notifications:
                db.delete(notification)
                deleted_notification_count += 1

            deposits = list(
                db.scalars(
                    select(DepositTransaction)
                    .where(
                        DepositTransaction.contract_id
                        == contract.id
                    )
                    .with_for_update()
                ).all()
            )

            for deposit in deposits:
                db.delete(deposit)
                deleted_deposit_count += 1

            contract_occupants = list(
                db.scalars(
                    select(ContractOccupant)
                    .where(
                        ContractOccupant.contract_id
                        == contract.id
                    )
                    .with_for_update()
                ).all()
            )

            for membership in contract_occupants:
                db.delete(membership)
                deleted_contract_occupant_count += 1

            # Xóa các bản ghi con trước để tránh vướng FK RESTRICT.
            db.flush()

            db.delete(contract)
            deleted_contract_count += 1

        # ==============================
        # DELETE THIS TENANT'S
        # OCCUPANT HISTORY IN OTHER
        # CONTRACTS
        # ==============================

        for membership in occupant_memberships:
            if (
                membership.contract_id
                in primary_contract_ids
            ):
                continue

            db.delete(membership)
            deleted_contract_occupant_count += 1

        # ==============================
        # DELETE LINKED TENANT USERS
        # ==============================

        for user in linked_users:
            db.delete(user)
            deleted_user_count += 1

        # Bảo đảm contract / occupant / user đã rời khỏi DB
        # trước khi xóa tenant gốc.
        db.flush()

        tenant_name = tenant.full_name

        db.delete(tenant)

        db.commit()

    except IntegrityError as exc:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Không thể xóa khách vì vẫn còn dữ liệu "
                "liên quan trong hệ thống. Không có dữ liệu "
                "nào được xóa."
            ),
        ) from exc

    except Exception:
        db.rollback()
        raise

    return {
        "message": "Tenant deleted successfully",
        "tenant_id": tenant_id,
        "full_name": tenant_name,
        "retention_days": TENANT_DELETE_RETENTION_DAYS,
        "latest_departure_date": (
            latest_departure_date.isoformat()
            if latest_departure_date is not None
            else None
        ),
        "deleted_contract_count": deleted_contract_count,
        "deleted_contract_occupant_count": (
            deleted_contract_occupant_count
        ),
        "deleted_deposit_count": deleted_deposit_count,
        "deleted_notification_count": (
            deleted_notification_count
        ),
        "deleted_user_count": deleted_user_count,
    }
