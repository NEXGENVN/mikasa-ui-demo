import test from 'node:test';
import assert from 'node:assert/strict';
import {appFrameRoute,buildAppInteractiveFrames} from './app-interactive-source.mjs';
import {appInteractiveFrames} from '../figma-preview/app-interactive-controls.mjs';
import {appFlowArtwork} from '../figma-preview/app-flow-artwork.mjs';
import {darkAppArtwork} from '../figma-preview/dark-app-artwork.mjs';

test('dark fingerprint modal roles follow their actual prompt rather than old ĐN numbering',()=>{
 for(const [id,name,text,route]of [['1450:9996','ĐN 3','Xác thực vân tay','fingerprint'],['1456:11813','ĐN 5','Xác thực thành công','fingerprint-success']]){
  const frame={id,name,platform:'app',theme:'dark',width:390,height:844,nodes:[{id:id+';title',type:'TEXT',name:'Prompt title',text,bbox:[20,582,350,28],rendered:true}]};
  assert.equal(appFrameRoute(frame),route);
 }
});

test('dark account and session switches use source-proved track, thumb and shadow assets',()=>{
 for(const id of ['1450:9744','1456:14881'])for(const control of appInteractiveFrames[id].controls.filter(c=>c.type==='checkbox')){
  const size='@'+control.box[2]+'x'+control.box[3];
  assert.equal(control.checkedAsset,appFlowArtwork[control.checkedMasterId+size].file,id+' checked');
  assert.equal(control.uncheckedAsset,appFlowArtwork[control.uncheckedMasterId+size].file,id+' unchecked');
 }
});

test('dark fingerprint metadata blocks account background and completes through the source verify action',()=>{
 const prompt=appInteractiveFrames['1450:9996'],success=appInteractiveFrames['1456:11813'];
 assert.equal(prompt.route,'fingerprint');assert.equal(success.route,'fingerprint-success');
 assert.ok(prompt.controls.some(c=>c.action==='app.fingerprint.verify'));
 assert.equal(prompt.controls.some(c=>c.field==='app.preferences.fingerprint'),false);
 assert.ok(success.timers.some(t=>t.control.action==='app.navigate'&&t.control.route==='account'));
});

test('dark permission variants retain their source4/3/2 caps and all allowed counter states',()=>{
 for(const [id,cap]of [['1432:10566',4],['1432:10696',3],['1432:10827',2]]){
  const node=(id,type,name,bbox,extra={})=>({id,type,name,bbox,clippedBBox:bbox,visible:true,rendered:true,...extra});
  const f={id,name:'B1.3 '+cap+' quyền',platform:'app',theme:'dark',width:390,height:844,nodes:[
   node('send-role','TEXT','Hint',[16,306,250,20],{text:'Nhập số điện thoại người nhận. Mẫu ZNS'}),node('counter','INSTANCE','Chọn số tin '+cap+' số dark',[244,406,130,50]),node('count','FRAME','Số OA',[294,418,30,22],{parentId:'counter'}),node('digit','TEXT','Tài khoản quản trị placeholder',[294,418,30,24],{parentId:'count',text:String(cap)}),node('permission','TEXT','Tài khoản quản trị placeholder',[66,485,250,16],{text:'Bạn chỉ được chọn tối đa '+cap+' OA cho mỗi lần gửi.'})]};
  const out=buildAppInteractiveFrames([f])[id];assert.equal(out.oaLimit,cap);
  assert.equal(out.componentStates[0].initialValue,String(cap));assert.deepEqual(Object.keys(out.componentStates[0].states),Array.from({length:cap},(_,i)=>String(i+1)));
  assert.deepEqual(out.controls.find(c=>c.field==='app.send.oaCount').options.map(o=>Number(o.value)),Array.from({length:cap},(_,i)=>i+1));
 }
});

test('all changed dark counters and gender controls are wired to the audited App artwork',()=>{
 let counters=0,popups=0;
 for(const frame of Object.values(appInteractiveFrames).filter(f=>f.theme==='dark')){
  for(const component of frame.componentStates){counters++;for(const [value,state]of Object.entries(component.states))assert.equal(state.file,darkAppArtwork.counters[frame.oaLimit].states[value].file);}
  for(const control of frame.controls.filter(c=>c.field==='app.profile.gender'&&c.popup)){popups++;assert.equal(control.popup.file,darkAppArtwork.popups[control.id].file);}
 }
 assert.equal(counters,8);assert.equal(popups,10);
});
