"""add contract rent billing cycle

Revision ID: 4f9d2c7a81b3
Revises: 63895dab1569
Create Date: 2026-09-01
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "4f9d2c7a81b3"
down_revision: Union[str, Sequence[str], None] = "63895dab1569"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "contracts",
        sa.Column(
            "rent_billing_cycle_months",
            sa.Integer(),
            server_default=sa.text("1"),
            nullable=True,
        ),
    )

    op.add_column(
        "contracts",
        sa.Column(
            "rent_billing_anchor_year",
            sa.Integer(),
            nullable=True,
        ),
    )

    op.add_column(
        "contracts",
        sa.Column(
            "rent_billing_anchor_month",
            sa.Integer(),
            nullable=True,
        ),
    )

    # Hợp đồng cũ giữ hành vi hiện tại:
    # thu tiền phòng hàng tháng và lấy tháng bắt đầu hợp đồng
    # làm mốc chu kỳ.
    op.execute(
        """
        UPDATE contracts
        SET
            rent_billing_cycle_months = 1,
            rent_billing_anchor_year = EXTRACT(YEAR FROM start_date)::INTEGER,
            rent_billing_anchor_month = EXTRACT(MONTH FROM start_date)::INTEGER
        WHERE
            rent_billing_cycle_months IS NULL
            OR rent_billing_anchor_year IS NULL
            OR rent_billing_anchor_month IS NULL
        """
    )

    op.alter_column(
        "contracts",
        "rent_billing_cycle_months",
        existing_type=sa.Integer(),
        nullable=False,
        server_default=sa.text("1"),
    )

    op.alter_column(
        "contracts",
        "rent_billing_anchor_year",
        existing_type=sa.Integer(),
        nullable=False,
    )

    op.alter_column(
        "contracts",
        "rent_billing_anchor_month",
        existing_type=sa.Integer(),
        nullable=False,
    )

    op.create_check_constraint(
        "ck_contract_rent_billing_cycle_valid",
        "contracts",
        (
            "rent_billing_cycle_months >= 1 "
            "AND rent_billing_cycle_months <= 12"
        ),
    )

    op.create_check_constraint(
        "ck_contract_rent_billing_anchor_year_valid",
        "contracts",
        (
            "rent_billing_anchor_year >= 2020 "
            "AND rent_billing_anchor_year <= 2100"
        ),
    )

    op.create_check_constraint(
        "ck_contract_rent_billing_anchor_month_valid",
        "contracts",
        (
            "rent_billing_anchor_month >= 1 "
            "AND rent_billing_anchor_month <= 12"
        ),
    )


def downgrade() -> None:
    op.drop_constraint(
        "ck_contract_rent_billing_anchor_month_valid",
        "contracts",
        type_="check",
    )

    op.drop_constraint(
        "ck_contract_rent_billing_anchor_year_valid",
        "contracts",
        type_="check",
    )

    op.drop_constraint(
        "ck_contract_rent_billing_cycle_valid",
        "contracts",
        type_="check",
    )

    op.drop_column(
        "contracts",
        "rent_billing_anchor_month",
    )

    op.drop_column(
        "contracts",
        "rent_billing_anchor_year",
    )

    op.drop_column(
        "contracts",
        "rent_billing_cycle_months",
    )
