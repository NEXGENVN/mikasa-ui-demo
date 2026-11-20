import test from 'node:test';
import assert from 'node:assert/strict';
import {createDemoState, validatePhone, createRequest, beginSubmission, finishSubmission, filterMessages, escapeHtml, toCsv} from './core.mjs';

test('request gateways reject schedules outside future half-hours and fourteen days without mutating data',()=>{
 const now=Date.parse('2026-11-20T10:12:37+07:00'),input={phone:'0332225555',oaCount:1,scheduled:true},s=createDemoState(),before=s.messages.length;
 for(const schedule of ['2026-11-20T10:00:00+07:00','2026-11-20T10:31:00+07:00','2026-11-20T10:30:01+07:00','2026-12-05T07:00:00+07:00','2030-01-01T10:00:00+07:00']){
  assert.throws(()=>createRequest(s,{...input,schedule},{now}),/14 ngày/);
  assert.throws(()=>beginSubmission(s,{...input,schedule},{now}),/14 ngày/);
  assert.equal(s.messages.length,before);assert.equal(s.pendingSubmission,undefined);
 }
 const job=beginSubmission(s,{...input,schedule:'2026-12-04T10:00:00+07:00'},{now});
 assert.equal(finishSubmission(s,job.id,{now}).schedule,'2026-12-04T03:00:00.000Z');
 assert.equal(s.messages.length,before+1);assert.equal(finishSubmission(s,job.id,{now}).id,job.row.id);
});
test('queued schedules are revalidated when finishing and immediate sends ignore stale schedule values',()=>{
 const now=Date.parse('2026-11-20T10:12:37+07:00'),s=createDemoState(),before=s.messages.length;
 const job=beginSubmission(s,{phone:'0332225555',oaCount:1,scheduled:true,schedule:'2026-11-20T10:30:00+07:00'},{now});
 assert.throws(()=>finishSubmission(s,job.id,{now:now+30*60*1000}),/14 ngày/);assert.equal(s.messages.length,before);assert.equal(job.row,null);
 s.pendingSubmission=null;const immediate=beginSubmission(s,{phone:'0332225555',oaCount:1,scheduled:false,schedule:'2030-01-01T10:01:00Z'},{now});assert.equal(immediate.input.schedule,'');
});

test('accepts Vietnamese local and international phone formats', () => {
  assert.equal(validatePhone('033 222 5555'), '0332225555');
  assert.equal(validatePhone('+84 33 222 5555'), '0332225555');
  for (const value of ['', 'abc0332225555', '0123', '0000000000', '033222555511']) assert.equal(validatePhone(value), null);
});
test('rejects invalid requests without inserting a message', () => {
  const s = createDemoState(); const before = s.messages.length;
  assert.throws(() => createRequest(s, {phone:'bad',oaCount:1}), /điện thoại/);
  for (const oaCount of [0,6,1.5,NaN]) assert.throws(() => createRequest(s, {phone:'0332225555',oaCount}), /OA/);
  assert.equal(s.messages.length,before);
});
test('creates independent request results for each selected OA', () => {
  const s=createDemoState(); const row=createRequest(s,{phone:'0332225555',oaCount:3,template:'Thông báo đơn hàng',outcome:'partial'});
  assert.equal(s.messages[0].id,row.id); assert.equal(row.results.length,3);
  assert.deepEqual(row.results.map(x=>x.status),['success','success','failed']);
  assert.equal(row.status,'partial'); assert.equal(row.phone,'0332225555');
});
test('filters by status and query together and returns an empty result',()=>{
  const rows=[{id:'A1',phone:'0332225555',template:'Đơn hàng',status:'success'},{id:'B2',phone:'0901234567',template:'Thanh toán',status:'failed'}];
  assert.equal(filterMessages(rows,{query:'033',status:'success'}).length,1);
  assert.equal(filterMessages(rows,{query:'033',status:'failed'}).length,0);
  assert.equal(filterMessages(rows,{query:'b2',status:'all'})[0].phone,'0901234567');
});
test('escapes user input before embedding it into HTML',()=>{
  assert.equal(escapeHtml('<img src=x onerror="alert(1)"> & \'hi\''),'&lt;img src=x onerror=&quot;alert(1)&quot;&gt; &amp; &#39;hi&#39;');
});
test('exports CSV safely including quotes and spreadsheet formula input',()=>{
  const csv=toCsv([['name','value'],['=1+1','a,"b"']]);
  assert.equal(csv,'\uFEFF"name","value"\r\n"\'=1+1","a,""b"""');
});
