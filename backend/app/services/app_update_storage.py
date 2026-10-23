from pathlib import (
    PurePosixPath,
)

from botocore.exceptions import (
    ClientError,
)


from backend.app.services.r2_storage import (
    R2_BUCKET_NAME,
    get_r2_client,
)


# ==========================================
# CONSTANTS
# ==========================================

APP_UPDATE_PREFIX = (
    "app-updates/"
)


MIN_PRESIGNED_EXPIRY = (
    60
)


MAX_PRESIGNED_EXPIRY = (
    600
)


# ==========================================
# VALIDATE APP UPDATE OBJECT KEY
# ==========================================

def _validate_app_update_key(
    file_key: str,
) -> str:

    clean_key = (
        file_key
        .strip()
    )


    if not clean_key:

        raise ValueError(
            "R2 app update object key cannot be empty"
        )


    if len(clean_key) > 1024:

        raise ValueError(
            "R2 app update object key is too long"
        )


    # APK chỉ được nằm trong:
    #
    # app-updates/
    if not clean_key.startswith(
        APP_UPDATE_PREFIX
    ):

        raise ValueError(
            "Invalid R2 app update object key"
        )


    if (
        clean_key.startswith("/")
        or
        "\\" in clean_key
    ):

        raise ValueError(
            "Invalid R2 app update object key"
        )


    parts = (
        clean_key.split(
            "/"
        )
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
            "Invalid R2 app update object key"
        )


    if not clean_key.lower().endswith(
        ".apk"
    ):

        raise ValueError(
            "App update object must be an APK file"
        )


    return clean_key


# ==========================================
# CHECK OBJECT EXISTS
# ==========================================

def app_update_exists(
    file_key: str,
) -> bool:

    clean_key = (
        _validate_app_update_key(
            file_key
        )
    )


    client = (
        get_r2_client()
    )


    try:

        client.head_object(

            Bucket=
                R2_BUCKET_NAME,

            Key=
                clean_key,

        )


        return True


    except ClientError as error:

        error_code = str(

            error.response
            .get(
                "Error",
                {},
            )
            .get(
                "Code",
                "",
            )

        )


        if error_code in {
            "404",
            "NoSuchKey",
            "NotFound",
        }:

            return False


        raise


# ==========================================
# TEMPORARY PRIVATE DOWNLOAD URL
# ==========================================

def create_app_update_presigned_url(
    file_key: str,
    expires_in: int = 600,
) -> str:

    clean_key = (
        _validate_app_update_key(
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


    # Tránh tạo link tới file
    # chưa tồn tại trong R2.
    if not app_update_exists(
        clean_key
    ):

        raise FileNotFoundError(
            "App update APK not found in R2"
        )


    client = (
        get_r2_client()
    )


    filename = (

        PurePosixPath(
            clean_key
        )
        .name

    )


    return client.generate_presigned_url(

        "get_object",

        Params={

            "Bucket":
                R2_BUCKET_NAME,

            "Key":
                clean_key,

            "ResponseContentType":
                "application/vnd.android.package-archive",

            "ResponseContentDisposition":
                (
                    f'attachment; filename="{filename}"'
                ),

        },

        ExpiresIn=
            safe_expiry,

    )