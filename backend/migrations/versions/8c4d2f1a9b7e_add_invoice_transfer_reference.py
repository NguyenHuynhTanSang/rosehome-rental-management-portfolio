"""add invoice transfer reference

Revision ID: 8c4d2f1a9b7e
Revises: 7149aff23a44
Create Date: 2026-08-28

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "8c4d2f1a9b7e"
down_revision: Union[str, Sequence[str], None] = "7149aff23a44"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add nullable column first so existing rows remain valid.
    op.add_column(
        "invoices",
        sa.Column(
            "transfer_reference",
            sa.String(length=100),
            nullable=True,
        ),
    )

    # 2. Backfill only invoices that have already been issued
    #    (including cancelled invoices that were once issued).
    #
    #    DRAFT invoices intentionally stay NULL. Their RH code
    #    will be generated when /issue is called.
    op.execute(
        """
        UPDATE invoices AS i
        SET transfer_reference =
            'RH'
            || LPAD(MOD(i.year, 100)::text, 2, '0')
            || LPAD(i.month::text, 2, '0')
            || REGEXP_REPLACE(
                UPPER(r.room_code),
                '[^A-Z0-9]',
                '',
                'g'
            )
            || 'I'
            || i.id::text
        FROM rooms AS r
        WHERE
            r.id = i.room_id
            AND i.status IN ('ISSUED', 'CANCELLED')
            AND i.transfer_reference IS NULL
        """
    )

    # 3. RH reference must be unique when present.
    #    PostgreSQL allows multiple NULLs in a UNIQUE constraint,
    #    so multiple DRAFT invoices can remain NULL safely.
    op.create_unique_constraint(
        "uq_invoice_transfer_reference",
        "invoices",
        ["transfer_reference"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "uq_invoice_transfer_reference",
        "invoices",
        type_="unique",
    )

    op.drop_column(
        "invoices",
        "transfer_reference",
    )
