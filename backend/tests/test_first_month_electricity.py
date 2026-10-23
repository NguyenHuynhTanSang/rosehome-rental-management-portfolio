"""First-month billing and contract baseline repair; isolated SQLite, no app/.env."""
import ast
from datetime import date
from types import SimpleNamespace
import unittest
import subprocess
from pydantic import BaseModel, Field, ValidationError
from sqlalchemy import select, func
from fastapi import HTTPException
import test_electricity_transition as fixtures

ns = fixtures.ns
Contract, Invoice, MeterReading = fixtures.Contract, fixtures.Invoice, fixtures.MeterReading
ROOT = fixtures.ROOT


class FirstMonthElectricityTests(unittest.TestCase):
    setUp = fixtures.TransitionTests.setUp
    tearDown = fixtures.TransitionTests.tearDown
    add_room = fixtures.TransitionTests.add_room
    meter = fixtures.TransitionTests.meter
    generate = fixtures.TransitionTests.generate

    def setup_p103(self, baseline=10931):
        contract = self.db.scalar(select(Contract).where(Contract.room_id == 1))
        contract.start_date = date(2026,9,1)
        contract.move_in_electric_reading = baseline
        self.db.get(fixtures.Room,1).room_code = 'P103'
        self.db.commit()
        return contract, self.meter(old=10931,new=11025)

    def test_p103_94_kwh_regular_source_and_amount(self):
        contract,meter = self.setup_p103()
        invoice = self.generate()
        self.assertEqual((invoice.electricity_period_year,invoice.electricity_period_month,invoice.meter_reading_id),(2026,9,meter.id))
        electricity = next(i for i in invoice.items if i.item_type == 'ELECTRICITY')
        self.assertEqual((electricity.quantity,electricity.unit_price,electricity.amount),(94,4000,376000))
        self.assertIsNone(invoice.electricity_transition_new_reading)
        self.assertEqual(ns['preview_transitions'](2026,10,self.db)['candidates'],[])

    def test_missing_and_mismatch_single_block_bulk_skip_other_room_succeeds(self):
        for baseline, reason in [(None,'Thi\u1ebfu'),(10900,'kh\u00f4ng kh\u1edbp')]:
            with self.subTest(baseline=baseline):
                contract,meter = self.setup_p103(baseline)
                with self.assertRaises(HTTPException) as cm: self.generate()
                self.assertEqual(cm.exception.status_code,400)
                self.assertIn(reason,cm.exception.detail)
                self.assertIn('09/2026',cm.exception.detail)
                self.assertEqual(self.db.scalar(select(func.count(Invoice.id)).where(Invoice.room_id==1)),0)
                if baseline is None:
                    self.add_room(2);self.meter(room_id=2)
                result=ns['generate_bulk_invoices'](ns['InvoiceBulkGenerate'](year=2026,month=10),None,self.db,None)
                self.assertTrue(any('P103:' in message and reason in message for message in result.skipped_rooms))
                self.assertEqual(self.db.scalar(select(func.count(Invoice.id)).where(Invoice.room_id==1)),0)
                self.assertEqual(self.db.scalar(select(func.count(Invoice.id)).where(Invoice.room_id==2)),1)
                self.db.delete(meter);self.db.commit()

    def test_old_tenant_and_october_start(self):
        meter=self.meter()
        invoice=self.generate()
        self.assertEqual(invoice.meter_reading_id,meter.id)
        self.add_room(2,start=date(2026,10,1),baseline=4500)
        self.meter(room_id=2)
        second=self.generate(room=2)
        self.assertFalse(any(i.item_type=='ELECTRICITY' for i in second.items))

    def test_january_rollover_actual_generation(self):
        meter=self.meter(month=12)
        invoice=ns['generate_invoice'](ns['InvoiceGenerate'](room_id=1,year=2027,month=1),None,self.db,None)
        self.assertEqual((invoice.electricity_period_year,invoice.electricity_period_month,invoice.meter_reading_id),(2026,12,meter.id))

    def test_matching_first_month_already_claimed_is_not_double_billed(self):
        contract,meter=self.setup_p103()
        claimed=Invoice(room_id=1,year=2026,month=9,status='ISSUED',meter_reading_id=meter.id,
            electricity_period_year=2026,electricity_period_month=9)
        claimed.items=[fixtures.InvoiceItem(item_type='ELECTRICITY',quantity=94,amount=376000)]
        self.db.add(claimed);self.db.commit()
        invoice=self.generate()
        self.assertIsNone(invoice.meter_reading_id)
        self.assertFalse(any(i.item_type=='ELECTRICITY' for i in invoice.items))

    def test_contract_patch_baseline_validation_audit_and_no_meter_mutation(self):
        schema_tree=ast.parse((ROOT/'backend/app/schemas/contract.py').read_text(encoding='utf-8'))
        schema_node=next(n for n in schema_tree.body if isinstance(n,ast.ClassDef) and n.name=='ContractUpdate')
        scope=dict(ns,BaseModel=BaseModel,Field=Field,date=date)
        exec(compile(ast.Module(body=[schema_node],type_ignores=[]),'contract_schema','exec'),scope)
        schema=scope['ContractUpdate']
        for value in [-1,1.5,True,2147483648]:
            with self.assertRaises(ValidationError): schema(move_in_electric_reading=value)
        tree=ast.parse((ROOT/'backend/app/api/contracts.py').read_text(encoding='utf-8'))
        node=next(n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name=='update_contract');node.decorator_list=[]
        tenant_type=object();logs=[]
        scope.update(Tenant=tenant_type,record_audit_log=lambda **kw:logs.append(kw))
        exec(compile(ast.Module(body=[node],type_ignores=[]),'contracts_api','exec',flags=__import__('__future__').annotations.compiler_flag),scope)
        contract,meter=self.setup_p103(None)
        contract.tenant_id=1;contract.status='ACTIVE';contract.deposit_required=0;contract.occupant_count=1
        contract.move_out_electric_reading=11025
        real_get=self.db.get
        self.db.get=lambda model,key:SimpleNamespace(id=1) if model is tenant_type else real_get(model,key)
        for value in [None,11026]:
            with self.assertRaises(HTTPException) as cm:
                scope['update_contract'](contract.id,schema(move_in_electric_reading=value),None,self.db,None)
            self.assertEqual(cm.exception.status_code,400)
        updated=scope['update_contract'](contract.id,schema(move_in_electric_reading=10931),None,self.db,None)
        self.assertEqual(updated.move_in_electric_reading,10931)
        self.assertIsNone(logs[-1]['details']['before']['move_in_electric_reading'])
        self.assertEqual(logs[-1]['details']['after']['move_in_electric_reading'],10931)
        self.assertEqual((meter.old_reading,meter.new_reading),(10931,11025))
        self.assertEqual(self.generate().meter_reading_id,meter.id)

    def test_edit_contract_payload_validation_offline(self):
        js=r"""
const fs=require('fs'),ts=require('typescript'),assert=require('assert/strict');
const text=fs.readFileSync('src/components/EditContractModal.tsx','utf8');
const file=ts.createSourceFile('EditContractModal.tsx',text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
let handler;function walk(n){if(ts.isFunctionDeclaration(n)&&n.name?.text==='handleSubmit')handler=n;ts.forEachChild(n,walk);}walk(file);assert(handler);
const code=ts.transpile(handler.getText(file),{target:ts.ScriptTarget.ES2022});
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
new AsyncFunction('assert',`
const contractId=1,roomId='1',tenantId='1',startDate='2026-09-01',endDate='',monthlyRent='3000000',depositRequired='0',occupantCount='1';
let moveInElectricReading='',payload,error;
const setError=v=>error=v,setSubmitting=()=>{},onUpdated=()=>{},onClose=()=>{};
const apiPatch=async(path,data)=>{payload=data;return data;};
`+code+`
for(const value of ['10931','0','','-1','1.5']){
 moveInElectricReading=value;payload=undefined;error='';
 await handleSubmit({preventDefault(){}});
 if(['-1','1.5'].includes(value)){assert.equal(payload,undefined);assert(error);}
 else if(value===''){assert(!('move_in_electric_reading' in payload));}
 else assert.equal(payload.move_in_electric_reading,Number(value));
}
`)(assert).catch(e=>{console.error(e);process.exitCode=1;});
"""
        result=subprocess.run(['node','-'],input=js,text=True,capture_output=True,cwd=ROOT/'frontend')
        self.assertEqual(result.returncode,0,result.stdout+result.stderr)
