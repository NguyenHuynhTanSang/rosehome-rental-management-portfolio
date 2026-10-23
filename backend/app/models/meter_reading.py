from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    UniqueConstraint,
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


class MeterReading(Base):

    __tablename__ = "meter_readings"


    __table_args__ = (

        # Một phòng chỉ có
        # một record điện mỗi tháng.

        UniqueConstraint(
            "room_id",
            "year",
            "month",
            name="uq_meter_reading_room_month",
        ),


        # ==============================
        # MONTH / YEAR
        # ==============================

        CheckConstraint(
            "month >= 1 AND month <= 12",
            name="ck_meter_reading_month_valid",
        ),

        CheckConstraint(
            "year >= 2020 AND year <= 2100",
            name="ck_meter_reading_year_valid",
        ),


        # ==============================
        # READINGS
        # ==============================

        CheckConstraint(
            "old_reading >= 0",
            name="ck_meter_reading_old_nonnegative",
        ),

        CheckConstraint(
            "new_reading >= 0",
            name="ck_meter_reading_new_nonnegative",
        ),

        CheckConstraint(
            "new_reading >= old_reading",
            name="ck_meter_reading_new_gte_old",
        ),


        # ==============================
        # CONSUMPTION
        # ==============================

        CheckConstraint(
            "consumption >= 0",
            name="ck_meter_reading_consumption_nonnegative",
        ),

        CheckConstraint(
            "consumption = new_reading - old_reading",
            name="ck_meter_reading_consumption_matches",
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

        nullable=False,

        index=True,

    )


    # ==============================
    # YEAR
    # ==============================

    year: Mapped[
        int
    ] = mapped_column(

        Integer,

        nullable=False,

    )


    # ==============================
    # MONTH
    # ==============================

    month: Mapped[
        int
    ] = mapped_column(

        Integer,

        nullable=False,

    )


    # ==============================
    # OLD READING
    # ==============================

    old_reading: Mapped[
        int
    ] = mapped_column(

        Integer,

        nullable=False,

    )


    # ==============================
    # NEW READING
    # ==============================

    new_reading: Mapped[
        int
    ] = mapped_column(

        Integer,

        nullable=False,

    )


    # ==============================
    # CONSUMPTION
    # ==============================

    consumption: Mapped[
        int
    ] = mapped_column(

        Integer,

        nullable=False,

    )


    # ==============================
    # CREATED
    # ==============================

    created_at: Mapped[
        datetime
    ] = mapped_column(

        DateTime(
            timezone=True
        ),

        server_default=func.now(),

        nullable=False,

    )


    # ==============================
    # RELATIONSHIP
    # ==============================

    room: Mapped[
        "Room"
    ] = relationship(

        back_populates="meter_readings",

    )