"""Run: .\\.venv\\Scripts\\python.exe -m unittest discover -s backend/tests -p test_electricity_billing_audit.py -v

Executes current source functions against minimal SQLite :memory: fixtures.
Does not import the app, load .env, connect to PostgreSQL or run migrations.
SQLite tests validate query semantics, NOT PostgreSQL concurrency.
"""
import ast
from datetime import date
from pathlib import Path
import subprocess
from types import SimpleNamespace
import unittest

from fastapi import HTTPException, status
from sqlalchemy import Column, Integer, String, ForeignKey, and_, or_, select, create_engine
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import declarative_base, relationship, Session
from sqlalchemy.dialects import postgresql

ROOT = Path(__file__).resolve().parents[2]
Base = declarative_base()


class Room(Base):
    __tablename__ = "rooms"
    id = Column(Integer, primary_key=True)


class MeterReading(Base):
    __tablename__ = "meter_readings"
    id = Column(Integer, primary_key=True)
    room_id = Column(Integer)
    year = Column(Integer)
    month = Column(Integer)
    old_reading = Column(Integer)
    new_reading = Column(Integer)
    consumption = Column(Integer)


class Invoice(Base):
    __tablename__ = "invoices"
    id = Column(Integer, primary_key=True)
    room_id = Column(Integer)
    year = Column(Integer)
    month = Column(Integer)
    electricity_period_year = Column(Integer)
    electricity_period_month = Column(Integer)
    electricity_transition_old_reading = Column(Integer)
    electricity_transition_new_reading = Column(Integer)
    meter_reading_id = Column(Integer)
    status = Column(String)
    version = Column(Integer, default=1)
    replaces_invoice_id = Column(Integer)
    total_amount = Column(Integer, default=296000)
    note = Column(String)
    items = relationship("InvoiceItem", cascade="all, delete-orphan")


class InvoiceItem(Base):
    __tablename__ = "invoice_items"
    id = Column(Integer, primary_key=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"))
    item_type = Column(String)
    description = Column(String)
    quantity = Column(Integer)
    unit = Column(String)
    unit_price = Column(Integer)
    amount = Column(Integer)


# Extract production functions unchanged, excluding route decorators/imports.
source = (ROOT / "backend/app/api/invoices.py").read_text(encoding="utf-8")
tree = ast.parse(source)
names = {"_get_previous_month_period", "_meter_has_active_invoice",
         "_get_invoice_electricity_source", "get_invoice_or_404", "create_replacement_invoice", "create_replacement_invoice_in_transaction"}
functions = [n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name in names]
assert len(functions) == len(names)
for f in functions:
    f.decorator_list = []
module = ast.Module(body=[ast.ImportFrom(module="__future__", names=[ast.alias(name="annotations")], level=0)] + functions, type_ignores=[])
ns = dict(globals(), record_audit_log=lambda **kw: None,
          assert_invoice_not_frozen=lambda *args: None, assert_contract_not_prepared=lambda *args: None)
exec(compile(ast.fix_missing_locations(module), str(ROOT / "backend/app/api/invoices.py"), "exec"), ns)


class TracedSession(Session):
    def scalar(self, statement, *args, **kwargs):
        self.statements.append(str(statement.compile(dialect=postgresql.dialect())))
        return super().scalar(statement, *args, **kwargs)


class ElectricityAuditTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(self.engine)
        self.db = TracedSession(self.engine, autoflush=False)
        self.db.statements = []
        self.db.add(Room(id=1))
        self.db.commit()

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    def meter(self, month=9, old=3976):
        m = MeterReading(room_id=1, year=2026, month=month, old_reading=old,
                         new_reading=4050, consumption=4050-old)
        self.db.add(m)
        self.db.commit()
        return m

    def invoice(self, status="ISSUED", period=9, meter_id=None, electricity=True, month=9):
        i = Invoice(room_id=1, year=2026, month=month, electricity_period_year=2026,
                    electricity_period_month=period, meter_reading_id=meter_id, status=status)
        i.items = [InvoiceItem(item_type="ELECTRICITY" if electricity else "WATER",
                    description="snapshot", quantity=74, unit="kWh", unit_price=4000, amount=296000)]
        self.db.add(i)
        self.db.commit()
        return i

    def claimed(self, m):
        return ns["_meter_has_active_invoice"](self.db, m.id, m.room_id, m.year, m.month)

    def source(self, baseline=3976, start=date(2026,9,15)):
        c = SimpleNamespace(id=1, room_id=1, start_date=start, move_in_electric_reading=baseline)
        return ns["_get_invoice_electricity_source"](self.db, c, 2026, 10)

    def test_legacy_null_id_claims_later_meter(self):
        self.invoice(meter_id=None)
        m = self.meter()
        self.assertTrue(self.claimed(m))
        self.assertEqual(self.source(), (None,None,None))

    def test_new_invoice_month_is_not_electricity_period(self):
        self.invoice(month=10, period=9)
        self.assertFalse(self.claimed(self.meter(month=10)))

    def test_fallback_requires_electricity_item(self):
        self.invoice(electricity=False)
        self.assertFalse(self.claimed(self.meter()))

    def test_exact_id_claim_even_without_period(self):
        m = self.meter()
        i = self.invoice(meter_id=m.id, electricity=False)
        i.electricity_period_year = i.electricity_period_month = None
        self.db.commit()
        self.assertTrue(self.claimed(m))

    def test_draft_claims_cancelled_does_not(self):
        m = self.meter()
        i = self.invoice(status="DRAFT")
        self.assertTrue(self.claimed(m))
        i.status = "CANCELLED"
        self.db.commit()
        self.assertFalse(self.claimed(m))

    def test_null_baseline_skips_with_or_without_meter(self):
        with self.assertRaises(HTTPException) as cm:
            self.source(baseline=None)
        self.assertEqual(cm.exception.status_code, 400)
        self.meter(old=3900)
        with self.assertRaises(HTTPException) as cm:
            self.source(baseline=None)
        self.assertEqual(cm.exception.status_code, 400)

    def test_matching_baseline_charges_74(self):
        m = self.meter()
        result = self.source()
        self.assertEqual(result, (2026,9,m))
        self.assertEqual(result[2].consumption, 74)
        self.assertTrue(any("FOR UPDATE" in q for q in self.db.statements))

    def test_mismatched_baseline_blocks(self):
        self.meter(old=3900)
        with self.assertRaises(HTTPException) as cm:
            self.source()
        self.assertEqual(cm.exception.status_code, 400)

    def test_contract_after_electricity_period_skips(self):
        self.meter()
        self.assertEqual(self.source(start=date(2026,10,5)), (None,None,None))

    def test_required_missing_meter_and_rollover(self):
        with self.assertRaises(HTTPException) as cm:
            self.source()
        self.assertEqual(cm.exception.status_code,400)
        self.assertEqual(ns["_get_previous_month_period"](2027,1),(2026,12))

    def test_replacement_cancelled_original_preserves_snapshot(self):
        m = self.meter()
        for meter_id in (None, m.id):
            with self.subTest(meter_id=meter_id):
                original = self.invoice(status="CANCELLED", meter_id=meter_id)
                result = ns["create_replacement_invoice"](original.id,None,self.db,None)
                self.assertEqual((result.meter_reading_id,result.electricity_period_month),(meter_id,9))
                self.assertEqual(result.electricity_period_year,2026)
                for field in ("item_type","description","quantity","unit","unit_price","amount"):
                    self.assertEqual(getattr(result.items[0],field),getattr(original.items[0],field))
                result.status = "CANCELLED"
                self.db.commit()

    def test_replacement_legacy_without_meter_preserves_null(self):
        original = self.invoice(status="CANCELLED")
        result = ns["create_replacement_invoice"](original.id,None,self.db,None)
        self.assertIsNone(result.meter_reading_id)
        self.assertEqual(result.electricity_period_month,9)
        self.assertTrue(any("FOR NO KEY UPDATE" in q for q in self.db.statements))
        self.assertTrue(self.claimed(self.meter()))

    def test_replacement_conflict_with_legacy_claim(self):
        self.invoice(status="DRAFT", meter_id=None)
        for has_meter in (False, True):
            m = self.meter() if has_meter else None
            for meter_id in ([None,m.id] if m else [None]):
                with self.subTest(has_meter=has_meter,meter_id=meter_id):
                    original = self.invoice(status="CANCELLED",meter_id=meter_id)
                    with self.assertRaises(HTTPException) as cm:
                        ns["create_replacement_invoice"](original.id,None,self.db,None)
                    self.assertEqual(cm.exception.status_code,409)

    def test_single_and_bulk_use_shared_source(self):
        for name in ("generate_invoice","generate_bulk_invoices"):
            function = next(n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name==name)
            calls = [n.func.id for n in ast.walk(function) if isinstance(n,ast.Call) and isinstance(n.func,ast.Name)]
            self.assertIn("_get_invoice_electricity_source",calls)

    def test_invoice_details_rejects_mismatched_source(self):
        js = r"""
const fs = require('fs'), ts = require('typescript'), assert = require('assert/strict');
const text = fs.readFileSync('src/pages/InvoiceDetails.tsx','utf8').replace(/\r\n/g,'\n');
const start = text.lastIndexOf('      try {', text.indexOf('if (invoiceData.meter_reading_id == null)'));
const end = text.indexOf('    } catch (\n      err', start);
assert(start >= 0 && end > start);
const code = ts.transpile(text.slice(start,end), {target: ts.ScriptTarget.ES2022});
const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
const run = new AsyncFunction('invoiceData','apiGet','setMeterReading','console',code);
(async () => {
 const invoice={meter_reading_id:9,room_id:1,electricity_period_year:2026,electricity_period_month:9};
 const good={id:9,room_id:1,year:2026,month:9};
 for (const source of [good,{...good,year:2025},{...good,month:10},{...good,id:10},{...good,room_id:2}]) {
   let selected='stale';
   await run(invoice,async ()=>source,v=>selected=v,{warn:()=>{}});
   assert.equal(selected,source===good ? good : null);
 }
 let selected='stale', fetched=false;
 await run({...invoice,meter_reading_id:null},async ()=>{fetched=true;},v=>selected=v,{warn:()=>{}});
 assert.equal(selected,null);assert.equal(fetched,false);
 console.log('PASS: InvoiceDetails 6 source validation cases');
})().catch(err=>{console.error(err);process.exitCode=1;});
"""
        result = subprocess.run(["node","-"],input=js,text=True,capture_output=True,cwd=ROOT/"frontend")
        self.assertEqual(result.returncode,0,result.stdout+result.stderr)
        print(result.stdout.strip())


if __name__ == "__main__":
    unittest.main(verbosity=2)
