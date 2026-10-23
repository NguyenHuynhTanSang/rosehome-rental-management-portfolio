from backend.app.models.room_public_image import (
    RoomPublicImage,
)


from backend.app.schemas.room_public_image import (
    RoomPublicImageResponse,
)


from backend.app.services.public_room_storage import (
    delete_public_image,
    get_public_image_url,
    upload_public_image,
)

from uuid import uuid4

from typing import Annotated

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
    File,
    UploadFile,
)

from sqlalchemy import (
    func,
    select,
)

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.app.auth_dependencies import (
    require_admin,
)

from backend.app.dependencies import (
    get_db,
)

from backend.app.models.contract import (
    Contract,
)

from backend.app.models.invoice import (
    Invoice,
)

from backend.app.models.meter_reading import (
    MeterReading,
)

from backend.app.models.room import (
    Room,
)

from backend.app.models.room_fee_setting import (
    RoomFeeSetting,
)

from backend.app.schemas.room import (
    RoomCreate,
    RoomDetailResponse,
    RoomResponse,
    RoomUpdate,
)

from backend.app.models.room_public_profile import (
    RoomPublicProfile,
)

from backend.app.schemas.room_public_profile import (
    RoomPublicProfileAdminResponse,
    RoomPublicProfileListItem,
    RoomPublicProfileSave,
)


router = APIRouter(
    prefix="/rooms",
    tags=["Rooms"],
    dependencies=[
        Depends(require_admin),
    ],
)


# =========================================================
# GET ROOM
# =========================================================

def get_room_or_404(
    room_id: int,
    db: Session,
    *,
    for_update: bool = False,
) -> Room:

    statement = (
        select(
            Room
        )
        .where(
            Room.id
            == room_id
        )
    )

    if for_update:

        statement = (
            statement
            .with_for_update()
        )

    room = db.scalar(
        statement
    )

    if room is None:

        raise HTTPException(
            status_code=
                status.HTTP_404_NOT_FOUND,

            detail=
                "Room not found",
        )

    return room


# =========================================================
# GET FEE SETTING
# =========================================================

def get_fee_setting_or_404(
    room_id: int,
    db: Session,
    *,
    for_update: bool = False,
) -> RoomFeeSetting:

    statement = (
        select(
            RoomFeeSetting
        )
        .where(
            RoomFeeSetting.room_id
            == room_id
        )
    )

    if for_update:

        statement = (
            statement
            .with_for_update()
        )

    fee_setting = db.scalar(
        statement
    )

    if fee_setting is None:

        raise HTTPException(
            status_code=
                status.HTTP_404_NOT_FOUND,

            detail=
                "Room fee settings not found",
        )

    return fee_setting


# =========================================================
# BUILD ROOM DETAIL RESPONSE
# =========================================================

def build_room_detail_response(
    room: Room,
    fee_setting: RoomFeeSetting,
) -> RoomDetailResponse:

    return RoomDetailResponse(
        id=
            room.id,

        room_code=
            room.room_code,

        floor=
            room.floor,

        status=
            room.status,

        description=
            room.description,

        electricity_rate=
            fee_setting.electricity_rate,

        water_fee=
            fee_setting.water_fee,

        management_fee=
            fee_setting.management_fee,
    )

# =========================================================
# CLEAN STRING LIST
# =========================================================

def clean_string_list(
    values: list[str],
) -> list[str]:

    cleaned: list[str] = []

    seen: set[str] = set()

    for value in values:

        normalized = (
            value
            .strip()
        )

        if not normalized:
            continue

        key = (
            normalized
            .casefold()
        )

        if key in seen:
            continue

        seen.add(
            key
        )

        cleaned.append(
            normalized
        )

    return cleaned


# =========================================================
# BUILD PUBLIC PROFILE ADMIN RESPONSE
# =========================================================

def build_public_profile_response(
    room: Room,
    profile: (
        RoomPublicProfile
        | None
    ),
) -> RoomPublicProfileAdminResponse:

    if profile is None:

        return RoomPublicProfileAdminResponse(
            id=None,

            room_id=
                room.id,

            room_code=
                room.room_code,

            is_visible=False,

            monthly_rent=None,

            area_m2=None,

            max_occupants=None,

            available_from=None,

            deposit_months=1,

            parking_fee=0,

            wifi_fee=0,

            amenities=[],

            furniture=[],
        )

    return RoomPublicProfileAdminResponse(
        id=
            profile.id,

        room_id=
            room.id,

        room_code=
            room.room_code,

        is_visible=
            profile.is_visible,

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

        amenities=
            profile.amenities,

        furniture=
            profile.furniture,
    )

# =========================================================
# BUILD PUBLIC IMAGE RESPONSE
# =========================================================

def build_public_image_response(
    image: RoomPublicImage,
) -> RoomPublicImageResponse:

    return RoomPublicImageResponse(
        id=
            image.id,

        room_id=
            image.room_id,

        file_key=
            image.file_key,

        original_name=
            image.original_name,

        content_type=
            image.content_type,

        sort_order=
            image.sort_order,

        url=
            get_public_image_url(
                image.file_key
            ),
    )

# =========================================================
# THÊM PHÒNG
# =========================================================

@router.post(
    "",
    response_model=RoomResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add Room",
)
def create_room(
    room_data: RoomCreate,

    db: Annotated[
        Session,
        Depends(get_db),
    ],
):

    room_code = (
        room_data.room_code
        .strip()
        .upper()
    )

    if not room_code:

        raise HTTPException(
            status_code=
                status.HTTP_400_BAD_REQUEST,

            detail=
                "Room code cannot be empty",
        )

    existing_room = db.scalar(
        select(
            Room
        )
        .where(
            Room.room_code
            == room_code
        )
    )

    if existing_room:

        raise HTTPException(
            status_code=
                status.HTTP_409_CONFLICT,

            detail=
                "Room code already exists",
        )

    room = Room(
        room_code=
            room_code,

        floor=
            room_data.floor,

        description=
            room_data.description,

        status=
            "VACANT",
    )

    try:

        db.add(
            room
        )

        # Lấy room.id trước khi tạo fee setting.
        db.flush()

        fee_setting = RoomFeeSetting(
            room_id=
                room.id,

            electricity_rate=
                room_data.electricity_rate,

            water_fee=
                room_data.water_fee,

            management_fee=
                room_data.management_fee,
        )

        db.add(
            fee_setting
        )

        db.commit()

        db.refresh(
            room
        )

    except IntegrityError as exc:

        db.rollback()

        raise HTTPException(
            status_code=
                status.HTTP_409_CONFLICT,

            detail=
                (
                    "Không thể tạo phòng vì "
                    "mã phòng đã tồn tại hoặc "
                    "dữ liệu phòng không hợp lệ."
                ),
        ) from exc

    except Exception:

        db.rollback()

        raise

    return room


# =========================================================
# XEM TẤT CẢ PHÒNG
# =========================================================

@router.get(
    "",
    response_model=list[RoomResponse],
    summary="View All Rooms",
)
def get_rooms(
    db: Annotated[
        Session,
        Depends(get_db),
    ],
):

    rooms = db.scalars(
        select(
            Room
        )
        .order_by(
            Room.room_code
        )
    ).all()

    return rooms


# =========================================================
# DANH SÁCH PHÒNG CHO QUẢN LÝ WEBSITE
# =========================================================

@router.get(
    "/public-profiles",
    response_model=
        list[
            RoomPublicProfileListItem
        ],
    summary=
        "View Room Public Profiles",
)
def get_room_public_profiles(
    db: Annotated[
        Session,
        Depends(get_db),
    ],
):

    rows = db.execute(
    select(
        Room,
        RoomPublicProfile,
    )
    .outerjoin(
        RoomPublicProfile,
        RoomPublicProfile.room_id
        == Room.id,
    )
    .where(
        Room.status
        == "VACANT"
    )
    .order_by(
        Room.room_code
    )
).all()


    result: list[
        RoomPublicProfileListItem
    ] = []


    for (
        room,
        profile,
    ) in rows:

        if profile is None:

            result.append(
                RoomPublicProfileListItem(
                    room_id=
                        room.id,

                    room_code=
                        room.room_code,

                    floor=
                        room.floor,

                    room_status=
                        room.status,

                    is_visible=False,

                    monthly_rent=None,

                    area_m2=None,

                    max_occupants=None,

                    available_from=None,
                )
            )

            continue


        result.append(
            RoomPublicProfileListItem(
                room_id=
                    room.id,

                room_code=
                    room.room_code,

                floor=
                    room.floor,

                room_status=
                    room.status,

                is_visible=
                    profile.is_visible,

                monthly_rent=
                    profile.monthly_rent,

                area_m2=
                    profile.area_m2,

                max_occupants=
                    profile.max_occupants,

                available_from=
                    profile.available_from,
            )
        )


    return result
# =========================================================
# XEM CHI TIẾT MỘT PHÒNG
# =========================================================

@router.get(
    "/{room_id}",
    response_model=RoomDetailResponse,
    summary="View Room Details",
)
def get_room(
    room_id: int,

    db: Annotated[
        Session,
        Depends(get_db),
    ],
):

    room = get_room_or_404(
        room_id,
        db,
    )

    fee_setting = (
        get_fee_setting_or_404(
            room_id,
            db,
        )
    )

    return build_room_detail_response(
        room,
        fee_setting,
    )


# =========================================================
# SỬA THÔNG TIN PHÒNG
# =========================================================

@router.patch(
    "/{room_id}",
    response_model=RoomDetailResponse,
    summary="Edit Room",
)
def update_room(
    room_id: int,

    data: RoomUpdate,

    db: Annotated[
        Session,
        Depends(get_db),
    ],
):

    # Lock room để hai request sửa cùng lúc
    # không ghi đè dữ liệu của nhau.
    room = get_room_or_404(
        room_id,
        db,
        for_update=True,
    )

    fee_setting = (
        get_fee_setting_or_404(
            room_id,
            db,
            for_update=True,
        )
    )

    update_data = data.model_dump(
        exclude_unset=True
    )

    # =====================================================
    # MÃ PHÒNG
    # =====================================================

    if "room_code" in update_data:

        new_room_code = (
            update_data[
                "room_code"
            ]
        )

        if new_room_code is not None:

            new_room_code = (
                new_room_code
                .strip()
                .upper()
            )

            if not new_room_code:

                raise HTTPException(
                    status_code=
                        status.HTTP_400_BAD_REQUEST,

                    detail=
                        "Room code cannot be empty",
                )

            existing_room = db.scalar(
                select(
                    Room
                )
                .where(
                    Room.room_code
                    == new_room_code,

                    Room.id
                    != room_id,
                )
            )

            if existing_room:

                raise HTTPException(
                    status_code=
                        status.HTTP_409_CONFLICT,

                    detail=
                        "Room code already exists",
                )

            room.room_code = (
                new_room_code
            )

    # =====================================================
    # THÔNG TIN PHÒNG
    # =====================================================

    if "floor" in update_data:

        room.floor = (
            update_data[
                "floor"
            ]
        )

    if "description" in update_data:

        room.description = (
            update_data[
                "description"
            ]
        )

    # =====================================================
    # PHÍ MẶC ĐỊNH
    # =====================================================

    if (
        "electricity_rate"
        in update_data
        and
        update_data[
            "electricity_rate"
        ]
        is not None
    ):

        fee_setting.electricity_rate = (
            update_data[
                "electricity_rate"
            ]
        )

    if (
        "water_fee"
        in update_data
        and
        update_data[
            "water_fee"
        ]
        is not None
    ):

        fee_setting.water_fee = (
            update_data[
                "water_fee"
            ]
        )

    if (
        "management_fee"
        in update_data
        and
        update_data[
            "management_fee"
        ]
        is not None
    ):

        fee_setting.management_fee = (
            update_data[
                "management_fee"
            ]
        )

    try:

        db.commit()

        db.refresh(
            room
        )

        db.refresh(
            fee_setting
        )

    except IntegrityError as exc:

        db.rollback()

        raise HTTPException(
            status_code=
                status.HTTP_409_CONFLICT,

            detail=
                (
                    "Không thể cập nhật phòng vì "
                    "mã phòng đã tồn tại hoặc "
                    "dữ liệu không hợp lệ."
                ),
        ) from exc

    except Exception:

        db.rollback()

        raise

    return build_room_detail_response(
        room,
        fee_setting,
    )


# =========================================================
# XÓA PHÒNG
# =========================================================

@router.delete(
    "/{room_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete Room",
)
def delete_room(
    room_id: int,

    db: Annotated[
        Session,
        Depends(get_db),
    ],
):

    # Lock row để tránh xóa phòng trong lúc
    # request khác đang đổi trạng thái phòng.
    room = get_room_or_404(
        room_id,
        db,
        for_update=True,
    )

    # =====================================================
    # PHÒNG ĐANG CÓ KHÁCH
    # =====================================================

    if (
        room.status
        == "OCCUPIED"
    ):

        raise HTTPException(
            status_code=
                status.HTTP_409_CONFLICT,

            detail=
                (
                    "Không thể xóa phòng "
                    "đang có khách thuê"
                ),
        )

    # =====================================================
    # KHÔNG XÓA PHÒNG ĐÃ CÓ LỊCH SỬ
    #
    # MeterReading đang dùng ON DELETE CASCADE.
    # Vì vậy phải chặn ở API để không vô tình
    # xóa luôn lịch sử điện khi xóa Room.
    # =====================================================

    related_contract_id = db.scalar(
        select(
            Contract.id
        )
        .where(
            Contract.room_id
            == room_id
        )
        .limit(1)
    )

    related_invoice_id = db.scalar(
        select(
            Invoice.id
        )
        .where(
            Invoice.room_id
            == room_id
        )
        .limit(1)
    )

    related_meter_id = db.scalar(
        select(
            MeterReading.id
        )
        .where(
            MeterReading.room_id
            == room_id
        )
        .limit(1)
    )

    if (
        related_contract_id
        is not None
        or
        related_invoice_id
        is not None
        or
        related_meter_id
        is not None
    ):

        raise HTTPException(
            status_code=
                status.HTTP_409_CONFLICT,

            detail=
                (
                    "Không thể xóa phòng vì phòng "
                    "đã có dữ liệu lịch sử như "
                    "hợp đồng, hóa đơn hoặc chỉ số điện."
                ),
        )

    fee_setting = db.scalar(
        select(
            RoomFeeSetting
        )
        .where(
            RoomFeeSetting.room_id
            == room_id
        )
        .with_for_update()
    )

    deleted_room_code = (
        room.room_code
    )

    try:

        if fee_setting is not None:

            db.delete(
                fee_setting
            )

        db.delete(
            room
        )

        db.commit()

    except IntegrityError as exc:

        db.rollback()

        raise HTTPException(
            status_code=
                status.HTTP_409_CONFLICT,

            detail=
                (
                    "Không thể xóa phòng vì "
                    "vẫn còn dữ liệu liên quan."
                ),
        ) from exc

    except Exception:

        db.rollback()

        raise

    return {
        "message":
            "Room deleted successfully",

        "room_id":
            room_id,

        "room_code":
            deleted_room_code,
    }

# =========================================================
# GET ROOM PUBLIC PROFILE
# =========================================================

@router.get(
    "/{room_id}/public-profile",
    response_model=
        RoomPublicProfileAdminResponse,
    summary=
        "View Room Public Profile",
)
def get_room_public_profile(
    room_id: int,

    db: Annotated[
        Session,
        Depends(get_db),
    ],
):

    room = get_room_or_404(
        room_id,
        db,
    )

    profile = db.scalar(
        select(
            RoomPublicProfile
        )
        .where(
            RoomPublicProfile.room_id
            == room_id
        )
    )

    return build_public_profile_response(
        room,
        profile,
    )


# =========================================================
# SAVE ROOM PUBLIC PROFILE
# =========================================================

@router.put(
    "/{room_id}/public-profile",
    response_model=
        RoomPublicProfileAdminResponse,
    summary=
        "Save Room Public Profile",
)
def save_room_public_profile(
    room_id: int,

    data: RoomPublicProfileSave,

    db: Annotated[
        Session,
        Depends(get_db),
    ],
):

    room = get_room_or_404(
        room_id,
        db,
        for_update=True,
    )

    profile = db.scalar(
        select(
            RoomPublicProfile
        )
        .where(
            RoomPublicProfile.room_id
            == room_id
        )
        .with_for_update()
    )

    # Không cho bật website nếu thiếu
    # các thông tin bắt buộc.
    if data.is_visible:

        if data.monthly_rent is None:

            raise HTTPException(
                status_code=
                    status.HTTP_400_BAD_REQUEST,

                detail=
                    (
                        "Vui lòng nhập giá thuê "
                        "trước khi hiển thị phòng "
                        "trên website."
                    ),
            )

        if data.area_m2 is None:

            raise HTTPException(
                status_code=
                    status.HTTP_400_BAD_REQUEST,

                detail=
                    (
                        "Vui lòng nhập diện tích "
                        "trước khi hiển thị phòng "
                        "trên website."
                    ),
            )

        if data.max_occupants is None:

            raise HTTPException(
                status_code=
                    status.HTTP_400_BAD_REQUEST,

                detail=
                    (
                        "Vui lòng nhập số người "
                        "tối đa trước khi hiển thị "
                        "phòng trên website."
                    ),
            )

    amenities = clean_string_list(
        data.amenities
    )

    furniture = clean_string_list(
        data.furniture
    )

    if profile is None:

        profile = RoomPublicProfile(
            room_id=
                room.id,
        )

        db.add(
            profile
        )

    profile.is_visible = (
        data.is_visible
    )

    profile.monthly_rent = (
        data.monthly_rent
    )

    profile.area_m2 = (
        data.area_m2
    )

    profile.max_occupants = (
        data.max_occupants
    )

    profile.available_from = (
        data.available_from
    )

    profile.deposit_months = (
        data.deposit_months
    )

    profile.parking_fee = (
        data.parking_fee
    )

    profile.wifi_fee = (
        data.wifi_fee
    )

    profile.amenities = (
        amenities
    )

    profile.furniture = (
        furniture
    )

    try:

        db.commit()

        db.refresh(
            profile
        )

    except IntegrityError as exc:

        db.rollback()

        raise HTTPException(
            status_code=
                status.HTTP_409_CONFLICT,

            detail=
                (
                    "Không thể lưu thông tin "
                    "website của phòng."
                ),
        ) from exc

    except Exception:

        db.rollback()

        raise

    return build_public_profile_response(
        room,
        profile,
    )

# =========================================================
# GET ROOM PUBLIC IMAGES
# =========================================================

@router.get(
    "/{room_id}/public-images",
    response_model=
        list[
            RoomPublicImageResponse
        ],
    summary=
        "View Room Public Images",
)
def get_room_public_images(
    room_id: int,

    db: Annotated[
        Session,
        Depends(get_db),
    ],
):

    get_room_or_404(
        room_id,
        db,
    )


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
        build_public_image_response(
            image
        )
        for image in images
    ]


# =========================================================
# UPLOAD ROOM PUBLIC IMAGE
# =========================================================

@router.post(
    "/{room_id}/public-images",
    response_model=
        RoomPublicImageResponse,
    status_code=
        status.HTTP_201_CREATED,
    summary=
        "Upload Room Public Image",
)
async def upload_room_public_image(
    room_id: int,

    file: Annotated[
        UploadFile,
        File(...),
    ],

    db: Annotated[
        Session,
        Depends(get_db),
    ],
):

    room = get_room_or_404(
        room_id,
        db,
    )


    existing_count = db.scalar(
        select(
            func.count(
                RoomPublicImage.id
            )
        )
        .where(
            RoomPublicImage.room_id
            == room_id
        )
    )


    if (
        existing_count is not None
        and
        existing_count >= 10
    ):

        raise HTTPException(
            status_code=
                status.HTTP_400_BAD_REQUEST,

            detail=
                "Mỗi phòng chỉ được tối đa 10 ảnh.",
        )


    content_type = (
        file.content_type
        or ""
    ).strip().lower()


    extension_map = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
    }


    extension = (
        extension_map.get(
            content_type
        )
    )


    if extension is None:

        raise HTTPException(
            status_code=
                status.HTTP_400_BAD_REQUEST,

            detail=
                "Chỉ hỗ trợ ảnh JPG, PNG hoặc WEBP.",
        )


    data = await file.read()


    max_sort_order = db.scalar(
        select(
            func.max(
                RoomPublicImage.sort_order
            )
        )
        .where(
            RoomPublicImage.room_id
            == room_id
        )
    )


    next_sort_order = (
        0
        if max_sort_order is None
        else max_sort_order + 1
    )


    safe_room_code = (
        room.room_code
        .strip()
        .upper()
    )


    file_key = (
        "room-images/"
        f"{safe_room_code}/"
        f"{uuid4().hex}.{extension}"
    )


    try:

        uploaded_key = (
            upload_public_image(
                file_key=
                    file_key,

                data=
                    data,

                content_type=
                    content_type,
            )
        )

    except ValueError as exc:

        raise HTTPException(
            status_code=
                status.HTTP_400_BAD_REQUEST,

            detail=
                str(exc),
        ) from exc


    image = RoomPublicImage(
        room_id=
            room_id,

        file_key=
            uploaded_key,

        original_name=
            file.filename,

        content_type=
            content_type,

        sort_order=
            next_sort_order,
    )


    db.add(
        image
    )


    try:

        db.commit()

        db.refresh(
            image
        )

    except Exception:

        db.rollback()


        try:

            delete_public_image(
                uploaded_key
            )

        except Exception:

            pass


        raise


    return build_public_image_response(
        image
    )


# =========================================================
# DELETE ROOM PUBLIC IMAGE
# =========================================================

@router.delete(
    "/{room_id}/public-images/{image_id}",
    status_code=
        status.HTTP_204_NO_CONTENT,
    summary=
        "Delete Room Public Image",
)
def delete_room_public_image(
    room_id: int,
    image_id: int,

    db: Annotated[
        Session,
        Depends(get_db),
    ],
):

    get_room_or_404(
        room_id,
        db,
    )


    image = db.scalar(
        select(
            RoomPublicImage
        )
        .where(
            RoomPublicImage.id
            == image_id,

            RoomPublicImage.room_id
            == room_id,
        )
    )


    if image is None:

        raise HTTPException(
            status_code=
                status.HTTP_404_NOT_FOUND,

            detail=
                "Không tìm thấy ảnh phòng.",
        )


    file_key = (
        image.file_key
    )


    try:

        delete_public_image(
            file_key
        )

    except Exception as exc:

        raise HTTPException(
            status_code=
                status.HTTP_502_BAD_GATEWAY,

            detail=
                "Không thể xóa ảnh khỏi R2.",
        ) from exc


    db.delete(
        image
    )


    try:

        db.commit()

    except Exception:

        db.rollback()

        raise


    return None
# =========================================================
# SET ROOM PUBLIC IMAGE AS COVER
# =========================================================

@router.patch(
    "/{room_id}/public-images/{image_id}/cover",
    response_model=
        list[
            RoomPublicImageResponse
        ],
    summary=
        "Set Room Public Image As Cover",
)
def set_room_public_image_cover(
    room_id: int,
    image_id: int,

    db: Annotated[
        Session,
        Depends(get_db),
    ],
):

    get_room_or_404(
        room_id,
        db,
    )


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
        .with_for_update()
    ).all()


    selected_image = next(
        (
            image
            for image in images
            if image.id == image_id
        ),
        None,
    )


    if selected_image is None:

        raise HTTPException(
            status_code=
                status.HTTP_404_NOT_FOUND,

            detail=
                "Không tìm thấy ảnh phòng.",
        )


    ordered_images = [
        selected_image,
        *[
            image
            for image in images
            if image.id != image_id
        ],
    ]


    for (
        index,
        image,
    ) in enumerate(
        ordered_images
    ):

        image.sort_order = (
            index
        )


    try:

        db.commit()

    except Exception:

        db.rollback()

        raise


    return [
        build_public_image_response(
            image
        )
        for image in ordered_images
    ]
