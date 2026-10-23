"""Add internal deposit payment method and checkout execution state.

Revision ID: e8f4d2c1b6a7
Revises: d7e1c2b3a4f5
"""
from alembic import op
import sqlalchemy as sa


revision = "e8f4d2c1b6a7"
down_revision = "d7e1c2b3a4f5"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("payments") as batch:
        batch.drop_constraint(
            "ck_payment_method_valid",
            type_="check",
        )

        batch.create_check_constraint(
            "ck_payment_method_valid",
            "payment_method IN "
            "('CASH', 'BANK_TRANSFER', 'OTHER', 'DEPOSIT')",
        )

    with op.batch_alter_table("checkout_settlements") as batch:
        batch.add_column(
            sa.Column(
                "deposit_execution_status",
                sa.String(length=20),
                nullable=False,
                server_default="PENDING",
            )
        )

        batch.add_column(
            sa.Column(
                "deposit_forfeit_transaction_id",
                sa.Integer(),
                nullable=True,
            )
        )

        batch.add_column(
            sa.Column(
                "deposit_deduction_transaction_id",
                sa.Integer(),
                nullable=True,
            )
        )

        batch.add_column(
            sa.Column(
                "deposit_refund_transaction_id",
                sa.Integer(),
                nullable=True,
            )
        )

        batch.add_column(
            sa.Column(
                "deposit_payment_id",
                sa.Integer(),
                nullable=True,
            )
        )

        batch.add_column(
            sa.Column(
                "deposit_processed_at",
                sa.DateTime(timezone=True),
                nullable=True,
            )
        )

        batch.create_check_constraint(
            "ck_checkout_deposit_execution_status",
            "deposit_execution_status IN ('PENDING', 'APPLIED')",
        )

        batch.create_foreign_key(
            "fk_checkout_deposit_forfeit_transaction",
            "deposit_transactions",
            ["deposit_forfeit_transaction_id"],
            ["id"],
            ondelete="RESTRICT",
        )

        batch.create_foreign_key(
            "fk_checkout_deposit_deduction_transaction",
            "deposit_transactions",
            ["deposit_deduction_transaction_id"],
            ["id"],
            ondelete="RESTRICT",
        )

        batch.create_foreign_key(
            "fk_checkout_deposit_refund_transaction",
            "deposit_transactions",
            ["deposit_refund_transaction_id"],
            ["id"],
            ondelete="RESTRICT",
        )

        batch.create_foreign_key(
            "fk_checkout_deposit_payment",
            "payments",
            ["deposit_payment_id"],
            ["id"],
            ondelete="RESTRICT",
        )


def downgrade():
    bind = op.get_bind()

    has_execution_data = bind.execute(
        sa.text(
            "SELECT 1 "
            "FROM checkout_settlements "
            "WHERE deposit_execution_status = 'APPLIED' "
            "OR deposit_forfeit_transaction_id IS NOT NULL "
            "OR deposit_deduction_transaction_id IS NOT NULL "
            "OR deposit_refund_transaction_id IS NOT NULL "
            "OR deposit_payment_id IS NOT NULL "
            "OR deposit_processed_at IS NOT NULL "
            "LIMIT 1"
        )
    ).first()

    if has_execution_data:
        raise RuntimeError(
            "Checkout deposit execution data exists; "
            "downgrade would lose financial linkage data"
        )

    has_deposit_payments = bind.execute(
        sa.text(
            "SELECT 1 "
            "FROM payments "
            "WHERE payment_method = 'DEPOSIT' "
            "LIMIT 1"
        )
    ).first()

    if has_deposit_payments:
        raise RuntimeError(
            "DEPOSIT payments exist; downgrade would invalidate payment data"
        )

    with op.batch_alter_table("checkout_settlements") as batch:
        batch.drop_constraint(
            "fk_checkout_deposit_payment",
            type_="foreignkey",
        )

        batch.drop_constraint(
            "fk_checkout_deposit_refund_transaction",
            type_="foreignkey",
        )

        batch.drop_constraint(
            "fk_checkout_deposit_deduction_transaction",
            type_="foreignkey",
        )

        batch.drop_constraint(
            "fk_checkout_deposit_forfeit_transaction",
            type_="foreignkey",
        )

        batch.drop_constraint(
            "ck_checkout_deposit_execution_status",
            type_="check",
        )

        batch.drop_column(
            "deposit_processed_at"
        )

        batch.drop_column(
            "deposit_payment_id"
        )

        batch.drop_column(
            "deposit_refund_transaction_id"
        )

        batch.drop_column(
            "deposit_deduction_transaction_id"
        )

        batch.drop_column(
            "deposit_forfeit_transaction_id"
        )

        batch.drop_column(
            "deposit_execution_status"
        )

    with op.batch_alter_table("payments") as batch:
        batch.drop_constraint(
            "ck_payment_method_valid",
            type_="check",
        )

        batch.create_check_constraint(
            "ck_payment_method_valid",
            "payment_method IN "
            "('CASH', 'BANK_TRANSFER', 'OTHER')",
        )
