from datetime import date, datetime

from sqlalchemy import BigInteger, Boolean, CheckConstraint, Date, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.database import Base


class CheckoutSettlement(Base):
    """Phase A: one immutable preparation per contract, linked to its invoice."""
    __tablename__ = "checkout_settlements"
    __table_args__ = (
        UniqueConstraint("contract_id", name="uq_checkout_settlement_contract"),
        UniqueConstraint("invoice_id", name="uq_checkout_settlement_invoice"),
        CheckConstraint("status = 'PREPARED'", name="ck_checkout_status"),
        CheckConstraint("rent_mode IN ('NONE', 'FULL_MONTH', 'PRORATED', 'CUSTOM')", name="ck_checkout_rent_mode"),
        CheckConstraint("checkout_type IS NULL OR checkout_type IN ('EARLY', 'ON_TIME')", name="ck_checkout_type"),
        CheckConstraint(
            "deposit_execution_status IN ('PENDING', 'APPLIED')",
            name="ck_checkout_deposit_execution_status",
        ),
        CheckConstraint(
            "(checkout_type IS NULL AND deposit_balance_at_prepare IS NULL AND deposit_forfeit_amount IS NULL "
            "AND deposit_offset_amount IS NULL AND deposit_refund_amount IS NULL AND tenant_due_after_deposit IS NULL) "
            "OR (checkout_type IS NOT NULL AND deposit_balance_at_prepare IS NOT NULL "
            "AND deposit_forfeit_amount IS NOT NULL AND deposit_offset_amount IS NOT NULL "
            "AND deposit_refund_amount IS NOT NULL AND tenant_due_after_deposit IS NOT NULL "
            "AND deposit_balance_at_prepare >= 0 AND deposit_forfeit_amount >= 0 "
            "AND deposit_offset_amount >= 0 AND deposit_refund_amount >= 0 "
            "AND tenant_due_after_deposit >= 0)",
            name="ck_checkout_deposit_plan_values",
        ),
        CheckConstraint(
            "checkout_type IS NULL "
            "OR (checkout_type = 'EARLY' "
            "AND deposit_forfeit_amount = deposit_balance_at_prepare "
            "AND deposit_offset_amount = 0 AND deposit_refund_amount = 0 "
            "AND tenant_due_after_deposit = total_amount) "
            "OR (checkout_type = 'ON_TIME' "
            "AND deposit_forfeit_amount = 0 "
            "AND deposit_offset_amount + deposit_refund_amount = deposit_balance_at_prepare "
            "AND deposit_offset_amount <= total_amount "
            "AND tenant_due_after_deposit = total_amount - deposit_offset_amount)",
            name="ck_checkout_deposit_plan_math",
        ),
        CheckConstraint("electricity_old_reading >= 0 AND electricity_new_reading >= electricity_old_reading AND move_out_electric_reading = electricity_new_reading AND electricity_consumption = electricity_new_reading - electricity_old_reading", name="ck_checkout_readings"),
        CheckConstraint("electricity_rate >= 0 AND electricity_amount >= 0 AND carried_electricity_amount >= 0 AND rent_amount >= 0 AND water_amount >= 0 AND management_amount >= 0 AND other_amount >= 0", name="ck_checkout_amounts"),
        CheckConstraint("total_amount = electricity_amount + carried_electricity_amount + rent_amount + water_amount + management_amount + other_amount", name="ck_checkout_total"),
        CheckConstraint("(rent_period_start IS NULL AND rent_period_end IS NULL) OR (rent_period_start IS NOT NULL AND rent_period_end IS NOT NULL AND rent_period_end >= rent_period_start)", name="ck_checkout_rent_period"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    contract_id: Mapped[int] = mapped_column(ForeignKey("contracts.id", ondelete="RESTRICT"), nullable=False)
    invoice_id: Mapped[int | None] = mapped_column(ForeignKey("invoices.id", ondelete="RESTRICT"))
    source_invoice_id: Mapped[int | None] = mapped_column(ForeignKey("invoices.id", ondelete="RESTRICT"))
    baseline_invoice_id: Mapped[int] = mapped_column(ForeignKey("invoices.id", ondelete="RESTRICT"), nullable=False, index=True)
    checkout_date: Mapped[date] = mapped_column(Date, nullable=False)
    checkout_type: Mapped[str | None] = mapped_column(String(20), nullable=True)
    deposit_balance_at_prepare: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    deposit_forfeit_amount: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    deposit_offset_amount: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    deposit_refund_amount: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    tenant_due_after_deposit: Mapped[int | None] = mapped_column(BigInteger, nullable=True)

    deposit_execution_status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="PENDING",
        server_default="PENDING",
    )

    deposit_forfeit_transaction_id: Mapped[int | None] = mapped_column(
        ForeignKey(
            "deposit_transactions.id",
            ondelete="RESTRICT",
        ),
        nullable=True,
    )

    deposit_deduction_transaction_id: Mapped[int | None] = mapped_column(
        ForeignKey(
            "deposit_transactions.id",
            ondelete="RESTRICT",
        ),
        nullable=True,
    )

    deposit_refund_transaction_id: Mapped[int | None] = mapped_column(
        ForeignKey(
            "deposit_transactions.id",
            ondelete="RESTRICT",
        ),
        nullable=True,
    )

    deposit_payment_id: Mapped[int | None] = mapped_column(
        ForeignKey(
            "payments.id",
            ondelete="RESTRICT",
        ),
        nullable=True,
    )

    deposit_processed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    move_out_electric_reading: Mapped[int] = mapped_column(Integer, nullable=False)
    electricity_old_reading: Mapped[int] = mapped_column(Integer, nullable=False)
    electricity_new_reading: Mapped[int] = mapped_column(Integer, nullable=False)
    electricity_consumption: Mapped[int] = mapped_column(Integer, nullable=False)
    electricity_rate: Mapped[int] = mapped_column(BigInteger, nullable=False)
    electricity_amount: Mapped[int] = mapped_column(BigInteger, nullable=False)
    carried_electricity_amount: Mapped[int] = mapped_column(BigInteger, nullable=False)
    electricity_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False)
    rent_mode: Mapped[str] = mapped_column(String(20), nullable=False)
    rent_amount: Mapped[int] = mapped_column(BigInteger, nullable=False)
    rent_period_start: Mapped[date | None] = mapped_column(Date)
    rent_period_end: Mapped[date | None] = mapped_column(Date)
    water_amount: Mapped[int] = mapped_column(BigInteger, nullable=False)
    management_amount: Mapped[int] = mapped_column(BigInteger, nullable=False)
    other_amount: Mapped[int] = mapped_column(BigInteger, nullable=False)
    total_amount: Mapped[int] = mapped_column(BigInteger, nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="PREPARED")
    request_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
