import test from 'node:test';
import assert from 'node:assert/strict';
import * as core from './core.mjs';
import {renderWeb} from './web.mjs';
import {renderMobile} from './mobile.mjs';

test('created role names remain plain text and cannot create HTML attributes',()=>{
 const s=core.createDemoState();s.roles=['<b>Team</b>','" onclick="alert(1)'];
 const html=renderWeb(s,'settings');
 assert.equal(html.includes('<b>Team</b>'),false);
 assert.equal(html.includes('data-role="" onclick='),false);
 assert.ok(html.includes('&lt;b&gt;Team&lt;/b&gt;'));
 assert.equal(Object.getPrototypeOf(s.permissions),null);
});
test('account status filter offers active and inactive selectable options',()=>{
 const html=renderWeb(core.createDemoState(),'accounts');
 const statusSelect=html.match(/<select[^>]*data-filter="status"[\s\S]*?<\/select>/)?.[0]||'';
 const options=[...statusSelect.matchAll(/<option\s+value="([^"]+)"/g)].map(m=>m[1]);
 assert.deepEqual(options,['all','active','inactive']);
});
test('submitted request snapshots survive draft edits and complete only once',()=>{
 assert.equal(typeof core.beginSubmission,'function');
 const s=core.createDemoState();const count=s.messages.length;
 const job=core.beginSubmission(s,{...s.draft,phone:'0332225555',oaCount:3,outcome:'partial'});
 s.draft.phone='0901234567';s.ui.route='history';s.ui.platform='web';
 const row=core.finishSubmission(s,job.id);
 assert.equal(row.phone,'0332225555');assert.equal(row.oaCount,3);
 assert.equal(s.messages.length,count+1);
 assert.equal(core.finishSubmission(s,job.id).id,row.id);
 assert.equal(s.messages.length,count+1);
});
test('configuration creation, listing and details use the selected channel',()=>{
 assert.equal(typeof core.addConfiguration,'function');
 const s=core.createDemoState();const c=core.addConfiguration(s,{name:'GIF chúc mừng mới',channel:'GIF'});
 assert.equal(s.configurations.find(x=>x.id===c.id).name,'GIF chúc mừng mới');
 s.ui.tab='gif';assert.ok(renderWeb(s,'oa').includes('GIF chúc mừng mới'));
 s.ui.tab='oa';assert.equal(renderWeb(s,'oa').includes('GIF chúc mừng mới'),false);
});
test('report totals and empty-state follow the same filtered messages as export',()=>{
 assert.equal(typeof core.getReport,'function');
 const s=core.createDemoState();s.messages=[{id:'1',phone:'0332225555',status:'success',cost:4000,oa:'OA chính',date:'2026-11-18'},{id:'2',phone:'0901234567',status:'failed',cost:0,oa:'OA chính',date:'2026-11-18'},{id:'3',status:'success',cost:8000,oa:'OA CSKH',date:'2026-11-17'}];
 const r=core.getReport(s,{date:'2026-11-18',oa:'OA chính'});
 assert.deepEqual([r.sent,r.success,r.cost,r.costPerMessage],[2,1,4000,2000]);
 assert.deepEqual(r.byOa.map(x=>[x.name,x.sent,x.cost]),[['OA chính',2,4000]]);
 s.ui.date='2026-11-01';const html=renderWeb(s,'reports');
 assert.ok(html.includes('Không có dữ liệu báo cáo'));
 assert.ok(html.includes('aria-label="Ngày báo cáo"'));
});
test('saved session policies are selected after navigating Web and App screens',()=>{
 assert.equal(typeof core.saveSessionPolicy,'function');
 const s=core.createDemoState();core.saveSessionPolicy(s,{lifetime:'8 giờ',idle:'5 phút'});
 assert.equal(s.preferences.sessionLifetime,'8 giờ');assert.equal(s.preferences.idleTimeout,'5 phút');
 assert.ok(renderWeb(s,'security').includes('value="8 giờ" selected'));
 assert.ok(renderMobile(s,'sessions').includes('value="5 phút" selected'));
});
test('password recovery requests are retained in the sample state',()=>{
 assert.equal(typeof core.queueRecovery,'function');
 const s=core.createDemoState();core.queueRecovery(s,'recovery@example.com');s.ui.tab='recovery';
 assert.equal(s.recoveries.length,1);assert.equal(s.recoveries[0].email,'recovery@example.com');
});
