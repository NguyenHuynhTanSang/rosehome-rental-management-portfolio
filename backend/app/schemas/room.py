from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
)



# ==============================
# ROOM FEE SETTING RESPONSE
# ==============================

class RoomFeeSettingResponse(
    BaseModel
):

    model_config = ConfigDict(
        from_attributes=True
    )


    id: int

    room_id: int


    electricity_rate: int

    water_fee: int

    management_fee: int


# ==============================
# CREATE ROOM
# ==============================

class RoomCreate(
    BaseModel
):

    room_code: str = Field(

        min_length=1,

        max_length=20,

    )


    floor: (
        int
        |
        None
    ) = Field(

        default=None,

        ge=0,

    )


    description: (
        str
        |
        None
    ) = None


    electricity_rate: int = Field(

        default=4000,

        ge=0,

    )


    water_fee: int = Field(

        default=300000,

        ge=0,

    )


    management_fee: int = Field(

        default=250000,

        ge=0,

    )


# ==============================
# ROOM RESPONSE
# ==============================

class RoomResponse(
    BaseModel
):

    model_config = ConfigDict(
        from_attributes=True
    )


    id: int

    room_code: str


    floor: (
        int
        |
        None
    )


    status: str


    description: (
        str
        |
        None
    )


    # Quan trọng:
    # có = None để field này
    # thật sự không bắt buộc.

    fee_setting: (
        RoomFeeSettingResponse
        |
        None
    ) = None


# ==============================
# UPDATE ROOM
# ==============================

class RoomUpdate(
    BaseModel
):

    room_code: (
        str
        |
        None
    ) = Field(

        default=None,

        min_length=1,

        max_length=20,

    )


    floor: (
        int
        |
        None
    ) = Field(

        default=None,

        ge=0,

    )


    description: (
        str
        |
        None
    ) = None


    electricity_rate: (
        int
        |
        None
    ) = Field(

        default=None,

        ge=0,

    )


    water_fee: (
        int
        |
        None
    ) = Field(

        default=None,

        ge=0,

    )


    management_fee: (
        int
        |
        None
    ) = Field(

        default=None,

        ge=0,

    )


# ==============================
# ROOM DETAIL RESPONSE
# ==============================

class RoomDetailResponse(
    RoomResponse
):

    electricity_rate: int

    water_fee: int

    management_fee: int