from dataclasses import dataclass
from io import BytesIO
import warnings

from PIL import (
    Image,
    ImageFile,
    UnidentifiedImageError,
)


# =========================================================
# PILLOW SECURITY CONFIG
# =========================================================

# Không cho Pillow bỏ qua ảnh bị cắt/hỏng.
ImageFile.LOAD_TRUNCATED_IMAGES = False


# Giới hạn số pixel của ảnh.
#
# 30 triệu pixel vẫn dư sức cho:
# - screenshot
# - bill ngân hàng
# - ảnh chụp điện thoại thông thường
#
# nhưng giúp hạn chế decompression bomb.
MAX_IMAGE_PIXELS = (
    30_000_000
)


# Giới hạn riêng từng chiều.
MAX_IMAGE_WIDTH = (
    10_000
)

MAX_IMAGE_HEIGHT = (
    10_000
)


# Pillow cũng dùng giới hạn này
# để cảnh báo decompression bomb.
Image.MAX_IMAGE_PIXELS = (
    MAX_IMAGE_PIXELS
)


# =========================================================
# RESULT
# =========================================================

@dataclass(
    frozen=True
)
class DetectedImageType:

    mime_type: str

    extension: str


# =========================================================
# MAGIC SIGNATURES
# =========================================================

PNG_SIGNATURE = (
    b"\x89PNG\r\n\x1a\n"
)


JPEG_SIGNATURE = (
    b"\xff\xd8\xff"
)


# =========================================================
# SUPPORTED IMAGE FORMATS
# =========================================================

PIL_FORMAT_MAP = {

    "JPEG":
        DetectedImageType(
            mime_type=
                "image/jpeg",

            extension=
                ".jpg",
        ),

    "PNG":
        DetectedImageType(
            mime_type=
                "image/png",

            extension=
                ".png",
        ),

    "WEBP":
        DetectedImageType(
            mime_type=
                "image/webp",

            extension=
                ".webp",
        ),

}


# =========================================================
# DETECT IMAGE TYPE BY MAGIC BYTES
# =========================================================

def detect_image_type(
    data: bytes,
) -> DetectedImageType | None:

    if not data:

        return None


    # =====================================================
    # PNG
    # =====================================================

    if data.startswith(
        PNG_SIGNATURE
    ):

        return DetectedImageType(
            mime_type=
                "image/png",

            extension=
                ".png",
        )


    # =====================================================
    # JPEG
    # =====================================================

    if data.startswith(
        JPEG_SIGNATURE
    ):

        return DetectedImageType(
            mime_type=
                "image/jpeg",

            extension=
                ".jpg",
        )


    # =====================================================
    # WEBP
    #
    # RIFF....WEBP
    # =====================================================

    if (
        len(data) >= 12
        and
        data[0:4]
        == b"RIFF"
        and
        data[8:12]
        == b"WEBP"
    ):

        return DetectedImageType(
            mime_type=
                "image/webp",

            extension=
                ".webp",
        )


    return None


# =========================================================
# VALIDATE IMAGE DIMENSIONS
# =========================================================

def _validate_image_dimensions(
    width: int,
    height: int,
) -> None:

    if (
        width <= 0
        or
        height <= 0
    ):

        raise ValueError(
            "Kích thước ảnh không hợp lệ."
        )


    if (
        width > MAX_IMAGE_WIDTH
        or
        height > MAX_IMAGE_HEIGHT
    ):

        raise ValueError(
            (
                "Kích thước ảnh quá lớn. "
                f"Tối đa "
                f"{MAX_IMAGE_WIDTH}x"
                f"{MAX_IMAGE_HEIGHT} pixel."
            )
        )


    total_pixels = (
        width
        *
        height
    )


    if (
        total_pixels
        >
        MAX_IMAGE_PIXELS
    ):

        raise ValueError(
            (
                "Ảnh có quá nhiều pixel. "
                "Vui lòng sử dụng ảnh nhỏ hơn."
            )
        )


# =========================================================
# PILLOW VERIFY
# =========================================================

def _verify_with_pillow(
    data: bytes,
) -> DetectedImageType:

    try:

        # =================================================
        # FIRST PASS
        #
        # Kiểm tra:
        # - Pillow có nhận diện được không
        # - format
        # - width / height
        # - cấu trúc file
        # =================================================

        with warnings.catch_warnings():

            warnings.simplefilter(
                "error",
                Image.DecompressionBombWarning,
            )


            with Image.open(
                BytesIO(
                    data
                )
            ) as image:

                image_format = (
                    image.format
                    or ""
                ).upper()


                detected = (
                    PIL_FORMAT_MAP.get(
                        image_format
                    )
                )


                if detected is None:

                    raise ValueError(
                        (
                            "Chỉ hỗ trợ ảnh "
                            "JPG, PNG hoặc WEBP."
                        )
                    )


                width, height = (
                    image.size
                )


                _validate_image_dimensions(
                    width,
                    height,
                )


                # verify() kiểm tra cấu trúc
                # mà chưa decode toàn bộ pixel.
                image.verify()


        # =================================================
        # SECOND PASS
        #
        # Sau verify() phải mở lại ảnh.
        #
        # load() buộc Pillow decode dữ liệu thật.
        # Nếu file bị cắt/hỏng sẽ lỗi ở đây.
        # =================================================

        with warnings.catch_warnings():

            warnings.simplefilter(
                "error",
                Image.DecompressionBombWarning,
            )


            with Image.open(
                BytesIO(
                    data
                )
            ) as image:

                image_format = (
                    image.format
                    or ""
                ).upper()


                second_detected = (
                    PIL_FORMAT_MAP.get(
                        image_format
                    )
                )


                if second_detected is None:

                    raise ValueError(
                        (
                            "Chỉ hỗ trợ ảnh "
                            "JPG, PNG hoặc WEBP."
                        )
                    )


                width, height = (
                    image.size
                )


                _validate_image_dimensions(
                    width,
                    height,
                )


                # Decode pixel thật.
                image.load()


                return (
                    second_detected
                )


    except ValueError:

        raise


    except (
        UnidentifiedImageError,
        OSError,
        SyntaxError,
        Image.DecompressionBombError,
        Image.DecompressionBombWarning,
    ) as exc:

        raise ValueError(
            (
                "File ảnh bị hỏng, "
                "không hợp lệ hoặc có "
                "kích thước bất thường."
            )
        ) from exc


# =========================================================
# VALIDATE RECEIPT IMAGE
# =========================================================

def validate_receipt_image(
    data: bytes,
    declared_content_type: str | None,
) -> DetectedImageType:

    # =====================================================
    # EMPTY
    # =====================================================

    if not data:

        raise ValueError(
            "File ảnh trống."
        )


    # =====================================================
    # MAGIC BYTES
    # =====================================================

    magic_detected = (
        detect_image_type(
            data
        )
    )


    if magic_detected is None:

        raise ValueError(
            (
                "File không phải ảnh "
                "JPG, PNG hoặc WEBP hợp lệ."
            )
        )


    # =====================================================
    # DECLARED MIME
    # =====================================================

    clean_content_type = (
        declared_content_type
        or ""
    ).strip().lower()


    if (
        clean_content_type
        != magic_detected.mime_type
    ):

        raise ValueError(
            (
                "Loại file không khớp "
                "với nội dung thực tế."
            )
        )


    # =====================================================
    # PILLOW VERIFY + DECODE
    # =====================================================

    pillow_detected = (
        _verify_with_pillow(
            data
        )
    )


    # =====================================================
    # MAGIC BYTES PHẢI KHỚP PILLOW
    # =====================================================

    if (
        pillow_detected.mime_type
        != magic_detected.mime_type
    ):

        raise ValueError(
            (
                "Định dạng ảnh không nhất quán "
                "hoặc file không hợp lệ."
            )
        )


    if (
        pillow_detected.extension
        != magic_detected.extension
    ):

        raise ValueError(
            (
                "Định dạng ảnh không nhất quán "
                "hoặc file không hợp lệ."
            )
        )


    return pillow_detected