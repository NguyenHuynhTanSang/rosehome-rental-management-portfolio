from __future__ import annotations

from typing import Any

from fastapi import Request
from sqlalchemy.orm import Session

from backend.app.models.audit_log import AuditLog
from backend.app.models.user import User


# =========================================================
# CÁC FIELD KHÔNG ĐƯỢC GHI VÀO AUDIT LOG
# =========================================================

SENSITIVE_KEYS = {
    "password",
    "password_hash",
    "access_token",
    "refresh_token",
    "token",
    "authorization",
    "api_key",
    "secret",
    "secret_key",
    "jwt",
    "citizen_id",
}


# =========================================================
# SANITIZE DETAILS
# =========================================================

def sanitize_audit_details(
    value: Any,
) -> Any:

    """
    Loại bỏ dữ liệu nhạy cảm trước khi
    ghi vào audit_logs.

    Hàm chạy đệ quy cho:
    - dict
    - list
    - tuple
    """

    if isinstance(
        value,
        dict,
    ):

        result = {}


        for key, item in (
            value.items()
        ):

            normalized_key = (
                str(key)
                .strip()
                .lower()
            )


            if (
                normalized_key
                in SENSITIVE_KEYS
            ):

                result[
                    str(key)
                ] = "[REDACTED]"

                continue


            result[
                str(key)
            ] = sanitize_audit_details(
                item
            )


        return result


    if isinstance(
        value,
        list,
    ):

        return [
            sanitize_audit_details(
                item
            )

            for item
            in value
        ]


    if isinstance(
        value,
        tuple,
    ):

        return [
            sanitize_audit_details(
                item
            )

            for item
            in value
        ]


    return value


# =========================================================
# GET REQUEST IP
# =========================================================

def get_request_ip(
    request: Request | None,
) -> str | None:

    if request is None:

        return None


    if request.client is None:

        return None


    return (
        request.client.host
    )


# =========================================================
# RECORD AUDIT LOG
# =========================================================

def record_audit_log(
    db: Session,
    user: User,
    action: str,
    entity_type: str,
    entity_id: int | str | None = None,
    description: str | None = None,
    details: dict[str, Any] | None = None,
    request: Request | None = None,
) -> AuditLog:

    """
    Tạo Audit Log trong cùng transaction
    với thao tác nghiệp vụ.

    Hàm này KHÔNG tự commit.

    Endpoint/service gọi hàm này nên commit
    transaction sau khi đã thêm AuditLog,
    để dữ liệu nghiệp vụ và audit log
    được lưu cùng nhau.
    """

    clean_action = (
        action
        .strip()
        .upper()
    )


    clean_entity_type = (
        entity_type
        .strip()
        .upper()
    )


    if not clean_action:

        raise ValueError(
            "Audit action không được để trống."
        )


    if not clean_entity_type:

        raise ValueError(
            "Audit entity_type không được để trống."
        )


    safe_details = (

        sanitize_audit_details(
            details
        )

        if details
        is not None

        else None

    )


    audit_log = AuditLog(

        user_id=
            user.id,

        actor_email=
            user.email,

        action=
            clean_action,

        entity_type=
            clean_entity_type,

        entity_id=(
            str(
                entity_id
            )

            if entity_id
            is not None

            else None
        ),

        description=(
            description.strip()

            if description
            and description.strip()

            else None
        ),

        details=
            safe_details,

        ip_address=
            get_request_ip(
                request
            ),

    )


    db.add(
        audit_log
    )


    # flush để audit_log.id có thể được tạo
    # nhưng chưa commit transaction.

    db.flush()


    return audit_log