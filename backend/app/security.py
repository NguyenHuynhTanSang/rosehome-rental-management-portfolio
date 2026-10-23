import os

from datetime import (
    datetime,
    timedelta,
    timezone,
)

from pathlib import Path

import jwt

from dotenv import load_dotenv
from pwdlib import PasswordHash


# ==============================
# ENV
# ==============================

ENV_PATH = (
    Path(__file__)
    .resolve()
    .parents[1]
    / ".env"
)

load_dotenv(
    ENV_PATH
)


# ==============================
# PASSWORD
# ==============================

password_hash = (
    PasswordHash.recommended()
)


def hash_password(
    password: str
) -> str:

    return password_hash.hash(
        password
    )


def verify_password(
    plain_password: str,
    hashed_password: str
) -> bool:

    return password_hash.verify(
        plain_password,
        hashed_password
    )


# ==============================
# JWT CONFIG
# ==============================

JWT_SECRET_KEY = os.getenv(
    "JWT_SECRET_KEY"
)

JWT_ALGORITHM = os.getenv(
    "JWT_ALGORITHM",
    "HS256"
).strip().upper()

JWT_ACCESS_TOKEN_EXPIRE_MINUTES = int(
    os.getenv(
        "JWT_ACCESS_TOKEN_EXPIRE_MINUTES",
        "60"
    )
)

JWT_ISSUER = os.getenv(
    "JWT_ISSUER",
    "rosehome-rental-management"
).strip()

JWT_AUDIENCE = os.getenv(
    "JWT_AUDIENCE",
    "rosehome-admin"
).strip()


ALLOWED_JWT_ALGORITHMS = {
    "HS256",
    "HS384",
    "HS512",
}


if not JWT_SECRET_KEY:

    raise RuntimeError(
        "JWT_SECRET_KEY is missing in backend/.env"
    )


if JWT_ALGORITHM not in ALLOWED_JWT_ALGORITHMS:

    raise RuntimeError(
        "JWT_ALGORITHM must be one of: "
        "HS256, HS384, HS512"
    )


if JWT_ACCESS_TOKEN_EXPIRE_MINUTES <= 0:

    raise RuntimeError(
        "JWT_ACCESS_TOKEN_EXPIRE_MINUTES must be greater than 0"
    )


if not JWT_ISSUER:

    raise RuntimeError(
        "JWT_ISSUER cannot be empty"
    )


if not JWT_AUDIENCE:

    raise RuntimeError(
        "JWT_AUDIENCE cannot be empty"
    )


# ==============================
# CREATE ACCESS TOKEN
# ==============================

def create_access_token(
    user_id: int,
    role: str,
    tenant_id: int | None,
) -> str:

    now = datetime.now(
        timezone.utc
    )

    expire = (
        now
        +
        timedelta(
            minutes=
                JWT_ACCESS_TOKEN_EXPIRE_MINUTES
        )
    )


    payload = {

        "sub":
            str(user_id),

        "role":
            role,

        "tenant_id":
            tenant_id,

        "iat":
            now,

        "exp":
            expire,

        "iss":
            JWT_ISSUER,

        "aud":
            JWT_AUDIENCE,

    }


    return jwt.encode(
        payload,
        JWT_SECRET_KEY,
        algorithm=
            JWT_ALGORITHM,
    )


# ==============================
# DECODE ACCESS TOKEN
# ==============================

def decode_access_token(
    token: str
) -> dict:

    return jwt.decode(
        token,
        JWT_SECRET_KEY,
        algorithms=[
            JWT_ALGORITHM
        ],
        issuer=
            JWT_ISSUER,
        audience=
            JWT_AUDIENCE,
        options={
            "require": [
                "sub",
                "iat",
                "exp",
                "iss",
                "aud",
            ]
        },
    )