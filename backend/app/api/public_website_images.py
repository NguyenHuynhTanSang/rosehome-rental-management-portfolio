from typing import Annotated

from fastapi import (
    APIRouter,
    Depends,
)

from sqlalchemy import (
    select,
)

from sqlalchemy.orm import (
    Session,
)

from backend.app.dependencies import (
    get_db,
)

from backend.app.models.website_public_image import (
    WebsitePublicImage,
)

from backend.app.schemas.website_public_image import (
    PublicWebsiteImageResponse,
)

from backend.app.services.website_image_storage import (
    get_website_image_url,
)


router = APIRouter(
    prefix="/public/website-images",
    tags=[
        "Public Website Images"
    ],
)


# =========================================================
# GET PUBLIC WEBSITE IMAGES
# =========================================================

@router.get(
    "",
    response_model=
        list[PublicWebsiteImageResponse],
    summary=
        "List Public Website Images",
)
def list_public_website_images(
    db: Annotated[
        Session,
        Depends(get_db),
    ],
):

    images = db.scalars(
        select(
            WebsitePublicImage
        )
        .where(
            WebsitePublicImage.is_active.is_(
                True
            )
        )
        .order_by(
            WebsitePublicImage.image_type,
            WebsitePublicImage.sort_order,
            WebsitePublicImage.id,
        )
    ).all()


    return [
        PublicWebsiteImageResponse(
            id=
                image.id,

            image_type=
                image.image_type,

            alt_text=
                image.alt_text,

            sort_order=
                image.sort_order,

            url=
                get_website_image_url(
                    image.file_key
                ),
        )
        for image in images
    ]