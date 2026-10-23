from pydantic import (
    BaseModel,
    Field,
)


# =========================================================
# ADMIN CREATE
# =========================================================

class WebsiteFaqCreate(
    BaseModel
):

    question: str = Field(
        min_length=1,
        max_length=500,
    )

    answer: str = Field(
        min_length=1,
        max_length=5000,
    )

    is_visible: bool = True


# =========================================================
# ADMIN UPDATE
# =========================================================

class WebsiteFaqUpdate(
    BaseModel
):

    question: str = Field(
        min_length=1,
        max_length=500,
    )

    answer: str = Field(
        min_length=1,
        max_length=5000,
    )

    is_visible: bool


# =========================================================
# ADMIN RESPONSE
# =========================================================

class WebsiteFaqAdminResponse(
    BaseModel
):

    id: int

    question: str

    answer: str

    sort_order: int

    is_visible: bool


# =========================================================
# PUBLIC RESPONSE
# =========================================================

class PublicWebsiteFaqResponse(
    BaseModel
):

    id: int

    question: str

    answer: str