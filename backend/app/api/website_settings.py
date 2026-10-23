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

from sqlalchemy.orm import (
    Session,
)

from backend.app.auth_dependencies import (
    require_admin,
)

from backend.app.dependencies import (
    get_db,
)

from backend.app.models.website_setting import (
    WebsiteSetting,
)

from backend.app.schemas.website_setting import (
    WebsiteSettingAdminResponse,
    WebsiteSettingSave,
)


router = APIRouter(
    prefix="/website-settings",
    tags=[
        "Website Settings"
    ],
    dependencies=[
        Depends(
            require_admin
        ),
    ],
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
# HELPERS
# =========================================================

def get_setting(
    db: Session,
) -> WebsiteSetting | None:

    return db.scalar(
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


def get_or_create_setting(
    db: Session,
) -> WebsiteSetting:

    setting = get_setting(
        db
    )


    if setting is not None:

        return setting


    setting = WebsiteSetting(
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


    db.add(
        setting
    )


    try:

        db.commit()

        db.refresh(
            setting
        )

    except Exception:

        db.rollback()

        raise


    return setting


def build_admin_response(
    setting: WebsiteSetting,
) -> WebsiteSettingAdminResponse:

    return WebsiteSettingAdminResponse(
        id=
            setting.id,

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


def clean_required(
    value: str,
    field_label: str,
) -> str:

    cleaned = (
        value
        .strip()
    )


    if not cleaned:

        raise HTTPException(
            status_code=
                status.HTTP_422_UNPROCESSABLE_ENTITY,

            detail=
                f"{field_label} không được để trống.",
        )


    return cleaned


def clean_optional(
    value: str | None,
) -> str | None:

    if value is None:

        return None


    cleaned = (
        value
        .strip()
    )


    return (
        cleaned
        or None
    )


# =========================================================
# GET WEBSITE SETTINGS
# =========================================================

@router.get(
    "",
    response_model=
        WebsiteSettingAdminResponse,
    summary=
        "View Website Settings",
)
def get_website_settings(
    db: Annotated[
        Session,
        Depends(get_db),
    ],
):

    setting = (
        get_or_create_setting(
            db
        )
    )


    return build_admin_response(
        setting
    )


# =========================================================
# SAVE WEBSITE SETTINGS
# =========================================================

@router.put(
    "",
    response_model=
        WebsiteSettingAdminResponse,
    summary=
        "Save Website Settings",
)
def save_website_settings(
    payload: WebsiteSettingSave,

    db: Annotated[
        Session,
        Depends(get_db),
    ],
):

    setting = (
        get_or_create_setting(
            db
        )
    )


    setting.site_name = (
        clean_required(
            payload.site_name,
            "Tên website",
        )
    )


    setting.hero_badge = (
        clean_required(
            payload.hero_badge,
            "Nhãn giới thiệu",
        )
    )


    setting.hero_title = (
        clean_required(
            payload.hero_title,
            "Tiêu đề chính",
        )
    )


    setting.hero_description = (
        clean_required(
            payload.hero_description,
            "Mô tả website",
        )
    )


    setting.phone = (
        clean_optional(
            payload.phone
        )
    )


    setting.zalo_url = (
        clean_optional(
            payload.zalo_url
        )
    )


    setting.address = (
        clean_optional(
            payload.address
        )
    )


    setting.contact_note = (
        clean_optional(
            payload.contact_note
        )
    )


    try:

        db.commit()

        db.refresh(
            setting
        )

    except Exception:

        db.rollback()

        raise


    return build_admin_response(
        setting
    )