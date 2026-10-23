"""Offline JSX/handler regression. All HTTP calls are in-memory stubs."""
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[2]


class InvoicePreparationUITests(unittest.TestCase):
    def test_all_create_buttons_require_preparation_and_explicit_confirmation(self):
        script = r"""
const fs=require('fs'),ts=require('typescript'),assert=require('assert/strict');
const text=fs.readFileSync('src/pages/Invoices.tsx','utf8');
const file=ts.createSourceFile('Invoices.tsx',text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const handlers=[],buttons=[];let dialog;
function attr(n,name){return n.attributes.properties.find(p=>p.name?.getText(file)===name);}
function walk(n){
 if(ts.isFunctionDeclaration(n)&&['handleGenerateBulk','submitGenerateBulk'].includes(n.name?.text))handlers.push(n.getText(file));
 if(ts.isJsxElement(n)){
  const opening=n.openingElement;
  if(opening.tagName.getText(file)==='Dialog' && attr(opening,'open')?.initializer?.getText(file)==='{transitionDialog}')dialog=n;
  if(opening.tagName.getText(file)==='Button' && attr(opening,'onClick')?.initializer?.expression?.getText(file)==='handleGenerateBulk')buttons.push(n);
 }
 ts.forEachChild(n,walk);
}walk(file);
// Four desktop/mobile entry points plus the dialog retry button.
assert.equal(buttons.length,5);assert(dialog);assert.equal(handlers.length,2);
const entryButtons=buttons.filter(n=>n.pos<dialog.pos);
assert.equal(entryButtons.length,4);
const confirmation=[];
function check(n){if(ts.isJsxElement(n)&&attr(n.openingElement,'onClick')?.initializer?.expression?.getText(file)==='submitGenerateBulk')confirmation.push(n);ts.forEachChild(n,check);}check(file);
assert.equal(confirmation.length,1);assert(confirmation[0].pos>dialog.pos&&confirmation[0].end<dialog.end);
const source=handlers.join('\n')+'\nconst renderDialog=()=>('+dialog.getText(file)+');\nconst renderButtons=()=>['+entryButtons.map(n=>n.getText(file)).join(',')+'];';
const code=ts.transpile(source,{target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.React,jsxFactory:'h'});
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
new AsyncFunction('assert',`
let transitionDialog=false,transitionPreview=null,transitionInputs={},transitionSelected={},transitionError='',generating=false;
const transitionRequest={current:0},year=2026,month=10,loading=false;
const requests=[],posts=[];
const candidates=[{room_id:1,room_code:'P01',old_reading:4246,electricity_rate:4000}];
const apiGet=async path=>{requests.push(path);return {candidates,warnings:[]};};
const apiPost=async(path,payload)=>{posts.push({path,payload});return {created_count:0,skipped_count:1,created_invoice_ids:[],skipped_rooms:['P01']};};
const setTransitionDialog=v=>transitionDialog=v;
const setTransitionPreview=v=>transitionPreview=v;
const setTransitionInputs=v=>transitionInputs=typeof v==='function'?v(transitionInputs):v;
const setTransitionSelected=v=>transitionSelected=typeof v==='function'?v(transitionSelected):v;
const setTransitionError=v=>transitionError=v;
const setGenerating=v=>generating=v;
const setError=()=>{},setSuccess=()=>{},setBulkResult=()=>{},loadInvoices=async()=>{};
const Dialog='Dialog',DialogContent='DialogContent',DialogHeader='DialogHeader',DialogTitle='DialogTitle',DialogDescription='DialogDescription',Button='Button',Input='Input',Plus='Plus',RefreshCw='RefreshCw';
const formatMoney=value=>String(value);
const h=(type,props,...children)=>({type,props:props||{},children:children.flat(Infinity)});
const all=(node)=> !node||typeof node!=='object'?[]:[node,...node.children.flatMap(all)];
const content=node=> !node?'':typeof node==='object'?node.children.map(content).join(''):String(node);
`+code+`
for(const button of renderButtons()){
 await button.props.onClick();
 assert.equal(transitionDialog,true);assert.equal(posts.length,0);
 assert.equal(requests.at(-1),'/invoices/transition-preview?year=2026&month=10');
}
let ui=renderDialog();assert.equal(ui.props.open,true);
let checkbox=all(ui).find(n=>n.type==='input'&&n.props.type==='checkbox');
assert.equal(checkbox.props.checked,false);
assert(content(ui).includes('\u0110\u00e3 thu \u0111i\u1ec7n \u0111\u1ebfn: 4246'));
checkbox.props.onChange({target:{checked:true}});
const confirm=()=>all(renderDialog()).find(n=>n.type==='Button'&&n.props.onClick===submitGenerateBulk);
assert.equal(confirm().props.type,'button');
await confirm().props.onClick();assert.equal(posts.length,0);assert(transitionError);
let input=all(renderDialog()).find(n=>n.type==='Input');input.props.onChange({target:{value:'4200'}});
await confirm().props.onClick();assert.equal(posts.length,0);
input.props.onChange({target:{value:'4270'}});
assert(content(renderDialog()).includes('24 kWh'));assert(content(renderDialog()).includes('96000'));
transitionDialog=false;await submitGenerateBulk();assert.equal(posts.length,0);
transitionDialog=true;generating=true;await submitGenerateBulk();assert.equal(posts.length,0);
generating=false;await confirm().props.onClick();assert.equal(posts.length,1);
assert.deepEqual(posts[0],{path:'/invoices/generate-bulk',payload:{year:2026,month:10,transition_readings:[{room_id:1,current_reading:4270}]}});
assert.equal(transitionInputs[1],'4270');assert.equal(transitionSelected[1],true);
`)(assert).then(()=>console.log('PASS: all 4 entry buttons, dialog JSX, OFF default, old reading, validation, 24 kWh preview, explicit POST, retry state')).catch(e=>{console.error(e);process.exitCode=1;});
"""
        result = subprocess.run(["node", "-"], input=script, text=True, capture_output=True, cwd=ROOT / "frontend")
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)


if __name__ == "__main__":
    unittest.main()
