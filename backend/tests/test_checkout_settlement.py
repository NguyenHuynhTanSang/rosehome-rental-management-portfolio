"""Real SQLAlchemy models and service tests, executed in a subprocess with an in-memory DB.
The child explicitly disables dotenv before importing the app; no production connections.
"""
import os
from pathlib import Path
import subprocess
import sys


def test_checkout_phase_a():
    result = subprocess.run([sys.executable, str(Path(__file__).resolve()), "--isolated"],
                            cwd=Path(__file__).resolve().parents[2], capture_output=True, text=True,
                            encoding="utf-8", timeout=120)
    assert result.returncode == 0, result.stdout + result.stderr


def run_isolated():
    os.environ["DATABASE_URL"] = "sqlite:///:memory:"
    import secrets
    os.environ["JWT_SECRET_KEY"] = secrets.token_hex(32)
    import dotenv
    dotenv.load_dotenv = lambda *a, **kw: False
    sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
    import unittest
    from datetime import date
    from types import SimpleNamespace
    from unittest.mock import patch
    from sqlalchemy import create_engine, event, func, select
    from sqlalchemy.orm import Session
    from sqlalchemy.exc import IntegrityError
    from fastapi import HTTPException
    from pydantic import ValidationError
    from backend.app.database import Base
    import backend.app.models
    from backend.app.models.contract_occupant import ContractOccupant
    from backend.app.models.room import Room
    from backend.app.models.tenant import Tenant
    from backend.app.models.contract import Contract
    from backend.app.models.invoice import Invoice
    from backend.app.models.invoice_item import InvoiceItem
    from backend.app.models.meter_reading import MeterReading
    from backend.app.models.room_fee_setting import RoomFeeSetting
    from backend.app.models.checkout_settlement import CheckoutSettlement
    from backend.app.models.payment import Payment
    from backend.app.models.deposit_transaction import DepositTransaction
    from backend.app.models.audit_log import AuditLog
    from backend.app.schemas.checkout_settlement import (
        CheckoutDepositApplyRequest,
        CheckoutPrepareRequest,
        CheckoutRequest,
    )
    from backend.app.services import checkout_settlement as svc
    from backend.app.services.checkout_rent import prorated_rent
    from backend.app.api.contracts import end_contract
    from backend.app.schemas.contract import ContractEndRequest

    class CheckoutTests(unittest.TestCase):
        def setUp(self):
            self.engine = create_engine("sqlite:///:memory:")
            event.listen(self.engine, "connect", lambda c, r: c.execute("PRAGMA foreign_keys=ON"))
            Base.metadata.create_all(self.engine)
            self.db = Session(self.engine, autoflush=False)
            room = Room(room_code="P403", status="OCCUPIED")
            tenant = Tenant(full_name="Test")
            self.db.add_all([room, tenant])
            self.db.flush()
            self.contract = Contract(room_id=room.id, tenant_id=tenant.id, start_date=date(2026,8,1),
                monthly_rent=5000000, move_in_electric_reading=5700, status="ACTIVE",
                rent_billing_cycle_months=3, rent_billing_anchor_year=2026, rent_billing_anchor_month=8)
            self.db.add(self.contract)
            self.db.flush()
            self.fee = RoomFeeSetting(room_id=room.id, electricity_rate=4000, water_fee=150000, management_fee=250000)
            self.db.add_all([self.fee, DepositTransaction(contract_id=self.contract.id, transaction_type="COLLECT", amount=5000000)])
            meter = MeterReading(room_id=room.id, year=2026, month=8, old_reading=5700, new_reading=5799, consumption=99)
            self.db.add(meter)
            self.db.flush()
            self.base = Invoice(room_id=room.id, year=2026, month=9, version=1, status="ISSUED",
                meter_reading_id=meter.id, electricity_period_year=2026, electricity_period_month=8,
                total_amount=396000, items=[InvoiceItem(description="Test item",item_type="ELECTRICITY", quantity=99, unit="kWh", unit_price=4000, amount=396000)])
            self.db.add(self.base)
            self.db.commit()
            self.user = SimpleNamespace(id=None, email="local-test@example.invalid")

        def tearDown(self):
            self.db.close()
            self.engine.dispose()

        def data(self, **changes):
            values = dict(room_id=self.contract.room_id, checkout_date="2026-10-10", checkout_type="EARLY",
                          move_out_electric_reading=5820, rent_mode="NONE", reason="Explicit admin choice")
            values.update(changes)
            return CheckoutRequest(**values)

        def prep(self, data=None):
            data = data or self.data()
            p = svc.preview(self.db, self.contract.id, data)
            return svc.prepare(self.db, self.contract.id,
                CheckoutPrepareRequest(**data.model_dump(), preview_token=p["preview_token"], confirmed=True), self.user, None)

        def target(self, status="DRAFT", electric=False):
            inv = Invoice(room_id=self.contract.room_id, year=2026, month=10, version=1, status=status,
                total_amount=5250000, items=[
                    InvoiceItem(description="Test item",item_type="RENT", amount=5000000),
                    InvoiceItem(description="Test item",item_type="MANAGEMENT", amount=250000)])
            if electric:
                m = MeterReading(room_id=self.contract.room_id, year=2026, month=9, old_reading=5799, new_reading=5879, consumption=80)
                self.db.add(m)
                self.db.flush()
                inv.meter_reading_id=m.id
                inv.electricity_period_year=2026
                inv.electricity_period_month=9
                inv.items.append(InvoiceItem(description="Test item",item_type="ELECTRICITY", quantity=80, unit="kWh", unit_price=4000, amount=320000))
                inv.total_amount += 320000
            self.db.add(inv)
            self.db.commit()
            return inv

        def test_preview_is_read_only(self):
            before = self.db.scalar(select(func.count(AuditLog.id)))
            p=svc.preview(self.db,self.contract.id,self.data())
            self.assertEqual(p["snapshot"]["electricity_amount"],84000)
            self.assertEqual(self.db.scalar(select(func.count(CheckoutSettlement.id))),0)
            self.assertEqual(self.db.scalar(select(func.count(Invoice.id))),1)
            self.assertEqual(self.db.scalar(select(func.count(AuditLog.id))),before)
            self.assertFalse(self.db.new or self.db.dirty or self.db.deleted)

        def test_no_invoice_creates_draft_no_financial_side_effects(self):
            saved=self.prep()
            inv=self.db.get(Invoice,saved.invoice_id)
            self.assertEqual(inv.status,"DRAFT")
            self.assertEqual(inv.total_amount,234000)
            self.assertEqual(self.db.scalar(select(func.count(Payment.id))),0)
            self.assertEqual(self.db.scalar(select(func.count(DepositTransaction.id))),1)
            self.assertEqual(self.db.get(Contract,self.contract.id).status,"ACTIVE")
            self.assertIsNone(self.db.get(Contract,self.contract.id).move_out_electric_reading)
            self.assertEqual(self.db.get(Room,self.contract.room_id).status,"OCCUPIED")

        def test_early_deposit_plan_is_snapshot_only(self):
            preview = svc.preview(
                self.db,
                self.contract.id,
                self.data(checkout_type="EARLY"),
            )

            snapshot = preview["snapshot"]

            self.assertEqual(
                (
                    snapshot["checkout_type"],
                    snapshot["deposit_balance_at_prepare"],
                    snapshot["deposit_forfeit_amount"],
                    snapshot["deposit_offset_amount"],
                    snapshot["deposit_refund_amount"],
                    snapshot["tenant_due_after_deposit"],
                ),
                (
                    "EARLY",
                    5000000,
                    5000000,
                    0,
                    0,
                    234000,
                ),
            )

            saved = self.prep(
                self.data(checkout_type="EARLY")
            )

            self.assertEqual(
                saved.deposit_forfeit_amount,
                5000000,
            )

            self.assertEqual(
                self.db.scalar(
                    select(
                        func.count(
                            DepositTransaction.id
                        )
                    )
                ),
                1,
            )


        def test_on_time_deposit_plan_refunds_remainder(self):
            preview = svc.preview(
                self.db,
                self.contract.id,
                self.data(checkout_type="ON_TIME"),
            )

            snapshot = preview["snapshot"]

            self.assertEqual(
                (
                    snapshot["checkout_type"],
                    snapshot["deposit_balance_at_prepare"],
                    snapshot["deposit_forfeit_amount"],
                    snapshot["deposit_offset_amount"],
                    snapshot["deposit_refund_amount"],
                    snapshot["tenant_due_after_deposit"],
                ),
                (
                    "ON_TIME",
                    5000000,
                    0,
                    234000,
                    4766000,
                    0,
                ),
            )


        def test_paid_source_does_not_suppress_selected_final_water_and_management(self):
            inv = self.target(
                "ISSUED",
                electric=True,
            )

            # Historical paid invoice already contains
            # WATER + MANAGEMENT, like the real P403 case.
            inv.items.append(
                InvoiceItem(
                    description="Prior-period water",
                    item_type="WATER",
                    amount=150000,
                )
            )

            inv.total_amount += 150000
            inv.payment_status = "PAID"

            self.db.add(
                Payment(
                    invoice_id=inv.id,
                    amount=inv.total_amount,
                    payment_method="CASH",
                )
            )

            self.db.commit()

            data = self.data(
                invoice_id=inv.id,
                move_out_electric_reading=5900,
                rent_mode="FULL_MONTH",
                include_water=True,
                include_management=True,
            )

            preview = svc.preview(
                self.db,
                self.contract.id,
                data,
            )

            snapshot = preview[
                "snapshot"
            ]

            # Paid historical rent remains protected,
            # but explicitly selected final-period fees
            # use the CURRENT room fee settings.
            self.assertEqual(
                (
                    snapshot["rent_amount"],
                    snapshot["electricity_amount"],
                    snapshot["water_amount"],
                    snapshot["management_amount"],
                    snapshot["total_amount"],
                ),
                (
                    0,
                    84000,
                    150000,
                    250000,
                    484000,
                ),
            )


        def test_on_time_deposit_plan_keeps_shortfall_separate(self):
            self.db.add(
                DepositTransaction(
                    contract_id=self.contract.id,
                    transaction_type="REFUND",
                    amount=4900000,
                    note="test setup",
                )
            )
            self.db.commit()

            preview = svc.preview(
                self.db,
                self.contract.id,
                self.data(checkout_type="ON_TIME"),
            )

            snapshot = preview["snapshot"]

            self.assertEqual(
                (
                    snapshot["deposit_balance_at_prepare"],
                    snapshot["deposit_offset_amount"],
                    snapshot["deposit_refund_amount"],
                    snapshot["tenant_due_after_deposit"],
                ),
                (
                    100000,
                    100000,
                    0,
                    134000,
                ),
            )


        def test_existing_draft_updated(self):
            inv=self.target()
            saved=self.prep(self.data(invoice_id=inv.id))
            self.assertEqual(saved.invoice_id,inv.id)
            self.assertEqual(self.db.scalar(select(func.count(Invoice.id))),2)
            self.assertEqual([i.item_type for i in self.db.get(Invoice,inv.id).items],["ELECTRICITY","WATER"])

        def test_issued_unpaid_atomic_replacement_keeps_history(self):
            inv=self.target("ISSUED")
            saved=self.prep(self.data(invoice_id=inv.id))
            new=self.db.get(Invoice,saved.invoice_id)
            self.assertEqual(self.db.get(Invoice,inv.id).status,"CANCELLED")
            self.assertEqual(self.db.get(Invoice,inv.id).total_amount,5250000)
            self.assertEqual(len(self.db.get(Invoice,inv.id).items),2)
            self.assertEqual((new.status,new.version,new.replaces_invoice_id),("DRAFT",2,inv.id))
            self.assertEqual(set(self.db.scalars(select(AuditLog.action))),{"CANCEL_INVOICE","CREATE_REPLACEMENT_INVOICE","PREPARE_CHECKOUT_SETTLEMENT"})

        def test_replacement_failure_rolls_back_cancel_and_audit(self):
            inv=self.target("ISSUED")
            with patch("backend.app.api.invoices.create_replacement_invoice_in_transaction",side_effect=RuntimeError("injected failure")):
                with self.assertRaises(RuntimeError):
                    self.prep(self.data(invoice_id=inv.id))
            self.assertEqual(self.db.get(Invoice,inv.id).status,"ISSUED")
            self.assertEqual(self.db.scalar(select(func.count(CheckoutSettlement.id))),0)
            self.assertEqual(self.db.scalar(select(func.count(AuditLog.id))),0)

        def test_paid_invoice_preserved_and_final_draft_created(self):
            inv=self.target("ISSUED",electric=True)
            original_total=inv.total_amount
            inv.payment_status="PAID"
            self.db.add(
                Payment(
                    invoice_id=inv.id,
                    amount=original_total,
                    payment_method="CASH",
                )
            )
            self.db.commit()

            data=self.data(
                invoice_id=inv.id,
                move_out_electric_reading=5900,
                rent_mode="FULL_MONTH",
            )

            preview=svc.preview(
                self.db,
                self.contract.id,
                data,
            )

            self.assertEqual(
                preview["action"],
                "PRESERVE",
            )

            saved=svc.prepare(
                self.db,
                self.contract.id,
                CheckoutPrepareRequest(
                    **data.model_dump(),
                    preview_token=preview["preview_token"],
                    confirmed=True,
                ),
                self.user,
                None,
            )

            source=self.db.get(
                Invoice,
                inv.id,
            )

            final=self.db.get(
                Invoice,
                saved.invoice_id,
            )

            self.assertNotEqual(
                source.id,
                final.id,
            )

            self.assertEqual(
                (
                    source.status,
                    source.payment_status,
                    source.total_amount,
                ),
                (
                    "ISSUED",
                    "PAID",
                    original_total,
                ),
            )

            self.assertEqual(
                sum(
                    payment.amount
                    for payment in source.payments
                ),
                original_total,
            )

            self.assertEqual(
                (
                    final.status,
                    final.payment_status,
                    final.version,
                    final.replaces_invoice_id,
                ),
                (
                    "DRAFT",
                    "UNPAID",
                    2,
                    None,
                ),
            )

            self.assertEqual(
                saved.source_invoice_id,
                source.id,
            )

            self.assertEqual(
                (
                    saved.carried_electricity_amount,
                    saved.electricity_amount,
                    saved.rent_amount,
                    saved.management_amount,
                    saved.water_amount,
                    saved.total_amount,
                ),
                (
                    0,
                    84000,
                    0,
                    0,
                    150000,
                    234000,
                ),
            )

            self.assertEqual(
                [
                    item.item_type
                    for item in final.items
                ],
                [
                    "ELECTRICITY",
                    "WATER",
                ],
            )

        def test_none_and_full_month(self):
            for mode,amount in [("NONE",0),("FULL_MONTH",5000000)]:
                self.assertEqual(svc.preview(self.db,self.contract.id,self.data(rent_mode=mode))["snapshot"]["rent_amount"],amount)

        def test_prorated_boundaries(self):
            for start,end,expected in [(date(2026,10,1),date(2026,10,1),161290),
                    (date(2026,10,1),date(2026,10,31),5000000),
                    (date(2026,2,1),date(2026,2,28),5000000),
                    (date(2024,2,1),date(2024,2,29),5000000),
                    (date(2024,2,29),date(2024,2,29),172414)]:
                self.assertEqual(prorated_rent(5000000,start,end),expected)
            self.assertEqual(prorated_rent(31,date(2026,10,1),date(2026,10,10)),10)
            p=svc.preview(self.db,self.contract.id,self.data(rent_mode="PRORATED",rent_period_start="2026-10-01",rent_period_end="2026-10-10"))
            self.assertEqual(p["snapshot"]["rent_amount"],1612903)

        def test_custom_requires_reason_and_preserves_amount(self):
            with self.assertRaises(ValidationError):
                self.data(rent_mode="CUSTOM",custom_rent_amount=100,reason=" ")
            p=svc.preview(self.db,self.contract.id,self.data(rent_mode="CUSTOM",custom_rent_amount=123456))
            self.assertEqual(p["snapshot"]["rent_amount"],123456)

        def test_final_electricity_uses_billed_not_move_in(self):
            saved=self.prep()
            self.assertEqual((saved.electricity_old_reading,saved.electricity_new_reading,saved.electricity_consumption),(5799,5820,21))

        def test_legacy_contract_without_move_in_uses_billed_endpoint(self):
            self.contract.move_in_electric_reading=None
            self.db.commit()

            saved=self.prep()

            self.assertEqual(
                (
                    saved.electricity_old_reading,
                    saved.electricity_new_reading,
                    saved.electricity_consumption,
                ),
                (
                    5799,
                    5820,
                    21,
                ),
            )

        def test_transition_is_baseline(self):
            inv=Invoice(room_id=self.contract.room_id,year=2026,month=9,version=2,status="ISSUED",
                electricity_transition_old_reading=5799,electricity_transition_new_reading=5800,total_amount=4000,
                items=[InvoiceItem(description="Test item",item_type="ELECTRICITY",quantity=1,unit_price=4000,amount=4000)])
            # Use a different billing period for the regular invoice.
            self.base.month=8
            self.db.add(inv)
            self.db.commit()
            self.assertEqual(self.prep().electricity_old_reading,5800)

        def test_cancelled_not_baseline_active_replacement_wins(self):
            self.base.status="CANCELLED"
            replacement=Invoice(room_id=self.contract.room_id,year=2026,month=9,version=2,
                replaces_invoice_id=self.base.id,status="DRAFT",meter_reading_id=self.base.meter_reading_id,
                electricity_period_year=2026,electricity_period_month=8,total_amount=396000,
                items=[InvoiceItem(description="Test item",item_type="ELECTRICITY",quantity=99,unit_price=4000,amount=396000)])
            self.db.add(replacement)
            self.db.commit()
            self.assertEqual(self.prep().baseline_invoice_id,replacement.id)

        def test_missing_or_inconsistent_baseline_blocks(self):
            self.base.items[0].quantity=98
            self.db.commit()
            with self.assertRaises(HTTPException):
                self.prep()

        def test_reading_below_baseline_blocks(self):
            with self.assertRaises(HTTPException):
                self.prep(self.data(move_out_electric_reading=5798))

        def test_reload_and_duplicate_idempotent(self):
            data=self.data()
            p=svc.preview(self.db,self.contract.id,data)
            payload=CheckoutPrepareRequest(**data.model_dump(),preview_token=p["preview_token"],confirmed=True)
            saved=svc.prepare(self.db,self.contract.id,payload,self.user,None)
            snapshot=svc.snapshot_values(saved)
            self.db.expire_all()
            self.assertEqual(svc.snapshot_values(svc.get_existing(self.db,self.contract.id)),snapshot)
            self.assertEqual(svc.prepare(self.db,self.contract.id,payload,self.user,None).id,saved.id)
            self.assertEqual(self.db.scalar(select(func.count(CheckoutSettlement.id))),1)

        def test_unique_contract_and_invoice_constraints(self):
            saved=self.prep()
            columns={c.name:getattr(saved,c.name) for c in CheckoutSettlement.__table__.columns if c.name not in ("id","created_at")}
            self.db.add(CheckoutSettlement(**columns))
            with self.assertRaises(IntegrityError):
                self.db.commit()
            self.db.rollback()

        def test_stale_preview_rejected(self):
            data=self.data()
            p=svc.preview(self.db,self.contract.id,data)
            self.fee.water_fee+=1
            self.db.commit()
            with self.assertRaises(HTTPException):
                svc.prepare(self.db,self.contract.id,CheckoutPrepareRequest(**data.model_dump(),preview_token=p["preview_token"],confirmed=True),self.user,None)
            self.assertEqual(self.db.scalar(select(func.count(CheckoutSettlement.id))),0)

        def test_room_and_selected_invoice_checked(self):
            for data in [self.data(room_id=999),self.data(invoice_id=self.base.id)]:
                with self.assertRaises(HTTPException):
                    self.prep(data)

        def test_p403_retains_old_electricity_plus_final_gap(self):
            inv=self.target("ISSUED",electric=True)
            saved=self.prep(self.data(invoice_id=inv.id,move_out_electric_reading=5879))
            self.assertEqual((saved.carried_electricity_amount,saved.electricity_amount,saved.total_amount),(320000,0,470000))

        def test_p403_gap_not_waived(self):
            inv=self.target("ISSUED",electric=True)
            saved=self.prep(self.data(invoice_id=inv.id,move_out_electric_reading=5900))
            self.assertEqual((saved.electricity_amount,saved.total_amount),(84000,554000))

        def test_snapshot_guards_block_item_changes_and_monthly_generation(self):
            saved=self.prep()
            from backend.app.api.invoices import update_invoice_item, cancel_invoice, create_replacement_invoice
            from backend.app.schemas.invoice import InvoiceItemUpdate
            inv=self.db.get(Invoice,saved.invoice_id)
            with self.assertRaises(HTTPException):
                update_invoice_item(inv.id,inv.items[0].id,InvoiceItemUpdate(amount=1),None,self.db,self.user)
            with self.assertRaises(HTTPException):
                svc.assert_contract_not_prepared(self.db,self.contract.id)
            with self.assertRaises(HTTPException):
                svc.assert_invoice_not_frozen(self.db,self.base.id)

        def test_admin_dependency(self):
            from backend.app.auth_dependencies import require_admin
            from backend.app.api.checkout_settlements import router
            with self.assertRaises(HTTPException):
                require_admin(SimpleNamespace(role="TENANT"))
            self.assertTrue(all(any(d.call is require_admin for d in route.dependant.dependencies) for route in router.routes))

        def test_migration_upgrade_constraints_and_guarded_downgrade(self):
            import importlib.util
            from alembic.migration import MigrationContext
            from alembic.operations import Operations
            from sqlalchemy import inspect

            def load_migration(filename, module_name):
                path = (
                    Path(__file__).resolve().parents[1]
                    / "migrations/versions"
                    / filename
                )
                spec = importlib.util.spec_from_file_location(
                    module_name,
                    path,
                )
                module = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(module)
                return module

            base_migration = load_migration(
                "c4a9e6f102bd_add_checkout_settlements.py",
                "checkout_base_migration",
            )

            plan_migration = load_migration(
                "d7e1c2b3a4f5_add_checkout_deposit_plan.py",
                "checkout_plan_migration",
            )

            execution_migration = load_migration(
                "e8f4d2c1b6a7_add_checkout_financial_execution.py",
                "checkout_execution_migration",
            )

            with self.engine.begin() as conn:
                CheckoutSettlement.__table__.drop(conn)

                with Operations.context(
                    MigrationContext.configure(conn)
                ):
                    base_migration.upgrade()
                    plan_migration.upgrade()
                    execution_migration.upgrade()

                inspector = inspect(conn)

                self.assertEqual(
                    {
                        column["name"]
                        for column in inspector.get_columns(
                            "checkout_settlements"
                        )
                    },
                    set(
                        CheckoutSettlement.__table__.columns.keys()
                    ),
                )

                self.assertEqual(
                    len(
                        inspector.get_foreign_keys(
                            "checkout_settlements"
                        )
                    ),
                    8,
                )

                self.assertEqual(
                    len(
                        inspector.get_unique_constraints(
                            "checkout_settlements"
                        )
                    ),
                    2,
                )

                constraint_names = {
                    item["name"]
                    for item in inspector.get_check_constraints(
                        "checkout_settlements"
                    )
                }

                self.assertTrue(
                    {
                        "ck_checkout_type",
                        "ck_checkout_deposit_plan_values",
                        "ck_checkout_deposit_plan_math",
                        "ck_checkout_deposit_execution_status",
                    }.issubset(
                        constraint_names
                    )
                )

                with Operations.context(
                    MigrationContext.configure(conn)
                ):
                    execution_migration.downgrade()
                    plan_migration.downgrade()
                    base_migration.downgrade()
                    base_migration.upgrade()
                    plan_migration.upgrade()
                    execution_migration.upgrade()

            self.prep()

            with self.engine.begin() as conn:
                with Operations.context(
                    MigrationContext.configure(conn)
                ):
                    with self.assertRaises(RuntimeError):
                        plan_migration.downgrade()

            self.assertEqual(
                self.db.scalar(
                    select(
                        func.count(
                            CheckoutSettlement.id
                        )
                    )
                ),
                1,
            )


        def test_postgres_migration_ddl_offline(self):
            import importlib.util
            from io import StringIO
            from alembic.migration import MigrationContext
            from alembic.operations import Operations
            path=Path(__file__).resolve().parents[1]/"migrations/versions/c4a9e6f102bd_add_checkout_settlements.py"
            spec=importlib.util.spec_from_file_location("checkout_pg_migration",path)
            migration=importlib.util.module_from_spec(spec)
            spec.loader.exec_module(migration)
            output=StringIO()
            with Operations.context(MigrationContext.configure(dialect_name="postgresql",opts={"as_sql":True,"output_buffer":output})):
                migration.upgrade()
            ddl=output.getvalue()
            self.assertIn("CREATE TABLE checkout_settlements",ddl)
            self.assertEqual(ddl.count("ON DELETE RESTRICT"),4)
            self.assertIn("uq_checkout_settlement_contract",ddl)
            self.assertNotIn("UPDATE ",ddl)
            self.assertNotIn("DELETE FROM",ddl)


        def test_checkout_plan_postgres_migration_ddl_offline(self):
            import importlib.util
            from io import StringIO
            from alembic.migration import MigrationContext
            from alembic.operations import Operations

            path = (
                Path(__file__).resolve().parents[1]
                / "migrations/versions/"
                "d7e1c2b3a4f5_add_checkout_deposit_plan.py"
            )

            spec = importlib.util.spec_from_file_location(
                "checkout_plan_pg_migration",
                path,
            )

            migration = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(migration)

            output = StringIO()

            with Operations.context(
                MigrationContext.configure(
                    dialect_name="postgresql",
                    opts={
                        "as_sql": True,
                        "output_buffer": output,
                    },
                )
            ):
                migration.upgrade()

            ddl = output.getvalue()

            self.assertIn(
                "checkout_type",
                ddl,
            )

            self.assertIn(
                "deposit_balance_at_prepare",
                ddl,
            )

            self.assertIn(
                "ck_checkout_deposit_plan_math",
                ddl,
            )

            self.assertNotIn(
                "UPDATE ",
                ddl,
            )

            self.assertNotIn(
                "DELETE FROM",
                ddl,
            )



        def test_apply_early_forfeits_entire_deposit_without_paying_invoice(self):
            saved = self.prep(
                self.data(
                    checkout_type="EARLY"
                )
            )

            invoice = self.db.get(
                Invoice,
                saved.invoice_id,
            )

            invoice.status = "ISSUED"

            self.db.commit()

            applied = svc.apply_deposit_plan(
                self.db,
                self.contract.id,
                CheckoutDepositApplyRequest(
                    confirmed=True
                ),
                self.user,
                None,
            )

            self.assertEqual(
                applied.deposit_execution_status,
                "APPLIED",
            )

            self.assertIsNotNone(
                applied.deposit_forfeit_transaction_id
            )

            self.assertIsNone(
                applied.deposit_payment_id
            )

            self.assertEqual(
                self.db.scalar(
                    select(
                        func.count(
                            Payment.id
                        )
                    )
                ),
                0,
            )

            forfeits = list(
                self.db.scalars(
                    select(
                        DepositTransaction
                    )
                    .where(
                        DepositTransaction.contract_id
                        == self.contract.id,
                        DepositTransaction.transaction_type
                        == "FORFEIT",
                    )
                ).all()
            )

            self.assertEqual(
                len(
                    forfeits
                ),
                1,
            )

            self.assertEqual(
                forfeits[0].amount,
                5000000,
            )

            self.assertEqual(
                svc.current_deposit_balance(
                    self.db,
                    self.contract.id,
                ),
                0,
            )

            invoice = self.db.get(
                Invoice,
                saved.invoice_id,
            )

            self.assertEqual(
                invoice.payment_status,
                "UNPAID",
            )

            deposit_count_before = self.db.scalar(
                select(
                    func.count(
                        DepositTransaction.id
                    )
                )
            )

            audit_count_before = self.db.scalar(
                select(
                    func.count(
                        AuditLog.id
                    )
                )
            )

            payment_count_before = self.db.scalar(
                select(
                    func.count(
                        Payment.id
                    )
                )
            )

            again = svc.apply_deposit_plan(
                self.db,
                self.contract.id,
                CheckoutDepositApplyRequest(
                    confirmed=True
                ),
                self.user,
                None,
            )

            self.assertEqual(
                again.id,
                applied.id,
            )

            self.assertEqual(
                self.db.scalar(
                    select(
                        func.count(
                            DepositTransaction.id
                        )
                    )
                ),
                deposit_count_before,
            )

            self.assertEqual(
                self.db.scalar(
                    select(
                        func.count(
                            Payment.id
                        )
                    )
                ),
                payment_count_before,
            )

            self.assertEqual(
                self.db.scalar(
                    select(
                        func.count(
                            AuditLog.id
                        )
                    )
                ),
                audit_count_before,
            )


        def test_apply_on_time_offsets_invoice_and_refunds_remainder(self):
            saved = self.prep(
                self.data(
                    checkout_type="ON_TIME"
                )
            )

            invoice = self.db.get(
                Invoice,
                saved.invoice_id,
            )

            invoice.status = "ISSUED"

            self.db.commit()

            applied = svc.apply_deposit_plan(
                self.db,
                self.contract.id,
                CheckoutDepositApplyRequest(
                    confirmed=True
                ),
                self.user,
                None,
            )

            self.assertEqual(
                applied.deposit_execution_status,
                "APPLIED",
            )

            self.assertIsNone(
                applied.deposit_forfeit_transaction_id
            )

            self.assertIsNotNone(
                applied.deposit_deduction_transaction_id
            )

            self.assertIsNotNone(
                applied.deposit_refund_transaction_id
            )

            self.assertIsNotNone(
                applied.deposit_payment_id
            )

            payment = self.db.get(
                Payment,
                applied.deposit_payment_id,
            )

            self.assertEqual(
                (
                    payment.invoice_id,
                    payment.amount,
                    payment.payment_method,
                    payment.confirmed_by,
                ),
                (
                    saved.invoice_id,
                    234000,
                    "DEPOSIT",
                    self.user.email,
                ),
            )

            invoice = self.db.get(
                Invoice,
                saved.invoice_id,
            )

            self.assertEqual(
                invoice.payment_status,
                "PAID",
            )

            deduction = self.db.get(
                DepositTransaction,
                applied.deposit_deduction_transaction_id,
            )

            refund = self.db.get(
                DepositTransaction,
                applied.deposit_refund_transaction_id,
            )

            self.assertEqual(
                (
                    deduction.transaction_type,
                    deduction.amount,
                    refund.transaction_type,
                    refund.amount,
                ),
                (
                    "DEDUCTION",
                    234000,
                    "REFUND",
                    4766000,
                ),
            )

            self.assertEqual(
                svc.current_deposit_balance(
                    self.db,
                    self.contract.id,
                ),
                0,
            )


        def test_apply_on_time_keeps_shortfall_as_invoice_balance(self):
            self.db.add(
                DepositTransaction(
                    contract_id=self.contract.id,
                    transaction_type="REFUND",
                    amount=4900000,
                    note="test setup",
                )
            )

            self.db.commit()

            saved = self.prep(
                self.data(
                    checkout_type="ON_TIME"
                )
            )

            invoice = self.db.get(
                Invoice,
                saved.invoice_id,
            )

            invoice.status = "ISSUED"

            self.db.commit()

            applied = svc.apply_deposit_plan(
                self.db,
                self.contract.id,
                CheckoutDepositApplyRequest(
                    confirmed=True
                ),
                self.user,
                None,
            )

            payment = self.db.get(
                Payment,
                applied.deposit_payment_id,
            )

            self.assertEqual(
                payment.amount,
                100000,
            )

            self.assertIsNone(
                applied.deposit_refund_transaction_id
            )

            invoice = self.db.get(
                Invoice,
                saved.invoice_id,
            )

            self.assertEqual(
                invoice.payment_status,
                "PARTIALLY_PAID",
            )

            self.assertEqual(
                (
                    invoice.total_amount
                    - sum(
                        item.amount
                        for item in invoice.payments
                    )
                ),
                134000,
            )

            self.assertEqual(
                applied.tenant_due_after_deposit,
                134000,
            )

            self.assertEqual(
                svc.current_deposit_balance(
                    self.db,
                    self.contract.id,
                ),
                0,
            )


        def test_apply_deposit_requires_issued_checkout_invoice(self):
            saved = self.prep(
                self.data(
                    checkout_type="ON_TIME"
                )
            )

            with self.assertRaises(
                HTTPException
            ) as caught:
                svc.apply_deposit_plan(
                    self.db,
                    self.contract.id,
                    CheckoutDepositApplyRequest(
                        confirmed=True
                    ),
                    self.user,
                    None,
                )

            self.assertEqual(
                caught.exception.status_code,
                409,
            )

            self.assertEqual(
                self.db.get(
                    CheckoutSettlement,
                    saved.id,
                ).deposit_execution_status,
                "PENDING",
            )

            self.assertEqual(
                self.db.scalar(
                    select(
                        func.count(
                            Payment.id
                        )
                    )
                ),
                0,
            )

            self.assertEqual(
                self.db.scalar(
                    select(
                        func.count(
                            DepositTransaction.id
                        )
                    )
                ),
                1,
            )


        def test_apply_on_time_blocks_if_deposit_changed_after_prepare(self):
            saved = self.prep(
                self.data(
                    checkout_type="ON_TIME"
                )
            )

            invoice = self.db.get(
                Invoice,
                saved.invoice_id,
            )

            invoice.status = "ISSUED"

            self.db.add(
                DepositTransaction(
                    contract_id=self.contract.id,
                    transaction_type="REFUND",
                    amount=1000,
                    note="changed after checkout prepare",
                )
            )

            self.db.commit()

            with self.assertRaises(
                HTTPException
            ) as caught:
                svc.apply_deposit_plan(
                    self.db,
                    self.contract.id,
                    CheckoutDepositApplyRequest(
                        confirmed=True
                    ),
                    self.user,
                    None,
                )

            self.assertEqual(
                caught.exception.status_code,
                409,
            )

            self.assertEqual(
                self.db.get(
                    CheckoutSettlement,
                    saved.id,
                ).deposit_execution_status,
                "PENDING",
            )

            self.assertEqual(
                self.db.scalar(
                    select(
                        func.count(
                            Payment.id
                        )
                    )
                ),
                0,
            )


        def test_apply_on_time_blocks_if_invoice_paid_before_deposit(self):
            saved = self.prep(
                self.data(
                    checkout_type="ON_TIME"
                )
            )

            invoice = self.db.get(
                Invoice,
                saved.invoice_id,
            )

            invoice.status = "ISSUED"

            self.db.add(
                Payment(
                    invoice_id=invoice.id,
                    amount=10000,
                    payment_method="CASH",
                    confirmed_by=self.user.email,
                    note="test setup",
                )
            )

            invoice.payment_status = (
                "PARTIALLY_PAID"
            )

            self.db.commit()

            with self.assertRaises(
                HTTPException
            ) as caught:
                svc.apply_deposit_plan(
                    self.db,
                    self.contract.id,
                    CheckoutDepositApplyRequest(
                        confirmed=True
                    ),
                    self.user,
                    None,
                )

            self.assertEqual(
                caught.exception.status_code,
                409,
            )

            settlement = self.db.get(
                CheckoutSettlement,
                saved.id,
            )

            self.assertEqual(
                settlement.deposit_execution_status,
                "PENDING",
            )

            self.assertIsNone(
                settlement.deposit_payment_id
            )

            self.assertEqual(
                svc.current_deposit_balance(
                    self.db,
                    self.contract.id,
                ),
                5000000,
            )



        def test_end_contract_checkout_cannot_bypass_pending_deposit_plan(self):
            saved = self.prep(
                self.data(
                    checkout_type="EARLY"
                )
            )

            invoice = self.db.get(
                Invoice,
                saved.invoice_id,
            )

            invoice.status = "ISSUED"
            self.db.commit()

            with self.assertRaises(
                HTTPException
            ) as caught:
                end_contract(
                    self.contract.id,
                    ContractEndRequest(
                        end_date=date(
                            2026,
                            10,
                            10,
                        ),
                        move_out_electric_reading=5820,
                        allow_unsettled_deposit=True,
                    ),
                    None,
                    self.db,
                    self.user,
                )

            self.assertEqual(
                caught.exception.status_code,
                409,
            )

            self.assertEqual(
                self.db.get(
                    Contract,
                    self.contract.id,
                ).status,
                "ACTIVE",
            )

            self.assertEqual(
                self.db.get(
                    Room,
                    self.contract.room_id,
                ).status,
                "OCCUPIED",
            )


        def test_end_contract_early_requires_residual_invoice_paid(self):
            saved = self.prep(
                self.data(
                    checkout_type="EARLY"
                )
            )

            invoice = self.db.get(
                Invoice,
                saved.invoice_id,
            )

            invoice.status = "ISSUED"
            self.db.commit()

            svc.apply_deposit_plan(
                self.db,
                self.contract.id,
                CheckoutDepositApplyRequest(
                    confirmed=True
                ),
                self.user,
                None,
            )

            invoice = self.db.get(
                Invoice,
                saved.invoice_id,
            )

            self.assertEqual(
                invoice.payment_status,
                "UNPAID",
            )

            with self.assertRaises(
                HTTPException
            ) as caught:
                end_contract(
                    self.contract.id,
                    ContractEndRequest(
                        end_date=date(
                            2026,
                            10,
                            10,
                        ),
                        move_out_electric_reading=5820,
                        allow_unsettled_deposit=False,
                    ),
                    None,
                    self.db,
                    self.user,
                )

            self.assertEqual(
                caught.exception.status_code,
                409,
            )

            self.db.add(
                Payment(
                    invoice_id=invoice.id,
                    amount=invoice.total_amount,
                    payment_method="CASH",
                    confirmed_by=self.user.email,
                    note="settle checkout residual",
                )
            )

            invoice.payment_status = "PAID"
            self.db.commit()

            ended = end_contract(
                self.contract.id,
                ContractEndRequest(
                    end_date=date(
                        2026,
                        10,
                        10,
                    ),
                    move_out_electric_reading=5820,
                    allow_unsettled_deposit=False,
                ),
                None,
                self.db,
                self.user,
            )

            self.assertEqual(
                ended.status,
                "ENDED",
            )

            contract = self.db.get(
                Contract,
                self.contract.id,
            )

            room = self.db.get(
                Room,
                self.contract.room_id,
            )

            self.assertEqual(
                contract.status,
                "ENDED",
            )

            self.assertEqual(
                contract.end_date,
                date(
                    2026,
                    10,
                    10,
                ),
            )

            self.assertEqual(
                contract.move_out_electric_reading,
                5820,
            )

            self.assertEqual(
                room.status,
                "VACANT",
            )


        def test_end_contract_on_time_waits_for_shortfall_payment(self):
            self.db.add(
                DepositTransaction(
                    contract_id=self.contract.id,
                    transaction_type="REFUND",
                    amount=4900000,
                    note="test setup",
                )
            )

            self.db.commit()

            saved = self.prep(
                self.data(
                    checkout_type="ON_TIME"
                )
            )

            invoice = self.db.get(
                Invoice,
                saved.invoice_id,
            )

            invoice.status = "ISSUED"
            self.db.commit()

            applied = svc.apply_deposit_plan(
                self.db,
                self.contract.id,
                CheckoutDepositApplyRequest(
                    confirmed=True
                ),
                self.user,
                None,
            )

            invoice = self.db.get(
                Invoice,
                saved.invoice_id,
            )

            self.assertEqual(
                applied.tenant_due_after_deposit,
                134000,
            )

            self.assertEqual(
                invoice.payment_status,
                "PARTIALLY_PAID",
            )

            with self.assertRaises(
                HTTPException
            ) as caught:
                end_contract(
                    self.contract.id,
                    ContractEndRequest(
                        end_date=date(
                            2026,
                            10,
                            10,
                        ),
                        move_out_electric_reading=5820,
                        allow_unsettled_deposit=False,
                    ),
                    None,
                    self.db,
                    self.user,
                )

            self.assertEqual(
                caught.exception.status_code,
                409,
            )

            self.db.add(
                Payment(
                    invoice_id=invoice.id,
                    amount=134000,
                    payment_method="BANK_TRANSFER",
                    confirmed_by=self.user.email,
                    note="pay checkout shortfall",
                )
            )

            invoice.payment_status = "PAID"
            self.db.commit()

            ended = end_contract(
                self.contract.id,
                ContractEndRequest(
                    end_date=date(
                        2026,
                        10,
                        10,
                    ),
                    move_out_electric_reading=5820,
                    allow_unsettled_deposit=False,
                ),
                None,
                self.db,
                self.user,
            )

            self.assertEqual(
                ended.status,
                "ENDED",
            )

            self.assertEqual(
                ended.deposit_balance,
                0,
            )

            self.assertEqual(
                self.db.get(
                    Room,
                    self.contract.room_id,
                ).status,
                "VACANT",
            )


        def test_end_contract_checkout_requires_snapshot_date_and_meter(self):
            saved = self.prep(
                self.data(
                    checkout_type="ON_TIME"
                )
            )

            invoice = self.db.get(
                Invoice,
                saved.invoice_id,
            )

            invoice.status = "ISSUED"
            self.db.commit()

            svc.apply_deposit_plan(
                self.db,
                self.contract.id,
                CheckoutDepositApplyRequest(
                    confirmed=True
                ),
                self.user,
                None,
            )

            with self.assertRaises(
                HTTPException
            ) as wrong_date:
                end_contract(
                    self.contract.id,
                    ContractEndRequest(
                        end_date=date(
                            2026,
                            10,
                            9,
                        ),
                        move_out_electric_reading=5820,
                        allow_unsettled_deposit=False,
                    ),
                    None,
                    self.db,
                    self.user,
                )

            self.assertEqual(
                wrong_date.exception.status_code,
                409,
            )

            with self.assertRaises(
                HTTPException
            ) as wrong_meter:
                end_contract(
                    self.contract.id,
                    ContractEndRequest(
                        end_date=date(
                            2026,
                            10,
                            10,
                        ),
                        move_out_electric_reading=5821,
                        allow_unsettled_deposit=False,
                    ),
                    None,
                    self.db,
                    self.user,
                )

            self.assertEqual(
                wrong_meter.exception.status_code,
                409,
            )

            self.assertEqual(
                self.db.get(
                    Contract,
                    self.contract.id,
                ).status,
                "ACTIVE",
            )

            self.assertEqual(
                self.db.get(
                    Room,
                    self.contract.room_id,
                ).status,
                "OCCUPIED",
            )


        def test_checkout_financial_execution_postgres_ddl_offline(self):
            import importlib.util
            from io import StringIO
            from alembic.migration import MigrationContext
            from alembic.operations import Operations

            path = (
                Path(__file__).resolve().parents[1]
                / "migrations/versions/"
                "e8f4d2c1b6a7_add_checkout_financial_execution.py"
            )

            spec = importlib.util.spec_from_file_location(
                "checkout_execution_pg_migration",
                path,
            )

            migration = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(migration)

            output = StringIO()

            with Operations.context(
                MigrationContext.configure(
                    dialect_name="postgresql",
                    opts={
                        "as_sql": True,
                        "output_buffer": output,
                    },
                )
            ):
                migration.upgrade()

            ddl = output.getvalue()

            self.assertIn(
                "DEPOSIT",
                ddl,
            )

            self.assertIn(
                "deposit_execution_status",
                ddl,
            )

            self.assertIn(
                "ck_checkout_deposit_execution_status",
                ddl,
            )

            self.assertNotIn(
                "UPDATE ",
                ddl,
            )

            self.assertNotIn(
                "DELETE FROM",
                ddl,
            )


        def test_manual_payment_schema_rejects_deposit_method(self):
            from pydantic import ValidationError
            from backend.app.schemas.payment import PaymentCreate

            with self.assertRaises(ValidationError):
                PaymentCreate(
                    amount=1000,
                    payment_method="DEPOSIT",
                )


        def test_forfeit_is_separate_deposit_bucket(self):
            from backend.app.api.deposits import get_deposit_values

            self.db.add(
                DepositTransaction(
                    contract_id=self.contract.id,
                    transaction_type="FORFEIT",
                    amount=1000000,
                    note="B2B test",
                )
            )
            self.db.commit()

            self.assertEqual(
                get_deposit_values(
                    self.contract.id,
                    self.db,
                ),
                (
                    5000000,
                    0,
                    0,
                    1000000,
                    4000000,
                ),
            )


        def add_normal_bulk_room(self, code):
            room=Room(room_code=code,status="OCCUPIED")
            tenant=Tenant(full_name="Bulk test")
            self.db.add_all([room,tenant])
            self.db.flush()
            contract=Contract(room_id=room.id,tenant_id=tenant.id,start_date=date(2026,8,1),
                monthly_rent=5000000,move_in_electric_reading=1000,status="ACTIVE",
                rent_billing_cycle_months=1,rent_billing_anchor_year=2026,rent_billing_anchor_month=8)
            self.db.add_all([contract,RoomFeeSetting(room_id=room.id,electricity_rate=4000,water_fee=150000,management_fee=250000)])
            meter=MeterReading(room_id=room.id,year=2026,month=8,old_reading=1000,new_reading=1100,consumption=100)
            self.db.add(meter)
            self.db.flush()
            self.db.add(Invoice(room_id=room.id,year=2026,month=9,version=1,status="ISSUED",
                meter_reading_id=meter.id,electricity_period_year=2026,electricity_period_month=8,total_amount=400000,
                items=[InvoiceItem(description="Billed electricity",item_type="ELECTRICITY",quantity=100,unit_price=4000,amount=400000)]))
            self.db.add(MeterReading(room_id=room.id,year=2026,month=10,old_reading=1100,new_reading=1200,consumption=100))
            self.db.commit()
            return contract

        def run_november_bulk(self):
            from backend.app.api.invoices import generate_bulk_invoices
            from backend.app.schemas.invoice import InvoiceBulkGenerate
            return generate_bulk_invoices(InvoiceBulkGenerate(year=2026,month=11),None,self.db,self.user)

        def assert_mixed_bulk(self, normal_count):
            saved=self.prep()
            before=svc.snapshot_values(saved)
            normal=[self.add_normal_bulk_room("P"+str(404+i)) for i in range(normal_count)]
            result=self.run_november_bulk()
            self.assertEqual((result.created_count,result.skipped_count),(normal_count,1))
            self.assertEqual(len(result.created_invoice_ids),normal_count)
            self.assertTrue(result.skipped_rooms[0].startswith("P403:"))
            self.assertEqual(result.skipped_rooms[0],"P403: "+svc.PreparedCheckoutConflict().detail)
            created=list(self.db.scalars(select(Invoice).where(Invoice.year==2026,Invoice.month==11)).all())
            self.assertEqual({i.room_id for i in created},{c.room_id for c in normal})
            self.assertEqual(svc.snapshot_values(svc.get_existing(self.db,self.contract.id)),before)
            self.assertEqual(self.db.scalar(select(func.count(CheckoutSettlement.id))),1)

        def test_bulk_checkout_room_skipped_normal_created(self):
            self.assert_mixed_bulk(1)

        def test_bulk_checkout_room_skipped_multiple_normal_created(self):
            self.assert_mixed_bulk(3)

        def test_bulk_all_checkout_rooms_successfully_skipped(self):
            first=self.prep()
            other=self.add_normal_bulk_room("P404")
            data=self.data(room_id=other.room_id,move_out_electric_reading=1120)
            p=svc.preview(self.db,other.id,data)
            second=svc.prepare(self.db,other.id,CheckoutPrepareRequest(**data.model_dump(),
                preview_token=p["preview_token"],confirmed=True),self.user,None)
            before=[svc.snapshot_values(first),svc.snapshot_values(second)]
            result=self.run_november_bulk()
            self.assertEqual(result.created_count,0)
            self.assertEqual(result.created_invoice_ids,[])
            self.assertEqual(result.skipped_count,2)
            self.assertEqual({s.split(":")[0] for s in result.skipped_rooms},{"P403","P404"})
            self.assertTrue(all(svc.PreparedCheckoutConflict().detail in s for s in result.skipped_rooms))
            self.assertEqual(self.db.scalar(select(func.count(Invoice.id)).where(Invoice.year==2026,Invoice.month==11)),0)
            self.assertEqual([svc.snapshot_values(svc.get_existing(self.db,c)) for c in (self.contract.id,other.id)],before)

        def test_single_checkout_invoice_generation_still_blocks(self):
            from backend.app.api.invoices import generate_invoice
            from backend.app.schemas.invoice import InvoiceGenerate
            self.prep()
            with self.assertRaises(svc.PreparedCheckoutConflict) as caught:
                generate_invoice(InvoiceGenerate(room_id=self.contract.room_id,year=2026,month=11),None,self.db,self.user)
            self.assertEqual(caught.exception.status_code,409)
            self.assertEqual(self.db.scalar(select(func.count(Invoice.id)).where(Invoice.year==2026,Invoice.month==11)),0)

        def test_bulk_unknown_409_and_integrity_error_rollback_not_skipped(self):
            import backend.app.api.invoices as invoices_api
            self.contract.end_date=date(2026,10,31)
            self.db.commit()
            normal=self.add_normal_bulk_room("P404")
            faulty=self.add_normal_bulk_room("P405")
            original=invoices_api._get_invoice_electricity_source
            for failure in [HTTPException(409,"Unexpected conflict"),IntegrityError("injected INSERT",{},RuntimeError("unexpected integrity"))]:
                with self.subTest(error=type(failure).__name__):
                    reached=[]
                    def source(db,contract,year,month):
                        if contract.id==faulty.id:
                            self.assertIsNotNone(db.scalar(select(Invoice.id).where(Invoice.room_id==normal.room_id,Invoice.year==2026,Invoice.month==11)))
                            reached.append(True)
                            raise failure
                        return original(db,contract,year,month)
                    with patch.object(invoices_api,"_get_invoice_electricity_source",side_effect=source):
                        with self.assertRaises(HTTPException) as caught:
                            self.run_november_bulk()
                    self.assertEqual(caught.exception.status_code,409)
                    self.assertTrue(reached)
                    if isinstance(failure,IntegrityError):
                        self.assertIs(caught.exception.__cause__,failure)
                    else:
                        self.assertIs(caught.exception,failure)
                    self.assertEqual(self.db.scalar(select(func.count(Invoice.id)).where(Invoice.year==2026,Invoice.month==11)),0)

        def test_reason_500_preview_and_issued_replacement_prepare_pass(self):
            original=self.target("ISSUED")
            data=self.data(invoice_id=original.id,reason="x"*500)
            p=svc.preview(self.db,self.contract.id,data)
            self.assertEqual(len(p["snapshot"]["reason"]),500)
            result=svc.prepare(self.db,self.contract.id,CheckoutPrepareRequest(**data.model_dump(),
                preview_token=p["preview_token"],confirmed=True),self.user,None)
            self.assertEqual(result.reason,"x"*500)
            self.assertEqual(self.db.get(Invoice,original.id).status,"CANCELLED")
            self.assertEqual(self.db.get(Invoice,result.invoice_id).status,"DRAFT")

        def test_reason_invalid_boundaries_rejected_at_request_validation(self):
            values=self.data().model_dump()
            for length in [0,501,1000]:
                for schema,extra in [(CheckoutRequest,{}),(CheckoutPrepareRequest,dict(preview_token="a"*64,confirmed=True))]:
                    with self.subTest(length=length,schema=schema.__name__):
                        with self.assertRaises(ValidationError) as caught:
                            schema(**dict(values,reason="x"*length),**extra)
                        self.assertTrue(any(e["loc"]==("reason",) for e in caught.exception.errors()))
            self.assertEqual(self.db.scalar(select(func.count(CheckoutSettlement.id))),0)

        def test_partially_paid_issued_invoice_still_blocks(self):
            inv=self.target("ISSUED")
            inv.payment_status="PARTIALLY_PAID"

            self.db.add(
                Payment(
                    invoice_id=inv.id,
                    amount=1,
                    payment_method="CASH",
                )
            )

            self.db.commit()

            data=self.data(
                invoice_id=inv.id
            )

            with self.assertRaises(
                HTTPException
            ) as preview_error:

                svc.preview(
                    self.db,
                    self.contract.id,
                    data,
                )

            self.assertEqual(
                preview_error.exception.status_code,
                409,
            )

            with self.assertRaises(
                HTTPException
            ) as prepare_error:

                svc.prepare(
                    self.db,
                    self.contract.id,
                    CheckoutPrepareRequest(
                        **data.model_dump(),
                        preview_token="a"*64,
                        confirmed=True,
                    ),
                    self.user,
                    None,
                )

            self.assertEqual(
                prepare_error.exception.status_code,
                409,
            )

            self.assertEqual(
                self.db.get(
                    Invoice,
                    inv.id,
                ).status,
                "ISSUED",
            )

            self.assertEqual(
                self.db.get(
                    Invoice,
                    inv.id,
                ).payment_status,
                "PARTIALLY_PAID",
            )

            self.assertEqual(
                self.db.scalar(
                    select(
                        func.sum(
                            Payment.amount
                        )
                    )
                ),
                1,
            )

            self.assertEqual(
                self.db.scalar(
                    select(
                        func.count(
                            CheckoutSettlement.id
                        )
                    )
                ),
                0,
            )


    suite=unittest.defaultTestLoader.loadTestsFromTestCase(CheckoutTests)
    result=unittest.TextTestRunner(verbosity=2).run(suite)
    sys.exit(0 if result.wasSuccessful() else 1)


if __name__ == "__main__":
    run_isolated()
