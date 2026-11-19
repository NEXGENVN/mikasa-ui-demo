import test from 'node:test';import assert from 'node:assert/strict';
import {createDemoState} from './core.mjs';import {renderWeb,webScreens,getWebFrame} from './web.mjs';
test('Web excludes the fabricated send page and links both source form factors',()=>{
 const s=createDemoState();assert.equal(webScreens.some(([id])=>id==='send'),false);
 assert.equal(getWebFrame(s,'overview','landscape').id,'1144:70434');assert.equal(getWebFrame(s,'overview','portrait').id,'1214:84730');
 assert.ok(renderWeb(s,'overview',{orientation:'portrait'}).includes('data-orientation="portrait"'));
});
test('source account workflow uses complete pages and source form fields',()=>{
 const s=createDemoState(),html=renderWeb(s,'account-create');
 for(const label of ['Tên đăng nhập','Mật khẩu','Email','Số điện thoại','Admin','Super Admin','Quyền truy cập'])assert.ok(html.includes(label));
 assert.equal(html.includes('Họ tên'),false);assert.equal(html.includes('sidebar-bottom'),false);
});
test('history details retain the source device/error panels without fabricated OA result cards',()=>{
 const s=createDemoState();renderWeb(s,'history');s.selectedId=s.messages[0].id;
 const html=renderWeb(s,'detail');for(const label of ['Chi tiết bản tin lịch sử','Thông tin gửi','Thiết bị & kết nối','Lỗi phát sinh'])assert.ok(html.includes(label));
 assert.equal(html.includes('Kết quả theo OA'),false);assert.equal(html.includes('Luồng mô phỏng'),false);
});
test('account recovery tab uses its own source frames and empty filtering retains the reset',()=>{
 const s=createDemoState();s.ui.tab='recovery';
 assert.equal(getWebFrame(s,'accounts','landscape').id,'557:35890');assert.equal(getWebFrame(s,'accounts','portrait').id,'580:27340');
 assert.match(renderWeb(s,'accounts'),/BK-001/);s.ui.tab='list';s.ui.query='no matching account';
 const html=renderWeb(s,'accounts');assert.match(html,/118b7.svg/);assert.match(html,/Chưa có dữ liệu/);assert.match(html,/data-action="clear-filters"/);
});
test('overview selected date filters recent messages and summary counts',()=>{
 const s=createDemoState();s.ui.date='2026-11-12';const matching=renderWeb(s,'overview');
 assert.match(matching,/12\/11 · 11:42/);assert.doesNotMatch(matching,/12\/12 · 09:15/);
 s.ui.date='2027-01-01';const empty=renderWeb(s,'overview');assert.doesNotMatch(empty,/<td>033 \*\*\* 5555<\/td>/);assert.match(empty,/<strong>0<\/strong>/);
});
