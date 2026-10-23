from pydantic import (
    BaseModel,
)


class WebsitePublicImageResponse(
    BaseModel
):

    id: int

    image_type: str

    file_key: str

    original_name:str | None

    content_type:str | None

    alt_text:str | None

    sort_order: int

    is_active: bool

    url: str


class PublicWebsiteImageResponse(
    BaseModel
):

    id: int

    image_type: str

    alt_text:str | None

    sort_order: int

    url: str