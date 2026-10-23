from __future__ import annotations

from typing import Annotated
from uuid import uuid4

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Response,
    UploadFile,
    status,
)

from sqlalchemy import (
    func,
    select,
)

from sqlalchemy.orm import (
    Session,
)

from backend.app.auth_dependencies import (
    require_admin,
)

from backend.app.dependencies import (
    get_db,
)

from backend.app.models.website_public_image import (
    WebsitePublicImage,
)

from backend.app.schemas.website_public_image import (
    WebsitePublicImageResponse,
)

from backend.app.services.website_image_storage import (
    ALLOWED_IMAGE_TYPES,
    MAX_IMAGE_BYTES,
    delete_website_image,
    get_website_image_url,
    upload_website_image,
)


router = APIRouter(
    prefix="/website-images",
    tags=[
        "Website Images"
    ],
    dependencies=[
        Depends(
            require_admin
        ),
    ],
)


MAX_GALLERY_IMAGES = 20


CONTENT_TYPE_EXTENSIONS = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
}


# =========================================================
# HELPERS
# =========================================================

def build_image_response(
    image: WebsitePublicImage,
) -> WebsitePublicImageResponse:

    return WebsitePublicImageResponse(
        id=
            image.id,

        image_type=
            image.image_type,

        file_key=
            image.file_key,

        original_name=
            image.original_name,

        content_type=
            image.content_type,

        alt_text=
            image.alt_text,

        sort_order=
            image.sort_order,

        is_active=
            image.is_active,

        url=
            get_website_image_url(
                image.file_key
            ),
    )


def clean_alt_text(
    value: str | None,
) -> str | None:

    if value is None:
        return None


    cleaned = (
        value.strip()
    )


    if not cleaned:
        return None


    return cleaned[:255]


async def read_and_validate_image(
    file: UploadFile,
) -> tuple[
    bytes,
    str,
]:

    content_type = (
        file.content_type
        or ""
    )


    if (
        content_type
        not in ALLOWED_IMAGE_TYPES
    ):

        raise HTTPException(
            status_code=
                status.HTTP_422_UNPROCESSABLE_ENTITY,

            detail=
                (
                    "Chỉ hỗ trợ ảnh "
                    "JPG, PNG hoặc WEBP."
                ),
        )


    data = await file.read()


    if not data:

        raise HTTPException(
            status_code=
                status.HTTP_422_UNPROCESSABLE_ENTITY,

            detail=
                "File ảnh không được để trống.",
        )


    if len(data) > MAX_IMAGE_BYTES:

        raise HTTPException(
            status_code=
                status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,

            detail=
                (
                    "Ảnh phải nhỏ hơn "
                    "hoặc bằng 10 MB."
                ),
        )


    extension = (
        CONTENT_TYPE_EXTENSIONS[
            content_type
        ]
    )


    return (
        data,
        extension,
    )


def get_image_or_404(
    image_id: int,
    db: Session,
) -> WebsitePublicImage:

    image = db.get(
        WebsitePublicImage,
        image_id,
    )


    if image is None:

        raise HTTPException(
            status_code=
                status.HTTP_404_NOT_FOUND,

            detail=
                "Không tìm thấy ảnh website.",
        )


    return image


def normalize_gallery_order(
    db: Session,
) -> None:

    images = db.scalars(
        select(
            WebsitePublicImage
        )
        .where(
            WebsitePublicImage.image_type
            == "GALLERY"
        )
        .order_by(
            WebsitePublicImage.sort_order,
            WebsitePublicImage.id,
        )
    ).all()


    for index, image in enumerate(
        images
    ):

        image.sort_order = index


# =========================================================
# LIST
# =========================================================

@router.get(
    "",
    response_model=
        list[WebsitePublicImageResponse],
    summary=
        "List Website Images",
)
def list_website_images(
    db: Annotated[
        Session,
        Depends(get_db),
    ],
):

    images = db.scalars(
        select(
            WebsitePublicImage
        )
        .order_by(
            WebsitePublicImage.image_type,
            WebsitePublicImage.sort_order,
            WebsitePublicImage.id,
        )
    ).all()


    return [
        build_image_response(
            image
        )
        for image in images
    ]


# =========================================================
# UPLOAD HERO
# =========================================================

@router.post(
    "/hero",
    response_model=
        WebsitePublicImageResponse,
    status_code=
        status.HTTP_201_CREATED,
    summary=
        "Upload Website Hero Image",
)
async def upload_hero_image(
    db: Annotated[
        Session,
        Depends(get_db),
    ],

    file: Annotated[
        UploadFile,
        File(),
    ],

    alt_text: Annotated[
        str | None,
        Form(),
    ] = None,
):

    data, extension = (
        await read_and_validate_image(
            file
        )
    )


    file_key = (
        "website-images/hero/"
        f"{uuid4()}.{extension}"
    )


    try:

        upload_website_image(
            file_key=
                file_key,

            data=
                data,

            content_type=
                file.content_type
                or "",
        )

    except ValueError as exc:

        raise HTTPException(
            status_code=
                status.HTTP_422_UNPROCESSABLE_ENTITY,

            detail=
                str(exc),
        ) from exc

    except Exception as exc:

        raise HTTPException(
            status_code=
                status.HTTP_502_BAD_GATEWAY,

            detail=
                "Không thể tải ảnh lên Cloudflare R2.",
        ) from exc


    try:

        # HERO chỉ có một ảnh active.
        old_hero_images = db.scalars(
            select(
                WebsitePublicImage
            )
            .where(
                WebsitePublicImage.image_type
                == "HERO"
            )
        ).all()


        for old_image in old_hero_images:

            old_image.is_active = False


        image = WebsitePublicImage(
            image_type=
                "HERO",

            file_key=
                file_key,

            original_name=
                file.filename,

            content_type=
                file.content_type,

            alt_text=
                clean_alt_text(
                    alt_text
                ),

            sort_order=
                0,

            is_active=
                True,
        )


        db.add(
            image
        )


        db.commit()

        db.refresh(
            image
        )


    except Exception:

        db.rollback()


        try:

            delete_website_image(
                file_key
            )

        except Exception:

            pass


        raise


    return build_image_response(
        image
    )


# =========================================================
# UPLOAD GALLERY
# =========================================================

@router.post(
    "/gallery",
    response_model=
        WebsitePublicImageResponse,
    status_code=
        status.HTTP_201_CREATED,
    summary=
        "Upload Website Gallery Image",
)
async def upload_gallery_image(
    db: Annotated[
        Session,
        Depends(get_db),
    ],

    file: Annotated[
        UploadFile,
        File(),
    ],

    alt_text: Annotated[
        str | None,
        Form(),
    ] = None,
):

    gallery_count = db.scalar(
        select(
            func.count(
                WebsitePublicImage.id
            )
        )
        .where(
            WebsitePublicImage.image_type
            == "GALLERY"
        )
    )


    if (
        gallery_count
        is not None
        and gallery_count
        >= MAX_GALLERY_IMAGES
    ):

        raise HTTPException(
            status_code=
                status.HTTP_409_CONFLICT,

            detail=
                (
                    "Thư viện website đã có "
                    "tối đa 20 ảnh."
                ),
        )


    data, extension = (
        await read_and_validate_image(
            file
        )
    )


    max_sort_order = db.scalar(
        select(
            func.max(
                WebsitePublicImage.sort_order
            )
        )
        .where(
            WebsitePublicImage.image_type
            == "GALLERY"
        )
    )


    next_sort_order = (
        0
        if max_sort_order is None
        else max_sort_order + 1
    )


    file_key = (
        "website-images/gallery/"
        f"{uuid4()}.{extension}"
    )


    try:

        upload_website_image(
            file_key=
                file_key,

            data=
                data,

            content_type=
                file.content_type
                or "",
        )

    except ValueError as exc:

        raise HTTPException(
            status_code=
                status.HTTP_422_UNPROCESSABLE_ENTITY,

            detail=
                str(exc),
        ) from exc

    except Exception as exc:

        raise HTTPException(
            status_code=
                status.HTTP_502_BAD_GATEWAY,

            detail=
                "Không thể tải ảnh lên Cloudflare R2.",
        ) from exc


    try:

        image = WebsitePublicImage(
            image_type=
                "GALLERY",

            file_key=
                file_key,

            original_name=
                file.filename,

            content_type=
                file.content_type,

            alt_text=
                clean_alt_text(
                    alt_text
                ),

            sort_order=
                next_sort_order,

            is_active=
                True,
        )


        db.add(
            image
        )


        db.commit()

        db.refresh(
            image
        )


    except Exception:

        db.rollback()


        try:

            delete_website_image(
                file_key
            )

        except Exception:

            pass


        raise


    return build_image_response(
        image
    )


# =========================================================
# TOGGLE ACTIVE
# =========================================================

@router.patch(
    "/{image_id}/active",
    response_model=
        WebsitePublicImageResponse,
    summary=
        "Toggle Website Image Active",
)
def toggle_website_image_active(
    image_id: int,

    db: Annotated[
        Session,
        Depends(get_db),
    ],
):

    image = get_image_or_404(
        image_id,
        db,
    )


    new_state = (
        not image.is_active
    )


    if (
        image.image_type == "HERO"
        and new_state
    ):

        hero_images = db.scalars(
            select(
                WebsitePublicImage
            )
            .where(
                WebsitePublicImage.image_type
                == "HERO"
            )
        ).all()


        for hero_image in hero_images:

            hero_image.is_active = (
                hero_image.id
                == image.id
            )


    else:

        image.is_active = (
            new_state
        )


    try:

        db.commit()

        db.refresh(
            image
        )

    except Exception:

        db.rollback()

        raise


    return build_image_response(
        image
    )


# =========================================================
# DELETE
# =========================================================

@router.delete(
    "/{image_id}",
    status_code=
        status.HTTP_204_NO_CONTENT,
    summary=
        "Delete Website Image",
)
def delete_website_public_image(
    image_id: int,

    db: Annotated[
        Session,
        Depends(get_db),
    ],
):

    image = get_image_or_404(
        image_id,
        db,
    )


    file_key = (
        image.file_key
    )


    image_type = (
        image.image_type
    )


    try:

        delete_website_image(
            file_key
        )

    except Exception as exc:

        raise HTTPException(
            status_code=
                status.HTTP_502_BAD_GATEWAY,

            detail=
                "Không thể xóa ảnh khỏi Cloudflare R2.",
        ) from exc


    try:

        db.delete(
            image
        )

        db.flush()


        if (
            image_type
            == "GALLERY"
        ):

            normalize_gallery_order(
                db
            )


        db.commit()

    except Exception:

        db.rollback()

        raise


    return Response(
        status_code=
            status.HTTP_204_NO_CONTENT
    )