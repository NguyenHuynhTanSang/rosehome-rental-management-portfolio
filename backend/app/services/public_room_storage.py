import os

from functools import lru_cache
from pathlib import Path
from urllib.parse import quote

import boto3

from botocore.config import Config

from dotenv import load_dotenv


# ==========================================
# LOAD LOCAL ENV
# ==========================================

BACKEND_DIR = (
    Path(__file__)
    .resolve()
    .parents[2]
)


load_dotenv(
    BACKEND_DIR
    / ".env"
)


# ==========================================
# R2 PUBLIC CONFIG
# ==========================================

R2_PUBLIC_BUCKET_NAME = os.getenv(
    "R2_PUBLIC_BUCKET_NAME"
)

R2_PUBLIC_BASE_URL = os.getenv(
    "R2_PUBLIC_BASE_URL"
)

R2_ENDPOINT_URL = os.getenv(
    "R2_ENDPOINT_URL"
)

R2_PUBLIC_ACCESS_KEY_ID = os.getenv(
    "R2_PUBLIC_ACCESS_KEY_ID"
)

R2_PUBLIC_SECRET_ACCESS_KEY = os.getenv(
    "R2_PUBLIC_SECRET_ACCESS_KEY"
)


# ==========================================
# CONSTANTS
# ==========================================

MAX_PUBLIC_IMAGE_BYTES = (
    10
    * 1024
    * 1024
)


ALLOWED_PUBLIC_IMAGE_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
}


# ==========================================
# VALIDATE CONFIG
# ==========================================

def _validate_config() -> None:

    missing: list[str] = []


    if not R2_PUBLIC_BUCKET_NAME:

        missing.append(
            "R2_PUBLIC_BUCKET_NAME"
        )


    if not R2_PUBLIC_BASE_URL:

        missing.append(
            "R2_PUBLIC_BASE_URL"
        )


    if not R2_ENDPOINT_URL:

        missing.append(
            "R2_ENDPOINT_URL"
        )


    if not R2_PUBLIC_ACCESS_KEY_ID:

        missing.append(
            "R2_PUBLIC_ACCESS_KEY_ID"
        )


    if not R2_PUBLIC_SECRET_ACCESS_KEY:

        missing.append(
            "R2_PUBLIC_SECRET_ACCESS_KEY"
        )


    if missing:

        raise RuntimeError(
            (
                "Missing public R2 "
                "environment variables: "
            )
            +
            ", ".join(
                missing
            )
        )


# ==========================================
# VALIDATE FILE KEY
# ==========================================

def _validate_file_key(
    file_key: str,
) -> str:

    clean_key = (
        file_key
        .strip()
    )


    if not clean_key:

        raise ValueError(
            "R2 object key cannot be empty"
        )


    if len(clean_key) > 1024:

        raise ValueError(
            "R2 object key is too long"
        )


    if not clean_key.startswith(
        "room-images/"
    ):

        raise ValueError(
            "Invalid public room image key"
        )


    if (
        clean_key.startswith("/")
        or
        "\\" in clean_key
    ):

        raise ValueError(
            "Invalid R2 object key"
        )


    parts = clean_key.split(
        "/"
    )


    if any(
        part in {
            "",
            ".",
            "..",
        }
        for part in parts
    ):

        raise ValueError(
            "Invalid R2 object key"
        )


    return clean_key


# ==========================================
# CLIENT
# ==========================================

@lru_cache(
    maxsize=1
)
def get_public_r2_client():

    _validate_config()


    return boto3.client(

        "s3",

        endpoint_url=
            R2_ENDPOINT_URL,

        aws_access_key_id=
            R2_PUBLIC_ACCESS_KEY_ID,

        aws_secret_access_key=
            R2_PUBLIC_SECRET_ACCESS_KEY,

        region_name=
            "auto",

        config=Config(

            signature_version=
                "s3v4",

            connect_timeout=
                5,

            read_timeout=
                15,

            retries={

                "max_attempts":
                    3,

                "mode":
                    "standard",

            },

        ),

    )


# ==========================================
# CONNECTION TEST
# ==========================================

def test_public_r2_connection() -> bool:

    client = (
        get_public_r2_client()
    )


    client.list_objects_v2(

        Bucket=
            R2_PUBLIC_BUCKET_NAME,

        MaxKeys=
            1,

    )


    return True


# ==========================================
# UPLOAD PUBLIC IMAGE
# ==========================================

def upload_public_image(
    file_key: str,
    data: bytes,
    content_type: str,
) -> str:

    clean_key = (
        _validate_file_key(
            file_key
        )
    )


    if not data:

        raise ValueError(
            "Cannot upload empty image"
        )


    if (
        len(data)
        >
        MAX_PUBLIC_IMAGE_BYTES
    ):

        raise ValueError(
            "Public room image is too large"
        )


    clean_content_type = (
        content_type
        .strip()
        .lower()
    )


    if (
        clean_content_type
        not in
        ALLOWED_PUBLIC_IMAGE_TYPES
    ):

        raise ValueError(
            "Unsupported room image content type"
        )


    client = (
        get_public_r2_client()
    )


    client.put_object(

        Bucket=
            R2_PUBLIC_BUCKET_NAME,

        Key=
            clean_key,

        Body=
            data,

        ContentType=
            clean_content_type,

        ContentDisposition=
            "inline",

        CacheControl=
            (
                "public, "
                "max-age=31536000, "
                "immutable"
            ),

    )


    return clean_key


# ==========================================
# DELETE PUBLIC IMAGE
# ==========================================

def delete_public_image(
    file_key: str,
) -> None:

    clean_key = (
        _validate_file_key(
            file_key
        )
    )


    client = (
        get_public_r2_client()
    )


    client.delete_object(

        Bucket=
            R2_PUBLIC_BUCKET_NAME,

        Key=
            clean_key,

    )


# ==========================================
# PUBLIC URL
# ==========================================

def get_public_image_url(
    file_key: str,
) -> str:

    clean_key = (
        _validate_file_key(
            file_key
        )
    )


    _validate_config()


    base_url = (
        R2_PUBLIC_BASE_URL
        .rstrip("/")
    )


    encoded_key = quote(
        clean_key,
        safe="/",
    )


    return (
        f"{base_url}/{encoded_key}"
    )