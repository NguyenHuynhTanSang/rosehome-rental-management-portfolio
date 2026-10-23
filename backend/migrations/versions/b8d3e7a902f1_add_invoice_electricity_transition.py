"""Add optional electricity transition snapshots; no historical backfill.

Revision ID: b8d3e7a902f1
Revises: f6c2a1d48e73
"""
from alembic import op
import sqlalchemy as sa

revision = "b8d3e7a902f1"
down_revision = "f6c2a1d48e73"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("invoices", sa.Column("electricity_transition_old_reading", sa.Integer(), nullable=True))
    op.add_column("invoices", sa.Column("electricity_transition_new_reading", sa.Integer(), nullable=True))
    op.create_check_constraint("ck_invoice_transition_pair", "invoices",
        "(electricity_transition_old_reading IS NULL AND electricity_transition_new_reading IS NULL) OR "
        "(electricity_transition_old_reading IS NOT NULL AND electricity_transition_new_reading IS NOT NULL "
        "AND electricity_transition_old_reading >= 0 AND electricity_transition_new_reading >= electricity_transition_old_reading)")
    op.create_check_constraint("ck_invoice_transition_source", "invoices",
        "electricity_transition_new_reading IS NULL OR "
        "(meter_reading_id IS NULL AND electricity_period_year IS NULL AND electricity_period_month IS NULL)")


def downgrade():
    op.drop_constraint("ck_invoice_transition_source", "invoices", type_="check")
    op.drop_constraint("ck_invoice_transition_pair", "invoices", type_="check")
    op.drop_column("invoices", "electricity_transition_new_reading")
    op.drop_column("invoices", "electricity_transition_old_reading")
