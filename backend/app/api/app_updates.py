import logging
import os

from dataclasses import (
    dataclass,
)

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)

from pydantic import (
    BaseModel,
)


from backend.app.auth_dependencies import (
    require_admin,
)

from backend.app.services.app_update_storage import (
    create_app_update_presigned_url,
)


logger = logging.getLogger(
    __name__
)


router = APIRouter(

    prefix=
        "/app",

    tags=[
        "App Updates"
    ],

)


# ==========================================
# INTERNAL CONFIG MODEL
# ==========================================

@dataclass(
    frozen=True
)
class AppUpdateConfig:

    latest_version: str

    latest_build: int

    minimum_build: int

    force_update: bool

    apk_key: str

    release_notes: list[str]

    download_expiry: int


# ==========================================
# RESPONSE MODELS
# ==========================================

class AppVersionResponse(
    BaseModel
):

    platform: str

    latest_version: str

    latest_build: int

    minimum_build: int

    force_update: bool

    release_notes: list[str]

    download_requires_auth: bool


class AppUpdateDownloadResponse(
    BaseModel
):

    latest_version: str

    latest_build: int

    download_url: str

    expires_in: int


# ==========================================
# ENV HELPERS
# ==========================================

def _read_positive_int(
    name: str,
    default: int,
) -> int:

    raw_value = (

        os.getenv(
            name,
            str(
                default
            ),
        )
        .strip()

    )


    try:

        value = int(
            raw_value
        )


    except ValueError as error:

        raise RuntimeError(

            f"Invalid integer environment variable: {name}"

        ) from error


    if value < 1:

        raise RuntimeError(

            f"{name} must be greater than or equal to 1"

        )


    return value


def _read_bool(
    name: str,
    default: bool = False,
) -> bool:

    raw_value = (

        os.getenv(

            name,

            (
                "true"
                if default
                else "false"
            ),

        )
        .strip()
        .lower()

    )


    if raw_value in {
        "1",
        "true",
        "yes",
        "on",
    }:

        return True


    if raw_value in {
        "0",
        "false",
        "no",
        "off",
    }:

        return False


    raise RuntimeError(

        f"Invalid boolean environment variable: {name}"

    )


def _read_release_notes() -> list[str]:

    raw_value = (

        os.getenv(

            "APP_UPDATE_RELEASE_NOTES",

            (
                "Phiên bản đầu tiên "
                "của Rosehome Android"
            ),

        )
        .strip()

    )


    notes = [

        item.strip()

        for item in raw_value.split(
            "|"
        )

        if item.strip()

    ]


    if not notes:

        return [
            "Cập nhật Rosehome."
        ]


    return notes


# ==========================================
# READ UPDATE CONFIG
# ==========================================

def _get_update_config() -> AppUpdateConfig:

    latest_version = (

        os.getenv(
            "APP_UPDATE_LATEST_VERSION",
            "1.0.0",
        )
        .strip()

    )


    if not latest_version:

        raise RuntimeError(
            "APP_UPDATE_LATEST_VERSION cannot be empty"
        )


    latest_build = (

        _read_positive_int(
            "APP_UPDATE_LATEST_BUILD",
            1,
        )

    )


    minimum_build = (

        _read_positive_int(
            "APP_UPDATE_MINIMUM_BUILD",
            1,
        )

    )


    if minimum_build > latest_build:

        raise RuntimeError(

            "APP_UPDATE_MINIMUM_BUILD "
            "cannot be greater than "
            "APP_UPDATE_LATEST_BUILD"

        )


    force_update = (

        _read_bool(
            "APP_UPDATE_FORCE",
            False,
        )

    )


    apk_key = (

        os.getenv(

            "APP_UPDATE_APK_KEY",

            (
                "app-updates/"
                f"rosehome-{latest_version}.apk"
            ),

        )
        .strip()

    )


    if not apk_key:

        raise RuntimeError(
            "APP_UPDATE_APK_KEY cannot be empty"
        )


    download_expiry = (

        _read_positive_int(
            "APP_UPDATE_DOWNLOAD_EXPIRY",
            600,
        )

    )


    download_expiry = max(

        60,

        min(
            download_expiry,
            600,
        ),

    )


    return AppUpdateConfig(

        latest_version=
            latest_version,

        latest_build=
            latest_build,

        minimum_build=
            minimum_build,

        force_update=
            force_update,

        apk_key=
            apk_key,

        release_notes=
            _read_release_notes(),

        download_expiry=
            download_expiry,

    )


# ==========================================
# PUBLIC VERSION CHECK
# ==========================================

@router.get(

    "/version",

    response_model=
        AppVersionResponse,

)
def get_app_version():

    try:

        config = (
            _get_update_config()
        )


    except RuntimeError as error:

        logger.exception(

            "Invalid app update configuration: %s",

            error,

        )


        raise HTTPException(

            status_code=
                status.HTTP_503_SERVICE_UNAVAILABLE,

            detail=
                "App update configuration is unavailable.",

        )


    return AppVersionResponse(

        platform=
            "android",

        latest_version=
            config.latest_version,

        latest_build=
            config.latest_build,

        minimum_build=
            config.minimum_build,

        force_update=
            config.force_update,

        release_notes=
            config.release_notes,

        download_requires_auth=
            True,

    )


# ==========================================
# PRIVATE APK DOWNLOAD LINK
# ADMIN REQUIRED
# ==========================================

@router.get(

    "/version/download",

    response_model=
        AppUpdateDownloadResponse,

)
def get_app_update_download(

    _current_user=
        Depends(
            require_admin
        ),

):

    config = None


    try:

        config = (
            _get_update_config()
        )


        download_url = (

            create_app_update_presigned_url(

                file_key=
                    config.apk_key,

                expires_in=
                    config.download_expiry,

            )

        )


    except FileNotFoundError as error:

        logger.warning(

            "Rosehome update APK not found. "
            "apk_key=%r error=%s",

            (
                config.apk_key
                if config
                else None
            ),

            error,

        )


        raise HTTPException(

            status_code=
                status.HTTP_404_NOT_FOUND,

            detail=
                "Update APK has not been uploaded yet.",

        )


    except RuntimeError as error:

        logger.exception(

            "Rosehome update configuration error: %s",

            error,

        )


        raise HTTPException(

            status_code=
                status.HTTP_503_SERVICE_UNAVAILABLE,

            detail=
                "App update configuration is unavailable.",

        )


    except ValueError as error:

        # ValueError không chứa secret.
        #
        # Log:
        # - thông báo lỗi thật
        # - APK object key Render đang sử dụng
        #
        # Không log R2 secret/access key.
        logger.exception(

            "Rosehome update ValueError. "
            "message=%s apk_key=%r",

            error,

            (
                config.apk_key
                if config
                else None
            ),

        )


        raise HTTPException(

            status_code=
                status.HTTP_503_SERVICE_UNAVAILABLE,

            detail=
                "Unable to create the update download link.",

        )


    except Exception as error:

        logger.exception(

            "Unable to create Rosehome update download link. "
            "error_type=%s apk_key=%r",

            type(
                error
            ).__name__,

            (
                config.apk_key
                if config
                else None
            ),

        )


        raise HTTPException(

            status_code=
                status.HTTP_503_SERVICE_UNAVAILABLE,

            detail=
                "Unable to create the update download link.",

        )


    return AppUpdateDownloadResponse(

        latest_version=
            config.latest_version,

        latest_build=
            config.latest_build,

        download_url=
            download_url,

        expires_in=
            config.download_expiry,

    )