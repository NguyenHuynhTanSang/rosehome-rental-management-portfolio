from pydantic import BaseModel, ConfigDict, Field


class MeterReadingCreate(BaseModel):
    room_id: int

    year: int = Field(ge=2020, le=2100)
    month: int = Field(ge=1, le=12)

    new_reading: int = Field(ge=0)

    # Chỉ cần nhập số điện cũ ở lần đầu tiên
    old_reading: int | None = Field(default=None, ge=0)


class MeterReadingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    room_id: int
    year: int
    month: int
    old_reading: int
    new_reading: int
    consumption: int

class MeterReadingBulkItem(BaseModel):
    room_id: int

    new_reading: int = Field(
        ge=0
    )

    # Chỉ cần nếu phòng chưa từng có dữ liệu điện
    old_reading: int | None = Field(
        default=None,
        ge=0
    )


class MeterReadingBulkCreate(BaseModel):
    year: int = Field(
        ge=2020,
        le=2100
    )

    month: int = Field(
        ge=1,
        le=12
    )

    readings: list[MeterReadingBulkItem]