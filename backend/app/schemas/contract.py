from datetime import date

from pydantic import BaseModel, ConfigDict, Field


class ContractCreate(BaseModel):
    room_id: int
    tenant_id: int

    start_date: date
    end_date: date | None = None

    move_in_electric_reading: int = Field(
        ge=0,
    )

    monthly_rent: int = Field(
        ge=0
    )

    # 1 = mỗi tháng, 3 = thu gộp 3 tháng/lần, ...
    rent_billing_cycle_months: int = Field(
        default=1,
        ge=1,
        le=12,
    )

    # Nếu để trống, backend lấy tháng/năm của start_date.
    rent_billing_anchor_year: int | None = Field(
        default=None,
        ge=2020,
        le=2100,
    )

    rent_billing_anchor_month: int | None = Field(
        default=None,
        ge=1,
        le=12,
    )

    deposit_required: int = Field(
        default=0,
        ge=0
    )

    occupant_count: int = Field(
        default=1,
        ge=1
    )


class ContractResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True
    )

    id: int

    room_id: int
    tenant_id: int

    start_date: date
    end_date: date | None

    move_in_electric_reading: int | None
    move_out_electric_reading: int | None

    monthly_rent: int

    rent_billing_cycle_months: int
    rent_billing_anchor_year: int
    rent_billing_anchor_month: int

    deposit_required: int
    occupant_count: int

    status: str


class ContractEndRequest(BaseModel):
    end_date: date | None = None

    move_out_electric_reading: int | None = Field(
        default=None,
        ge=0,
    )

    # False = phải xử lý hết cọc trước khi trả phòng
    # True = vẫn cho kết thúc dù còn đang giữ cọc
    allow_unsettled_deposit: bool = False


class ContractEndResponse(ContractResponse):
    deposit_balance: int


class ContractUpdate(BaseModel):
    move_in_electric_reading: int | None = Field(default=None, ge=0, le=2147483647, strict=True)

    room_id: int | None = None
    tenant_id: int | None = None
    start_date: date | None = None
    end_date: date | None = None

    monthly_rent: int | None = Field(
        default=None,
        ge=0,
    )

    rent_billing_cycle_months: int | None = Field(
        default=None,
        ge=1,
        le=12,
    )

    rent_billing_anchor_year: int | None = Field(
        default=None,
        ge=2020,
        le=2100,
    )

    rent_billing_anchor_month: int | None = Field(
        default=None,
        ge=1,
        le=12,
    )

    deposit_required: int | None = Field(
        default=None,
        ge=0,
    )

    occupant_count: int | None = Field(
        default=None,
        ge=1,
    )


class ContractOccupantAdd(BaseModel):
    tenant_id: int


class ContractTenantResponse(BaseModel):
    id: int
    full_name: str
    phone: str | None
    email: str | None
    citizen_id: str | None
    note: str | None

    role: str
