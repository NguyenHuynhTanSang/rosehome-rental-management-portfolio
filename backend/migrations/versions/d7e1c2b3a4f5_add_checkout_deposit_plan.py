"""Add checkout type and frozen deposit disposition plan.

Revision ID: d7e1c2b3a4f5
Revises: c4a9e6f102bd
"""
from alembic import op
import sqlalchemy as sa


revision = "d7e1c2b3a4f5"
down_revision = "c4a9e6f102bd"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("checkout_settlements") as batch:
        batch.add_column(
            sa.Column(
                "checkout_type",
                sa.String(length=20),
                nullable=True,
            )
        )
        batch.add_column(
            sa.Column(
                "deposit_balance_at_prepare",
                sa.BigInteger(),
                nullable=True,
            )
        )
        batch.add_column(
            sa.Column(
                "deposit_forfeit_amount",
                sa.BigInteger(),
                nullable=True,
            )
        )
        batch.add_column(
            sa.Column(
                "deposit_offset_amount",
                sa.BigInteger(),
                nullable=True,
            )
        )
        batch.add_column(
            sa.Column(
                "deposit_refund_amount",
                sa.BigInteger(),
                nullable=True,
            )
        )
        batch.add_column(
            sa.Column(
                "tenant_due_after_deposit",
                sa.BigInteger(),
                nullable=True,
            )
        )

        batch.create_check_constraint(
            "ck_checkout_type",
            "checkout_type IS NULL OR checkout_type IN ('EARLY', 'ON_TIME')",
        )

        batch.create_check_constraint(
            "ck_checkout_deposit_plan_values",
            "(checkout_type IS NULL "
            "AND deposit_balance_at_prepare IS NULL "
            "AND deposit_forfeit_amount IS NULL "
            "AND deposit_offset_amount IS NULL "
            "AND deposit_refund_amount IS NULL "
            "AND tenant_due_after_deposit IS NULL) "
            "OR (checkout_type IS NOT NULL "
            "AND deposit_balance_at_prepare IS NOT NULL "
            "AND deposit_forfeit_amount IS NOT NULL "
            "AND deposit_offset_amount IS NOT NULL "
            "AND deposit_refund_amount IS NOT NULL "
            "AND tenant_due_after_deposit IS NOT NULL "
            "AND deposit_balance_at_prepare >= 0 "
            "AND deposit_forfeit_amount >= 0 "
            "AND deposit_offset_amount >= 0 "
            "AND deposit_refund_amount >= 0 "
            "AND tenant_due_after_deposit >= 0)",
        )

        batch.create_check_constraint(
            "ck_checkout_deposit_plan_math",
            "checkout_type IS NULL "
            "OR (checkout_type = 'EARLY' "
            "AND deposit_forfeit_amount = deposit_balance_at_prepare "
            "AND deposit_offset_amount = 0 "
            "AND deposit_refund_amount = 0 "
            "AND tenant_due_after_deposit = total_amount) "
            "OR (checkout_type = 'ON_TIME' "
            "AND deposit_forfeit_amount = 0 "
            "AND deposit_offset_amount + deposit_refund_amount = deposit_balance_at_prepare "
            "AND deposit_offset_amount <= total_amount "
            "AND tenant_due_after_deposit = total_amount - deposit_offset_amount)",
        )


def downgrade():
    bind = op.get_bind()

    has_b2_data = bind.execute(
        sa.text(
            "SELECT 1 "
            "FROM checkout_settlements "
            "WHERE checkout_type IS NOT NULL "
            "OR deposit_balance_at_prepare IS NOT NULL "
            "OR deposit_forfeit_amount IS NOT NULL "
            "OR deposit_offset_amount IS NOT NULL "
            "OR deposit_refund_amount IS NOT NULL "
            "OR tenant_due_after_deposit IS NOT NULL "
            "LIMIT 1"
        )
    ).first()

    if has_b2_data:
        raise RuntimeError(
            "Checkout deposit plans exist; downgrade would lose financial snapshot data"
        )

    with op.batch_alter_table("checkout_settlements") as batch:
        batch.drop_constraint(
            "ck_checkout_deposit_plan_math",
            type_="check",
        )
        batch.drop_constraint(
            "ck_checkout_deposit_plan_values",
            type_="check",
        )
        batch.drop_constraint(
            "ck_checkout_type",
            type_="check",
        )

        batch.drop_column(
            "tenant_due_after_deposit"
        )
        batch.drop_column(
            "deposit_refund_amount"
        )
        batch.drop_column(
            "deposit_offset_amount"
        )
        batch.drop_column(
            "deposit_forfeit_amount"
        )
        batch.drop_column(
            "deposit_balance_at_prepare"
        )
        batch.drop_column(
            "checkout_type"
        )
