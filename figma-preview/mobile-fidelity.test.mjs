import test from 'node:test';
import assert from 'node:assert/strict';
import {createDemoState,beginSubmission,finishSubmission} from './core.mjs';
import {renderMobile,mobileScreens,getMobileFrame} from './mobile.mjs';
import {mobileAction,mobileChange,mobileSubmit} from './mobile-controller.mjs';
import {readFileSync,statSync} from 'node:fs';

test('App routes are linked to actual Figma frames, without fabricated help/logout screens',()=>{
 const s=createDemoState();
 assert.equal(mobileScreens.some(([r])=>['help','logout'].includes(r)),false);
 for(const [r] of mobileScreens){const f=getMobileFrame(s,r);assert.match(f.id,/^\d+:\d+$/);assert.ok(renderMobile(s,r).includes(`data-figma-node="${f.id}"`));}
});
test('processing displays the same request ID that is saved in history',()=>{
 const s=createDemoState(),job=beginSubmission(s,{...s.draft,phone:'0332225555'});
 assert.ok(renderMobile(s,'processing').includes('data-copy="'+job.messageId+'"'));
 const row=finishSubmission(s,job.id);assert.equal(row.id,job.messageId);
});
test('new request details do not reuse fixture delivery/open timestamps',()=>{
 for(const outcome of ['success','sent']){
  const s=createDemoState(),job=beginSubmission(s,{...s.draft,phone:'0332225555',outcome});
  const row=finishSubmission(s,job.id);s.selectedId=row.id;
  const html=renderMobile(s,'detail');assert.ok(html.includes(row.time));assert.equal(html.includes('15/07/2025'),false);assert.equal(html.includes('15/09/2025'),false);
 }
});
test('profile has the five source fields and appearance has all three list choices',()=>{
 const s=createDemoState(),p=renderMobile(s,'profile'),a=renderMobile(s,'appearance');
 for(const label of ['Tên','Số điện thoại','Email','Giới tính','Mã xác thực'])assert.ok(p.includes(label));
 assert.equal(p.includes('Vai trò'),false);
 for(const label of ['Sáng','Tối','Hệ thống'])assert.ok(a.includes(label));
 assert.equal(a.includes('theme-thumbnail'),false);
});
test('approved devices and security match the mobile designs rather than Web session controls',()=>{
 const s=createDemoState(),d=renderMobile(s,'devices'),p=renderMobile(s,'sessions');
 for(const n of ['S25','S24','S23'])assert.ok(d.includes('Samsung Galaxy '+n+' Ultra'));
 assert.equal(d.includes('data-action="revoke"'),false);
 for(const t of ['Ẩn nội dung thông báo','Ẩn nội dung khi chuyển ứng dụng','Theo hệ thống','Đang hoạt động'])assert.ok(p.includes(t));
 assert.equal(p.includes('Lưu cấu hình'),false);
});
test('subscreens have no invented tab bar or data actions, processing has only the source exit',()=>{
 const s=createDemoState();
 for(const r of ['profile','appearance','password','devices','sessions','data','confirm','processing','result','detail'])assert.equal(renderMobile(s,r).includes('aria-label="Điều hướng app"'),false,r);
 const d=renderMobile(s,'data');assert.ok(d.includes('Xóa dữ liệu'));assert.ok(d.includes('Xóa tài khoản'));assert.equal(d.includes('CSV'),false);assert.equal(d.includes('Khôi phục'),false);
 const p=renderMobile(s,'processing');for(const t of ['Hệ thống đang gửi tin','Mã tin','Gửi tới Zalo','Thời gian chờ','Về lịch sử'])assert.ok(p.includes(t));assert.equal(p.includes('finish-request'),false);
 const result=renderMobile(s,'result');assert.ok(result.includes('e1e15.png'));assert.equal(result.includes('Kết quả từng OA'),false);
});

test('current Send and Confirm keep source notices and action assets in their own slots',()=>{
 const s=createDemoState(),send=renderMobile(s,'send'),confirm=renderMobile(s,'confirm');
 assert.match(send,/f-send-note"><img[^>]+accc5\.svg/);
 assert.ok(send.includes('Mỗi OA gửi 1 cặp , tương ứng 2 tin.'));
 assert.equal(send.includes('1 tin thông báo + 1 tin theo dõi'),false);
 assert.match(confirm,/f-notice"><img[^>]+497e2\.svg/);
 assert.match(confirm,/data-action="schedule-later"[^>]*>[\s\S]*?0fb9a\.svg/);
 assert.match(confirm,/data-action="submit-request"[^>]*><img[^>]+a9191\.svg/);
 assert.match(confirm,/data-route="send"[^>]*><img[^>]+32de8\.svg/);
 s.ui.theme='dark';
 assert.match(renderMobile(s,'send'),/f-send-note"><img[^>]+38e9a\.svg/);
 assert.match(renderMobile(s,'confirm'),/f-notice"><img[^>]+df652\.svg/);
});

test('rendered App routes and source sheets use nonempty local assets in both themes',()=>{
 const assets=new Set();
 const collect=html=>{assert.equal(html.includes('figma.com/api/mcp/asset'),false);for(const m of html.matchAll(/src="assets\/figma\/([^\"]+)"/g))assets.add(m[1]);};
 for(const theme of ['light','dark']){
  const s=createDemoState();s.ui.theme=theme;
  for(const [route] of mobileScreens)collect(renderMobile(s,route));
  for(const sheet of ['delete-data','delete-account','schedule','fingerprint','fingerprint-success']){s.ui.mobileSheet=sheet;collect(renderMobile(s,sheet==='schedule'?'confirm':sheet.startsWith('delete-')?'data':'account'));}
  s.ui.mobileSheet='';s.mobile.fixtures[0].status='success';s.selectedId='figma-1';collect(renderMobile(s,'detail'));
 }
 const css=readFileSync(new URL('./mobile.css',import.meta.url),'utf8');for(const m of css.matchAll(/url\(['"]?assets\/figma\/([^'")]+)['"]?\)/g))assets.add(m[1]);
 for(const asset of assets)assert.ok(statSync(new URL('./assets/figma/'+asset,import.meta.url)).size>0,asset);
 assert.ok(assets.has('c8d96.svg'));assert.ok(assets.has('48784.svg'));assert.ok(assets.has('a3317.svg'));
});

test('source recovery phone and privacy controls keep working with sample data',()=>{
 const s=createDemoState(),routes=[],context={state:s,navigate:r=>routes.push(r),toast:()=>{},render:()=>{}};
 mobileSubmit({dataset:{form:'mobile-forgot'}},{phone:'0912345678'},context);
 assert.equal(routes.at(-1),'otp');assert.ok(renderMobile(s,'otp').includes('0*******78'));
 assert.equal(renderMobile(s,'forgot').includes('assets/figma/4d17a.svg'),false);
 mobileAction('mobile-recorded-visibility',{},context);assert.equal(s.mobile.hideRecorded,true);
 mobileAction('mobile-map-zoom',{dataset:{offset:'1'}},context);assert.equal(s.mobile.mapZoom,1.2);
 for(let i=0;i<10;i++)mobileAction('mobile-map-zoom',{dataset:{offset:'1'}},context);
 assert.equal(s.mobile.mapZoom,1.6);
 let rendered=0;mobileChange({dataset:{mobilePreference:'hideNotifications'},type:'checkbox',checked:false},{state:s,render:()=>rendered++});
 assert.equal(s.mobile.hideNotifications,false);assert.equal(rendered,1);
});

test('refreshed detail variants retain their own source assets and scheduled actions',()=>{
 const cases=[
  ['light','scheduled',1,'1086:73413',['ce8d2.svg','1ee08.svg','ea78d.svg']],
  ['light','sent',5,'1308:6902',['cd966.svg','67957.svg','32de8.svg']],
  ['dark','sent',5,'1450:8895',['cd966.svg','77c2d.svg','fb81e.svg']],
  ['light','failed',5,'1308:7021',['41c72.svg','81b8b.svg','2feb1.svg']],
  ['light','success',5,'1308:7105',['0ab68.svg','7ed32.svg','18606.svg']],
  ['light','partial',5,'1309:7446',['0ab68.svg','d1bb7.svg','44b97.svg']],
  ['dark','success',1,'1430:87138',['77c2d.svg','bc2a6.svg','97b8d.png','1d81f.svg','ae6ba.svg']],
  ['dark','failed',1,'1444:95125',['41c72.svg','81b8b.svg','2feb1.svg','7d026.svg']],
  ['dark','failed',5,'1450:9014',['41c72.svg','81b8b.svg','2feb1.svg','7d026.svg']],
  ['dark','success',5,'1450:9130',['af0c8.svg','01357.svg','d07ee.svg','e81f1.svg','c3641.svg','2f758.svg']],
  ['light','failed',1,'784:50672',['41c72.svg','81b8b.svg','2feb1.svg']]
 ];
 for(const [theme,status,oaCount,node,assets] of cases){
  const s=createDemoState();s.ui.theme=theme;s.mobile={fixtures:[{id:'figma-variant',phone:'0332225555',template:'Source row',time:'Now',status,oaCount}]};s.selectedId='figma-variant';
  const html=renderMobile(s,'detail');assert.ok(html.includes('data-figma-node="'+node+'"'),node);
  const heights={'1086:73413':844,'1308:6902':1164,'1450:8895':926,'1308:7021':926,'1308:7105':1199,'1309:7446':1199,'1430:87138':1190,'1444:95125':844,'1450:9014':844,'1450:9130':1198,'784:50672':926};
  assert.ok(html.includes('--frame-height:'+heights[node]+'px'),node+' height');
  for(const asset of assets)assert.ok(html.includes('assets/figma/'+asset),node+' / '+asset);
  for(const [,asset] of html.matchAll(/src="assets\/figma\/([^\"]+)"/g))assert.ok(statSync(new URL('./assets/figma/'+asset,import.meta.url)).size>0,asset);
  assert.ok(html.includes('Thông báo đơn hàng'));assert.equal(html.includes('Source row'),false);
  if(status==='scheduled'){assert.ok(html.includes('f-detail-schedule-footer'));assert.ok(html.includes('f-outline-danger'));assert.equal(html.includes('f-primary'),false);}
 }
});
