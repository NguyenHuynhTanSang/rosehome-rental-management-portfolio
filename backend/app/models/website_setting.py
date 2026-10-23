from __future__ import annotations

from datetime import datetime

from sqlalchemy import (
    DateTime,
    String,
    Text,
    func,
)

from sqlalchemy.orm import (
    Mapped,
    mapped_column,
)

from backend.app.database import Base


class WebsiteSetting(Base):

    __tablename__ = "website_settings"

    id: Mapped[int] = mapped_column(
        primary_key=True
    )

    site_name: Mapped[str] = mapped_column(
        String(100),
        default="Rosehome Apartment",
        nullable=False,
    )

    hero_badge: Mapped[str] = mapped_column(
        String(150),
        default="Phòng trọ & căn hộ cho thuê",
        nullable=False,
    )

    hero_title: Mapped[str] = mapped_column(
        String(255),
        default=(
            "Không gian phù hợp "
            "cho cuộc sống của bạn"
        ),
        nullable=False,
    )

    hero_description: Mapped[str] = mapped_column(
        Text,
        default=(
            "Xem thông tin phòng, hình ảnh thực tế, "
            "giá thuê, chi phí và tiện ích trước khi liên hệ."
        ),
        nullable=False,
    )

    phone: Mapped[str | None] = mapped_column(
        String(30),
        nullable=True,
    )

    zalo_url: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )

    address: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )

    contact_note: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
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