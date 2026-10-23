import os

from functools import lru_cache
from pathlib import Path

import boto3

from botocore.config import (
    Config,
)

from dotenv import (
    load_dotenv,
)


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
# R2 CONFIG
# ==========================================

R2_BUCKET_NAME = os.getenv(
    "R2_BUCKET_NAME"
)

R2_ENDPOINT_URL = os.getenv(
    "R2_ENDPOINT_URL"
)

R2_ACCESS_KEY_ID = os.getenv(
    "R2_ACCESS_KEY_ID"
)

R2_SECRET_ACCESS_KEY = os.getenv(
    "R2_SECRET_ACCESS_KEY"
)


# ==========================================
# CONSTANTS
# ==========================================

MIN_PRESIGNED_EXPIRY = 60

MAX_PRESIGNED_EXPIRY = 600


ALLOWED_UPLOAD_CONTENT_TYPES = {

    "image/jpeg",

    "image/png",

    "image/webp",

}


# ==========================================
# VALIDATE CONFIG
# ==========================================

def _validate_config() -> None:

    missing = []


    if not R2_BUCKET_NAME:

        missing.append(
            "R2_BUCKET_NAME"
        )


    if not R2_ENDPOINT_URL:

        missing.append(
            "R2_ENDPOINT_URL"
        )


    if not R2_ACCESS_KEY_ID:

        missing.append(
            "R2_ACCESS_KEY_ID"
        )


    if not R2_SECRET_ACCESS_KEY:

        missing.append(
            "R2_SECRET_ACCESS_KEY"
        )


    if missing:

        raise RuntimeError(

            "Missing R2 environment variables: "

            +
            ", ".join(
                missing
            )

        )


# ==========================================
# VALIDATE OBJECT KEY
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


    # Service này hiện chỉ quản lý
    # payment receipt.
    if not clean_key.startswith(
        "receipts/"
    ):

        raise ValueError(
            "Invalid R2 receipt object key"
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
def get_r2_client():

    _validate_config()


    return boto3.client(

        "s3",

        endpoint_url=
            R2_ENDPOINT_URL,

        aws_access_key_id=
            R2_ACCESS_KEY_ID,

        aws_secret_access_key=
            R2_SECRET_ACCESS_KEY,

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

def test_r2_connection() -> bool:

    client = get_r2_client()


    client.list_objects_v2(

        Bucket=
            R2_BUCKET_NAME,

        MaxKeys=
            1,

    )


    return True


# ==========================================
# UPLOAD OBJECT
# ==========================================

def upload_bytes(
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
            "Cannot upload empty object"
        )


    clean_content_type = (
        content_type
        .strip()
        .lower()
    )


    if (
        clean_content_type
        not in
        ALLOWED_UPLOAD_CONTENT_TYPES
    ):

        raise ValueError(
            "Unsupported R2 receipt content type"
        )


    client = get_r2_client()


    client.put_object(

        Bucket=
            R2_BUCKET_NAME,

        Key=
            clean_key,

        Body=
            data,

        ContentType=
            clean_content_type,

        ContentDisposition=
            "inline",

        CacheControl=
            "private, no-store",

    )


    return clean_key


# ==========================================
# DELETE OBJECT
# ==========================================

def delete_object(
    file_key: str,
) -> None:

    clean_key = (
        _validate_file_key(
            file_key
        )
    )


    client = get_r2_client()


    client.delete_object(

        Bucket=
            R2_BUCKET_NAME,

        Key=
            clean_key,

    )


# ==========================================
# TEMPORARY PRIVATE URL
# ==========================================

def create_presigned_url(
    file_key: str,
    expires_in: int = 300,
) -> str:

    clean_key = (
        _validate_file_key(
            file_key
        )
    )


    safe_expiry = max(

        MIN_PRESIGNED_EXPIRY,

        min(
            int(
                expires_in
            ),
            MAX_PRESIGNED_EXPIRY,
        ),

    )


    client = get_r2_client()


    return client.generate_presigned_url(

        "get_object",

        Params={

            "Bucket":
                R2_BUCKET_NAME,

            "Key":
                clean_key,

        },

        ExpiresIn=
            safe_expiry,

    )