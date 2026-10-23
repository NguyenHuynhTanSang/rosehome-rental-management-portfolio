from datetime import datetime

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
)


class UserResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True
    )

    id: int

    email: EmailStr

    role: str

    is_active: bool

    tenant_id: int | None

    created_at: datetime


class UserCreate(BaseModel):
    email: EmailStr

    password: str

    role: str = "ADMIN"

    tenant_id: int | None = None