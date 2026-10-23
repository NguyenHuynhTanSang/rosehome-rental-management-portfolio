from typing import Annotated

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)

from sqlalchemy import (
    select,
)

from sqlalchemy.orm import Session

from backend.app.dependencies import (
    get_db,
)

from backend.app.models.room import (
    Room,
)

from backend.app.models.room_fee_setting import (
    RoomFeeSetting,
)

from backend.app.models.room_public_image import (
    RoomPublicImage,
)

from backend.app.models.room_public_profile import (
    RoomPublicProfile,
)

from backend.app.schemas.public_room import (
    PublicRoomDetailResponse,
    PublicRoomListItem,
)

from backend.app.services.public_room_storage import (
    get_public_image_url,
)


router = APIRouter(
    prefix="/public/rooms",
    tags=["Public Rooms"],
)


# =========================================================
# BUILD PUBLIC STATUS
# =========================================================

def build_public_status(
    room: Room,
) -> str:

    return "AVAILABLE"


# =========================================================
# GET ROOM IMAGE URLS
# =========================================================

def get_room_image_urls(
    room_id: int,
    db: Session,
) -> list[str]:

    images = db.scalars(
        select(
            RoomPublicImage
        )
        .where(
            RoomPublicImage.room_id
            == room_id
        )
        .order_by(
            RoomPublicImage.sort_order,
            RoomPublicImage.id,
        )
    ).all()


    return [
        get_public_image_url(
            image.file_key
        )
        for image in images
    ]


# =========================================================
# GET PUBLIC ROOMS
# =========================================================

@router.get(
    "",
    response_model=
        list[
            PublicRoomListItem
        ],
    summary=
        "View Public Rooms",
)
def get_public_rooms(
    db: Annotated[
        Session,
        Depends(get_db),
    ],
):

    statement = (
        select(
            Room,
            RoomPublicProfile,
        )
        .join(
            RoomPublicProfile,
            RoomPublicProfile.room_id
            == Room.id,
        )
        .where(
            RoomPublicProfile.is_visible
            .is_(True),

            RoomPublicProfile.monthly_rent
            .is_not(None),

            RoomPublicProfile.area_m2
            .is_not(None),

            RoomPublicProfile.max_occupants
            .is_not(None),

            Room.status
            == "VACANT",
        )
        .order_by(
            Room.room_code
        )
    )


    rows = db.execute(
        statement
    ).all()


    result: list[
        PublicRoomListItem
    ] = []


    for (
        room,
        profile,
    ) in rows:

        images = (
            get_room_image_urls(
                room.id,
                db,
            )
        )


        result.append(
            PublicRoomListItem(
                id=
                    room.id,

                room_code=
                    room.room_code,

                floor=
                    room.floor,

                description=
                    room.description,

                public_status=
                    build_public_status(
                        room
                    ),

                monthly_rent=
                    profile.monthly_rent,

                area_m2=
                    profile.area_m2,

                max_occupants=
                    profile.max_occupants,

                available_from=
                    profile.available_from,

                deposit_months=
                    profile.deposit_months,

                parking_fee=
                    profile.parking_fee,

                wifi_fee=
                    profile.wifi_fee,

                images=
                    images,
            )
        )


    return result


# =========================================================
# GET PUBLIC ROOM BY CODE
# =========================================================

@router.get(
    "/{room_code}",
    response_model=
        PublicRoomDetailResponse,
    summary=
        "View Public Room Details",
)
def get_public_room(
    room_code: str,

    db: Annotated[
        Session,
        Depends(get_db),
    ],
):

    normalized_room_code = (
        room_code
        .strip()
        .upper()
    )


    statement = (
        select(
            Room,
            RoomPublicProfile,
            RoomFeeSetting,
        )
        .join(
            RoomPublicProfile,
            RoomPublicProfile.room_id
            == Room.id,
        )
        .outerjoin(
            RoomFeeSetting,
            RoomFeeSetting.room_id
            == Room.id,
        )
        .where(
            Room.room_code
            == normalized_room_code,

            RoomPublicProfile.is_visible
            .is_(True),

            RoomPublicProfile.monthly_rent
            .is_not(None),

            RoomPublicProfile.area_m2
            .is_not(None),

            RoomPublicProfile.max_occupants
            .is_not(None),

            Room.status
            == "VACANT",
        )
    )


    row = db.execute(
        statement
    ).first()


    if row is None:

        raise HTTPException(
            status_code=
                status.HTTP_404_NOT_FOUND,

            detail=
                "Public room not found",
        )


    (
        room,
        profile,
        fee_setting,
    ) = row


    images = (
        get_room_image_urls(
            room.id,
            db,
        )
    )


    return PublicRoomDetailResponse(
        id=
            room.id,

        room_code=
            room.room_code,

        floor=
            room.floor,

        description=
            room.description,

        public_status=
            build_public_status(
                room
            ),

        monthly_rent=
            profile.monthly_rent,

        area_m2=
            profile.area_m2,

        max_occupants=
            profile.max_occupants,

        available_from=
            profile.available_from,

        deposit_months=
            profile.deposit_months,

        parking_fee=
            profile.parking_fee,

        wifi_fee=
            profile.wifi_fee,

        electricity_rate=(
            fee_setting
            .electricity_rate

            if fee_setting
            is not None

            else None
        ),

        water_fee=(
            fee_setting
            .water_fee

            if fee_setting
            is not None

            else None
        ),

        management_fee=(
            fee_setting
            .management_fee

            if fee_setting
            is not None

            else None
        ),

        amenities=
            profile.amenities,

        furniture=
            profile.furniture,

        images=
            images,
    )