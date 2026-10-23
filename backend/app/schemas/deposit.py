from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class DepositTransactionCreate(BaseModel):
    transaction_type: Literal[
        "COLLECT",
        "REFUND",
        "DEDUCTION"
    ]

    amount: int = Field(
        gt=0
    )

    note: str | None = None


class DepositTransactionResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True
    )

    id: int
    contract_id: int
    transaction_type: str
    amount: int
    note: str | None
    created_at: datetime


class DepositSummaryResponse(BaseModel):
    contract_id: int

    required_amount: int

    total_collected: int
    total_refunded: int
    total_deducted: int
    total_forfeited: int

    current_balance: int