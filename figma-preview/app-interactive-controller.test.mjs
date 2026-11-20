import test from 'node:test';
import assert from 'node:assert/strict';
import {createDemoState} from './core.mjs';
import {nativeFrames} from './native-frames.mjs';
import {appInteractiveFrames} from './app-interactive-controls.mjs';
import {renderInteractiveFrame} from './interactive-preview.mjs';
const module=await import('./app-interactive-controller.mjs').catch(error=>{if(error.code==='ERR_MODULE_NOT_FOUND')return{};throw error;});
const session=()=>({data:createDemoState(),values:Object.create(null),dirty:new Set(),context:Object.create(null),history:[]});
const frame={id:'658:1036',name:'A1',theme:'light',group:'Light mode app',platform:'app'};
const now=Date.parse('2026-11-20T03:12:37Z');
const run=(s,action,value,extra={})=>module.handleAppInteraction({frame,session:s,control:{id:action,action,...extra},value,now});

test('login validates native fields and follows the labeled login operation despite the erroneous source link',()=>{
 assert.equal(typeof module.handleAppInteraction,'function','App source interaction controller is required');
 const s=session();assert.equal(run(s,'app.login').focusField,'app.auth.username');
 s.values['app.auth.username']='demo';s.values['app.auth.password']='secret';
 assert.equal(run(s,'app.login',undefined,{targetId:'658:34375'}).targetId,'506:23873');
 assert.equal(s.data.ui.route,'overview');
});

test('send validation, processing and repeated completion create exactly one persisted message',()=>{
 assert.equal(typeof module.handleAppInteraction,'function');const s=session(),before=s.data.messages.length;
 s.values['app.send.phone']='123';assert.equal(run(s,'app.send.next').focusField,'app.send.phone');
 Object.assign(s.values,{'app.send.phone':'0912345678','app.send.template':'Thông báo lịch hẹn','app.send.oaCount':'3'});
 assert.equal(run(s,'app.send.next').targetId,'1279:8766');
 assert.equal(run(s,'app.send.confirm').targetId,'778:89003');
 const done=run(s,'app.send.finish');assert.equal(done.targetId,'1279:8878');run(s,'app.send.finish');
 assert.equal(s.data.messages.length,before+1);const message=s.data.messages[0];assert.equal(message.phone,'0912345678');assert.equal(message.oaCount,3);assert.equal(message.template,'Thông báo lịch hẹn');assert.equal(s.data.selectedId,message.id);
});

test('profile edits persist in the common sample model across source frames',()=>{
 assert.equal(typeof module.handleAppInteraction,'function');const s=session();Object.assign(s.values,{'app.profile.name':'Lan','app.profile.email':'lan@example.com','app.profile.phone':'0901234567','app.profile.gender':'Nữ'});
 assert.equal(run(s,'app.profile.save').targetId,'843:50893');assert.equal(s.data.profile.name,'Lan');assert.equal(s.data.mobile.profile.gender,'Nữ');
});

test('theme and schedule actions retain canonical Flow identity and sample state',()=>{
 assert.equal(typeof module.handleAppInteraction,'function');const s=session();const result=module.handleAppInteraction({frame:{...frame,id:'1635:110779',group:'Flow'},session:s,control:{action:'app.theme',value:'dark'}});assert.equal(s.data.ui.theme,'dark');assert.equal(result.targetId,'1450:10174');
 const next=module.handleAppInteraction({frame:{...frame,id:'1635:105527',group:'Flow'},session:s,control:{action:'app.navigate',route:'confirm'}});assert.equal(next.targetId,'1635:109001');
});

test('actual native Flow grouping and dark source theme take precedence over the shell theme',()=>{
 assert.equal(typeof module.handleAppInteraction,'function');const s=session();
 const flow=nativeFrames.find(f=>f.id==='1635:105527');assert.ok(flow);assert.equal(module.handleAppInteraction({frame:flow,session:s,control:{action:'app.navigate',route:'confirm'}}).targetId,'1635:109001');
 const dark=nativeFrames.find(f=>f.id==='1430:85737');assert.ok(dark);assert.equal(s.data.ui.theme,'light');assert.equal(module.handleAppInteraction({frame:dark,session:s,control:{action:'app.navigate',route:'send'}}).targetId,'1430:86270');
});

test('unknown controls return null for exact generic prototype fallback',()=>{
 assert.equal(typeof module.handleAppInteraction,'function');assert.equal(run(session(),'prototype.navigate'),null);
});
test('canceling a schedule edit cannot redirect a later new-send schedule into the old message',()=>{
 const s=session(),scheduled={id:'MK1001',phone:'0901234567',template:'Mẫu gốc',status:'scheduled',oaCount:1,schedule:'2030-12-01T10:00:00.000Z'};s.data.messages.unshift(scheduled);s.data.selectedId=scheduled.id;s.history.push('1086:73413');
 const detail={...frame,id:'1086:73413',route:'detail'},calendar={...frame,id:'1279:8468',route:'schedule'};
 const action=(f,action,value)=>module.handleAppInteraction({frame:f,session:s,control:{action},value,now});
 action(detail,'app.schedule.edit');action(calendar,'app.schedule.hour','20');assert.deepEqual(action(calendar,'app.back'),{back:true});
 s.values['app.send.phone']='0987654321';s.values['app.send.oaCount']=1;action({...frame,route:'send-choice'},'app.schedule.open');
 const saved=action(calendar,'app.schedule.save');assert.equal(saved.targetId,'1279:8597');assert.equal(scheduled.schedule,'2030-12-01T10:00:00.000Z');
});
test('new-send scheduling replaces an abandoned edit transaction even without a back action',()=>{
 const s=session();s.data.messages.unshift({id:'MK1001',status:'scheduled',phone:'0901234567',oaCount:1,schedule:'2030-12-01T10:00:00.000Z'});s.data.selectedId='MK1001';
 run(s,'app.schedule.edit');s.values['app.send.phone']='0987654321';s.values['app.send.oaCount']=1;run(s,'app.schedule.open');
 assert.equal(run(s,'app.schedule.save').targetId,'1279:8597');assert.equal(s.data.messages[0].schedule,'2030-12-01T10:00:00.000Z');
});
test('editing a mobile sample record persists and canceling it removes it from subsequent history',()=>{
 const s=session();s.data.selectedId='figma-1';run(s,'app.schedule.edit');run(s,'app.schedule.hour','20');
 assert.equal(run(s,'app.schedule.save').targetId,'1086:73413');
 run(s,'app.history.detail',undefined,{rowIndex:0});assert.match(s.values['app.detail.schedule'],/T13:/);
 run(s,'app.schedule.cancel');run(s,'app.history.filter',undefined,{value:'all'});assert.ok(!s.context.appHistoryRows.includes('figma-1'));
});
test('editing a scheduled fixture projects its new Bangkok send time into the actual detail source slot',()=>{
 const s=session();s.data.mobile={fixtures:[{id:'figma-1',phone:'0901234567',template:'Mẫu',status:'scheduled',oaCount:1,time:'14/11/2026 09:00',schedule:'2026-11-21T10:00:00.000Z'}]};s.data.selectedId='figma-1';
 run(s,'app.schedule.edit');run(s,'app.schedule.hour','20');assert.equal(run(s,'app.schedule.save').targetId,'1086:73413');
 const detail={...nativeFrames.find(f=>f.id==='1086:73413'),...appInteractiveFrames['1086:73413']};module.prepareAppFrame({frame:detail,session:s});
 assert.equal(s.values['app.detail.time'],'21/11/2026 20:00');assert.equal(s.data.mobile.fixtures[0].time,'14/11/2026 09:00');
 assert.ok(detail.texts.some(slot=>slot.field==='app.detail.time'));assert.ok(renderInteractiveFrame(detail,s).includes('>21/11/2026 20:00</output>'));
});
test('completed message details retain their creation time even when a schedule is present',()=>{
 const s=session();s.data.messages.unshift({id:'MK1001',phone:'0901234567',template:'Mẫu',status:'success',oaCount:1,time:'14/11/2026 09:00',schedule:'2030-12-01T13:00:00.000Z'});s.data.selectedId='MK1001';
 run(s,'app.navigate',undefined,{route:'detail'});assert.equal(s.values['app.detail.time'],'14/11/2026 09:00');
});
test('a dark scheduled message opens the supplied dark scheduled detail original',()=>{
 assert.equal(module.appDetailFrameId({status:'scheduled',oaCount:1},{id:'1430:85737',theme:'dark'}),'1444:93591');
});
test('direct source back controls have a valid source fallback while populated history takes priority',()=>{
 const s=session();assert.equal(run(s,'app.back').targetId,'506:23873');
 const calendar={...frame,id:'1279:8468',route:'schedule'};assert.equal(module.handleAppInteraction({frame:calendar,session:s,control:{action:'app.back'}}).targetId,'1279:8766');
 s.history.push('843:50360');assert.deepEqual(module.handleAppInteraction({frame:calendar,session:s,control:{action:'app.back'}}),{back:true});
});
test('six-digit OTP, password confirmation and future scheduling use provided source states',()=>{
 const s=session();s.values['app.auth.recoveryPhone']='bad';assert.equal(run(s,'app.forgot.submit').focusField,'app.auth.recoveryPhone');s.values['app.auth.recoveryPhone']='0901234567';assert.equal(run(s,'app.forgot.submit').targetId,'658:34596');
 assert.equal(run(s,'app.otp','123456',{field:'app.auth.otp'}).targetId,'658:34855');
 Object.assign(s.values,{'app.reset.next':'ValidLong123!','app.reset.confirm':'different'});assert.equal(run(s,'app.reset.save').focusField,'app.reset.confirm');s.values['app.reset.confirm']='ValidLong123!';assert.equal(run(s,'app.reset.save').targetId,'658:35036');
 s.values['app.send.schedule']='2000-01-01T10:00';assert.equal(run(s,'app.schedule.save').focusField,'app.send.schedule');s.values['app.send.schedule']='2026-11-21T10:00';assert.equal(run(s,'app.schedule.save').targetId,'1279:8597');assert.equal(s.data.draft.scheduled,true);
});
test('history input keeps focus and hides every unmatched original row; fingerprint waits for verification',()=>{
 const s=session();s.values['app.history.query']='there-is-no-such-recipient';const changed=run(s,'app.input',undefined,{field:'app.history.query'});assert.equal(changed.repaint,false);assert.equal(s.values['app.history.count'],'0 tin nhắn');for(let i=0;i<7;i++)assert.equal(s.values[`app.history.${i}.visible`],false);
 s.values['app.preferences.fingerprint']=true;assert.equal(run(s,'app.fingerprint').targetId,'891:2144');assert.equal(s.values['app.preferences.fingerprint'],false);assert.equal(s.data.preferences.fingerprint,false);assert.equal(run(s,'app.fingerprint.verify').targetId,'916:2740');assert.equal(s.data.preferences.fingerprint,true);
});
test('actual selected message outcome and OA count choose their own source detail variants',()=>{
 const s=session();s.data.messages.unshift({id:'MK1001',phone:'0901234567',template:'Mẫu',time:'Vừa xong',status:'failed',oaCount:5});s.context.appHistoryRows=['MK1001'];assert.equal(run(s,'app.history.detail',undefined,{rowIndex:0,targetId:'784:48751'}).targetId,'1308:7021');
 assert.equal(module.appDetailFrameId({status:'success',oaCount:1},nativeFrames.find(f=>f.id==='1430:85737')),'1430:87138');assert.equal(module.appDetailFrameId({status:'partial',oaCount:5},frame),'1309:7446');
});
test('map actions zoom only within the native map and focus its existing source box',()=>{
 const s=session(),mapFrame={...frame,transforms:[{id:'map',box:[29,857,333,173],field:'app.detail.mapZoom',mode:'map'}]};
 for(let i=0;i<10;i++)module.handleAppInteraction({frame:mapFrame,session:s,control:{action:'app.map.zoom',value:.2}});assert.equal(s.values['app.detail.mapZoom'],1.6);
 const focused=module.handleAppInteraction({frame:mapFrame,session:s,control:{action:'app.map.focus'}});assert.equal(s.values['app.detail.mapZoom'],1.3);assert.deepEqual(focused.scrollToBox,[29,857,333,173]);
});
test('finishing a valid recipient reveals the original OA-count state before confirmation',()=>{
 const s=session();s.values['app.send.phone']='0912345678';const result=module.handleAppInteraction({frame:nativeFrames.find(f=>f.id==='734:77892'),session:s,control:{action:'app.input',field:'app.send.phone'}});assert.equal(result.targetId,'773:88074');assert.equal(s.data.draft.phone,'0912345678');
});
test('contact switching uses existing dark and Flow source variants',()=>{
 for(const [id,expected]of [['1456:12749','1456:12284'],['1635:110900','1635:111726']]){const s=session(),frame=nativeFrames.find(f=>f.id===id);assert.equal(module.handleAppInteraction({frame,session:s,control:{action:'app.profile.contact-switch'}}).targetId,expected);}
});
test('OA stepper updates in place and rejects non-numeric counts before corrupting the draft',()=>{
 const s=session();s.values['app.send.oaCount']='5';assert.equal(run(s,'app.oa.minus').repaint,false);assert.equal(s.data.draft.oaCount,4);s.values['app.send.oaCount']='x';const invalid=run(s,'app.input','x',{field:'app.send.oaCount'});assert.equal(invalid.focusField,'app.send.oaCount');assert.match(invalid.message,/1.*5/);assert.equal(s.data.draft.oaCount,4);
});
test('scheduled confirmation uses native selected-radio states and its result opens the scheduled detail',()=>{
 const s=session();Object.assign(s.data.draft,{scheduled:true,oaCount:3});assert.equal(run(s,'app.navigate',undefined,{route:'confirm'}).targetId,'1313:75767');s.data.messages.unshift({id:'MK1001',status:'scheduled',oaCount:3,phone:'0901234567'});s.data.selectedId='MK1001';assert.equal(run(s,'app.navigate',undefined,{route:'detail',targetId:'506:23873'}).targetId,'1086:73413');
});

test('save and confirmation reject tampered minutes and times beyond the inclusive fourteen-calendar-day limit',()=>{
 for(const iso of ['2026-11-21T04:09:00Z','2026-12-05T00:00:00Z','2026-11-20T03:00:00Z','2026-02-30T04:00:00Z']){
  const s=session(),before=s.data.messages.length;Object.assign(s.values,{'app.send.schedule':iso,'app.send.scheduled':true});
  assert.equal(run(s,'app.schedule.save').focusField,'app.send.schedule',iso);
  assert.equal(run(s,'app.send.confirm').focusField,'app.send.schedule',iso);
  assert.equal(s.data.pendingSubmission,undefined);assert.equal(s.data.messages.length,before);
 }
});

test('completion refuses an expired schedule and cannot persist a tampered pending schedule',()=>{
 const s=session(),before=s.data.messages.length;Object.assign(s.values,{'app.send.schedule':'2026-11-20T03:30:00Z','app.send.scheduled':true});
 assert.equal(run(s,'app.send.confirm').targetId,'778:89003');
 const expired=module.handleAppInteraction({frame,session:s,control:{action:'app.send.finish'},now:Date.parse('2026-11-20T03:30:00Z')});
 assert.equal(expired.focusField,'app.send.schedule');assert.equal(expired.targetId,'1279:8468');assert.equal(s.data.messages.length,before);
 const tampered=session();Object.assign(tampered.values,{'app.send.schedule':'2026-11-21T04:30:00Z','app.send.scheduled':true});run(tampered,'app.send.confirm');tampered.data.pendingSubmission.input={...tampered.data.pendingSubmission.input,schedule:'2026-11-21T04:59:00Z'};
 assert.equal(run(tampered,'app.send.finish').focusField,'app.send.schedule');assert.equal(tampered.data.messages.length,before);
});

test('an expired processing job can be rescheduled and completed without reusing its rejected snapshot',()=>{
 const s=session(),before=s.data.messages.length,later=Date.parse('2026-11-20T03:30:00Z');Object.assign(s.values,{'app.send.schedule':'2026-11-20T03:30:00Z','app.send.scheduled':true});run(s,'app.send.confirm');
 const action=(action)=>module.handleAppInteraction({frame,session:s,control:{action},now:later});
 assert.equal(action('app.send.finish').focusField,'app.send.schedule');assert.equal(s.data.pendingSubmission,undefined);assert.equal(s.context.appPendingJob,undefined);
 s.values['app.send.schedule']='2026-11-20T04:00:00Z';assert.equal(action('app.send.confirm').targetId,'778:89003');assert.equal(action('app.send.finish').targetId,'1086:73093');assert.equal(s.data.messages.length,before+1);assert.equal(s.data.messages[0].schedule,'2026-11-20T04:00:00.000Z');
});

test('direct edit entry normalizes the selected fixture and restores an unrelated unsaved draft on back',()=>{
 const s=session(),draft={...s.data.draft,schedule:'2026-11-23T04:00:00.000Z',scheduled:true};Object.assign(s.data.draft,draft);
 Object.assign(s.values,{'app.send.schedule':'2026-11-24T04:30:00.000Z','app.send.scheduled':true});s.context.appScheduleDate='2026-11-24T04:30:00.000Z';
 s.data.messages.unshift({id:'edit-me',status:'scheduled',phone:'0901234567',oaCount:1,schedule:'2020-01-01T04:09:00Z'});s.data.selectedId='edit-me';
 module.prepareAppFrame({frame:{...frame,route:'schedule',scheduleEdit:true},session:s,now});
 assert.equal(s.context.appScheduleDate,'2026-11-20T03:30:00.000Z');
 module.handleAppInteraction({frame:{...frame,route:'schedule'},session:s,control:{action:'app.back'},now});assert.deepEqual(s.data.draft,draft);assert.equal(s.values['app.send.schedule'],'2026-11-24T04:30:00.000Z');assert.equal(s.context.appScheduleDate,'2026-11-24T04:30:00.000Z');
});

test('an edit without a schedule seeds a future slot rather than another drafts selected date',()=>{
 const s=session();s.context.appScheduleDate='2026-11-24T04:30:00.000Z';s.data.messages.unshift({id:'no-date',status:'scheduled',phone:'0901234567',oaCount:1});s.data.selectedId='no-date';
 run(s,'app.schedule.edit');assert.equal(s.context.appScheduleDate,'2026-11-20T03:30:00.000Z');
});
