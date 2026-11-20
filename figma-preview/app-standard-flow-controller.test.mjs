import test from 'node:test';import assert from 'node:assert/strict';
import {createDemoState} from './core.mjs';import {nativeFrames} from './native-frames.mjs';import {appInteractiveFrames} from './app-interactive-controls.mjs';import {createInteractiveSession,seedInteractiveValues,setInteractiveValue,navigateInteractiveSession} from './interactive-session.mjs';import {composeSourceComponents} from './interactive-component-view.mjs';import {handleAppInteraction,prepareAppFrame} from './app-interactive-controller.mjs';
const now=Date.parse('2026-11-20T10:10:00+07:00'),catalogue=new Map(nativeFrames.map(f=>[f.id,f]));
export function flowHarness(id='1635:105527'){
 const s=createInteractiveSession(createDemoState());let frame;const enter=id=>{const original=catalogue.get(id);assert.ok(original,id);frame=composeSourceComponents({...original,...appInteractiveFrames[id]},s);seedInteractiveValues(s,frame);prepareAppFrame({frame,session:s,now});return frame;};enter(id);s.currentFrameId=id;
 const act=(action,value,extra={})=>{const control=(extra.id?frame.controls.find(c=>c.id===extra.id):frame.controls.find(c=>c.action===action&&!c.hidden&&(!extra.field||c.field===extra.field)))||frame.timers?.map(t=>t.control).find(c=>c.action===action);assert.ok(control,'Real source control/timer '+action+' in '+frame.id);const actual={...control,...extra};if(actual.field&&value!==undefined)setInteractiveValue(s,actual.field,value);const result=handleAppInteraction({frame,control:actual,session:s,value,now});assert.ok(result,action);if(result.targetId||result.back){const dest=navigateInteractiveSession(s,result.targetId,{catalogue,back:result.back,replace:result.replace});assert.ok(dest,'Valid destination '+JSON.stringify(result));enter(dest);}else{prepareAppFrame({frame,session:s,now});frame=composeSourceComponents({...catalogue.get(frame.id),...appInteractiveFrames[frame.id]},s);}return result;};
 return{s,act,get frame(){return frame;},enter(id){navigateInteractiveSession(s,id,{catalogue});return enter(id);}};
}
test('the actual Flow OA chooser stays available and selects the correct1/2OA confirmation branches',()=>{
 const h=flowHarness();h.act('app.oa.plus');assert.equal(h.s.values['app.send.oaCount'],2);h.act('app.oa.plus');assert.equal(h.s.values['app.send.oaCount'],2);assert.equal(h.act('app.send.next').targetId,'1635:105774');h.act('app.navigate',undefined,{route:'send-ready'});assert.equal(h.frame.id,'1635:105527');assert.equal(h.s.values['app.send.oaCount'],2);h.act('app.oa.minus');assert.equal(h.act('app.send.next').targetId,'1635:109001');
});
test('new scheduling cancels without keeping a temporary date and saves the multiOA branch before committing',()=>{
 const h=flowHarness();h.act('app.oa.plus');h.act('app.send.next');const before=h.s.data.messages.length;h.act('app.schedule.open');assert.equal(h.frame.id,'1635:105895');h.act('app.back');assert.equal(h.frame.id,'1635:105774');assert.equal(h.s.values['app.send.schedule']||'','');assert.equal(Boolean(h.s.values['app.send.scheduled']),false);h.act('app.schedule.open');h.act('app.schedule.save');assert.equal(h.frame.id,'1635:105774');h.act('app.send.confirm');assert.equal(h.frame.id,'1635:106187');assert.equal(h.s.data.messages.length,before+1);assert.equal(h.s.data.messages[0].oaCount,2);h.act('app.navigate',undefined,{route:'detail'});assert.equal(h.frame.id,'1635:109272');h.act('app.schedule.edit');assert.equal(h.frame.id,'1635:109376');
});
test('security OTP purpose routes to fingerprint or change-password instead of password recovery',()=>{
 const h=flowHarness('1635:110138');h.act('app.fingerprint');assert.equal(h.frame.id,'1635:110403');h.act('app.otp','123456');assert.equal(h.frame.id,'1635:110452');h.act('app.fingerprint.verify');assert.equal(h.frame.id,'1635:110629');h.act('app.navigate');assert.equal(h.frame.id,'1635:110138');h.act('app.navigate',undefined,{route:'password'});assert.equal(h.frame.id,'1635:112161');h.act('app.otp','123456');assert.equal(h.frame.id,'1635:112210');
});
test('Flow buttons with stale master links return to their actual Flow counterparts',()=>{
 const h=flowHarness('1635:110779');const back=h.frame.controls.find(c=>c.label==='Quay lại');h.act(back.action,undefined,{...back});assert.equal(h.frame.id,'1635:110138');h.enter('1635:106187');const overview=h.frame.controls.find(c=>c.label==='Tổng quát');h.act(overview.action,undefined,{...overview});assert.equal(h.frame.id,'1635:105349');
});

test('profile edits commit only after the actual loading overlay completes and cancel restores the view',()=>{
 const h=flowHarness('1635:110900'),old=h.s.data.profile.name;h.act('app.input','Lan',{field:'app.profile.name'});h.act('app.profile.save');assert.equal(h.frame.id,'1635:112035');assert.equal(h.frame.controls.length,0);assert.equal(h.s.data.profile.name,old);assert.ok(h.frame.texts.some(t=>t.field==='app.profile.name'));h.act('app.profile.finish');assert.equal(h.frame.id,'843:50893');assert.equal(h.s.data.profile.name,'Lan');
 const cancel=flowHarness('1635:110900');const original=cancel.s.values['app.profile.name'];cancel.act('app.input','Tên chưa lưu',{field:'app.profile.name'});cancel.act('app.back');assert.equal(cancel.frame.id,'843:50360');assert.equal(cancel.s.values['app.profile.name'],original);assert.equal(cancel.s.data.mobile?.profile,undefined);
});
test('email verification and profile update use the supplied code-sent and loading states',()=>{
 const h=flowHarness('1635:111726');assert.equal(h.frame.profileContact,'email');h.act('app.input','Minh',{field:'app.profile.name'});h.act('app.profile.verify.send');assert.equal(h.frame.id,'891:1762');assert.equal(h.frame.codeCountdown,true);h.act('app.input','123456',{field:'app.profile.verification'});h.act('app.profile.save');assert.equal(h.frame.id,'1635:111940');h.act('app.profile.finish');assert.equal(h.frame.id,'843:50893');assert.match(h.s.data.profile.email,/@/);
});
test('unfinished requests cannot reuse a different draft snapshot',()=>{
 const h=flowHarness();h.act('app.send.next');h.act('app.send.confirm');assert.equal(h.frame.id,'1635:109115');const job=h.s.data.pendingSubmission;h.enter('1635:105527');h.act('app.input','0987654321',{field:'app.send.phone'});h.act('app.send.next');const blocked=h.act('app.send.confirm');assert.equal(blocked.focusField,'app.send.phone');assert.equal(h.s.data.pendingSubmission,job);assert.equal(job.input.phone.replace(/\s/g,''),'0332225555');
});

test('the standard immediate-send journey uses real login/send/processing/result/detail controls',()=>{
 const h=flowHarness('1635:105270');h.act('app.input','demo',{field:'app.auth.username'});h.act('app.input','Demo1234!',{field:'app.auth.password'});h.act('app.login');assert.equal(h.frame.id,'1635:105349');h.act('app.navigate',undefined,{route:'send'});assert.equal(h.frame.id,'1635:105527');assert.equal(h.s.data.draft.outcome,'sent');h.act('app.send.next');assert.equal(h.frame.id,'1635:109001');h.act('app.send.confirm');assert.equal(h.frame.id,'1635:109115');const job=h.s.data.pendingSubmission;assert.equal(h.act('app.copy').copy,job.messageId);h.act('app.send.finish');assert.equal(h.frame.id,'1635:109243');h.act('app.navigate',undefined,{route:'detail'});assert.equal(h.frame.id,'1635:109806');assert.equal(h.s.data.messages[0].id,job.messageId);assert.equal(h.s.data.messages[0].status,'sent');
});

test('countdown tick keeps code entry in place and returns the resend button when its minute ends',()=>{
 const h=flowHarness('1635:111726');h.act('app.profile.verify.send');assert.equal(h.frame.id,'891:1762');h.act('app.profile.verify.tick');assert.equal(h.frame.id,'891:1762');assert.equal(h.s.values['app.profile.code.seconds'],'60');h.s.context.appProfileCodeSentAt=now-60000;h.act('app.profile.verify.tick');assert.equal(h.frame.id,'1635:111726');assert.ok(h.frame.controls.some(c=>c.action==='app.profile.verify.send'));
});
test('profile loading can be abandoned without committing an old pending edit later',()=>{
 const h=flowHarness('1635:110900'),name=h.s.data.profile.name;h.act('app.input','Không lưu',{field:'app.profile.name'});h.act('app.profile.save');h.enter('1635:110138');assert.equal(h.s.context.appPendingProfile,undefined);assert.equal(h.s.data.profile.name,name);h.enter('1635:112035');h.act('app.profile.finish');assert.equal(h.frame.id,'843:50360');assert.equal(h.s.data.profile.name,name);
});
test('a scheduled record exposes its actual new ID and a working native copy icon',()=>{
 const h=flowHarness();h.act('app.send.next');h.act('app.schedule.open');h.act('app.schedule.save');h.act('app.send.confirm');h.act('app.navigate',undefined,{route:'detail'});assert.equal(h.frame.id,'1635:109272');assert.ok(h.frame.texts.some(t=>t.field==='app.detail.id'));assert.equal(h.act('app.copy').copy,h.s.data.selectedId);
});

test('saving or canceling an overlay closes its history entry instead of bringing the modal back later',()=>{
 const h=flowHarness();h.act('app.send.next');h.act('app.schedule.open');h.act('app.schedule.save');assert.equal(h.frame.id,'1635:109001');assert.notEqual(h.s.history.at(-1),'1635:105895');h.act('app.send.confirm');h.act('app.navigate',undefined,{route:'detail'});h.act('app.schedule.edit');h.act('app.schedule.hour','11');h.act('app.schedule.save');assert.equal(h.frame.id,'1635:109272');assert.notEqual(h.s.history.at(-1),'1635:109376');
});
test('password changes and delete-data confirmations return to their parent screens without fake send successes',()=>{
 const h=flowHarness('1635:110138');h.act('app.navigate',undefined,{route:'password'});h.act('app.otp','123456');h.act('app.input','Old1234!',{field:'app.password.current'});h.act('app.input','New1234!',{field:'app.password.next'});h.act('app.input','New1234!',{field:'app.password.confirm'});h.act('app.password.save');assert.equal(h.frame.id,'1635:110138');assert.equal(h.s.context.appPasswordChanged,true);h.act('app.navigate',undefined,{route:'data'});h.act('app.delete.open',undefined,{value:'data'});assert.equal(h.frame.id,'1635:110281');h.act('app.delete.confirm');assert.equal(h.frame.id,'1112:77043');h.act('app.navigate');assert.equal(h.frame.id,'1112:76654');assert.notEqual(h.s.history.at(-1),'1112:77043');assert.equal(h.s.data.messages.length,0);
});

test('opening a result directly from the31-frame picker keeps its source detail branch',()=>{
 for(const [id,detail]of [['1635:106187','1635:109272'],['1635:109243','1635:109806'],['1635:109948','1635:109806'],['1635:112281','1635:109806']]){const h=flowHarness(id);h.act('app.navigate',undefined,{route:'detail'});assert.equal(h.frame.id,detail,id);}
});

test('direct source scheduled detail edits its own record and cancellation cannot erase a Web selection',()=>{
 const edit=flowHarness('1635:109272');edit.act('app.schedule.edit');edit.act('app.schedule.hour','11');edit.act('app.schedule.save');assert.equal(edit.frame.id,'1635:109272');assert.match(edit.s.values['app.detail.time'],/20\/11\/2026 11:30/);assert.equal(edit.s.data.selectedId,'SCH-6472');assert.equal(edit.s.data.mobile.fixtures.find(m=>m.id==='SCH-6472').schedule,edit.s.values['app.detail.schedule']);
 const direct=flowHarness('1635:109376');direct.act('app.schedule.hour','11');direct.act('app.schedule.save');assert.equal(direct.frame.id,'1635:109272');assert.match(direct.s.values['app.detail.time'],/11:30/);
 const cancel=flowHarness('1635:109272'),webId=cancel.s.data.selectedId;cancel.act('app.schedule.cancel');assert.ok(cancel.s.data.messages.some(m=>m.id===webId));assert.equal(cancel.s.data.mobile.fixtures.some(m=>m.id==='SCH-6472'),false);
});

test('a canceled source schedule cannot be recreated by reopening its frame in the picker',()=>{
 const h=flowHarness('1635:109272');h.act('app.schedule.cancel');h.enter('1635:109272');const result=h.act('app.schedule.edit');assert.equal(h.frame.id,'784:48201');assert.match(result.message,/không còn tồn tại/);assert.equal(h.s.data.mobile.fixtures.some(m=>m.id==='SCH-6472'),false);
});
