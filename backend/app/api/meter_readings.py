from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.app.auth_dependencies import require_admin
from backend.app.dependencies import get_db
from backend.app.models.meter_reading import MeterReading
from backend.app.models.contract import Contract
from backend.app.models.room import Room
from backend.app.services.electricity_transition import get_transition_baselines
from backend.app.schemas.meter_reading import (
    MeterReadingCreate,
    MeterReadingResponse,
    MeterReadingBulkCreate,
)


router = APIRouter(
    prefix="/meter-readings",
    tags=["Meter Readings"],
    dependencies=[
        Depends(require_admin),
    ],
)


# =========================================================
# PERIOD VALIDATION
# =========================================================

def validate_period(
    year: int,
    month: int,
) -> None:

    if (
        year < 2020
        or year > 2100
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Year must be between 2020 and 2100",
        )

    if (
        month < 1
        or month > 12
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Month must be between 1 and 12",
        )


# =========================================================
# 1. THÊM SỐ ĐIỆN CHO MỘT PHÒNG
# =========================================================

def _get_move_in_electric_reading_for_month(
    db: Session,
    room_id: int,
    year: int,
    month: int,
) -> int | None:

    contracts = db.scalars(
        select(
            Contract
        )
        .where(
            Contract.room_id
            == room_id,

            Contract.move_in_electric_reading
            .is_not(None),
        )
        .order_by(
            Contract.start_date.desc(),
            Contract.id.desc(),
        )
    ).all()


    for contract in contracts:

        if (
            contract.start_date.year
            == year
            and
            contract.start_date.month
            == month
        ):

            return (
                contract.move_in_electric_reading
            )


    return None


@router.get("/transition-baselines/{year}/{month}")
def transition_baselines(year: int, month: int, db: Annotated[Session, Depends(get_db)]):
    validate_period(year, month)
    return [{"room_id": room_id, "new_reading": value}
            for room_id, value in get_transition_baselines(db, year, month).items()]


@router.post(
    "",
    response_model=MeterReadingResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add Meter Reading"
)
def create_meter_reading(
    data: MeterReadingCreate,
    db: Annotated[Session, Depends(get_db)]
):
    validate_period(
        data.year,
        data.month,
    )

    room = db.scalar(
        select(
            Room
        )
        .where(
            Room.id
            == data.room_id
        )
        .with_for_update()
    )

    if room is None:
        raise HTTPException(
            status_code=404,
            detail="Room not found"
        )

    existing = db.scalar(
        select(MeterReading).where(
            MeterReading.room_id == data.room_id,
            MeterReading.year == data.year,
            MeterReading.month == data.month
        )
    )

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Meter reading for this month already exists"
        )

    previous = db.scalar(
        select(MeterReading)
        .where(
            MeterReading.room_id == data.room_id,
            (
                (MeterReading.year < data.year)
                |
                (
                    (MeterReading.year == data.year)
                    &
                    (MeterReading.month < data.month)
                )
            )
        )
        .order_by(
            MeterReading.year.desc(),
            MeterReading.month.desc()
        )
        .limit(1)
    )

    move_in_reading = (
        _get_move_in_electric_reading_for_month(
            db=
                db,

            room_id=
                data.room_id,

            year=
                data.year,

            month=
                data.month,
        )
    )


    if (
        move_in_reading
        is not None
    ):

        old_reading = (
            move_in_reading
        )

    elif (transition_reading := get_transition_baselines(db, data.year, data.month, data.room_id).get(data.room_id)) is not None:
        old_reading = transition_reading

    elif previous:

        old_reading = (
            previous.new_reading
        )

    else:

        if data.old_reading is None:

            raise HTTPException(
                status_code=400,

                detail=(
                    "Old reading is required "
                    "for the first meter reading"
                ),
            )


        old_reading = (
            data.old_reading
        )

    if data.new_reading < old_reading:
        raise HTTPException(
            status_code=400,
            detail="New reading cannot be less than old reading"
        )

    consumption = (
        data.new_reading
        - old_reading
    )

    reading = MeterReading(
        room_id=data.room_id,
        year=data.year,
        month=data.month,
        old_reading=old_reading,
        new_reading=data.new_reading,
        consumption=consumption
    )

    try:
        db.add(reading)
        db.commit()
        db.refresh(reading)

    except IntegrityError as exc:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Meter reading already exists "
                "or conflicts with database rules."
            ),
        ) from exc

    except Exception:
        db.rollback()
        raise

    return reading


# =========================================================
# 2. NHẬP SỐ ĐIỆN HÀNG LOẠT
# =========================================================

@router.post(
    "/bulk",
    response_model=list[MeterReadingResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Add Meter Readings in Bulk"
)
def create_bulk_meter_readings(
    data: MeterReadingBulkCreate,
    db: Annotated[Session, Depends(get_db)]
):
    validate_period(
        data.year,
        data.month,
    )

    created_readings = []

    room_ids = [
        item.room_id
        for item in data.readings
    ]

    if len(room_ids) != len(set(room_ids)):
        raise HTTPException(
            status_code=400,
            detail="Duplicate room_id found in request"
        )

    try:
        # Lock theo room_id tăng dần để các request bulk
        # lấy lock cùng thứ tự và giảm nguy cơ deadlock.
        locked_rooms = db.scalars(
            select(
                Room
            )
            .where(
                Room.id.in_(
                    room_ids
                )
            )
            .order_by(
                Room.id
            )
            .with_for_update()
        ).all()

        room_map = {
            room.id: room
            for room in locked_rooms
        }

        missing_room_ids = [
            room_id
            for room_id in room_ids
            if room_id not in room_map
        ]

        if missing_room_ids:
            raise HTTPException(
                status_code=404,
                detail=(
                    "Room not found: "
                    + ", ".join(
                        str(room_id)
                        for room_id in missing_room_ids
                    )
                ),
            )

        for item in data.readings:

            room = room_map[
                item.room_id
            ]

            existing = db.scalar(
                select(MeterReading).where(
                    MeterReading.room_id == item.room_id,
                    MeterReading.year == data.year,
                    MeterReading.month == data.month
                )
            )

            if existing:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"Meter reading already exists "
                        f"for room {item.room_id} "
                        f"in {data.month}/{data.year}"
                    )
                )

            previous = db.scalar(
                select(MeterReading)
                .where(
                    MeterReading.room_id == item.room_id,
                    (
                        (MeterReading.year < data.year)
                        |
                        (
                            (MeterReading.year == data.year)
                            &
                            (MeterReading.month < data.month)
                        )
                    )
                )
                .order_by(
                    MeterReading.year.desc(),
                    MeterReading.month.desc()
                )
                .limit(1)
            )

            move_in_reading = (
                _get_move_in_electric_reading_for_month(
                    db=
                        db,

                    room_id=
                        item.room_id,

                    year=
                        data.year,

                    month=
                        data.month,
                )
            )


            if (
                move_in_reading
                is not None
            ):

                old_reading = (
                    move_in_reading
                )

            elif (transition_reading := get_transition_baselines(db, data.year, data.month, item.room_id).get(item.room_id)) is not None:
                old_reading = transition_reading

            elif previous:

                old_reading = (
                    previous.new_reading
                )

            else:

                if item.old_reading is None:

                    raise HTTPException(
                        status_code=400,

                        detail=(
                            f"Old reading is required "
                            f"for room {item.room_id}"
                        ),
                    )


                old_reading = (
                    item.old_reading
                )

            if item.new_reading < old_reading:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"New reading cannot be less than "
                        f"old reading for room {item.room_id}"
                    )
                )

            consumption = (
                item.new_reading
                - old_reading
            )

            reading = MeterReading(
                room_id=item.room_id,
                year=data.year,
                month=data.month,
                old_reading=old_reading,
                new_reading=item.new_reading,
                consumption=consumption
            )

            db.add(reading)

            created_readings.append(
                reading
            )

        db.commit()

        for reading in created_readings:
            db.refresh(reading)

        return created_readings

    except IntegrityError as exc:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "One or more meter readings already exist "
                "or conflict with database rules."
            ),
        ) from exc

    except Exception:
        db.rollback()
        raise


# =========================================================
# 3. XEM SỐ ĐIỆN TOÀN BỘ PHÒNG THEO THÁNG
# =========================================================

@router.get(
    "/month/{year}/{month}",
    response_model=list[MeterReadingResponse],
    summary="View Monthly Meter Readings"
)
def get_month_meter_readings(
    year: int,
    month: int,
    db: Annotated[Session, Depends(get_db)]
):
    validate_period(
        year,
        month,
    )

    readings = db.scalars(
        select(MeterReading)
        .where(
            MeterReading.year == year,
            MeterReading.month == month
        )
        .order_by(
            MeterReading.room_id
        )
    ).all()

    return readings


# =========================================================
# 4. LẤY SỐ ĐIỆN GẦN NHẤT TRƯỚC THÁNG ĐANG CHỌN
# =========================================================

@router.get(
    "/previous/{year}/{month}",
    response_model=list[MeterReadingResponse],
    summary="View Previous Meter Readings"
)
def get_previous_meter_readings(
    year: int,
    month: int,
    db: Annotated[Session, Depends(get_db)]
):
    validate_period(
        year,
        month,
    )

    candidates = db.scalars(
        select(MeterReading)
        .where(
            (
                (MeterReading.year < year)
                |
                (
                    (MeterReading.year == year)
                    &
                    (MeterReading.month < month)
                )
            )
        )
        .order_by(
            MeterReading.room_id,
            MeterReading.year.desc(),
            MeterReading.month.desc()
        )
    ).all()

    latest_by_room = []
    seen_room_ids = set()

    for reading in candidates:

        if reading.room_id in seen_room_ids:
            continue

        seen_room_ids.add(
            reading.room_id
        )

        latest_by_room.append(
            reading
        )

    return latest_by_room


# =========================================================
# 5. XEM LỊCH SỬ SỐ ĐIỆN CỦA MỘT PHÒNG
# =========================================================

@router.get(
    "/room/{room_id}",
    response_model=list[MeterReadingResponse],
    summary="View Room Meter History"
)
def get_room_meter_readings(
    room_id: int,
    db: Annotated[Session, Depends(get_db)]
):
    room = db.get(
        Room,
        room_id
    )

    if room is None:
        raise HTTPException(
            status_code=404,
            detail="Room not found"
        )

    readings = db.scalars(
        select(MeterReading)
        .where(
            MeterReading.room_id == room_id
        )
        .order_by(
            MeterReading.year,
            MeterReading.month
        )
    ).all()

    return readings


@router.get(
    "/{reading_id}",
    response_model=MeterReadingResponse,
    summary="View Meter Reading Source",
)
def get_meter_reading(
    reading_id: int,
    db: Annotated[Session, Depends(get_db)],
):
    reading = db.get(MeterReading, reading_id)
    if reading is None:
        raise HTTPException(status_code=404, detail="Meter reading not found")
    return reading
