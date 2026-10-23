"""add contract electric handover readings

Revision ID: e2b7c4d91a36
Revises: 7c1a4e9b2d60
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "e2b7c4d91a36"
down_revision: Union[str, Sequence[str], None] = "7c1a4e9b2d60"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "contracts",
        sa.Column(
            "move_in_electric_reading",
            sa.Integer(),
            nullable=True,
        ),
    )

    op.add_column(
        "contracts",
        sa.Column(
            "move_out_electric_reading",
            sa.Integer(),
            nullable=True,
        ),
    )

    op.create_check_constraint(
        "ck_contract_move_in_electric_nonnegative",
        "contracts",
        (
            "move_in_electric_reading IS NULL "
            "OR move_in_electric_reading >= 0"
        ),
    )

    op.create_check_constraint(
        "ck_contract_move_out_electric_nonnegative",
        "contracts",
        (
            "move_out_electric_reading IS NULL "
            "OR move_out_electric_reading >= 0"
        ),
    )

    op.create_check_constraint(
        "ck_contract_electric_handover_order",
        "contracts",
        (
            "move_out_electric_reading IS NULL "
            "OR move_in_electric_reading IS NULL "
            "OR move_out_electric_reading >= move_in_electric_reading"
        ),
    )


def downgrade() -> None:
    op.drop_constraint(
        "ck_contract_electric_handover_order",
        "contracts",
        type_="check",
    )

    op.drop_constraint(
        "ck_contract_move_out_electric_nonnegative",
        "contracts",
        type_="check",
    )

    op.drop_constraint(
        "ck_contract_move_in_electric_nonnegative",
        "contracts",
        type_="check",
    )

    op.drop_column(
        "contracts",
        "move_out_electric_reading",
    )

    op.drop_column(
        "contracts",
        "move_in_electric_reading",
    )
