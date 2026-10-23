from pydantic import (
    BaseModel,
    Field,
)


# =========================================================
# ADMIN SAVE
# =========================================================

class WebsiteSettingSave(
    BaseModel
):

    site_name: str = Field(
        min_length=1,
        max_length=100,
    )

    hero_badge: str = Field(
        min_length=1,
        max_length=150,
    )

    hero_title: str = Field(
        min_length=1,
        max_length=255,
    )

    hero_description: str = Field(
        min_length=1,
        max_length=2000,
    )

    phone: (
        str
        | None
    ) = Field(
        default=None,
        max_length=30,
    )

    zalo_url: (
        str
        | None
    ) = Field(
        default=None,
        max_length=500,
    )

    address: (
        str
        | None
    ) = Field(
        default=None,
        max_length=500,
    )

    contact_note: (
        str
        | None
    ) = Field(
        default=None,
        max_length=2000,
    )


# =========================================================
# ADMIN RESPONSE
# =========================================================

class WebsiteSettingAdminResponse(
    BaseModel
):

    id: int

    site_name: str

    hero_badge: str

    hero_title: str

    hero_description: str

    phone: (
        str
        | None
    )

    zalo_url: (
        str
        | None
    )

    address: (
        str
        | None
    )

    contact_note: (
        str
        | None
    )


# =========================================================
# PUBLIC RESPONSE
# =========================================================

class PublicWebsiteSettingResponse(
    BaseModel
):

    site_name: str

    hero_badge: str

    hero_title: str

    hero_description: str

    phone: (
        str
        | None
    )

    zalo_url: (
        str
        | None
    )

    address: (
        str
        | None
    )

    contact_note: (
        str
        | None
    )