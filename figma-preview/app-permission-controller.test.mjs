import test from 'node:test';
import assert from 'node:assert/strict';
import {createDemoState} from './core.mjs';
import {nativeFrames} from './native-frames.mjs';
import {appInteractiveFrames} from './app-interactive-controls.mjs';
import {createInteractiveSession,seedInteractiveValues,setInteractiveValue,navigateInteractiveSession} from './interactive-session.mjs';
import {composeSourceComponents} from './interactive-component-view.mjs';
import {handleAppInteraction,prepareAppFrame} from './app-interactive-controller.mjs';
import {appPermissionFrameMetadata,resolveAppPermissionFrameId} from './app-permission-policy.mjs';

const now=Date.parse('2026-11-20T10:10:00+07:00'),catalogue=new Map(nativeFrames.map(f=>[f.id,f]));
function harness(variant='full',theme='light',route='send'){
 const s=createInteractiveSession(createDemoState());s.context.appPermissionVariant=variant;s.data.draft.oaCount=variant==='full'?5:1;s.data.ui.theme=theme;s.data.ui.platform='app';
 let frame;
 const enter=id=>{const source=catalogue.get(id);assert.ok(source,'Source '+id);const raw=appPermissionFrameMetadata({...source,...appInteractiveFrames[id]},{variant,session:s});frame=composeSourceComponents(raw,s);seedInteractiveValues(s,frame);prepareAppFrame({frame,session:s,now});frame=composeSourceComponents(raw,s);return frame;};
 const start=resolveAppPermissionFrameId(route,{variant,theme});s.currentFrameId=start;enter(start);
 const act=(action,value,extra={})=>{const c=frame.controls.find(c=>c.action===action&&!c.hidden&&(!extra.field||c.field===extra.field))||frame.timers?.map(t=>t.control).find(c=>c.action===action)||{action};const control={...c,...extra};if(control.field&&value!==undefined)setInteractiveValue(s,control.field,value);const result=handleAppInteraction({frame,control,session:s,value,now});assert.ok(result,action);if(result.targetId||result.back){const target=navigateInteractiveSession(s,result.targetId,{catalogue,back:result.back,replace:result.replace});assert.ok(target,'Existing destination '+JSON.stringify(result));enter(target);}else enter(frame.id);return result;};
 return{s,act,get frame(){return frame;},enter(id){navigateInteractiveSession(s,id,{catalogue});return enter(id);}};
}

test('full copies send five OA through their native confirmation and detail branches in both themes',()=>{
 for(const [theme,confirmation,processing,result,detail]of [['light','1313:75767','778:89003','1279:8878','1308:7105'],['dark','1430:88099','1430:87483','1430:87433','1450:9130']]){
  const h=harness('full',theme);h.act('app.input','0901234567',{field:'app.send.phone'});h.act('app.send.next');assert.equal(h.frame.id,confirmation);assert.equal(h.s.data.draft.oaCount,5);h.act('app.send.confirm');assert.equal(h.frame.id,processing);h.act('app.send.finish');assert.equal(h.frame.id,result);assert.equal(h.s.data.messages[0].oaCount,5);h.act('app.navigate',undefined,{route:'detail'});assert.equal(h.frame.id,detail);assert.equal(h.s.values['app.detail.oaCount'],'5');
 }
});

test('single copies clamp the chooser and reject tampered counts at input, next, and confirmation',()=>{
 for(const theme of ['light','dark']){
  const h=harness('single',theme);h.act('app.input','0901234567',{field:'app.send.phone'});assert.equal(h.frame.id,theme==='dark'?'1430:86270':'734:77892');assert.equal(Number(h.s.values['app.send.oaCount']),1);h.act('app.oa.plus');assert.equal(Number(h.s.values['app.send.oaCount']),1);assert.equal(h.s.data.draft.oaCount,1);
  const input=h.act('app.input',5,{field:'app.send.oaCount'});assert.equal(input.focusField,'app.send.oaCount');assert.equal(Number(h.s.values['app.send.oaCount']),1);
  setInteractiveValue(h.s,'app.send.oaCount',5);const next=handleAppInteraction({frame:h.frame,control:{action:'app.send.next'},session:h.s,now});assert.equal(next.focusField,'app.send.oaCount');
  const confirm=handleAppInteraction({frame:h.frame,control:{action:'app.send.confirm'},session:h.s,now});assert.equal(confirm.focusField,'app.send.oaCount');assert.equal(h.s.data.pendingSubmission,undefined);
 }
});

test('single copies persist exactly one OA and show the single detail source for success and failed sends',()=>{
 for(const [theme,outcome,detail]of [['light','success','784:49355'],['dark','success','1430:87138'],['light','failed','784:50672'],['dark','failed','1444:95125']]){
  const h=harness('single',theme);h.s.data.draft.outcome=outcome;h.act('app.input','0901234567',{field:'app.send.phone'});h.act('app.send.next');assert.equal(h.frame.id,theme==='dark'?'1430:88175':'1279:8766');h.act('app.send.confirm');h.act('app.send.finish');h.act('app.navigate',undefined,{route:'detail'});assert.equal(h.frame.id,detail);assert.equal(h.s.data.messages[0].oaCount,1);assert.equal(h.s.data.messages[0].results.length,1);
 }
});

test('permission policy overrides Flow metadata while standard Flow retains its two OA limit',()=>{
 for(const [variant,expected]of [['full',5],['single',1],['standard',2]]){const s=createInteractiveSession(createDemoState());s.context.appPermissionVariant=variant;s.values['app.send.oaCount']=5;prepareAppFrame({frame:{id:'1635:105527',route:'send',theme:'light',oaLimit:2},session:s,now});assert.equal(s.context.appOALimit,expected);assert.equal(Number(s.values['app.send.oaCount']),expected);}
});

test('full and single scheduled records retain count, date edits and cancellation in their own sessions',()=>{
 const full=harness('full'),single=harness('single','dark');
 for(const [h,count]of [[full,5],[single,1]]){
  h.act('app.input','0901234567',{field:'app.send.phone'});h.act('app.send.next');h.act('app.schedule.open');h.act('app.schedule.save');h.act('app.send.confirm');h.act('app.send.finish');assert.equal(h.s.data.messages[0].status,'scheduled');assert.equal(h.s.data.messages[0].oaCount,count);h.act('app.navigate',undefined,{route:'detail'});const id=h.s.data.selectedId,phone=h.s.data.draft.phone;h.act('app.schedule.edit');h.act('app.schedule.hour','11');h.act('app.schedule.save');assert.equal(h.s.data.selectedId,id);assert.equal(h.s.data.messages[0].oaCount,count);assert.match(h.s.values['app.detail.time'],/11:30/);assert.equal(h.s.data.draft.phone,phone);
 }
 full.act('app.schedule.cancel');assert.equal(full.s.data.messages.some(m=>m.id==='MK1001'),false);assert.equal(single.s.data.messages[0].status,'scheduled');
});

test('changing a draft while its job is active cannot change its saved OA count or selected record',()=>{
 const h=harness('full');h.act('app.input','0901234567',{field:'app.send.phone'});h.act('app.send.next');h.act('app.send.confirm');const job=h.s.data.pendingSubmission;h.enter('773:88074');h.act('app.input',1,{field:'app.send.oaCount'});h.act('app.input','0987654321',{field:'app.send.phone'});h.act('app.send.next');const blocked=h.act('app.send.confirm');assert.equal(blocked.focusField,'app.send.phone');assert.equal(h.s.data.pendingSubmission,job);h.act('app.send.finish');assert.equal(h.s.data.messages[0].oaCount,5);assert.equal(h.s.data.messages[0].phone,'0901234567');
});

test('history selection cannot open an invisible stale row after filtering to an empty scheduled list',()=>{
 const h=harness('single','light','history');h.act('app.history.filter',undefined,{value:'scheduled',targetId:'1085:71117'});assert.equal(h.s.values['app.history.count'],'0 tin nhắn');const selected=h.s.data.selectedId,result=h.act('app.history.detail',undefined,{rowIndex:0});assert.equal(h.s.data.selectedId,selected);assert.equal(result.targetId,undefined);
});

test('selected record projects its own OA results and raw states instead of source five-OA samples',()=>{
 const h=harness('full','dark','history');
 h.s.data.messages.unshift({id:'MK2001',phone:'0987654321',template:'Nhắc thanh toán',status:'partial',oaCount:3,time:'20/11/2026 10:15',openTime:'20/11/2026 10:16',ipv4:'192.0.2.4',ipv6:'',results:[{name:'OA bán hàng',status:'success'},{name:'OA CSKH',status:'failed'},{name:'OA dịch vụ',status:'pending'}]});h.s.context.appMessagesChanged=true;h.enter('1430:85846');
 assert.equal(h.s.values['app.history.projected'],true);assert.equal(h.s.values['app.history.0.phone'],'+84 98 765 ****');assert.equal(h.s.values['app.history.0.state'],'partial');assert.equal(h.s.values['app.history.0.oaCount'],3);
 h.act('app.history.detail',undefined,{rowIndex:0});assert.equal(h.frame.id,'1450:9522');
 assert.equal(h.s.values['app.detail.projected'],true);assert.equal(h.s.values['app.detail.successCount'],'1 Hoàn thành');assert.equal(h.s.values['app.detail.failedCount'],'1 Thất bại');assert.equal(h.s.values['app.detail.pendingCount'],'1 Chờ gửi');assert.equal(h.s.values['app.detail.oa.0.name'],'OA bán hàng');assert.equal(h.s.values['app.detail.oa.1.state'],'failed');assert.equal(h.s.values['app.detail.oa.2.status'],'Chờ gửi');assert.equal(h.s.values['app.detail.oa.3.visible'],false);assert.equal(h.s.values['app.detail.openTime'],'20/11/2026 10:16');assert.equal(h.s.values['app.recorded.ipv4'],'192.0.2.4');assert.equal(h.s.values['app.recorded.ipv6'],'Chưa có dữ liệu');assert.equal(h.act('app.copy',undefined,{field:'app.detail.id'}).copy,'MK2001');
});

test('single record projection has one result and date edits update scheduled history copy',()=>{
 const h=harness('single');h.act('app.input','0901234567',{field:'app.send.phone'});h.act('app.send.next');h.act('app.schedule.open');h.act('app.schedule.save');h.act('app.send.confirm');h.act('app.send.finish');h.act('app.navigate',undefined,{route:'detail'});assert.equal(h.s.values['app.detail.oaCount'],'1');assert.equal(h.s.values['app.detail.pendingCount'],'1 Chờ gửi');assert.equal(h.s.values['app.detail.oa.1.visible'],false);
 h.act('app.schedule.edit');h.act('app.schedule.hour','11');h.act('app.schedule.save');assert.match(h.s.values['app.detail.statusDetail'],/11:30/);h.act('app.navigate',undefined,{route:'history'});h.act('app.history.filter',undefined,{value:'scheduled',targetId:'1085:71117'});assert.equal(h.s.values['app.history.0.phone'],'Thông báo đơn hàng');assert.match(h.s.values['app.history.0.description'],/\+84 90 123 \*\*\*\*\n20\/11\/2026 11:30/);assert.equal(h.s.values['app.history.0.status'],'Chờ gửi');
});

test('permission copies cannot commit an unfinished job whose count exceeds their permission',()=>{
 const h=harness('single');h.s.data.pendingSubmission={id:1,messageId:'MK2001',row:null,input:{phone:'0901234567',template:'Thông báo đơn hàng',oaCount:5,outcome:'success',schedule:''}};h.s.context.appPendingJob=1;const count=h.s.data.messages.length,result=h.act('app.send.finish');assert.equal(result.focusField,'app.send.oaCount');assert.equal(h.s.data.messages.length,count);assert.equal(h.s.data.pendingSubmission,undefined);
});

test('future schedules confirm directly into the supplied scheduled result without a sending-now screen',()=>{
 for(const variant of ['full','single'])for(const theme of ['light','dark']){const h=harness(variant,theme);h.act('app.input','0901234567',{field:'app.send.phone'});h.act('app.send.next');h.act('app.schedule.open');h.act('app.schedule.save');h.act('app.send.confirm');assert.equal(h.frame.id,theme==='dark'?'1442:91277':'1086:73093');assert.equal(h.s.data.messages[0].status,'scheduled');assert.equal(h.s.data.messages[0].oaCount,variant==='full'?5:1);assert.ok(h.s.data.pendingSubmission.row);}
});

test('history filters do not hide overview recent messages or change the record opened there',()=>{
 const h=harness('full','light','history');h.act('app.history.filter',undefined,{value:'scheduled',targetId:'1085:71117'});assert.equal(h.s.context.appHistoryRows.length,0);h.enter('506:23873');assert.equal(h.s.values['app.history.0.visible'],true);assert.equal(h.s.context.appHistoryRows[0],'figma-1');h.act('app.history.detail',undefined,{rowIndex:0});assert.equal(h.s.data.selectedId,'figma-1');assert.equal(h.frame.id,'784:49355');
});

test('editing an older schedule shows its own recipient and restores an unrelated unsent draft',()=>{
 const h=harness('full');h.act('app.input','0901234567',{field:'app.send.phone'});h.act('app.send.next');h.act('app.schedule.open');h.act('app.schedule.save');h.act('app.send.confirm');h.act('app.navigate',undefined,{route:'detail'});const id=h.s.data.selectedId;
 h.enter('773:88074');h.act('app.input','0987654321',{field:'app.send.phone'});h.act('app.input','Nhắc thanh toán',{field:'app.send.template'});h.act('app.input',2,{field:'app.send.oaCount'});const draft={...h.s.data.draft};h.s.data.selectedId=id;h.enter('1086:73413');h.act('app.schedule.edit');assert.equal(h.s.values['app.send.phone'],'0901234567');assert.equal(h.s.values['app.send.template'],'Thông báo đơn hàng');assert.equal(Number(h.s.values['app.send.oaCount']),5);h.act('app.back');assert.deepEqual(h.s.data.draft,draft);assert.equal(h.s.values['app.send.phone'],'0987654321');assert.equal(h.s.values['app.send.template'],'Nhắc thanh toán');assert.equal(Number(h.s.values['app.send.oaCount']),2);
});

test('Full confirmation reviews all five OA and updates its grouped allocation after editing to two',()=>{
 for(const theme of ['light','dark']){
  const h=harness('full',theme);h.act('app.input','0901234567',{field:'app.send.phone'});h.act('app.send.next');assert.equal(h.s.values['app.send.oaCountDisplay'],'5 OA');assert.equal(h.s.values['app.send.totalMessages'],'10 tin');assert.equal(h.s.values['app.send.extraOA'],'4 OA còn lại');assert.equal(h.s.values['app.send.extraAllocation'],'4 tin V4 + 4 tin V6');
  h.act('app.navigate',undefined,{route:'send-ready'});h.act('app.input',2,{field:'app.send.oaCount'});h.act('app.send.next');assert.equal(h.s.values['app.send.oaCountDisplay'],'2 OA');assert.equal(h.s.values['app.send.totalMessages'],'4 tin');assert.equal(h.s.values['app.send.extraOA'],'OA phụ 1 ');assert.equal(h.s.values['app.send.extraAllocation'],'1 tin V4 + 1 tin V6');
 }
});

test('literal original confirmation stays unchanged until its send flow has started',()=>{
 const s=createInteractiveSession(createDemoState()),frame={...catalogue.get('1313:75767'),...appInteractiveFrames['1313:75767']};prepareAppFrame({frame,session:s,now});assert.equal(s.values['app.send.oaCountDisplay'],undefined);assert.equal(s.values['app.send.totalMessages'],undefined);
 const h=harness('standard');h.act('app.oa.plus');h.act('app.send.next');assert.equal(h.s.context.appConfirmStarted,true);assert.equal(h.s.values['app.send.oaCountDisplay'],'2 OA');assert.equal(h.s.values['app.send.totalMessages'],'4 tin');
});

test('the recorded-data eye reveals the selected record IPs without relying on another preparation',()=>{
 for(const variant of ['single','full'])for(const theme of ['light','dark']){
  const h=harness(variant,theme);h.act('app.input','0901234567',{field:'app.send.phone'});h.act('app.send.next');h.act('app.send.confirm');h.act('app.send.finish');const message=h.s.data.messages[0];Object.assign(message,{ipv4:'192.0.2.4',ipv6:'2001:db8::4',port:'443',provider:'Viettel'});h.act('app.navigate',undefined,{route:'detail'});
  const control=h.frame.controls.find(c=>c.action==='app.recorded.toggle');assert.ok(control,'Real source eye '+variant+' '+theme);
  handleAppInteraction({frame:h.frame,control,session:h.s,now});assert.equal(h.s.values['app.recorded.ipv4'],'••••••');assert.equal(h.s.values['app.recorded.ipv6'],'••••••');
  handleAppInteraction({frame:h.frame,control,session:h.s,now});assert.equal(h.s.values['app.recorded.ipv4'],'192.0.2.4',variant+' '+theme+' IPv4');assert.equal(h.s.values['app.recorded.ipv6'],'2001:db8::4',variant+' '+theme+' IPv6');assert.equal(h.s.values['app.recorded.port'],'443');assert.equal(h.s.values['app.recorded.provider'],'Viettel');
 }
});
