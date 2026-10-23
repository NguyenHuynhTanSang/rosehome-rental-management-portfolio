from __future__ import annotations

from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
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


class RoomPublicImage(Base):

    __tablename__ = (
        "room_public_images"
    )

    __table_args__ = (

        CheckConstraint(
            "sort_order >= 0",
            name=(
                "ck_room_public_images_"
                "sort_order_nonnegative"
            ),
        ),

        UniqueConstraint(
            "room_id",
            "file_key",
            name=(
                "uq_room_public_images_"
                "room_file_key"
            ),
        ),

    )


    id: Mapped[int] = mapped_column(
        primary_key=True
    )


    room_id: Mapped[int] = mapped_column(
        ForeignKey(
            "rooms.id",
            ondelete="CASCADE",
        ),
        index=True,
        nullable=False,
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


    sort_order: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )


    created_at: Mapped[
        datetime
    ] = mapped_column(
        DateTime(
            timezone=True
        ),
        server_default=
            func.now(),
        nullable=False,
    )