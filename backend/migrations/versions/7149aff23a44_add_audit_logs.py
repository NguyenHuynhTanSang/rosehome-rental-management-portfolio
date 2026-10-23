"""add audit logs

Revision ID: 7149aff23a44
Revises: c6364addfbe9
Create Date: 2026-08-28 19:16:39.500309

"""

from typing import (
    Sequence,
    Union,
)

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.

revision: str = (
    "7149aff23a44"
)

down_revision: Union[
    str,
    Sequence[str],
    None,
] = (
    "c6364addfbe9"
)

branch_labels: Union[
    str,
    Sequence[str],
    None,
] = None

depends_on: Union[
    str,
    Sequence[str],
    None,
] = None


# =========================================================
# UPGRADE
# =========================================================

def upgrade() -> None:

    # =====================================================
    # AUDIT LOGS
    # =====================================================

    op.create_table(

        "audit_logs",

        sa.Column(
            "id",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "user_id",
            sa.Integer(),
            nullable=True,
        ),

        sa.Column(
            "actor_email",
            sa.String(
                length=255
            ),
            nullable=False,
        ),

        sa.Column(
            "action",
            sa.String(
                length=80
            ),
            nullable=False,
        ),

        sa.Column(
            "entity_type",
            sa.String(
                length=50
            ),
            nullable=False,
        ),

        sa.Column(
            "entity_id",
            sa.String(
                length=100
            ),
            nullable=True,
        ),

        sa.Column(
            "description",
            sa.Text(),
            nullable=True,
        ),

        sa.Column(
            "details",
            sa.JSON(),
            nullable=True,
        ),

        sa.Column(
            "ip_address",
            sa.String(
                length=64
            ),
            nullable=True,
        ),

        sa.Column(
            "created_at",
            sa.DateTime(
                timezone=True
            ),
            server_default=
                sa.text(
                    "now()"
                ),
            nullable=False,
        ),

        sa.ForeignKeyConstraint(
            [
                "user_id"
            ],
            [
                "users.id"
            ],
            ondelete="SET NULL",
        ),

        sa.PrimaryKeyConstraint(
            "id"
        ),

    )


    # =====================================================
    # INDEX: USER
    # =====================================================

    op.create_index(

        op.f(
            "ix_audit_logs_user_id"
        ),

        "audit_logs",

        [
            "user_id"
        ],

        unique=False,

    )


    # =====================================================
    # INDEX: CREATED AT
    # =====================================================

    op.create_index(

        "ix_audit_logs_created_at",

        "audit_logs",

        [
            "created_at"
        ],

        unique=False,

    )


    # =====================================================
    # INDEX: ACTION
    # =====================================================

    op.create_index(

        "ix_audit_logs_action",

        "audit_logs",

        [
            "action"
        ],

        unique=False,

    )


# =========================================================
# DOWNGRADE
# =========================================================

def downgrade() -> None:

    op.drop_index(

        "ix_audit_logs_action",

        table_name=
            "audit_logs",

    )


    op.drop_index(

        "ix_audit_logs_created_at",

        table_name=
            "audit_logs",

    )


    op.drop_index(

        op.f(
            "ix_audit_logs_user_id"
        ),

        table_name=
            "audit_logs",

    )


    op.drop_table(
        "audit_logs"
    )