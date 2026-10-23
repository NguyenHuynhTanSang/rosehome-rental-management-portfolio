from datetime import date

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
)
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from backend.app.auth_dependencies import require_admin
from backend.app.database import SessionLocal
from backend.app.models.contract import Contract
from backend.app.models.notification import Notification
from backend.app.schemas.notification import (
    NotificationRead,
    NotificationReadAllResult,
    NotificationReadResult,
    NotificationSyncResult,
    NotificationUnreadCount,
)


router = APIRouter(
    prefix="/notifications",
    tags=["Notifications"],
    dependencies=[
        Depends(require_admin),
    ],
)


def get_db():

    db = SessionLocal()

    try:
        yield db

    finally:
        db.close()


def build_expiry_message(
    room_code: str,
    days_remaining: int,
    stage: str,
) -> tuple[str, str]:

    title = "Hợp đồng sắp hết hạn"

    if stage == "7_DAYS":

        if days_remaining == 1:
            message = (
                f"Hợp đồng phòng {room_code} "
                "sẽ hết hạn sau 1 ngày."
            )

        else:
            message = (
                f"Hợp đồng phòng {room_code} "
                f"sẽ hết hạn sau {days_remaining} ngày."
            )

    else:

        message = (
            f"Hợp đồng phòng {room_code} "
            "sẽ hết hạn trong vòng 1 tháng."
        )

    return title, message


def sync_contract_expiry_notifications(
    db: Session,
) -> NotificationSyncResult:

    today = date.today()

    created_count = 0
    marked_stale_as_read = 0


    # ==========================================================
    # 1. ĐÁNH DẤU CÁC THÔNG BÁO CŨ KHÔNG CÒN ĐÚNG LÀ ĐÃ ĐỌC
    #
    # Ví dụ:
    # - Hợp đồng đã kết thúc
    # - Ngày hết hạn đã được sửa/gia hạn
    # - Hợp đồng không còn end_date
    #
    # Nhờ vậy khi gia hạn hợp đồng, thông báo cũ không còn nằm
    # trong danh sách chưa đọc.
    # ==========================================================

    unread_expiry_notifications = (
        db.scalars(
            select(Notification)
            .where(
                Notification.notification_type
                == "CONTRACT_EXPIRY",
                Notification.is_read.is_(False),
            )
        )
        .all()
    )


    for notification in unread_expiry_notifications:

        contract = db.get(
            Contract,
            notification.contract_id,
        )

        is_stale = (
            contract is None
            or contract.status != "ACTIVE"
            or contract.end_date is None
            or contract.end_date
            != notification.contract_end_date
        )

        if is_stale:

            notification.is_read = True
            marked_stale_as_read += 1


    # ==========================================================
    # 2. TÌM HỢP ĐỒNG ACTIVE CÓ NGÀY KẾT THÚC
    # ==========================================================

    contracts = (
        db.scalars(
            select(Contract)
            .options(
                joinedload(
                    Contract.room
                )
            )
            .where(
                Contract.status == "ACTIVE",
                Contract.end_date.is_not(None),
            )
        )
        .all()
    )


    for contract in contracts:

        if contract.end_date is None:
            continue


        days_remaining = (
            contract.end_date
            -
            today
        ).days


        # Không tạo notification mới nếu đã hết hạn
        # hoặc đúng ngày hết hạn.
        if days_remaining <= 0:
            continue


        reminder_stage: str | None = None


        # Nếu chỉ còn <= 7 ngày thì chỉ tạo mốc 7 ngày.
        # Không tạo bù mốc 30 ngày để tránh spam.
        if days_remaining <= 7:

            reminder_stage = "7_DAYS"


        # Nếu còn từ 8 -> 30 ngày thì tạo mốc 1 tháng.
        elif days_remaining <= 30:

            reminder_stage = "30_DAYS"


        if reminder_stage is None:
            continue


        existing = db.scalar(
            select(Notification)
            .where(
                Notification.contract_id
                == contract.id,
                Notification.reminder_stage
                == reminder_stage,
                Notification.contract_end_date
                == contract.end_date,
            )
        )


        if existing:
            continue


        room_code = (
            contract.room.room_code
            if contract.room
            else f"#{contract.room_id}"
        )


        title, message = (
            build_expiry_message(
                room_code=room_code,
                days_remaining=days_remaining,
                stage=reminder_stage,
            )
        )


        notification = Notification(
            notification_type="CONTRACT_EXPIRY",
            contract_id=contract.id,
            reminder_stage=reminder_stage,
            contract_end_date=contract.end_date,
            title=title,
            message=message,
            is_read=False,
        )


        db.add(
            notification
        )

        created_count += 1


    db.commit()


    return NotificationSyncResult(
        created_count=created_count,
        marked_stale_as_read=marked_stale_as_read,
    )


def notification_to_schema(
    notification: Notification,
) -> NotificationRead:

    contract = notification.contract

    days_remaining = (
        notification.contract_end_date
        -
        date.today()
    ).days


    room_id = (
        contract.room_id
        if contract
        else 0
    )


    room_code = (
        contract.room.room_code
        if contract
        and contract.room
        else f"#{room_id}"
    )


    return NotificationRead(
        id=notification.id,
        notification_type=notification.notification_type,

        contract_id=notification.contract_id,
        room_id=room_id,
        room_code=room_code,

        reminder_stage=notification.reminder_stage,
        contract_end_date=notification.contract_end_date,
        days_remaining=days_remaining,

        title=notification.title,
        message=notification.message,

        is_read=notification.is_read,
        created_at=notification.created_at,
    )


@router.post(
    "/sync",
    response_model=NotificationSyncResult,
    summary="Check and create contract expiry notifications",
)
def sync_notifications(
    db: Session = Depends(get_db),
):

    return sync_contract_expiry_notifications(
        db
    )


@router.get(
    "/unread-count",
    response_model=NotificationUnreadCount,
    summary="Get unread notification count",
)
def get_unread_count(
    db: Session = Depends(get_db),
):

    sync_contract_expiry_notifications(
        db
    )


    unread_count = db.scalar(
        select(
            func.count(
                Notification.id
            )
        )
        .where(
            Notification.is_read.is_(
                False
            )
        )
    ) or 0


    return NotificationUnreadCount(
        unread_count=unread_count
    )


@router.get(
    "",
    response_model=list[NotificationRead],
    summary="Get notifications",
)
def get_notifications(
    unread_only: bool = Query(
        default=False
    ),
    limit: int = Query(
        default=50,
        ge=1,
        le=200,
    ),
    db: Session = Depends(get_db),
):

    sync_contract_expiry_notifications(
        db
    )


    statement = (
        select(Notification)
        .options(
            joinedload(
                Notification.contract
            )
            .joinedload(
                Contract.room
            )
        )
        .order_by(
            Notification.created_at.desc(),
            Notification.id.desc(),
        )
        .limit(limit)
    )


    if unread_only:

        statement = statement.where(
            Notification.is_read.is_(
                False
            )
        )


    notifications = (
        db.scalars(
            statement
        )
        .all()
    )


    return [
        notification_to_schema(
            notification
        )
        for notification
        in notifications
    ]


@router.patch(
    "/read-all",
    response_model=NotificationReadAllResult,
    summary="Mark all notifications as read",
)
def mark_all_notifications_as_read(
    db: Session = Depends(get_db),
):

    notifications = (
        db.scalars(
            select(Notification)
            .where(
                Notification.is_read.is_(
                    False
                )
            )
        )
        .all()
    )


    for notification in notifications:
        notification.is_read = True


    db.commit()


    return NotificationReadAllResult(
        message="Đã đánh dấu tất cả thông báo là đã đọc.",
        updated_count=len(
            notifications
        ),
    )


@router.patch(
    "/{notification_id}/read",
    response_model=NotificationReadResult,
    summary="Mark one notification as read",
)
def mark_notification_as_read(
    notification_id: int,
    db: Session = Depends(get_db),
):

    notification = db.get(
        Notification,
        notification_id,
    )


    if not notification:

        raise HTTPException(
            status_code=404,
            detail="Không tìm thấy thông báo.",
        )


    notification.is_read = True

    db.commit()


    return NotificationReadResult(
        message="Đã đánh dấu thông báo là đã đọc.",
        notification_id=notification.id,
    )
