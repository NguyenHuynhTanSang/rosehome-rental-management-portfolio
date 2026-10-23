"""add database integrity constraints

Revision ID: a13f6c92d4e1
Revises: 8c4d2f1a9b7e
Create Date: 2026-08-29
"""

from collections.abc import Sequence

from alembic import op

import sqlalchemy as sa


# revision identifiers, used by Alembic.

revision: str = (
    "a13f6c92d4e1"
)

down_revision: (
    str
    |
    Sequence[str]
    |
    None
) = (
    "8c4d2f1a9b7e"
)

branch_labels: (
    str
    |
    Sequence[str]
    |
    None
) = None

depends_on: (
    str
    |
    Sequence[str]
    |
    None
) = None


# =========================================================
# PRE-MIGRATION CHECK
# =========================================================

def _assert_no_invalid_rows() -> None:

    """
    Không tự sửa dữ liệu cũ.

    Nếu database đang có dữ liệu
    vi phạm rule mới, migration
    dừng lại để admin kiểm tra.
    """

    bind = (
        op.get_bind()
    )


    checks = [

        # =================================================
        # PAYMENTS
        # =================================================

        (
            "payments.payment_method",

            """
            SELECT COUNT(*)
            FROM payments
            WHERE payment_method
                  NOT IN (
                    'CASH',
                    'BANK_TRANSFER',
                    'OTHER'
                  )
            """,
        ),


        # =================================================
        # INVOICES
        # =================================================

        (
            (
                "invoices "
                "month/year/version/"
                "total/status"
            ),

            """
            SELECT COUNT(*)
            FROM invoices
            WHERE month < 1
               OR month > 12
               OR year < 2020
               OR year > 2100
               OR version < 1
               OR total_amount < 0
               OR status
                  NOT IN (
                    'DRAFT',
                    'ISSUED',
                    'CANCELLED'
                  )
               OR payment_status
                  NOT IN (
                    'UNPAID',
                    'PARTIALLY_PAID',
                    'PAID'
                  )
            """,
        ),


        # =================================================
        # ROOMS
        # =================================================

        (
            "rooms status/floor",

            """
            SELECT COUNT(*)
            FROM rooms
            WHERE status
                  NOT IN (
                    'VACANT',
                    'OCCUPIED'
                  )
               OR (
                    floor IS NOT NULL
                    AND floor < 0
                  )
            """,
        ),


        # =================================================
        # CONTRACTS
        # =================================================

        (
            "contracts values/status/date",

            """
            SELECT COUNT(*)
            FROM contracts
            WHERE (
                    end_date IS NOT NULL
                    AND end_date < start_date
                  )
               OR monthly_rent < 0
               OR deposit_required < 0
               OR occupant_count < 1
               OR status
                  NOT IN (
                    'ACTIVE',
                    'ENDED'
                  )
            """,
        ),


        # =================================================
        # METER
        # =================================================

        (
            "meter_readings values",

            """
            SELECT COUNT(*)
            FROM meter_readings
            WHERE month < 1
               OR month > 12
               OR year < 2020
               OR year > 2100
               OR old_reading < 0
               OR new_reading < 0
               OR new_reading < old_reading
               OR consumption < 0
               OR consumption
                  <> (
                    new_reading
                    -
                    old_reading
                  )
            """,
        ),


        # =================================================
        # ROOM FEES
        # =================================================

        (
            "room_fee_settings values",

            """
            SELECT COUNT(*)
            FROM room_fee_settings
            WHERE electricity_rate < 0
               OR water_fee < 0
               OR management_fee < 0
            """,
        ),


        # =================================================
        # DUPLICATE ACTIVE ROOM CONTRACT
        # =================================================

        (
            (
                "duplicate ACTIVE "
                "contracts per room"
            ),

            """
            SELECT COUNT(*)

            FROM (

                SELECT room_id

                FROM contracts

                WHERE status = 'ACTIVE'

                GROUP BY room_id

                HAVING COUNT(*) > 1

            ) AS duplicated_active_rooms
            """,
        ),


        # =================================================
        # DUPLICATE ACTIVE TENANT CONTRACT
        # =================================================

        (
            (
                "duplicate ACTIVE "
                "contracts per tenant"
            ),

            """
            SELECT COUNT(*)

            FROM (

                SELECT tenant_id

                FROM contracts

                WHERE status = 'ACTIVE'

                GROUP BY tenant_id

                HAVING COUNT(*) > 1

            ) AS duplicated_active_tenants
            """,
        ),

    ]


    for (
        label,
        sql,
    ) in checks:

        invalid_count = (
            bind.execute(
                sa.text(
                    sql
                )
            )
            .scalar_one()
        )


        if invalid_count:

            raise RuntimeError(

                "Database integrity migration stopped: "
                f"{invalid_count} invalid row/group(s) "
                f"found for {label}. "
                "Fix the existing data first, "
                "then run alembic upgrade again."

            )


# =========================================================
# UPGRADE
# =========================================================

def upgrade() -> None:

    _assert_no_invalid_rows()


    # =====================================================
    # PAYMENTS
    # =====================================================

    op.create_check_constraint(

        "ck_payment_method_valid",

        "payments",

        (
            "payment_method IN "
            "('CASH', 'BANK_TRANSFER', 'OTHER')"
        ),

    )


    # =====================================================
    # INVOICES
    # =====================================================

    op.create_check_constraint(

        "ck_invoice_month_valid",

        "invoices",

        "month >= 1 AND month <= 12",

    )


    op.create_check_constraint(

        "ck_invoice_year_valid",

        "invoices",

        "year >= 2020 AND year <= 2100",

    )


    op.create_check_constraint(

        "ck_invoice_version_positive",

        "invoices",

        "version >= 1",

    )


    op.create_check_constraint(

        "ck_invoice_total_amount_nonnegative",

        "invoices",

        "total_amount >= 0",

    )


    op.create_check_constraint(

        "ck_invoice_status_valid",

        "invoices",

        (
            "status IN "
            "('DRAFT', 'ISSUED', 'CANCELLED')"
        ),

    )


    op.create_check_constraint(

        "ck_invoice_payment_status_valid",

        "invoices",

        (
            "payment_status IN "
            "('UNPAID', 'PARTIALLY_PAID', 'PAID')"
        ),

    )


    # =====================================================
    # ROOMS
    # =====================================================

    op.create_check_constraint(

        "ck_room_status_valid",

        "rooms",

        (
            "status IN "
            "('VACANT', 'OCCUPIED')"
        ),

    )


    op.create_check_constraint(

        "ck_room_floor_nonnegative",

        "rooms",

        "floor IS NULL OR floor >= 0",

    )


    # =====================================================
    # CONTRACTS
    # =====================================================

    op.create_check_constraint(

        "ck_contract_end_date_valid",

        "contracts",

        (
            "end_date IS NULL "
            "OR end_date >= start_date"
        ),

    )


    op.create_check_constraint(

        "ck_contract_monthly_rent_nonnegative",

        "contracts",

        "monthly_rent >= 0",

    )


    op.create_check_constraint(

        "ck_contract_deposit_nonnegative",

        "contracts",

        "deposit_required >= 0",

    )


    op.create_check_constraint(

        "ck_contract_occupant_count_positive",

        "contracts",

        "occupant_count >= 1",

    )


    op.create_check_constraint(

        "ck_contract_status_valid",

        "contracts",

        (
            "status IN "
            "('ACTIVE', 'ENDED')"
        ),

    )


    # Normal indexes phục vụ lịch sử.

    op.create_index(

        "ix_contracts_room_id",

        "contracts",

        [
            "room_id",
        ],

        unique=False,

    )


    op.create_index(

        "ix_contracts_tenant_id",

        "contracts",

        [
            "tenant_id",
        ],

        unique=False,

    )


    # Một phòng chỉ có
    # một ACTIVE contract.

    op.create_index(

        "uq_contract_active_room",

        "contracts",

        [
            "room_id",
        ],

        unique=True,

        postgresql_where=
            sa.text(
                "status = 'ACTIVE'"
            ),

    )


    # Một tenant chỉ có
    # một ACTIVE contract.

    op.create_index(

        "uq_contract_active_tenant",

        "contracts",

        [
            "tenant_id",
        ],

        unique=True,

        postgresql_where=
            sa.text(
                "status = 'ACTIVE'"
            ),

    )


    # =====================================================
    # METER READINGS
    # =====================================================

    op.create_check_constraint(

        "ck_meter_reading_month_valid",

        "meter_readings",

        "month >= 1 AND month <= 12",

    )


    op.create_check_constraint(

        "ck_meter_reading_year_valid",

        "meter_readings",

        "year >= 2020 AND year <= 2100",

    )


    op.create_check_constraint(

        "ck_meter_reading_old_nonnegative",

        "meter_readings",

        "old_reading >= 0",

    )


    op.create_check_constraint(

        "ck_meter_reading_new_nonnegative",

        "meter_readings",

        "new_reading >= 0",

    )


    op.create_check_constraint(

        "ck_meter_reading_new_gte_old",

        "meter_readings",

        "new_reading >= old_reading",

    )


    op.create_check_constraint(

        "ck_meter_reading_consumption_nonnegative",

        "meter_readings",

        "consumption >= 0",

    )


    op.create_check_constraint(

        "ck_meter_reading_consumption_matches",

        "meter_readings",

        (
            "consumption = "
            "new_reading - old_reading"
        ),

    )


    # =====================================================
    # ROOM FEE SETTINGS
    # =====================================================

    op.create_check_constraint(

        "ck_room_fee_electricity_nonnegative",

        "room_fee_settings",

        "electricity_rate >= 0",

    )


    op.create_check_constraint(

        "ck_room_fee_water_nonnegative",

        "room_fee_settings",

        "water_fee >= 0",

    )


    op.create_check_constraint(

        "ck_room_fee_management_nonnegative",

        "room_fee_settings",

        "management_fee >= 0",

    )


# =========================================================
# DOWNGRADE
# =========================================================

def downgrade() -> None:


    # =====================================================
    # ROOM FEE SETTINGS
    # =====================================================

    op.drop_constraint(

        "ck_room_fee_management_nonnegative",

        "room_fee_settings",

        type_="check",

    )


    op.drop_constraint(

        "ck_room_fee_water_nonnegative",

        "room_fee_settings",

        type_="check",

    )


    op.drop_constraint(

        "ck_room_fee_electricity_nonnegative",

        "room_fee_settings",

        type_="check",

    )


    # =====================================================
    # METER READINGS
    # =====================================================

    op.drop_constraint(

        "ck_meter_reading_consumption_matches",

        "meter_readings",

        type_="check",

    )


    op.drop_constraint(

        "ck_meter_reading_consumption_nonnegative",

        "meter_readings",

        type_="check",

    )


    op.drop_constraint(

        "ck_meter_reading_new_gte_old",

        "meter_readings",

        type_="check",

    )


    op.drop_constraint(

        "ck_meter_reading_new_nonnegative",

        "meter_readings",

        type_="check",

    )


    op.drop_constraint(

        "ck_meter_reading_old_nonnegative",

        "meter_readings",

        type_="check",

    )


    op.drop_constraint(

        "ck_meter_reading_year_valid",

        "meter_readings",

        type_="check",

    )


    op.drop_constraint(

        "ck_meter_reading_month_valid",

        "meter_readings",

        type_="check",

    )


    # =====================================================
    # CONTRACTS
    # =====================================================

    op.drop_index(

        "uq_contract_active_tenant",

        table_name="contracts",

    )


    op.drop_index(

        "uq_contract_active_room",

        table_name="contracts",

    )


    op.drop_index(

        "ix_contracts_tenant_id",

        table_name="contracts",

    )


    op.drop_index(

        "ix_contracts_room_id",

        table_name="contracts",

    )


    op.drop_constraint(

        "ck_contract_status_valid",

        "contracts",

        type_="check",

    )


    op.drop_constraint(

        "ck_contract_occupant_count_positive",

        "contracts",

        type_="check",

    )


    op.drop_constraint(

        "ck_contract_deposit_nonnegative",

        "contracts",

        type_="check",

    )


    op.drop_constraint(

        "ck_contract_monthly_rent_nonnegative",

        "contracts",

        type_="check",

    )


    op.drop_constraint(

        "ck_contract_end_date_valid",

        "contracts",

        type_="check",

    )


    # =====================================================
    # ROOMS
    # =====================================================

    op.drop_constraint(

        "ck_room_floor_nonnegative",

        "rooms",

        type_="check",

    )


    op.drop_constraint(

        "ck_room_status_valid",

        "rooms",

        type_="check",

    )


    # =====================================================
    # INVOICES
    # =====================================================

    op.drop_constraint(

        "ck_invoice_payment_status_valid",

        "invoices",

        type_="check",

    )


    op.drop_constraint(

        "ck_invoice_status_valid",

        "invoices",

        type_="check",

    )


    op.drop_constraint(

        "ck_invoice_total_amount_nonnegative",

        "invoices",

        type_="check",

    )


    op.drop_constraint(

        "ck_invoice_version_positive",

        "invoices",

        type_="check",

    )


    op.drop_constraint(

        "ck_invoice_year_valid",

        "invoices",

        type_="check",

    )


    op.drop_constraint(

        "ck_invoice_month_valid",

        "invoices",

        type_="check",

    )


    # =====================================================
    # PAYMENTS
    # =====================================================

    op.drop_constraint(

        "ck_payment_method_valid",

        "payments",

        type_="check",

    )