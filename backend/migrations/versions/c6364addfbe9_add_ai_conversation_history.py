"""add ai conversation history

Revision ID: c6364addfbe9
Revises: c792df21d06b
Create Date: 2026-08-28 16:39:11.843019

"""

from typing import (
    Sequence,
    Union,
)

from alembic import op
import sqlalchemy as sa


# =========================================================
# REVISION IDENTIFIERS
# =========================================================

revision: str = (
    "c6364addfbe9"
)

down_revision: Union[
    str,
    Sequence[str],
    None,
] = (
    "c792df21d06b"
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
    # AI CONVERSATIONS
    # =====================================================

    op.create_table(

        "ai_conversations",

        sa.Column(
            "id",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "user_id",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "title",
            sa.String(
                length=160
            ),
            nullable=False,
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

        sa.Column(
            "updated_at",
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
            ondelete="CASCADE",
        ),

        sa.PrimaryKeyConstraint(
            "id"
        ),

    )


    op.create_index(

        op.f(
            "ix_ai_conversations_user_id"
        ),

        "ai_conversations",

        [
            "user_id"
        ],

        unique=False,

    )


    # =====================================================
    # AI MESSAGES
    # =====================================================

    op.create_table(

        "ai_messages",

        sa.Column(
            "id",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "conversation_id",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "role",
            sa.String(
                length=20
            ),
            nullable=False,
        ),

        sa.Column(
            "content",
            sa.Text(),
            nullable=False,
        ),

        sa.Column(
            "tools_used",
            sa.JSON(),
            nullable=True,
        ),

        sa.Column(
            "model",
            sa.String(
                length=100
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
                "conversation_id"
            ],
            [
                "ai_conversations.id"
            ],
            ondelete="CASCADE",
        ),

        sa.PrimaryKeyConstraint(
            "id"
        ),

    )


    op.create_index(

        op.f(
            "ix_ai_messages_conversation_id"
        ),

        "ai_messages",

        [
            "conversation_id"
        ],

        unique=False,

    )


# =========================================================
# DOWNGRADE
# =========================================================

def downgrade() -> None:

    # =====================================================
    # AI MESSAGES
    # =====================================================

    op.drop_index(

        op.f(
            "ix_ai_messages_conversation_id"
        ),

        table_name=
            "ai_messages",

    )


    op.drop_table(
        "ai_messages"
    )


    # =====================================================
    # AI CONVERSATIONS
    # =====================================================

    op.drop_index(

        op.f(
            "ix_ai_conversations_user_id"
        ),

        table_name=
            "ai_conversations",

    )


    op.drop_table(
        "ai_conversations"
    )