"""add contract occupants

Revision ID: 7c1a4e9b2d60
Revises: 4f9d2c7a81b3
Create Date: 2026-09-02
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "7c1a4e9b2d60"
down_revision: Union[str, Sequence[str], None] = "4f9d2c7a81b3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "contract_occupants",

        sa.Column(
            "id",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "contract_id",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "tenant_id",
            sa.Integer(),
            nullable=False,
        ),

        sa.Column(
            "is_active",
            sa.Boolean(),
            server_default=sa.text("TRUE"),
            nullable=False,
        ),

        sa.Column(
            "joined_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),

        sa.Column(
            "left_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),

        sa.ForeignKeyConstraint(
            ["contract_id"],
            ["contracts.id"],
            ondelete="CASCADE",
        ),

        sa.ForeignKeyConstraint(
            ["tenant_id"],
            ["tenants.id"],
            ondelete="RESTRICT",
        ),

        sa.PrimaryKeyConstraint(
            "id"
        ),

        sa.UniqueConstraint(
            "contract_id",
            "tenant_id",
            name="uq_contract_occupant_contract_tenant",
        ),
    )


    op.create_index(
        op.f(
            "ix_contract_occupants_contract_id"
        ),
        "contract_occupants",
        ["contract_id"],
        unique=False,
    )


    op.create_index(
        op.f(
            "ix_contract_occupants_tenant_id"
        ),
        "contract_occupants",
        ["tenant_id"],
        unique=False,
    )


    op.create_index(
        "uq_contract_occupant_active_tenant",
        "contract_occupants",
        ["tenant_id"],
        unique=True,
        postgresql_where=sa.text(
            "is_active = TRUE"
        ),
    )


def downgrade() -> None:
    op.drop_index(
        "uq_contract_occupant_active_tenant",
        table_name="contract_occupants",
    )

    op.drop_index(
        op.f(
            "ix_contract_occupants_tenant_id"
        ),
        table_name="contract_occupants",
    )

    op.drop_index(
        op.f(
            "ix_contract_occupants_contract_id"
        ),
        table_name="contract_occupants",
    )

    op.drop_table(
        "contract_occupants"
    )
