"""add invoice electricity period and meter source

Revision ID: f6c2a1d48e73
Revises: e2b7c4d91a36
"""

from alembic import op
import sqlalchemy as sa


revision = "f6c2a1d48e73"
down_revision = "e2b7c4d91a36"
branch_labels = None
depends_on = None


def upgrade() -> None:

    op.add_column(
        "invoices",
        sa.Column(
            "electricity_period_year",
            sa.Integer(),
            nullable=True,
        ),
    )

    op.add_column(
        "invoices",
        sa.Column(
            "electricity_period_month",
            sa.Integer(),
            nullable=True,
        ),
    )

    op.add_column(
        "invoices",
        sa.Column(
            "meter_reading_id",
            sa.Integer(),
            nullable=True,
        ),
    )


    op.create_index(
        "ix_invoices_meter_reading_id",
        "invoices",
        ["meter_reading_id"],
        unique=False,
    )


    op.create_foreign_key(
        "fk_invoices_meter_reading_id_meter_readings",
        "invoices",
        "meter_readings",
        ["meter_reading_id"],
        ["id"],
        ondelete="SET NULL",
    )


    # Existing invoices keep their old same-month meaning.
    op.execute(
        """
        UPDATE invoices
        SET
            electricity_period_year = year,
            electricity_period_month = month
        """
    )


    # Historical invoices are linked to the meter row
    # they used under the old same-month billing rule.
    op.execute(
        """
        UPDATE invoices AS i
        SET meter_reading_id = (
            SELECT mr.id
            FROM meter_readings AS mr
            WHERE
                mr.room_id = i.room_id
                AND mr.year = i.year
                AND mr.month = i.month
            LIMIT 1
        )
        WHERE EXISTS (
            SELECT 1
            FROM invoice_items AS item
            WHERE item.invoice_id = i.id
              AND item.item_type = 'ELECTRICITY'
        )
        """
    )


    op.create_check_constraint(
        "ck_invoice_electricity_period_month_valid",
        "invoices",
        (
            "electricity_period_month IS NULL "
            "OR "
            "(electricity_period_month >= 1 "
            "AND electricity_period_month <= 12)"
        ),
    )

    op.create_check_constraint(
        "ck_invoice_electricity_period_year_valid",
        "invoices",
        (
            "electricity_period_year IS NULL "
            "OR "
            "(electricity_period_year >= 2019 "
            "AND electricity_period_year <= 2100)"
        ),
    )

    op.create_check_constraint(
        "ck_invoice_electricity_period_pair",
        "invoices",
        (
            "(electricity_period_year IS NULL "
            "AND electricity_period_month IS NULL) "
            "OR "
            "(electricity_period_year IS NOT NULL "
            "AND electricity_period_month IS NOT NULL)"
        ),
    )


def downgrade() -> None:

    op.drop_constraint(
        "ck_invoice_electricity_period_pair",
        "invoices",
        type_="check",
    )

    op.drop_constraint(
        "ck_invoice_electricity_period_year_valid",
        "invoices",
        type_="check",
    )

    op.drop_constraint(
        "ck_invoice_electricity_period_month_valid",
        "invoices",
        type_="check",
    )

    op.drop_constraint(
        "fk_invoices_meter_reading_id_meter_readings",
        "invoices",
        type_="foreignkey",
    )

    op.drop_index(
        "ix_invoices_meter_reading_id",
        table_name="invoices",
    )

    op.drop_column(
        "invoices",
        "meter_reading_id",
    )

    op.drop_column(
        "invoices",
        "electricity_period_month",
    )

    op.drop_column(
        "invoices",
        "electricity_period_year",
    )
