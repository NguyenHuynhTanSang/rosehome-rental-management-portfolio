from pydantic import BaseModel, ConfigDict, Field


class TenantCreate(BaseModel):
    full_name: str = Field(
        min_length=2,
        max_length=100
    )

    phone: str | None = Field(
        default=None,
        max_length=20
    )

    email: str | None = Field(
        default=None,
        max_length=120
    )

    citizen_id: str | None = Field(
        default=None,
        max_length=30
    )

    note: str | None = None


class TenantResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True
    )

    id: int
    full_name: str
    phone: str | None
    email: str | None
    citizen_id: str | None
    note: str | None

class TenantUpdate(BaseModel):
    full_name: str | None = None
    phone: str | None = None
    email: str | None = None
    citizen_id: str | None = None
    note: str | None = None