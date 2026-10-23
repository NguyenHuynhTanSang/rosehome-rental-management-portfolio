from __future__ import annotations

import os

import boto3

from dotenv import load_dotenv


load_dotenv()


R2_ENDPOINT_URL = os.getenv(
    "R2_ENDPOINT_URL"
)

R2_PUBLIC_BUCKET_NAME = os.getenv(
    "R2_PUBLIC_BUCKET_NAME"
)

R2_PUBLIC_BASE_URL = os.getenv(
    "R2_PUBLIC_BASE_URL"
)

R2_PUBLIC_ACCESS_KEY_ID = os.getenv(
    "R2_PUBLIC_ACCESS_KEY_ID"
)

R2_PUBLIC_SECRET_ACCESS_KEY = os.getenv(
    "R2_PUBLIC_SECRET_ACCESS_KEY"
)


ALLOWED_WEBSITE_PREFIXES = (
    "website-images/hero/",
    "website-images/gallery/",
)


ALLOWED_IMAGE_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
}


MAX_IMAGE_BYTES = (
    10
    * 1024
    * 1024
)


def validate_public_r2_config() -> None:

    required_values = {
        "R2_ENDPOINT_URL":
            R2_ENDPOINT_URL,

        "R2_PUBLIC_BUCKET_NAME":
            R2_PUBLIC_BUCKET_NAME,

        "R2_PUBLIC_BASE_URL":
            R2_PUBLIC_BASE_URL,

        "R2_PUBLIC_ACCESS_KEY_ID":
            R2_PUBLIC_ACCESS_KEY_ID,

        "R2_PUBLIC_SECRET_ACCESS_KEY":
            R2_PUBLIC_SECRET_ACCESS_KEY,
    }


    missing = [
        key
        for key, value
        in required_values.items()
        if not value
    ]


    if missing:

        raise RuntimeError(
            (
                "Thiếu cấu hình R2 public: "
                + ", ".join(missing)
            )
        )


def validate_file_key(
    file_key: str,
) -> None:

    if not file_key.startswith(
        ALLOWED_WEBSITE_PREFIXES
    ):

        raise ValueError(
            "File key ảnh website không hợp lệ."
        )


def get_website_r2_client():

    validate_public_r2_config()


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
    )


def upload_website_image(
    file_key: str,
    data: bytes,
    content_type: str,
) -> None:

    validate_file_key(
        file_key
    )


    if content_type not in ALLOWED_IMAGE_TYPES:

        raise ValueError(
            (
                "Chỉ hỗ trợ ảnh "
                "JPG, PNG hoặc WEBP."
            )
        )


    if len(data) > MAX_IMAGE_BYTES:

        raise ValueError(
            "Ảnh phải nhỏ hơn hoặc bằng 10 MB."
        )


    client = (
        get_website_r2_client()
    )


    client.put_object(
        Bucket=
            R2_PUBLIC_BUCKET_NAME,

        Key=
            file_key,

        Body=
            data,

        ContentType=
            content_type,

        CacheControl=
            (
                "public, "
                "max-age=31536000, "
                "immutable"
            ),
    )


def delete_website_image(
    file_key: str,
) -> None:

    validate_file_key(
        file_key
    )


    client = (
        get_website_r2_client()
    )


    client.delete_object(
        Bucket=
            R2_PUBLIC_BUCKET_NAME,

        Key=
            file_key,
    )


def get_website_image_url(
    file_key: str,
) -> str:

    validate_file_key(
        file_key
    )


    validate_public_r2_config()


    base_url = (
        R2_PUBLIC_BASE_URL
        or ""
    ).rstrip("/")


    return (
        f"{base_url}/{file_key}"
    )


def test_website_r2_connection() -> bool:

    try:

        client = (
            get_website_r2_client()
        )


        client.head_bucket(
            Bucket=
                R2_PUBLIC_BUCKET_NAME
        )


        return True

    except Exception:

        return False