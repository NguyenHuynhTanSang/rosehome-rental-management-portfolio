"""Offline execution of the real wizard handlers; API requests are stubs, never fetch."""
from pathlib import Path
import subprocess


def test_checkout_wizard_requires_final_confirmation():
    root = Path(__file__).resolve().parents[2]
    script = r"""
const fs=require('fs'), ts=require('typescript'), assert=require('node:assert/strict');
let slots=[], cursor=0, effects=[], tree, props, saved=[], calls=[];
let previewResolve, prepareResolve;
const context={invoice_id:null,invoice_status:null,invoice_version:null,total_paid:0,
 suggested_checkout_type:'EARLY',
 monthly_rent:5000000,rent_cycle:3,rent_anchor_year:2026,rent_anchor_month:8,
 electricity_rate:4000,water_fee:150000,management_fee:250000,rent_history:[],
 deposit:{required_amount:5000000,total_collected:5000000,total_refunded:0,total_deducted:0,total_forfeited:0,current_balance:5000000}};
const snapshot={contract_id:1,source_invoice_id:null,baseline_invoice_id:1,checkout_date:'2026-10-10',
 checkout_type:'EARLY',deposit_balance_at_prepare:5000000,deposit_forfeit_amount:5000000,
 deposit_offset_amount:0,deposit_refund_amount:0,tenant_due_after_deposit:234000,
 deposit_execution_status:'PENDING',deposit_forfeit_transaction_id:null,
 deposit_deduction_transaction_id:null,deposit_refund_transaction_id:null,
 deposit_payment_id:null,deposit_processed_at:null,
 move_out_electric_reading:5820,electricity_old_reading:5799,electricity_new_reading:5820,electricity_consumption:21,
 electricity_rate:4000,electricity_amount:84000,carried_electricity_amount:0,electricity_enabled:true,
 rent_mode:'NONE',rent_amount:0,rent_period_start:null,rent_period_end:null,water_amount:150000,management_amount:0,
 other_amount:0,total_amount:234000,reason:'Explicit admin reason'};
const api={
 apiGet:async path=>{calls.push(['GET',path]);return context;},
 apiPost:async (path,body)=>{
   calls.push(['POST',path,body]);
   if(path.endsWith('/checkout-preview')) return new Promise(resolve=>{previewResolve=()=>resolve({snapshot,preview_token:'a'.repeat(64),action:'CREATE',previous_items:[]});});
   if(path.endsWith('/checkout-prepare')) return new Promise(resolve=>{prepareResolve=()=>resolve({...snapshot,id:1,invoice_id:2,status:'PREPARED'});});
   throw Error('Unexpected endpoint '+path);
 }
};
const react={
 useState:init=>{const i=cursor++;if(!(i in slots))slots[i]=typeof init==='function'?init():init;return [slots[i],value=>{slots[i]=typeof value==='function'?value(slots[i]):value;}];},
 useRef:init=>{const i=cursor++;if(!(i in slots))slots[i]={current:init};return slots[i];},
 useEffect:(fn,deps)=>{const i=cursor++,old=slots[i];if(!old||deps.some((d,j)=>d!==old.deps[j])){
   if(old?.cleanup)old.cleanup();slots[i]={deps};effects.push(()=>{slots[i].cleanup=fn();});
 }}
};
const jsx=(type,props,key)=>({type,props:props||{},key});
const mockRequire=name=>{
 if(name==='react')return react;
 if(name==='react/jsx-runtime')return {jsx,jsxs:jsx,Fragment:'fragment'};
 if(name==='../api/api')return api;
 if(name==='react-router')return {Link:'Link'};
 if(name.includes('/button'))return {Button:'Button'};
 if(name.includes('/dialog'))return Object.fromEntries(['Dialog','DialogContent','DialogDescription','DialogHeader','DialogTitle'].map(k=>[k,k]));
 throw Error('Unexpected import '+name);
};
const source=fs.readFileSync('src/components/CheckoutSettlementAction.tsx','utf8').replace('function CheckoutWizard(', 'export function CheckoutWizard(');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
const mod={exports:{}};new Function('require','module','exports',js)(mockRequire,mod,mod.exports);
const text=n=>n==null?'':typeof n==='string'||typeof n==='number'?String(n):Array.isArray(n)?n.map(text).join(''):text(n.props?.children);
function nodes(n,out=[]){if(!n)return out;if(Array.isArray(n)){n.forEach(x=>nodes(x,out));return out;}if(typeof n==='object'){out.push(n);nodes(n.props?.children,out);}return out;}
function render(){cursor=0;tree=mod.exports.CheckoutWizard(props);const pending=effects;effects=[];pending.forEach(fn=>fn());}
const flush=async()=>{await new Promise(resolve=>setImmediate(resolve));render();};
const button=label=>nodes(tree).find(n=>n.type==='Button'&&text(n)===label);
async function run(){
 props={contract:{id:1,room_id:1,status:'ACTIVE',start_date:'2026-08-01',monthly_rent:5000000,move_in_electric_reading:5700},
  roomCode:'P403',tenantName:'Test',saved:null,onSaved:value=>saved.push(value),onClose:()=>{}};
 render();await flush();
 assert.equal(calls.filter(c=>c[0]==='GET').length,1,'valid local date loads context');
 let reading=nodes(tree).find(n=>n.type==='input'&&n.props.type==='number');
 reading.props.onChange({target:{value:'5820'}});render();

 let checkoutRadios=nodes(tree).filter(
   n=>n.type==='input'&&n.props.type==='radio'&&n.props.name==='checkout-type'
 );
 assert.equal(checkoutRadios.length,2,'checkout type choices shown');
 assert.equal(checkoutRadios.filter(n=>n.props.checked).length,0,'checkout type requires explicit admin confirmation');

 checkoutRadios[0].props.onChange();render();

 await button('Tiếp tục').props.onClick();render();

 let rentRadios=nodes(tree).filter(
   n=>n.type==='input'&&n.props.type==='radio'&&n.props.name!=='checkout-type'
 );
 assert.ok(rentRadios.length>0,'rent choices shown');
 assert.equal(rentRadios.filter(n=>n.props.checked).length,0,'no rent auto-default');

 rentRadios[0].props.onChange();render();

 await button('Tiếp tục').props.onClick();render();

 const textarea=nodes(tree).find(n=>n.type==='textarea');
 assert.equal(textarea.props.maxLength,500);
 assert.ok(text(tree).includes('Tối đa 500 ký tự.'));
 textarea.props.onChange({target:{value:'x'.repeat(501)}});render();
 await button('Xem preview').props.onClick();render();
 assert.equal(calls.filter(c=>c[0]==='POST').length,0,'overlong reason rejected before preview request');
 nodes(tree).find(n=>n.type==='textarea').props.onChange({target:{value:'Explicit admin reason'}});render();
 const pendingPreview=button('Xem preview').props.onClick();
 assert.equal(calls.filter(c=>c[0]==='POST').length,1);
 assert.ok(calls.at(-1)[1].endsWith('/checkout-preview'));
 previewResolve();await pendingPreview;render();
 await button('Tiếp tục').props.onClick();render();
 let confirm=button('Xác nhận chuẩn bị quyết toán');
 assert.equal(confirm.props.disabled,true);
 await confirm.props.onClick();
 assert.equal(calls.filter(c=>c[1].endsWith('/checkout-prepare')).length,0);
 nodes(tree).find(n=>n.type==='input'&&n.props.type==='checkbox').props.onChange({target:{checked:true}});render();
 confirm=button('Xác nhận chuẩn bị quyết toán');
 const pendingPrepare=confirm.props.onClick();
 await confirm.props.onClick(); // rapid second click is blocked synchronously by useRef
 assert.equal(calls.filter(c=>c[1].endsWith('/checkout-prepare')).length,1);
 assert.equal(calls.at(-1)[2].confirmed,true);
 prepareResolve();await pendingPrepare;
 assert.equal(saved.length,1);
 assert.ok(calls.every(c=>c[1].includes('/checkout-')),'no invoice issue/payment/deposit/end calls');
 console.log('Wizard: preview-only until confirmation; duplicate click blocked; no financial side effects.');
}
run().catch(e=>{console.error(e);process.exitCode=1;});
"""
    result = subprocess.run(["node", "-"], input=script, text=True, encoding="utf-8",
                            capture_output=True, cwd=root / "frontend", timeout=30)
    assert result.returncode == 0, result.stdout + result.stderr



def test_checkout_finalization_ui_uses_frozen_snapshot():
    from pathlib import Path as _Path

    root = _Path(__file__).resolve().parents[2]

    checkout_source = (
        root
        / "frontend"
        / "src"
        / "components"
        / "CheckoutSettlementAction.tsx"
    ).read_text(encoding="utf-8")

    details_source = (
        root
        / "frontend"
        / "src"
        / "pages"
        / "ContractDetails.tsx"
    ).read_text(encoding="utf-8")

    assert (
        "end_date:\n"
        "          saved.checkout_date"
        in checkout_source
    )

    assert (
        "move_out_electric_reading:\n"
        "          saved.move_out_electric_reading"
        in checkout_source
    )

    assert (
        "allow_unsettled_deposit:\n"
        "          false"
        in checkout_source
    )

    assert (
        "`/contracts/${contract.id}/end`"
        in checkout_source
    )

    assert (
        'latestInvoice.status\n'
        '          !== "ISSUED"'
        in checkout_source
    )

    assert (
        'latestInvoice.payment_status\n'
        '          !== "PAID"'
        in checkout_source
    )

    assert (
        "Hoàn tất trả phòng"
        in checkout_source
    )

    assert (
        "onSettlementPresenceChange?.(\n"
        "            value !== null"
        in checkout_source
    )

    assert (
        details_source.count(
            "isActive && "
            "hasPreparedCheckout === false"
        )
        == 2
    )

    assert (
        "onEnded={\n"
        "          handleContractEnded"
        in details_source
    )
