from datetime import datetime
from typing import Any

from pydantic import BaseModel


class AuditLogResponse(BaseModel):

    id: int

    user_id: int | None

    actor_email: str

    action: str

    entity_type: str

    entity_id: str | None

    description: str | None

    details: dict[str, Any] | None

    ip_address: str | None

    created_at: datetime


class AuditLogListResponse(BaseModel):

    total_count: int

    items: list[AuditLogResponse]