from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    ForeignKey,
    func,
)

from sqlalchemy.orm import (
    Mapped,
    mapped_column,
    relationship,
)

from backend.app.database import Base


if TYPE_CHECKING:
    from backend.app.models.room import Room


class RoomFeeSetting(Base):

    __tablename__ = "room_fee_settings"


    __table_args__ = (

        CheckConstraint(
            "electricity_rate >= 0",
            name="ck_room_fee_electricity_nonnegative",
        ),

        CheckConstraint(
            "water_fee >= 0",
            name="ck_room_fee_water_nonnegative",
        ),

        CheckConstraint(
            "management_fee >= 0",
            name="ck_room_fee_management_nonnegative",
        ),

    )


    # ==============================
    # ID
    # ==============================

    id: Mapped[int] = mapped_column(
        primary_key=True
    )


    # ==============================
    # ROOM
    # ==============================

    room_id: Mapped[
        int
    ] = mapped_column(

        ForeignKey(
            "rooms.id",
            ondelete="CASCADE",
        ),

        unique=True,

        nullable=False,

    )


    # ==============================
    # ELECTRICITY
    # ==============================

    electricity_rate: Mapped[
        int
    ] = mapped_column(

        BigInteger,

        default=4000,

        nullable=False,

    )


    # ==============================
    # WATER
    # ==============================

    water_fee: Mapped[
        int
    ] = mapped_column(

        BigInteger,

        default=300000,

        nullable=False,

    )


    # ==============================
    # MANAGEMENT
    # ==============================

    management_fee: Mapped[
        int
    ] = mapped_column(

        BigInteger,

        default=250000,

        nullable=False,

    )


    # ==============================
    # UPDATED
    # ==============================

    updated_at: Mapped[
        datetime
    ] = mapped_column(

        DateTime(
            timezone=True
        ),

        server_default=func.now(),

        onupdate=func.now(),

        nullable=False,

    )


    # ==============================
    # RELATIONSHIP
    # ==============================

    room: Mapped[
        "Room"
    ] = relationship(

        back_populates="fee_setting",

    )