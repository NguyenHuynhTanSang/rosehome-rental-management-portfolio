from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    String,
    Text,
    func,
)

from sqlalchemy.orm import (
    Mapped,
    mapped_column,
    relationship,
)

from backend.app.database import Base


if TYPE_CHECKING:
    from backend.app.models.contract import Contract
    from backend.app.models.room_fee_setting import RoomFeeSetting
    from backend.app.models.meter_reading import MeterReading
    from backend.app.models.invoice import Invoice


class Room(Base):

    __tablename__ = "rooms"


    __table_args__ = (

        CheckConstraint(
            "status IN ('VACANT', 'OCCUPIED')",
            name="ck_room_status_valid",
        ),

        CheckConstraint(
            "floor IS NULL OR floor >= 0",
            name="ck_room_floor_nonnegative",
        ),

    )


    # ==============================
    # ID
    # ==============================

    id: Mapped[int] = mapped_column(
        primary_key=True
    )


    # ==============================
    # ROOM CODE
    # ==============================

    room_code: Mapped[str] = mapped_column(

        String(20),

        unique=True,

        index=True,

        nullable=False,

    )


    # ==============================
    # FLOOR
    # ==============================

    floor: Mapped[
        int | None
    ] = mapped_column(

        nullable=True,

    )


    # ==============================
    # STATUS
    # ==============================

    status: Mapped[str] = mapped_column(

        String(20),

        default="VACANT",

        nullable=False,

    )


    # ==============================
    # DESCRIPTION
    # ==============================

    description: Mapped[
        str | None
    ] = mapped_column(

        Text,

        nullable=True,

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
    # CONTRACTS
    # ==============================

    contracts: Mapped[
        list["Contract"]
    ] = relationship(

        back_populates="room",

    )


    # ==============================
    # FEE SETTING
    # ==============================

    fee_setting: Mapped[
        "RoomFeeSetting | None"
    ] = relationship(

        back_populates="room",

        uselist=False,

        cascade="all, delete-orphan",

    )


    # ==============================
    # METER READINGS
    # ==============================

    meter_readings: Mapped[
        list["MeterReading"]
    ] = relationship(

        back_populates="room",

        cascade="all, delete-orphan",

    )


    # ==============================
    # INVOICES
    # ==============================

    invoices: Mapped[
        list["Invoice"]
    ] = relationship(

        back_populates="room",

    )