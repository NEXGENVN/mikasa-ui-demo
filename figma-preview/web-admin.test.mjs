import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import {createDemoState,getReport} from './core.mjs';
import {adminFrame,adminReport,adminReportRows,adminReportCsv,renderReports,renderSecurity,renderSettings} from './web-admin.mjs';
import {webAdminAction,webAdminChange,webAdminSubmit} from './web-admin-controller.mjs';

test('both Web orientations map selected security and role states to actual Figma frames',()=>{
  const s=createDemoState();
  assert.deepEqual(adminFrame(s,'reports','portrait'),{id:'470:16153',name:'BC dọc 2'});
  for(const [tab,landscape,portrait] of [['config','1214:69975','495:39196'],['sessions','1214:70371','1226:92877'],['notifications','1214:70572','1226:93090']]){s.ui.tab=tab;assert.equal(adminFrame(s,'security').id,landscape);assert.equal(adminFrame(s,'security','portrait').id,portrait);}
  s.ui.role='Delivery Management';assert.equal(adminFrame(s,'settings').id,'540:26898');
  s.ui.adminRoleDialog=true;assert.equal(adminFrame(s,'settings','portrait').id,'556:26290');
  assert.equal(adminFrame(s,'unknown'),null);
});
test('report aggregate export matches the source reconciliation and filtered totals',()=>{
  const s=createDemoState(),r=adminReport(s),rows=adminReportRows(s);
  assert.equal(r.byOa.reduce((n,x)=>n+x.sent,0),r.sent);
  assert.equal(r.byOa.reduce((n,x)=>n+x.cost,0),r.cost);
  assert.deepEqual(rows.at(-1),['Tổng cộng',24860,20320000]);
  assert.match(adminReportCsv(s),/20320000/);
  s.ui.oa='OA chính';assert.equal(adminReport(s).cost,getReport(s,s.ui).cost);
  assert.match(renderReports(s),new RegExp(getReport(s,s.ui).cost.toLocaleString('vi-VN').replaceAll('.','\\.')));
  s.ui.date='1900-01-01';
  for(const orientation of ['portrait','landscape']){const html=renderReports(s,orientation);assert.match(html,/Không có dữ liệu báo cáo/);assert.doesNotMatch(html,/24\.860|wa-report-chart|wa-report-metrics/);}
  assert.deepEqual(adminReportRows(s).at(-1),['Tổng cộng',0,0]);
});
test('source security controls replace invented save, session revoke, and notification toggles',()=>{
  const s=createDemoState();
  assert.doesNotMatch(renderSecurity(s),/Lưu cấu hình|data-action="revoke"|data-preference/);
  s.ui.tab='sessions';assert.match(renderSecurity(s),/Thiết lập mật khẩu cấp 2/);assert.match(renderSecurity(s),/Lịch sử đăng nhập gần đây/);
  s.ui.tab='notifications';assert.match(renderSecurity(s),/Yêu cầu đang chờ/);assert.equal((renderSecurity(s).match(/data-action="wa-device-approve"/g)||[]).length,3);assert.equal((renderSecurity(s,'portrait').match(/data-action="wa-device-approve"/g)||[]).length,12);
});
test('source-backed controls update policy, roles, permissions, MFA and device decisions',()=>{
  const state=createDemoState();let renders=0;const c={state,render(){renders++;},toast(){}};
  const element=(dataset={},props={})=>({dataset,hasAttribute(name){return Object.hasOwn(dataset,name.replace(/^data-/,'').replace(/-([a-z])/g,(_,c)=>c.toUpperCase()));},...props});
  assert.equal(webAdminChange(element({adminPolicy:'idle'},{value:'5 phút'}),c),true);assert.equal(state.preferences.idleTimeout,'5 phút');
  state.ui.route='settings';webAdminAction('add-role',element(),c);assert.equal(state.ui.adminRoleDialog,true);
  webAdminSubmit({dataset:{form:'wa-role'}},{name:'Kiểm soát viên',description:'Kiểm soát'},c);assert.equal(state.roles.at(-1),'Kiểm soát viên');assert.equal(state.ui.adminRoleDialog,false);
  webAdminChange(element({adminPermission:'role',permission:'0'},{checked:false}),c);assert.equal(state.permissions['Kiểm soát viên'][0],false);
  const confirm={};webAdminSubmit({dataset:{form:'wa-mfa'},elements:{confirm,acknowledge:{checked:true}}},{next:'Example123',confirm:'Example123'},c);assert.equal(state.preferences.adminMfa,true);
  webAdminAction('wa-device-approve',element({id:'l-0'}),c);state.ui.tab='notifications';assert.match(renderSecurity(state),/Đã duyệt/);assert.equal(renders,5);
});
test('role search and dialog escape user content and omit unsupported profile forms',()=>{
  const s=createDemoState();s.roles.push('<script>');s.ui.adminRoleQuery='<script>';assert.match(renderSettings(s),/&lt;script&gt;/);assert.doesNotMatch(renderSettings(s),/<script>/);
  s.ui.adminRoleDialog=true;assert.match(renderSettings(s,'portrait'),/role="dialog"/);assert.doesNotMatch(renderSettings(s),/data-form="profile"|data-preference/);
});
test('role creation retains inactive status and role search requests focus restoration',()=>{
 const s=createDemoState();let restored;const c={state:s,render(options){restored=options;},toast(){}};
 webAdminSubmit({dataset:{form:'wa-role'}},{name:'Inactive sample',description:'Sample'},c);
 assert.equal(s.roleActive['Inactive sample'],false);assert.match(renderSettings(s),/Tạm ngưng/);
 webAdminChange({hasAttribute:n=>n==='data-admin-role-query',value:'Inactive',selectionStart:4},c);
 assert.equal(s.ui.adminRoleQuery,'Inactive');assert.deepEqual(restored,{restoreRoleQuery:{pos:4}});
});
test('all visible admin image assets are nonempty local files, with native SVG dimensions',async()=>{
  const s=createDemoState();const html=[renderReports(s),renderReports(s,'portrait'),renderSettings(s),...['config','sessions','notifications'].map(tab=>{s.ui.tab=tab;return renderSecurity(s);})].join('');
  const assets=[...new Set([...html.matchAll(/src="(assets\/figma\/[^\"]+)"/g)].map(x=>x[1]))];
  assert.ok(assets.length>=12);
  for(const path of assets){const url=new URL(path,import.meta.url);assert.ok((await stat(url)).size>0,path);const svg=await readFile(url,'utf8');assert.match(svg,/<svg[^>]*width="[^\"]+"[^>]*height="[^\"]+"/,path);}
  assert.doesNotMatch(html,/https:\/\/www\.figma\.com\/api\/mcp\/asset/);
});
