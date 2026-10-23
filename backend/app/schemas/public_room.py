from datetime import date

from pydantic import (
    BaseModel,
    Field,
)


class PublicRoomListItem(
    BaseModel
):

    id: int

    room_code: str

    floor: (
        int
        | None
    )

    description: (
        str
        | None
    )

    public_status: str

    monthly_rent: int

    area_m2: int

    max_occupants: int

    available_from: (
        date
        | None
    )

    deposit_months: int

    parking_fee: int

    wifi_fee: int

    images: list[str] = Field(
        default_factory=list
    )


class PublicRoomDetailResponse(
    PublicRoomListItem
):

    electricity_rate: (
        int
        | None
    )

    water_fee: (
        int
        | None
    )

    management_fee: (
        int
        | None
    )

    amenities: list[str] = Field(
        default_factory=list
    )

    furniture: list[str] = Field(
        default_factory=list
    )