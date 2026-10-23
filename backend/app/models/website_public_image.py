from __future__ import annotations

from datetime import datetime

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    Integer,
    String,
    UniqueConstraint,
    func,
)

from sqlalchemy.orm import (
    Mapped,
    mapped_column,
)

from backend.app.database import Base


class WebsitePublicImage(Base):

    __tablename__ = "website_public_images"

    __table_args__ = (

        CheckConstraint(
            "sort_order >= 0",
            name=(
                "ck_website_public_images_"
                "sort_order_nonnegative"
            ),
        ),

        CheckConstraint(
            "image_type IN ('HERO', 'GALLERY')",
            name=(
                "ck_website_public_images_"
                "image_type"
            ),
        ),

        UniqueConstraint(
            "file_key",
            name=(
                "uq_website_public_images_"
                "file_key"
            ),
        ),
    )


    id: Mapped[int] = mapped_column(
        primary_key=True,
    )


    image_type: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        index=True,
    )


    file_key: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
    )


    original_name: Mapped[
        str | None
    ] = mapped_column(
        String(255),
        nullable=True,
    )


    content_type: Mapped[
        str | None
    ] = mapped_column(
        String(100),
        nullable=True,
    )


    alt_text: Mapped[
        str | None
    ] = mapped_column(
        String(255),
        nullable=True,
    )


    sort_order: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )


    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )


    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )