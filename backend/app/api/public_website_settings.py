from typing import Annotated

from fastapi import (
    APIRouter,
    Depends,
)

from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.dependencies import (
    get_db,
)

from backend.app.models.website_setting import (
    WebsiteSetting,
)

from backend.app.schemas.website_setting import (
    PublicWebsiteSettingResponse,
)


router = APIRouter(
    prefix="/public/website-settings",
    tags=["Public Website Settings"],
)


# =========================================================
# DEFAULT VALUES
# =========================================================

DEFAULT_SITE_NAME = (
    "Rosehome Apartment"
)

DEFAULT_HERO_BADGE = (
    "Phòng trọ & căn hộ cho thuê"
)

DEFAULT_HERO_TITLE = (
    "Không gian phù hợp "
    "cho cuộc sống của bạn"
)

DEFAULT_HERO_DESCRIPTION = (
    "Xem thông tin phòng, hình ảnh thực tế, "
    "giá thuê, chi phí và tiện ích trước khi "
    "liên hệ trực tiếp với chủ nhà."
)


# =========================================================
# GET PUBLIC WEBSITE SETTINGS
# =========================================================

@router.get(
    "",
    response_model=
        PublicWebsiteSettingResponse,
    summary=
        "View Public Website Settings",
)
def get_public_website_settings(
    db: Annotated[
        Session,
        Depends(get_db),
    ],
):

    setting = db.scalar(
        select(
            WebsiteSetting
        )
        .order_by(
            WebsiteSetting.id
        )
        .limit(
            1
        )
    )


    if setting is None:

        return PublicWebsiteSettingResponse(
            site_name=
                DEFAULT_SITE_NAME,

            hero_badge=
                DEFAULT_HERO_BADGE,

            hero_title=
                DEFAULT_HERO_TITLE,

            hero_description=
                DEFAULT_HERO_DESCRIPTION,

            phone=
                None,

            zalo_url=
                None,

            address=
                None,

            contact_note=
                None,
        )


    return PublicWebsiteSettingResponse(
        site_name=
            setting.site_name,

        hero_badge=
            setting.hero_badge,

        hero_title=
            setting.hero_title,

        hero_description=
            setting.hero_description,

        phone=
            setting.phone,

        zalo_url=
            setting.zalo_url,

        address=
            setting.address,

        contact_note=
            setting.contact_note,
    )