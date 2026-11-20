import test from 'node:test';
import assert from 'node:assert/strict';
import {appInteractiveFrames} from './app-interactive-controls.mjs';
import {nativeFrames} from './native-frames.mjs';
import fs from 'node:fs/promises';
test('every App source frame has an in-bounds manifest and every declared full-frame target exists',()=>{
 const catalogue=new Map(nativeFrames.map(f=>[f.id,f])),apps=nativeFrames.filter(f=>f.platform==='app');assert.equal(Object.keys(appInteractiveFrames).length,apps.length);
 for(const frame of apps){const manifest=appInteractiveFrames[frame.id];assert.ok(manifest,frame.id);for(const c of manifest.controls){const[x,y,w,h]=c.box;assert.ok(x>=0&&y>=0&&w>0&&h>0&&x+w<=frame.width+.1&&y+h<=frame.height+.1,frame.id+' '+c.id);if(c.targetId)assert.equal(catalogue.get(c.targetId)?.platform,'app',c.targetId);assert.ok(c.action);}}
});
test('switch artwork retains its physical native width instead of stretching a larger master',async()=>{
 for(const f of Object.values(appInteractiveFrames))for(const c of f.controls.filter(c=>c.type==='checkbox'&&c.checkedAsset)){
  for(const asset of [c.checkedAsset,c.uncheckedAsset]){const svg=await fs.readFile(new URL(asset,import.meta.url),'utf8');const width=Number(svg.match(/\bwidth="([\d.]+)"/)?.[1]);assert.equal(width,c.box[2],asset);}
 }
});
test('overview statistics remain static while actual recent message cards have consecutive indices',()=>{
 const controls=appInteractiveFrames['506:23873'].controls;assert.ok(!controls.some(c=>c.label==='Hoàn thành 150 Đã gửi 200 Thất bại 50'));const rows=controls.filter(c=>c.action==='app.history.detail');assert.ok(rows.length>=3);assert.deepEqual(rows.map(c=>c.rowIndex),rows.map((_,i)=>i));assert.ok(rows.every(c=>c.box[1]>=491));
});
test('generic prototype navigation wrappers cannot cover editable native fields',()=>{
 for(const f of Object.values(appInteractiveFrames)){const inputs=f.controls.filter(c=>['input','select','textarea','file'].includes(c.type));for(const c of f.controls.filter(c=>c.type==='button'&&c.action==='app.navigate'))for(const input of inputs){const a=c.box,b=input.box;assert.ok(!(a[0]<=b[0]&&a[1]<=b[1]&&a[0]+a[2]>=b[0]+b[2]&&a[1]+a[3]>=b[1]+b[3]),'covered editable field '+input.id);}}
});
test('canonical Flow starts at the supplied SVG counter value one and declares native conditional counter states',()=>{
 const frame=appInteractiveFrames['1635:105527'],count=frame.controls.find(c=>c.field==='app.send.oaCount');assert.equal(count.value,'1');assert.deepEqual(count.box,[294,418,30,22]);assert.ok(frame.controls.some(c=>c.action==='app.oa.plus'));assert.ok(!frame.controls.some(c=>c.action==='app.oa.minus'));assert.deepEqual(Object.keys(frame.componentStates[0].states),['1','2','3','4','5']);
});
test('scheduled success links to its actual selected scheduled message rather than the prototype overview destination',()=>{
 const button=appInteractiveFrames['1086:73093'].controls.find(c=>c.label==='Xem lịch đã đặt');assert.equal(button.action,'app.navigate');assert.equal(button.route,'detail');
});
test('scheduled detail originals expose separate change and cancel source buttons',()=>{
 for(const [id,y]of [['1086:73413',746],['1444:93591',758],['1635:109272',746]]){
  const controls=appInteractiveFrames[id].controls,edit=controls.filter(c=>c.action==='app.schedule.edit'),cancel=controls.filter(c=>c.action==='app.schedule.cancel');
  assert.equal(edit.length,1,id+' must have one atomic change button');assert.deepEqual(edit[0].box,[24,y,166,46]);
  assert.equal(cancel.length,1,id+' must have one atomic cancel button');assert.deepEqual(cancel[0].box,[200,y,166,46]);assert.equal(cancel[0].label,'Hủy lịch');
 }
});
test('actual login, OTP, send, confirm, history and profile originals expose their required semantics',()=>{
 const actions=id=>appInteractiveFrames[id].controls.map(c=>c.action);
 assert.ok(actions('658:1036').includes('app.login'));assert.ok(actions('773:88074').includes('app.send.next'));assert.ok(actions('1279:8766').includes('app.send.confirm'));assert.ok(actions('843:50716').includes('app.profile.save'));
 assert.equal(appInteractiveFrames['658:34855'].controls.filter(c=>c.type==='input'&&c.inputType==='password').length,2);
 const otp=appInteractiveFrames['658:34596'].controls.find(c=>c.action==='app.otp');assert.equal(otp.maxLength,6);assert.equal(otp.splitSlots,true);assert.equal(otp.textSlots.length,6);
 assert.deepEqual(appInteractiveFrames['784:48201'].controls.filter(c=>c.action==='app.history.detail').map(c=>c.rowIndex),[0,1,2,3,4,5,6]);
 for(const f of Object.values(appInteractiveFrames))for(const c of f.controls.filter(c=>['input','select'].includes(c.type)))assert.ok(!f.controls.some(other=>other.type==='button'&&JSON.stringify(other.box)===JSON.stringify(c.box)),'input overlapped by button '+c.id);
 for(const f of Object.values(appInteractiveFrames))for(const c of f.controls.filter(c=>c.inputType==='password')){assert.ok(c.maskCharacter);assert.ok(c.valueFont);}
 for(const f of Object.values(appInteractiveFrames))for(const c of f.controls.filter(c=>c.type==='input'&&!c.splitSlots&&!c.componentStateId))for(const s of c.textSlots||[])assert.ok(s.box[3]<=c.box[3]+1,'non-editable countdown or label entered input slot '+s.id);
});
