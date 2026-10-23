"""Transition regression using production functions and isolated SQLite fixtures.
No app/.env import, production connection, or migration execution.
Run: .\\.venv\\Scripts\\python.exe -m unittest discover -s backend/tests -v
"""
import ast
from calendar import monthrange
from datetime import date, datetime, timezone
from pathlib import Path
from types import SimpleNamespace
import unittest
import subprocess

from fastapi import HTTPException, status
from pydantic import BaseModel, Field, ConfigDict, ValidationError
from sqlalchemy import Column, Date, DateTime, Integer, String, ForeignKey, CheckConstraint, and_, or_, func, select, create_engine
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from test_electricity_billing_audit import Base, Room, MeterReading, Invoice, InvoiceItem, ROOT

Room.room_code = Column(String)
Invoice.payment_status = Column(String, default="UNPAID")
Invoice.cancelled_reason = Column(String)
Invoice.cancelled_at = Column(DateTime(timezone=True))
Invoice.transfer_reference = Column(String)


class Contract(Base):
    __tablename__ = "contracts"
    id = Column(Integer, primary_key=True)
    room_id = Column(Integer)
    start_date = Column(Date)
    end_date = Column(Date)
    move_in_electric_reading = Column(Integer)
    monthly_rent = Column(Integer, default=3000000)
    rent_billing_cycle_months = Column(Integer, default=1)
    rent_billing_anchor_year = Column(Integer, default=2026)
    rent_billing_anchor_month = Column(Integer, default=1)


class RoomFeeSetting(Base):
    __tablename__ = "room_fee_settings"
    id = Column(Integer, primary_key=True)
    room_id = Column(Integer)
    electricity_rate = Column(Integer, default=4000)
    water_fee = Column(Integer, default=100000)
    management_fee = Column(Integer, default=50000)


class Payment(Base):
    __tablename__ = "payments"
    id = Column(Integer, primary_key=True)
    invoice_id = Column(Integer)
    amount = Column(Integer)


ns = dict(globals(), record_audit_log=lambda **kwargs: None,
          assert_invoice_not_frozen=lambda *args: None, assert_contract_not_prepared=lambda *args: None)


def load_nodes(path, names, kind=ast.FunctionDef):
    tree = ast.parse((ROOT / path).read_text(encoding="utf-8"))
    nodes = [n for n in tree.body if isinstance(n, kind) and (names is None or n.name in names)]
    if names is not None:
        assert len(nodes) == len(names)
    for n in nodes:
        n.decorator_list = []
    module = ast.Module(body=nodes, type_ignores=[])
    exec(compile(ast.fix_missing_locations(module), path, "exec", flags=__import__("__future__").annotations.compiler_flag), ns)


load_nodes("backend/app/schemas/invoice.py", {"ExtraInvoiceItemCreate", "InvoiceTransitionReading", "InvoiceGenerate", "InvoiceBulkGenerate", "InvoiceBulkResult"}, ast.ClassDef)
load_nodes("backend/app/schemas/meter_reading.py", None, ast.ClassDef)
load_nodes("backend/app/services/electricity_transition.py", {"get_transition_baselines"})
load_nodes("backend/app/services/checkout_settlement.py", {"PreparedCheckoutConflict"}, ast.ClassDef)
load_nodes("backend/app/api/invoices.py", {
    "month_serial", "add_months", "calculate_contract_rent_charge", "get_invoice_or_404",
    "_get_previous_month_period", "_meter_has_active_invoice", "_get_invoice_electricity_source",
    "_get_transition_source", "_has_meter_from_period", "_prepare_transition", "_transition_item",
    "_transition_meter_without_move_in", "_meter_depends_on_transition",
    "_guard_transition_removal", "delete_draft_invoice", "preview_transitions", "generate_invoice", "generate_bulk_invoices",
    "create_replacement_invoice", "create_replacement_invoice_in_transaction", "cancel_invoice", "cancel_invoice_in_transaction", "update_invoice_item", "delete_invoice_item",
})
load_nodes("backend/app/api/meter_readings.py", {
    "validate_period", "_get_move_in_electric_reading_for_month", "create_meter_reading", "create_bulk_meter_readings", "transition_baselines",
})


for value in list(ns.values()):
    if isinstance(value, type) and issubclass(value, BaseModel) and value is not BaseModel:
        value.model_rebuild(_types_namespace=ns)


class TransitionTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(self.engine)
        self.db = Session(self.engine, autoflush=False)
        self.add_room(1)

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    def add_room(self, room_id, start=date(2026, 1, 1), baseline=None):
        self.db.add_all([Room(id=room_id, room_code=f"P{room_id:02d}"),
            Contract(room_id=room_id, start_date=start, move_in_electric_reading=baseline),
            RoomFeeSetting(room_id=room_id)])
        self.db.commit()

    def meter(self, room_id=1, month=9, old=4161, new=4246):
        reading = MeterReading(room_id=room_id, year=2026, month=month,
            old_reading=old, new_reading=new, consumption=new-old)
        self.db.add(reading)
        self.db.commit()
        return reading

    def legacy(self, room_id=1, null_id=False):
        reading = self.meter(room_id)
        invoice = Invoice(room_id=room_id, year=2026, month=9, status="ISSUED", payment_status="PAID",
            electricity_period_year=2026, electricity_period_month=9,
            meter_reading_id=None if null_id else reading.id)
        invoice.items = [InvoiceItem(item_type="ELECTRICITY", description="historical", quantity=85,
            unit="kWh", unit_price=4000, amount=340000)]
        self.db.add(invoice)
        self.db.flush()
        self.db.add(Payment(invoice_id=invoice.id, amount=invoice.total_amount))
        self.db.commit()
        return invoice, reading

    def generate(self, current=None, room=1, month=10):
        return ns["generate_invoice"](ns["InvoiceGenerate"](room_id=room, year=2026, month=month,
            electricity_transition_new_reading=current), None, self.db, None)

    def create_meter(self, new=4350):
        return ns["create_meter_reading"](ns["MeterReadingCreate"](room_id=1, year=2026, month=10,
            old_reading=1, new_reading=new), self.db)

    def test_full_24_then_80_kwh_without_historical_mutation(self):
        historical, old_meter = self.legacy()
        invoice = self.generate(4270)
        self.assertEqual((invoice.electricity_transition_old_reading, invoice.electricity_transition_new_reading), (4246,4270))
        self.assertEqual((invoice.meter_reading_id, invoice.electricity_period_year, invoice.electricity_period_month), (None,None,None))
        electric = next(i for i in invoice.items if i.item_type == "ELECTRICITY")
        self.assertEqual((electric.quantity, electric.unit, electric.unit_price, electric.amount), (24,"kWh",4000,96000))
        self.assertIn("4246", electric.description)
        self.assertEqual(invoice.total_amount, 3246000)
        meter = self.create_meter()
        self.assertEqual((meter.old_reading,meter.new_reading,meter.consumption),(4270,4350,80))
        next_invoice = self.generate(month=11)
        self.assertEqual(next_invoice.meter_reading_id,meter.id)
        self.assertEqual(next(i.quantity for i in next_invoice.items if i.item_type=="ELECTRICITY"),80)
        self.assertEqual((historical.status,historical.payment_status), ("ISSUED","PAID"))
        self.assertEqual((old_meter.old_reading,old_meter.new_reading),(4161,4246))
        self.assertEqual(self.db.scalar(select(func.count(Payment.id))),1)

    def test_invalid_new_reading_rejected_without_invoice(self):
        self.legacy()
        with self.assertRaises(HTTPException): self.generate(4200)
        self.assertEqual(self.db.scalar(select(func.count(Invoice.id))),1)

    def test_no_opt_in_never_charges_claimed_meter(self):
        self.legacy(null_id=True)
        invoice = self.generate()
        self.assertIsNone(invoice.meter_reading_id)
        self.assertIsNone(invoice.electricity_transition_new_reading)
        self.assertFalse(any(i.item_type=="ELECTRICITY" for i in invoice.items))

    def test_unclaimed_meter_regular_and_explicit_transition_rejected(self):
        meter = self.meter()
        with self.assertRaises(HTTPException): self.generate(4270)
        self.db.rollback()
        invoice=self.generate()
        self.assertEqual(invoice.meter_reading_id,meter.id)
        self.assertEqual(next(i.quantity for i in invoice.items if i.item_type=="ELECTRICITY"),85)

    def test_cancelled_transition_not_baseline_and_replacement_preserves(self):
        self.legacy()
        invoice=self.generate(4270)
        invoice.status="ISSUED"
        self.db.commit()
        ns["cancel_invoice"](invoice.id,SimpleNamespace(reason="test cancel"),None,self.db,None)
        self.assertEqual(ns["get_transition_baselines"](self.db,2026,10),{})
        replacement=ns["create_replacement_invoice"](invoice.id,None,self.db,None)
        self.assertEqual((replacement.electricity_transition_old_reading,replacement.electricity_transition_new_reading),(4246,4270))
        self.assertEqual(replacement.items[1].amount,invoice.items[1].amount)
        self.assertEqual(ns["get_transition_baselines"](self.db,2026,10),{1:4270})
        self.assertEqual(self.create_meter().old_reading,4270)

    def test_cancelled_transition_falls_back_to_previous_meter(self):
        self.legacy(); invoice=self.generate(4270)
        invoice.status="CANCELLED";self.db.commit()
        self.assertEqual(self.create_meter().old_reading,4246)

    def test_move_in_has_priority_over_old_tenant_transition(self):
        self.legacy();self.generate(4270)
        self.db.add(Contract(room_id=1,start_date=date(2026,10,5),move_in_electric_reading=4300))
        self.db.commit()
        self.assertEqual(self.create_meter().old_reading,4300)

    def test_transition_does_not_claim_next_meter(self):
        self.legacy();self.generate(4270)
        meter=self.create_meter()
        self.assertFalse(ns["_meter_has_active_invoice"](self.db,meter.id,1,2026,10))
        self.assertTrue(ns["_meter_has_active_invoice"](self.db,None,1,2026,9))

    def test_bulk_regular_transition_new_tenant(self):
        self.legacy()
        self.add_room(2); regular=self.meter(2)
        self.add_room(3,start=date(2026,9,15),baseline=4161);new_tenant=self.meter(3)
        preview=ns["preview_transitions"](2026,10,self.db)
        self.assertEqual([r["room_id"] for r in preview["candidates"]],[1])
        data=ns["InvoiceBulkGenerate"](year=2026,month=10,transition_readings=[dict(room_id=1,current_reading=4270)])
        result=ns["generate_bulk_invoices"](data,None,self.db,None)
        self.assertEqual((result.created_count,result.skipped_count),(3,0))
        invoices={i.room_id:i for i in self.db.scalars(select(Invoice).where(Invoice.month==10)).all()}
        self.assertEqual(invoices[1].electricity_transition_new_reading,4270)
        self.assertEqual(invoices[2].meter_reading_id,regular.id)
        self.assertEqual(invoices[3].meter_reading_id,new_tenant.id)
        meters=ns["create_bulk_meter_readings"](ns["MeterReadingBulkCreate"](year=2026,month=10,
            readings=[dict(room_id=r,new_reading=4350) for r in (1,2,3)]),self.db)
        self.assertEqual([(m.old_reading,m.consumption) for m in meters],[(4270,80),(4246,104),(4246,104)])

    def test_missing_source_and_recorded_later_meter_rejected(self):
        with self.assertRaises(HTTPException): self.generate(4270)
        self.legacy();self.meter(month=10,old=4246,new=4350)
        with self.assertRaises(HTTPException): self.generate(4270)

    def test_repeated_transition_and_removal_after_meter_rejected(self):
        self.legacy();invoice=self.generate(4270);self.create_meter()
        with self.assertRaises(HTTPException): ns["_guard_transition_removal"](self.db,invoice)
        with self.assertRaises(HTTPException): self.generate(4400,month=11)

    def test_dependency_blocks_cancel_and_delete(self):
        self.legacy(); invoice = self.generate(4270); self.create_meter()
        self.assertTrue(ns["_meter_depends_on_transition"](self.db, invoice))
        with self.assertRaises(HTTPException) as cm:
            ns["delete_draft_invoice"](invoice.id, None, self.db, None)
        self.assertEqual(cm.exception.status_code, 409)
        invoice.status = "ISSUED"; self.db.commit()
        with self.assertRaises(HTTPException) as cm:
            ns["cancel_invoice"](invoice.id, SimpleNamespace(reason="test cancel"), None, self.db, None)
        self.assertEqual(cm.exception.status_code, 409)
        self.assertEqual(invoice.status, "ISSUED")

    def test_move_in_allows_cancel_replacement_and_delete(self):
        self.legacy(); invoice = self.generate(4270)
        self.db.add(Contract(room_id=1, start_date=date(2026,10,5), move_in_electric_reading=5000))
        self.db.commit()
        meter = self.create_meter(5080)
        self.assertEqual(meter.old_reading, 5000)
        self.assertFalse(ns["_meter_depends_on_transition"](self.db, invoice))
        invoice.status = "ISSUED"; self.db.commit()
        ns["cancel_invoice"](invoice.id, SimpleNamespace(reason="test cancel"), None, self.db, None)
        replacement = ns["create_replacement_invoice"](invoice.id, None, self.db, None)
        replacement_id = replacement.id
        self.assertEqual(replacement.electricity_transition_new_reading, 4270)
        ns["delete_draft_invoice"](replacement_id, None, self.db, None)
        self.assertIsNone(self.db.get(Invoice, replacement_id))
        self.assertEqual((meter.old_reading, meter.new_reading, meter.consumption), (5000,5080,80))

    def test_coincident_move_in_is_not_transition_dependency(self):
        self.legacy(); invoice = self.generate(4270)
        self.db.add(Contract(room_id=1, start_date=date(2026,10,5), move_in_electric_reading=4270))
        self.db.commit(); self.create_meter()
        self.assertFalse(ns["_meter_depends_on_transition"](self.db, invoice))
        ns["_guard_transition_removal"](self.db, invoice)

    def test_active_replacement_owns_dependency_and_previous_chain(self):
        self.legacy(); original = self.generate(4270)
        original.status = "CANCELLED"; self.db.commit()
        replacement = ns["create_replacement_invoice"](original.id, None, self.db, None)
        self.create_meter()
        self.meter(month=11, old=4350, new=4400)
        self.assertFalse(ns["_meter_depends_on_transition"](self.db, original))
        self.assertTrue(ns["_meter_depends_on_transition"](self.db, replacement))
        with self.assertRaises(HTTPException): ns["_guard_transition_removal"](self.db, replacement)

    def test_no_dependency_allows_and_later_equality_is_not_a_source(self):
        self.legacy(); invoice = self.generate(4270)
        ns["_guard_transition_removal"](self.db, invoice)
        # Month 11 only consults transition 11 / previous meter, never invoice 10.
        self.meter(month=11, old=4270, new=4350)
        self.assertFalse(ns["_meter_depends_on_transition"](self.db, invoice))
        ns["delete_draft_invoice"](invoice.id, None, self.db, None)

    def test_previous_meter_same_baseline_remains_valid_without_transition(self):
        self.legacy(); invoice = self.generate(4246); self.create_meter()
        self.assertFalse(ns["_meter_depends_on_transition"](self.db, invoice))
        ns["_guard_transition_removal"](self.db, invoice)

    def test_replacement_rejects_changing_previous_meter_baseline(self):
        self.legacy(); original = self.generate(4270)
        original.status = "CANCELLED"; self.db.commit()
        meter = self.create_meter()
        self.assertEqual(meter.old_reading, 4246)
        with self.assertRaises(HTTPException) as cm:
            ns["create_replacement_invoice"](original.id, None, self.db, None)
        self.assertEqual(cm.exception.status_code, 409)

    def test_snapshot_item_cannot_be_edited_or_deleted(self):
        self.legacy();invoice=self.generate(4270)
        electric=next(i for i in invoice.items if i.item_type=="ELECTRICITY")
        with self.assertRaises(HTTPException): ns["update_invoice_item"](invoice.id,electric.id,SimpleNamespace(),None,self.db,None)
        with self.assertRaises(HTTPException): ns["delete_invoice_item"](invoice.id,electric.id,None,self.db,None)
        self.assertEqual(electric.quantity,24)

    def test_schema_rejects_fraction_boolean_negative_and_overflow(self):
        for value in (1.2,True,-1,2147483648):
            with self.assertRaises(ValidationError): ns["InvoiceGenerate"](room_id=1,year=2026,month=10,electricity_transition_new_reading=value)

    def test_bulk_invalid_transition_skips_only_selected_room(self):
        self.legacy();self.add_room(2);self.meter(2)
        data=ns["InvoiceBulkGenerate"](year=2026,month=10,transition_readings=[dict(room_id=1,current_reading=4200)])
        result=ns["generate_bulk_invoices"](data,None,self.db,None)
        self.assertEqual((result.created_count,result.skipped_count),(1,1))
        self.assertEqual(self.db.scalar(select(Invoice.room_id).where(Invoice.month==10)),2)

    def test_zero_transition_and_null_legacy_source(self):
        self.legacy(null_id=True)
        invoice=self.generate(4246)
        self.assertEqual(next(i.quantity for i in invoice.items if i.item_type=="ELECTRICITY"),0)
        self.assertEqual(self.create_meter().old_reading,4246)


    def test_transition_constraints_from_model(self):
        # Execute the actual model check expressions without importing app/database.
        tree = ast.parse((ROOT / "backend/app/models/invoice.py").read_text(encoding="utf-8"))
        checks = []
        for node in ast.walk(tree):
            if isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id == "CheckConstraint":
                name = next((ast.literal_eval(k.value) for k in node.keywords if k.arg == "name"), "")
                if name.startswith("ck_invoice_transition_"):
                    checks.append(ast.literal_eval(node.args[0]))
        self.assertEqual(len(checks), 2)
        import sqlite3
        with sqlite3.connect(":memory:") as connection:
            connection.execute("CREATE TABLE snapshots (electricity_transition_old_reading INTEGER, electricity_transition_new_reading INTEGER, meter_reading_id INTEGER, electricity_period_year INTEGER, electricity_period_month INTEGER, " + ",".join("CHECK ("+c+")" for c in checks) + ")")
            for values in [(None,None,None,None,None),(4246,4270,None,None,None),(0,0,None,None,None)]:
                connection.execute("INSERT INTO snapshots VALUES (?,?,?,?,?)", values)
            for values in [(None,1,None,None,None),(1,None,None,None,None),(-1,1,None,None,None),(4,3,None,None,None),(1,2,9,None,None),(1,2,None,2026,9)]:
                with self.assertRaises(sqlite3.IntegrityError): connection.execute("INSERT INTO snapshots VALUES (?,?,?,?,?)", values)

    def test_frontend_export_bulk_opt_in_and_baseline_priority(self):
        js = r"""
const fs=require('fs'),ts=require('typescript'),assert=require('assert/strict');
function parse(path) { const text=fs.readFileSync(path,'utf8');return ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX); }
function find(root, predicate) { let result;function walk(n){ if(predicate(n))result=n;ts.forEachChild(n,walk); }walk(root);assert(result);return result; }
function js(node, file) {return ts.transpile(node.getText(file),{target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.React}).replace(/^\s*"use strict";\s*/, '').trim().replace(/;$/, '');}
const file=parse('src/pages/Invoices.tsx');
const helper=find(file,n=>ts.isVariableDeclaration(n)&&n.name.getText(file)==='getElectricityReadingsForInvoice');
const meter={id:9,room_id:1,year:2026,month:9,old_reading:4161,new_reading:4246,consumption:85};
const readings=new Function('meterMap','return ('+js(helper.initializer,file)+')')(new Map([[9,meter]]));
const regular={room_id:1,meter_reading_id:9,electricity_period_year:2026,electricity_period_month:9};
assert.equal(readings(regular),meter);
assert.equal(readings({...regular,electricity_period_month:10}),undefined);
assert.deepEqual(readings({...regular,meter_reading_id:null,electricity_period_year:null,electricity_period_month:null,electricity_transition_old_reading:4246,electricity_transition_new_reading:4270}),{old_reading:4246,new_reading:4270,consumption:24});
const meterFile=parse('src/pages/MeterReadings.tsx');
const baseline=find(meterFile,n=>ts.isVariableDeclaration(n)&&n.name.getText(meterFile)==='previousReadingMap');
const callback=js(baseline.initializer.arguments[0],meterFile);
const map=new Function('previousReadings','transitionBaselines','contracts','year','month','return ('+callback+')()');
assert.equal(map([{room_id:1,new_reading:4246}],[{room_id:1,new_reading:4270}],[],2026,10).get(1).new_reading,4270);
assert.equal(map([{room_id:1,new_reading:4246}],[{room_id:1,new_reading:4270}],[{id:1,room_id:1,start_date:'2026-10-05',move_in_electric_reading:4300}],2026,10).get(1).new_reading,4300);
const submit=find(file,n=>ts.isFunctionDeclaration(n)&&n.name?.text==='submitGenerateBulk');
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
let posted, error;
const keys=['transitionPreview','transitionSelected','transitionInputs','setTransitionError','setGenerating','setError','setSuccess','setBulkResult','setTransitionDialog','apiPost','loadInvoices','year','month','handleGenerateBulk','transitionDialog','generating'];
const run=new AsyncFunction(...keys,js(submit,file)+'; await submitGenerateBulk();');
(async()=>{
 for(const [selected,input,expected] of [[false,'4270',[]],[true,'4270',[{room_id:1,current_reading:4270}]],[true,'',null],[true,'4200',null],[true,'4270.5',null]]) {
  posted=undefined;error='';
  await run({candidates:[{room_id:1,room_code:'P01',old_reading:4246,electricity_rate:4000}],warnings:[]},{1:selected},{1:input},v=>error=v,()=>{},()=>{},()=>{},()=>{},()=>{},async(path,data)=>{posted=data;return {created_count:1}},async()=>{},2026,10,async()=>{},true,false);
  if(expected===null){assert.equal(posted,undefined);assert(error);}else{assert.deepEqual(posted,{year:2026,month:10,transition_readings:expected});}
 }
 console.log('PASS: frontend Excel snapshot, baseline priority, bulk explicit opt-in/input validation');
})().catch(e=>{console.error(e);process.exitCode=1});
"""
        result=subprocess.run(["node","-"],input=js,text=True,capture_output=True,cwd=ROOT/"frontend")
        self.assertEqual(result.returncode,0,result.stdout+result.stderr)
        print(result.stdout.strip())


    def test_bulk_partial_retry_state_reopen_and_http_failure(self):
        js = r"""
const fs=require('fs'),ts=require('typescript'),assert=require('assert/strict');
const text=fs.readFileSync('src/pages/Invoices.tsx','utf8');
const file=ts.createSourceFile('Invoices.tsx',text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const names=new Set(['handleGenerateBulk','submitGenerateBulk']),functions=[];
function walk(n){if(ts.isFunctionDeclaration(n)&&names.has(n.name?.text))functions.push(n.getText(file));ts.forEachChild(n,walk);}walk(file);
assert.equal(functions.length,2);
const code=ts.transpile(functions.join('\n'),{target:ts.ScriptTarget.ES2022});
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
new AsyncFunction('assert',`
let transitionInputs={1:'4800',2:'4270',3:'3550'},transitionSelected={1:true,2:true,3:true};
let candidates=[1,2,3].map(room_id=>({room_id,room_code:'P0'+room_id,old_reading:3000,electricity_rate:4000}));
let transitionPreview={candidates,warnings:[]},transitionError='',open=true,result;
let transitionDialog=true,generating=false;
const transitionRequest={current:0},year=2026,month=10;
let failPost=false,failPreview=false,previewCandidates=candidates.slice(1);
const setTransitionInputs=v=>{transitionInputs=typeof v==='function'?v(transitionInputs):v;};
const setTransitionSelected=v=>{transitionSelected=typeof v==='function'?v(transitionSelected):v;};
const setTransitionPreview=v=>{transitionPreview=v;};
const setTransitionDialog=v=>{open=v;};
const setTransitionError=v=>{transitionError=v;};
const setGenerating=()=>{},setError=()=>{},setSuccess=()=>{},loadInvoices=async()=>{};
const setBulkResult=v=>{result=v;};
const console={error:()=>{}};
const apiGet=async()=>{if(failPreview)throw Error('preview offline');return {candidates:previewCandidates,warnings:[]};};
const apiPost=async()=>{if(failPost)throw Error('post offline');return {created_count:1,skipped_count:2,created_invoice_ids:[101],skipped_rooms:['P02','P03']};};
`+code+`
await submitGenerateBulk();
assert.equal(result.created_count,1);assert.equal(open,true);
assert.deepEqual(transitionInputs,{2:'4270',3:'3550'});
assert.deepEqual(transitionSelected,{2:true,3:true});
open=false;await handleGenerateBulk();
assert.equal(open,true);
assert.deepEqual(transitionInputs,{2:'4270',3:'3550'});
assert.deepEqual(transitionSelected,{2:true,3:true});
assert.equal(transitionInputs[1],undefined);assert.equal(transitionSelected[1],undefined);
failPost=true;await submitGenerateBulk();
assert.deepEqual(transitionInputs,{2:'4270',3:'3550'});
assert.deepEqual(transitionSelected,{2:true,3:true});
assert.equal(transitionError,'post offline');
failPreview=true;await handleGenerateBulk();
assert.equal(transitionPreview,null);
assert.deepEqual(transitionInputs,{2:'4270',3:'3550'});
assert.deepEqual(transitionSelected,{2:true,3:true});
failPreview=false;await handleGenerateBulk();
assert.deepEqual(transitionInputs,{2:'4270',3:'3550'});
// A removed candidate is pruned; a later reappearing room has no stale state.
previewCandidates=candidates.filter(r=>r.room_id===3);await handleGenerateBulk();
assert.deepEqual(transitionInputs,{3:'3550'});
previewCandidates=candidates;await handleGenerateBulk();
assert.equal(transitionInputs[1],undefined);assert.equal(transitionInputs[2],undefined);
assert.equal(transitionSelected[1],undefined);assert.equal(transitionSelected[2],undefined);
`)(assert).then(()=>{process.stdout.write('PASS: partial success, reopen, pruning and HTTP failure preserve correct room state\n');}).catch(e=>{console.error(e);process.exitCode=1;});
"""
        result=subprocess.run(["node","-"],input=js,text=True,capture_output=True,cwd=ROOT/"frontend")
        self.assertEqual(result.returncode,0,result.stdout+result.stderr)
        print(result.stdout.strip())


if __name__ == "__main__":
    unittest.main()
