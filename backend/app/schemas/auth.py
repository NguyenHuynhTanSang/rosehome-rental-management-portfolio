from typing import Literal

from pydantic import (
    BaseModel,
    EmailStr,
    Field,
)

from backend.app.schemas.user import (
    UserResponse,
)


class LoginRequest(BaseModel):

    email: EmailStr

    password: str = Field(
        min_length=1,
        max_length=128,
    )


class LoginResponse(BaseModel):

    access_token: str

    token_type: Literal[
        "bearer"
    ]

    user: UserResponse