from pydantic import BaseModel


class RoomPublicImageResponse(
    BaseModel
):

    id: int

    room_id: int

    file_key: str

    original_name: (
        str
        | None
    )

    content_type: (
        str
        | None
    )

    sort_order: int

    url: str