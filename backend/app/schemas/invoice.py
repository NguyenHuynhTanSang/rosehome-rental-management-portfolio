from datetime import datetime
from backend.app.schemas.checkout_settlement import CheckoutSnapshot
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from backend.app.schemas.payment import PaymentResponse


class ExtraInvoiceItemCreate(BaseModel):
    description: str = Field(min_length=1, max_length=150)
    amount: int = Field(ge=0)


class InvoiceTransitionReading(BaseModel):
    room_id: int
    current_reading: int = Field(ge=0, le=2147483647, strict=True)


class InvoiceGenerate(BaseModel):
    electricity_transition_new_reading: int | None = Field(default=None, ge=0, le=2147483647, strict=True)

    room_id: int

    year: int = Field(ge=2020, le=2100)
    month: int = Field(ge=1, le=12)

    # Tạm thời cho nhập tiền phòng tại đây.
    # Sau này khi làm contract API, hệ thống sẽ tự lấy từ hợp đồng.
    monthly_rent: int | None = Field(
        default=None,
        ge=0,
    )

    # Nếu để trống -> lấy giá mặc định của phòng
    electricity_rate: int | None = Field(default=None, ge=0)
    water_fee: int | None = Field(default=None, ge=0)
    management_fee: int | None = Field(default=None, ge=0)

    # Chỉ dùng khi tháng này có thu cọc
    deposit_amount: int = Field(default=0, ge=0)

    # Ví dụ giảm 200k -> nhập 200000
    discount_amount: int = Field(default=0, ge=0)

    extra_items: list[ExtraInvoiceItemCreate] = []

    note: str | None = None


class InvoiceItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    item_type: str
    description: str

    quantity: int | None
    unit: str | None
    unit_price: int | None

    amount: int


class InvoiceResponse(BaseModel):
    checkout_settlement: CheckoutSnapshot | None = None
    model_config = ConfigDict(from_attributes=True)

    id: int
    room_id: int

    year: int
    month: int

    electricity_period_year: int | None
    electricity_period_month: int | None

    electricity_transition_old_reading: int | None
    electricity_transition_new_reading: int | None

    meter_reading_id: int | None

    version: int

    replaces_invoice_id: int | None

    status: str
    payment_status: str

    # Mã RH cố định của hóa đơn sau khi phát hành.
    transfer_reference: str | None

    total_amount: int

    note: str | None

    cancelled_reason: str | None
    cancelled_at: datetime | None

    items: list[InvoiceItemResponse]
    payments: list[PaymentResponse]


class InvoiceItemUpdate(BaseModel):
    description: str | None = Field(
        default=None,
        min_length=1,
        max_length=150,
    )

    quantity: int | None = Field(
        default=None,
        ge=0,
    )

    unit: str | None = Field(
        default=None,
        max_length=20,
    )

    unit_price: int | None = Field(
        default=None,
        ge=0,
    )

    amount: int | None = None


class InvoiceItemCreate(BaseModel):
    item_type: Literal[
        "OTHER",
        "DEPOSIT",
        "DISCOUNT",
    ] = "OTHER"

    description: str = Field(
        min_length=1,
        max_length=150,
    )

    amount: int = Field(
        ge=0,
    )


class InvoiceCancelRequest(BaseModel):
    reason: str = Field(
        min_length=3,
        max_length=500,
    )


class InvoiceBulkGenerate(BaseModel):
    transition_readings: list[InvoiceTransitionReading] = Field(default_factory=list)

    year: int = Field(
        ge=2020,
        le=2100,
    )

    month: int = Field(
        ge=1,
        le=12,
    )


class InvoiceBulkResult(BaseModel):
    created_count: int
    skipped_count: int

    created_invoice_ids: list[int]
    skipped_rooms: list[str]
