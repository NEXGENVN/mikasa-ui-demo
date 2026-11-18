import test from 'node:test';
import assert from 'node:assert/strict';
import {createDemoState, validatePhone, createRequest, filterMessages, escapeHtml, toCsv} from './core.mjs';

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
