"""add payment receipt fields

Revision ID: 912352cb2fba
Revises: 607c2c406489
Create Date: 2026-08-26 08:04:49.025130

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "912352cb2fba"

down_revision: Union[
    str,
    Sequence[str],
    None
] = "607c2c406489"

branch_labels: Union[
    str,
    Sequence[str],
    None
] = None

depends_on: Union[
    str,
    Sequence[str],
    None
] = None


def upgrade() -> None:

    op.add_column(
        "payments",
        sa.Column(
            "transaction_reference",
            sa.String(length=100),
            nullable=True,
        ),
    )

    op.add_column(
        "payments",
        sa.Column(
            "receipt_file_key",
            sa.String(length=500),
            nullable=True,
        ),
    )

    op.add_column(
        "payments",
        sa.Column(
            "receipt_original_name",
            sa.String(length=255),
            nullable=True,
        ),
    )

    op.add_column(
        "payments",
        sa.Column(
            "confirmed_by",
            sa.String(length=255),
            nullable=True,
        ),
    )

    op.create_index(
        "ix_payments_transaction_reference",
        "payments",
        ["transaction_reference"],
        unique=False,
    )


def downgrade() -> None:

    op.drop_index(
        "ix_payments_transaction_reference",
        table_name="payments",
    )

    op.drop_column(
        "payments",
        "confirmed_by",
    )

    op.drop_column(
        "payments",
        "receipt_original_name",
    )

    op.drop_column(
        "payments",
        "receipt_file_key",
    )

    op.drop_column(
        "payments",
        "transaction_reference",
    )