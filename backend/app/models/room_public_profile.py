from __future__ import annotations

from datetime import (
    date,
    datetime,
)

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    JSON,
    func,
)

from sqlalchemy.orm import (
    Mapped,
    mapped_column,
)

from backend.app.database import Base


class RoomPublicProfile(Base):

    __tablename__ = (
        "room_public_profiles"
    )

    __table_args__ = (

        CheckConstraint(
            (
                "monthly_rent IS NULL "
                "OR monthly_rent >= 0"
            ),
            name=(
                "ck_room_public_"
                "monthly_rent_nonnegative"
            ),
        ),

        CheckConstraint(
            (
                "area_m2 IS NULL "
                "OR area_m2 > 0"
            ),
            name=(
                "ck_room_public_"
                "area_positive"
            ),
        ),

        CheckConstraint(
            (
                "max_occupants IS NULL "
                "OR max_occupants > 0"
            ),
            name=(
                "ck_room_public_"
                "max_occupants_positive"
            ),
        ),

        CheckConstraint(
            "deposit_months >= 0",
            name=(
                "ck_room_public_"
                "deposit_nonnegative"
            ),
        ),

        CheckConstraint(
            "parking_fee >= 0",
            name=(
                "ck_room_public_"
                "parking_fee_nonnegative"
            ),
        ),

        CheckConstraint(
            "wifi_fee >= 0",
            name=(
                "ck_room_public_"
                "wifi_fee_nonnegative"
            ),
        ),

    )

    # ==============================
    # ID
    # ==============================

    id: Mapped[int] = mapped_column(
        primary_key=True,
    )

    # ==============================
    # ROOM
    # ==============================

    room_id: Mapped[int] = mapped_column(
        ForeignKey(
            "rooms.id",
            ondelete="CASCADE",
        ),
        unique=True,
        index=True,
        nullable=False,
    )

    # ==============================
    # PUBLIC VISIBILITY
    # ==============================

    is_visible: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    # ==============================
    # RENT INFORMATION
    # ==============================

    monthly_rent: Mapped[
        int | None
    ] = mapped_column(
        Integer,
        nullable=True,
    )

    area_m2: Mapped[
        int | None
    ] = mapped_column(
        Integer,
        nullable=True,
    )

    max_occupants: Mapped[
        int | None
    ] = mapped_column(
        Integer,
        nullable=True,
    )

    available_from: Mapped[
        date | None
    ] = mapped_column(
        Date,
        nullable=True,
    )

    # ==============================
    # FEES
    # ==============================

    deposit_months: Mapped[int] = (
        mapped_column(
            Integer,
            default=1,
            nullable=False,
        )
    )

    parking_fee: Mapped[int] = (
        mapped_column(
            Integer,
            default=0,
            nullable=False,
        )
    )

    wifi_fee: Mapped[int] = (
        mapped_column(
            Integer,
            default=0,
            nullable=False,
        )
    )

    # ==============================
    # PUBLIC DETAILS
    # ==============================

    amenities: Mapped[list[str]] = (
        mapped_column(
            JSON,
            default=list,
            nullable=False,
        )
    )

    furniture: Mapped[list[str]] = (
        mapped_column(
            JSON,
            default=list,
            nullable=False,
        )
    )

    # ==============================
    # TIMESTAMPS
    # ==============================

    created_at: Mapped[
        datetime
    ] = mapped_column(
        DateTime(
            timezone=True,
        ),
        server_default=func.now(),
        nullable=False,
    )

    updated_at: Mapped[
        datetime
    ] = mapped_column(
        DateTime(
            timezone=True,
        ),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )