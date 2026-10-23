"""Add checkout snapshots only; no historical backfill.

Revision ID: c4a9e6f102bd
Revises: b8d3e7a902f1
"""
from alembic import op
import sqlalchemy as sa

revision = "c4a9e6f102bd"
down_revision = "b8d3e7a902f1"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "checkout_settlements",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("contract_id", sa.Integer(), sa.ForeignKey("contracts.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("invoice_id", sa.Integer(), sa.ForeignKey("invoices.id", ondelete="RESTRICT"), nullable=True),
        sa.Column("source_invoice_id", sa.Integer(), sa.ForeignKey("invoices.id", ondelete="RESTRICT"), nullable=True),
        sa.Column("baseline_invoice_id", sa.Integer(), sa.ForeignKey("invoices.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("checkout_date", sa.Date(), nullable=False),
        sa.Column("rent_period_start", sa.Date(), nullable=True),
        sa.Column("rent_period_end", sa.Date(), nullable=True),
        sa.Column("move_out_electric_reading", sa.Integer(), nullable=False),
        sa.Column("electricity_old_reading", sa.Integer(), nullable=False),
        sa.Column("electricity_new_reading", sa.Integer(), nullable=False),
        sa.Column("electricity_consumption", sa.Integer(), nullable=False),
        sa.Column("electricity_rate", sa.BigInteger(), nullable=False),
        sa.Column("electricity_amount", sa.BigInteger(), nullable=False),
        sa.Column("carried_electricity_amount", sa.BigInteger(), nullable=False),
        sa.Column("rent_amount", sa.BigInteger(), nullable=False),
        sa.Column("water_amount", sa.BigInteger(), nullable=False),
        sa.Column("management_amount", sa.BigInteger(), nullable=False),
        sa.Column("other_amount", sa.BigInteger(), nullable=False),
        sa.Column("total_amount", sa.BigInteger(), nullable=False),
        sa.Column("electricity_enabled", sa.Boolean(), nullable=False),
        sa.Column("rent_mode", sa.String(20), nullable=False),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("request_hash", sa.String(64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("contract_id", name="uq_checkout_settlement_contract"),
        sa.UniqueConstraint("invoice_id", name="uq_checkout_settlement_invoice"),
        sa.CheckConstraint("status = 'PREPARED'", name='ck_checkout_status'),
        sa.CheckConstraint("rent_mode IN ('NONE', 'FULL_MONTH', 'PRORATED', 'CUSTOM')", name='ck_checkout_rent_mode'),
        sa.CheckConstraint('electricity_old_reading >= 0 AND electricity_new_reading >= electricity_old_reading AND move_out_electric_reading = electricity_new_reading AND electricity_consumption = electricity_new_reading - electricity_old_reading', name='ck_checkout_readings'),
        sa.CheckConstraint('electricity_rate >= 0 AND electricity_amount >= 0 AND carried_electricity_amount >= 0 AND rent_amount >= 0 AND water_amount >= 0 AND management_amount >= 0 AND other_amount >= 0', name='ck_checkout_amounts'),
        sa.CheckConstraint('total_amount = electricity_amount + carried_electricity_amount + rent_amount + water_amount + management_amount + other_amount', name='ck_checkout_total'),
        sa.CheckConstraint('(rent_period_start IS NULL AND rent_period_end IS NULL) OR (rent_period_start IS NOT NULL AND rent_period_end IS NOT NULL AND rent_period_end >= rent_period_start)', name='ck_checkout_rent_period'),
    )
    op.create_index("ix_checkout_settlements_baseline_invoice_id", "checkout_settlements", ["baseline_invoice_id"])


def downgrade():
    # Refuse data loss. Roll back the application first; a populated table must be retained.
    if op.get_bind().execute(sa.text("SELECT 1 FROM checkout_settlements LIMIT 1")).first():
        raise RuntimeError("Checkout settlements exist; downgrade would lose financial snapshots")
    op.drop_index("ix_checkout_settlements_baseline_invoice_id", table_name="checkout_settlements")
    op.drop_table("checkout_settlements")
