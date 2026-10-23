from datetime import datetime
from typing import Literal

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
)


class PaymentCreate(
    BaseModel
):

    # ==============================
    # AMOUNT
    # ==============================

    amount: int = Field(
        gt=0,
    )


    # ==============================
    # METHOD
    # ==============================

    payment_method: Literal[
        "CASH",
        "BANK_TRANSFER",
        "OTHER",
    ] = "CASH"


    # ==============================
    # BANK TRANSACTION ID
    #
    # Đây là mã do ngân hàng tạo,
    # KHÔNG phải mã RH của Rosehome.
    #
    # Ví dụ:
    # FT260828123456
    # ==============================

    transaction_reference: (
        str
        |
        None
    ) = Field(

        default=None,

        max_length=100,

    )


    # ==============================
    # NOTE
    # ==============================

    note: (
        str
        |
        None
    ) = Field(

        default=None,

        max_length=500,

    )


    # ==============================
    # NORMALIZE TEXT
    # ==============================

    @field_validator(
        "transaction_reference",
        "note",
        mode="before",
    )
    @classmethod
    def normalize_optional_text(
        cls,
        value,
    ):

        if value is None:
            return None


        if not isinstance(
            value,
            str,
        ):

            return value


        cleaned = (
            value
            .strip()
        )


        if not cleaned:
            return None


        return cleaned


class PaymentUpdate(
    BaseModel
):

    # ==============================
    # BANK TRANSACTION ID
    #
    # Chỉ cập nhật thông tin bổ sung
    # của Payment.
    #
    # Không cho phép sửa:
    # - amount
    # - invoice_id
    # - paid_at
    # - payment status
    # ==============================

    transaction_reference: (
        str
        |
        None
    ) = Field(

        default=None,

        max_length=100,

    )


    # ==============================
    # NOTE
    # ==============================

    note: (
        str
        |
        None
    ) = Field(

        default=None,

        max_length=500,

    )


    # ==============================
    # NORMALIZE TEXT
    # ==============================

    @field_validator(
        "transaction_reference",
        "note",
        mode="before",
    )
    @classmethod
    def normalize_optional_text(
        cls,
        value,
    ):

        if value is None:
            return None


        if not isinstance(
            value,
            str,
        ):

            return value


        cleaned = (
            value
            .strip()
        )


        if not cleaned:
            return None


        return cleaned


class PaymentResponse(
    BaseModel
):

    model_config = ConfigDict(
        from_attributes=True
    )


    # ==============================
    # ID
    # ==============================

    id: int

    invoice_id: int


    # ==============================
    # PAYMENT
    # ==============================

    amount: int

    payment_method: str


    # ==============================
    # BANK TRANSACTION ID
    # ==============================

    transaction_reference: (
        str
        |
        None
    )


    # ==============================
    # RECEIPT
    # ==============================

    receipt_file_key: (
        str
        |
        None
    )


    receipt_original_name: (
        str
        |
        None
    )


    # ==============================
    # CONFIRMED BY
    # ==============================

    confirmed_by: (
        str
        |
        None
    )


    # ==============================
    # NOTE
    # ==============================

    note: (
        str
        |
        None
    )


    # ==============================
    # TIME
    # ==============================

    paid_at: datetime
