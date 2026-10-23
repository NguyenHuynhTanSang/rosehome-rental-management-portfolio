from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class CheckoutRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    room_id: int = Field(gt=0, strict=True)
    invoice_id: int | None = Field(default=None, gt=0, strict=True)
    checkout_date: date
    checkout_type: Literal["EARLY", "ON_TIME"]
    move_out_electric_reading: int = Field(ge=0, le=2147483647, strict=True)
    rent_mode: Literal["NONE", "FULL_MONTH", "PRORATED", "CUSTOM"]
    rent_period_start: date | None = None
    rent_period_end: date | None = None
    custom_rent_amount: int = Field(default=0, ge=0, le=1000000000000, strict=True)
    include_electricity: bool = True
    include_water: bool = True
    include_management: bool = False
    other_amount: int = Field(default=0, ge=0, le=1000000000000, strict=True)
    reason: str = Field(min_length=3, max_length=500)

    @model_validator(mode="after")
    def validate_choices(self):
        self.reason = self.reason.strip()
        if len(self.reason) < 3:
            raise ValueError("Please provide the settlement reason")
        if not 2020 <= self.checkout_date.year <= 2100:
            raise ValueError("Checkout year must be between 2020 and 2100")
        if self.rent_mode == "PRORATED" and (self.rent_period_start is None or self.rent_period_end is None):
            raise ValueError("Prorated rent requires both inclusive dates")
        return self


class CheckoutPrepareRequest(CheckoutRequest):
    preview_token: str = Field(pattern=r"^[0-9a-f]{64}$")
    confirmed: Literal[True]


class CheckoutDepositApplyRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    confirmed: Literal[True]


class CheckoutSnapshot(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    contract_id: int
    invoice_id: int | None
    source_invoice_id: int | None
    baseline_invoice_id: int
    checkout_date: date
    checkout_type: Literal["EARLY", "ON_TIME"] | None = None
    deposit_balance_at_prepare: int | None = None
    deposit_forfeit_amount: int | None = None
    deposit_offset_amount: int | None = None
    deposit_refund_amount: int | None = None
    tenant_due_after_deposit: int | None = None

    deposit_execution_status: Literal["PENDING", "APPLIED"] = "PENDING"
    deposit_forfeit_transaction_id: int | None = None
    deposit_deduction_transaction_id: int | None = None
    deposit_refund_transaction_id: int | None = None
    deposit_payment_id: int | None = None
    deposit_processed_at: datetime | None = None

    move_out_electric_reading: int
    electricity_old_reading: int
    electricity_new_reading: int
    electricity_consumption: int
    electricity_rate: int
    electricity_amount: int
    carried_electricity_amount: int
    electricity_enabled: bool
    rent_mode: str
    rent_amount: int
    rent_period_start: date | None
    rent_period_end: date | None
    water_amount: int
    management_amount: int
    other_amount: int
    total_amount: int
    reason: str
    status: str
    created_at: datetime
