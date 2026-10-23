from typing import Annotated

from fastapi import (
    APIRouter,
    Depends,
    Query,
)

from sqlalchemy import (
    func,
    or_,
    select,
)

from sqlalchemy.orm import Session


from backend.app.auth_dependencies import (
    require_admin,
)

from backend.app.dependencies import (
    get_db,
)

from backend.app.models.audit_log import (
    AuditLog,
)

from backend.app.schemas.audit_log import (
    AuditLogListResponse,
    AuditLogResponse,
)


router = APIRouter(
    prefix="/audit-logs",
    tags=["Audit Logs"],
    dependencies=[
        Depends(require_admin),
    ],
)


@router.get(
    "",
    response_model=AuditLogListResponse,
    summary="View Audit Logs",
)
def get_audit_logs(

    db: Annotated[
        Session,
        Depends(get_db),
    ],

    action: str | None = Query(
        default=None,
    ),

    entity_type: str | None = Query(
        default=None,
    ),

    search: str | None = Query(
        default=None,
        max_length=200,
    ),

    limit: int = Query(
        default=50,
        ge=1,
        le=200,
    ),

    offset: int = Query(
        default=0,
        ge=0,
    ),

):

    filters = []


    if action:

        filters.append(
            AuditLog.action
            ==
            action.strip().upper()
        )


    if entity_type:

        filters.append(
            AuditLog.entity_type
            ==
            entity_type.strip().upper()
        )


    if (
        search
        and
        search.strip()
    ):

        keyword = (
            f"%{search.strip()}%"
        )


        filters.append(

            or_(

                AuditLog.actor_email
                .ilike(keyword),

                AuditLog.action
                .ilike(keyword),

                AuditLog.entity_type
                .ilike(keyword),

                AuditLog.entity_id
                .ilike(keyword),

                AuditLog.description
                .ilike(keyword),

            )

        )


    total_count = int(

        db.scalar(

            select(
                func.count(
                    AuditLog.id
                )
            )

            .where(
                *filters
            )

        )

        or 0

    )


    rows = list(

        db.scalars(

            select(
                AuditLog
            )

            .where(
                *filters
            )

            .order_by(
                AuditLog.created_at.desc(),
                AuditLog.id.desc(),
            )

            .offset(
                offset
            )

            .limit(
                limit
            )

        ).all()

    )


    return AuditLogListResponse(

        total_count=
            total_count,

        items=[

            AuditLogResponse(

                id=
                    row.id,

                user_id=
                    row.user_id,

                actor_email=
                    row.actor_email,

                action=
                    row.action,

                entity_type=
                    row.entity_type,

                entity_id=
                    row.entity_id,

                description=
                    row.description,

                details=
                    row.details,

                ip_address=
                    row.ip_address,

                created_at=
                    row.created_at,

            )

            for row
            in rows

        ],

    )
