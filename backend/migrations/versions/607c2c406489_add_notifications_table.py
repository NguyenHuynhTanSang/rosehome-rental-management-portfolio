"""add notifications table

Revision ID: 607c2c406489
Revises: 4a20430c81b6
Create Date: 2026-08-20 23:14:00.541012

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '607c2c406489'
down_revision: Union[str, Sequence[str], None] = '4a20430c81b6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:

    op.create_table(
        "notifications",

        sa.Column(
            "id",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "notification_type",
            sa.String(
                length=50
            ),
            nullable=False,
        ),

        sa.Column(
            "contract_id",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "reminder_stage",
            sa.String(
                length=20
            ),
            nullable=False,
        ),

        sa.Column(
            "contract_end_date",
            sa.Date(),
            nullable=False,
        ),

        sa.Column(
            "title",
            sa.String(
                length=255
            ),
            nullable=False,
        ),

        sa.Column(
            "message",
            sa.String(
                length=500
            ),
            nullable=False,
        ),

        sa.Column(
            "is_read",
            sa.Boolean(),
            server_default=sa.text(
                "false"
            ),
            nullable=False,
        ),

        sa.Column(
            "created_at",
            sa.DateTime(
                timezone=True
            ),
            server_default=sa.text(
                "now()"
            ),
            nullable=False,
        ),

        sa.ForeignKeyConstraint(
            [
                "contract_id",
            ],
            [
                "contracts.id",
            ],
        ),

        sa.PrimaryKeyConstraint(
            "id"
        ),

        sa.UniqueConstraint(
            "contract_id",
            "reminder_stage",
            "contract_end_date",
            name=(
                "uq_notifications_"
                "contract_stage_end_date"
            ),
        ),
    )


def downgrade() -> None:

    op.drop_table(
        "notifications"
    )