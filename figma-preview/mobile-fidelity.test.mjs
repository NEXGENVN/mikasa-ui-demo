import test from 'node:test';
import assert from 'node:assert/strict';
import {createDemoState,beginSubmission,finishSubmission} from './core.mjs';
import {renderMobile,mobileScreens,getMobileFrame} from './mobile.mjs';

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
