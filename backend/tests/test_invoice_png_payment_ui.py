"""Offline regression of the actual PNG handler, URL builder and image loader."""
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[2]


class InvoicePngPaymentTests(unittest.TestCase):
    def test_payment_block_qr_payload_and_failure_fallbacks(self):
        script = r"""

const fs=require('fs'),ts=require('typescript'),assert=require('assert/strict');
const source=fs.readFileSync('src/pages/InvoiceDetails.tsx','utf8');
const sf=ts.createSourceFile('InvoiceDetails.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const names=['formatMoney','formatNumber','getStatusText','getPaymentText','getItemTypeText','getBankName','buildVietQrUrl','loadImage','handleDownloadPng'];
const declarations=[],variables={};
function walk(n){
 if(ts.isFunctionDeclaration(n)&&names.includes(n.name?.text))declarations.push(n.getText(sf));
 if(ts.isVariableDeclaration(n)&&['transferContent','qrOnlyUrl','invoicePresentation'].includes(n.name.getText(sf)))variables[n.name.getText(sf)]='const '+n.getText(sf)+';';
 ts.forEachChild(n,walk);
}walk(sf);
assert.equal(declarations.length,names.length);
const code=ts.transpile(declarations.join('\n')+'\n'+variables.transferContent+'\n'+variables.qrOnlyUrl+'\n'+variables.invoicePresentation,{target:ts.ScriptTarget.ES2022});
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
async function run({status='ISSUED',payment='UNPAID',remaining=70000,fail=false,missingConfig=false,reference='RH261004I103'}={}){
 const texts=[],draws=[],requests=[],errors=[],alerts=[];let downloads=0,complete=false,releaseQr;
 // Non-payable account placeholder; public bank ID only exercises name mapping.
  // Image events are stubs only. No QR is generated and no HTTP request is made.
 class TestImage{
  set src(url){
   assert.equal(this.crossOrigin,'anonymous');
   requests.push(url);this.url=url;
   if(url.includes('/Rosehome.png'))queueMicrotask(()=>this.onload());
   else releaseQr=()=>queueMicrotask(()=>fail?this.onerror():this.onload());
  }
 }
 const ctx={measureText:t=>({width:String(t).length*12}),fillRect(){},strokeRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},fillText:t=>texts.push(String(t)),drawImage:image=>draws.push(image)};
 const document={body:{appendChild(){}},createElement:type=>type==='canvas'?{getContext:()=>ctx,toDataURL:()=> 'export-result'}:{click(){downloads++},remove(){}}};
 const args={
 invoice:{id:103,version:1,year:2026,month:10,status,payment_status:payment,transfer_reference:reference,total_amount:70000,items:[]},
 room:{room_code:'04'},remainingAmount:remaining,totalPaid:70000-remaining,meterReading:null,printNote:'',
 VIETQR_BANK_ID:'970416',VIETQR_ACCOUNT_NO:'DEMO-NOT-A-BANK-ACCOUNT',VIETQR_ACCOUNT_NAME:missingConfig?'':'TEST ACCOUNT',
 useMemo:fn=>fn(),Image:TestImage,document,window:{location:{origin:'https://offline.invalid'},alert:t=>alerts.push(t)},
 setProcessing(){},setError:t=>{if(t)errors.push(t)},
 };
 const task=new AsyncFunction(...Object.keys(args),code+'\nawait handleDownloadPng();')(...Object.values(args)).then(()=>complete=true);
 await new Promise(resolve=>setImmediate(resolve));
 if(releaseQr){
  assert.equal(complete,false,'must await image load before exporting');
  assert.equal(downloads,0);assert(!draws.some(x=>x instanceof TestImage&&!x.url.includes('/Rosehome.png')));
  releaseQr();
 }
 await task;
 assert.deepEqual(alerts,[]);assert.equal(downloads,1);
 return {texts,requests,errors,draws};
}
(async()=>{
 const a=await run();
 assert(a.texts.includes('THÔNG TIN THANH TOÁN'));assert(a.texts.includes('70.000 đ'));
 for(const value of ['ACB','DEMO-NOT-A-BANK-ACCOUNT','TEST ACCOUNT','RH261004I103'])assert(a.texts.includes(value));
 const url=a.requests.find(x=>x.includes('img.vietqr.io'));assert(url);
 const qr=new URL(url);assert.equal(qr.pathname,'/image/970416-DEMO-NOT-A-BANK-ACCOUNT-qr_only.png');
 assert.equal(qr.searchParams.get('amount'),'70000');assert.equal(qr.searchParams.get('addInfo'),'RH261004I103');assert.equal(qr.searchParams.get('accountName'),'TEST ACCOUNT');
 assert(a.draws.some(x=>x.url===url));assert.equal(a.errors.length,0);
 for(const config of [{status:'DRAFT'},{payment:'PAID',remaining:0},{payment:'PAID'},{status:'CANCELLED'}]){
  const r=await run(config);assert(!r.requests.some(x=>x.includes('vietqr')));assert(!r.texts.includes('THÔNG TIN THANH TOÁN'));
 }
 const d=await run({fail:true});assert(d.texts.includes('THÔNG TIN THANH TOÁN'));assert(d.texts.includes('RH261004I103'));assert(d.texts.includes('DEMO-NOT-A-BANK-ACCOUNT'));assert(d.texts.includes('TEST ACCOUNT'));assert(d.texts.includes('Không thể hiển thị mã QR'));assert.equal(d.errors.length,1);
 const missing=await run({missingConfig:true});assert(missing.texts.includes('THÔNG TIN THANH TOÁN'));assert(missing.texts.includes('RH261004I103'));assert(missing.texts.includes('DEMO-NOT-A-BANK-ACCOUNT'));assert(missing.texts.includes('Không thể hiển thị mã QR'));assert(!missing.requests.some(x=>x.includes('vietqr')));assert.equal(missing.errors.length,1);
 const noRef=await run({reference:''});assert(noRef.texts.includes('THÔNG TIN THANH TOÁN'));assert(noRef.texts.includes('Không thể hiển thị mã QR'));assert(!noRef.requests.some(x=>x.includes('vietqr')));

 for(const result of [d,missing,noRef]){
  assert(result.texts.includes('THÔNG TIN THANH TOÁN'));
  assert(result.texts.includes('ACB'));
  assert(result.texts.includes('DEMO-NOT-A-BANK-ACCOUNT'));
  assert(result.texts.includes('70.000 đ'));
  assert(result.texts.includes('Không thể hiển thị mã QR'));
  // Canvas wraps the customer-facing instruction into two lines.
  const fallbackIndex=result.texts.indexOf('Không thể hiển thị mã QR');
  assert.equal(result.texts.slice(fallbackIndex+1,fallbackIndex+3).join(' '),
    'Vui lòng chuyển khoản theo thông tin bên trái.');
  assert(!result.draws.some(image=>image.url?.includes('vietqr')));
 }
 console.log('PASS: A-D, async wait, exact payload, missing config/reference, cancelled, PAID with positive balance.');
})().catch(e=>{console.error(e);process.exitCode=1});

"""
        result = subprocess.run(
            ["node", "-"], input=script, text=True, encoding="utf-8",
            capture_output=True, cwd=ROOT / "frontend",
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)


if __name__ == "__main__":
    unittest.main()
