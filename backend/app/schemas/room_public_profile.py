from datetime import date

from pydantic import (
    BaseModel,
    Field,
)


# =========================================================
# SAVE PUBLIC PROFILE
# =========================================================

class RoomPublicProfileSave(
    BaseModel
):

    is_visible: bool = False

    monthly_rent: (
        int
        | None
    ) = Field(
        default=None,
        ge=0,
    )

    area_m2: (
        int
        | None
    ) = Field(
        default=None,
        gt=0,
    )

    max_occupants: (
        int
        | None
    ) = Field(
        default=None,
        gt=0,
    )

    available_from: (
        date
        | None
    ) = None

    deposit_months: int = Field(
        default=1,
        ge=0,
    )

    parking_fee: int = Field(
        default=0,
        ge=0,
    )

    wifi_fee: int = Field(
        default=0,
        ge=0,
    )

    amenities: list[str] = Field(
        default_factory=list,
    )

    furniture: list[str] = Field(
        default_factory=list,
    )


# =========================================================
# ADMIN RESPONSE
# =========================================================

class RoomPublicProfileAdminResponse(
    BaseModel
):

    id: (
        int
        | None
    )

    room_id: int

    room_code: str

    is_visible: bool

    monthly_rent: (
        int
        | None
    )

    area_m2: (
        int
        | None
    )

    max_occupants: (
        int
        | None
    )

    available_from: (
        date
        | None
    )

    deposit_months: int

    parking_fee: int

    wifi_fee: int

    amenities: list[str]

    furniture: list[str]


# =========================================================
# ADMIN LIST ITEM
# =========================================================

class RoomPublicProfileListItem(
    BaseModel
):

    room_id: int

    room_code: str

    floor: (
        int
        | None
    )

    room_status: str

    is_visible: bool

    monthly_rent: (
        int
        | None
    )

    area_m2: (
        int
        | None
    )

    max_occupants: (
        int
        | None
    )

    available_from: (
        date
        | None
    )