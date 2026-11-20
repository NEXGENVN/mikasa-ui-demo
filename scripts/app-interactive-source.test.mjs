import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const module=await import('./app-interactive-source.mjs').catch(error=>{if(error.code==='ERR_MODULE_NOT_FOUND')return{};throw error;});
const node=(id,type,name,bbox,extra={})=>({id,type,name,bbox,clippedBBox:bbox,visible:true,rendered:true,parentId:null,...extra});
const sourceFixtures=JSON.parse(fs.readFileSync(new URL('./fixtures/app-profile-controls-source.json',import.meta.url))).frames;
const sourceControls=()=>module.buildAppInteractiveFrames(sourceFixtures);
const messageFixtures=JSON.parse(fs.readFileSync(new URL('./fixtures/app-message-controls-source.json',import.meta.url))).frames;
const messageControls=()=>module.buildAppInteractiveFrames(messageFixtures);

test('recorded IP values and send/open times follow their actual owning source labels',()=>{
 const frames=messageControls();
 for(const id of ['1308:7105','1309:7446','1430:87138','1450:9130']){
  const frame=frames[id],fields=frame.texts;
  assert.equal(fields.filter(s=>s.field==='app.detail.phone').length,1,id+' recipient is unique');
  for(const key of ['ipv4','ipv6','port','provider'])assert.equal(fields.filter(s=>s.field==='app.recorded.'+key).length,1,id+' '+key);
  assert.equal(fields.filter(s=>s.field==='app.detail.time').length,1,id+' send time');
  assert.equal(fields.filter(s=>s.field==='app.detail.openTime').length,1,id+' open time');
 }
});

test('native OA results expose five owned rows, separate counts, and exact source drawing rectangles',()=>{
 const frames=messageControls();
 for(const id of ['1308:6902','1308:7105','1309:7446','1450:9130']){
  const frame=frames[id];
  for(const key of ['successCount','failedCount','pendingCount'])assert.ok(frame.texts.some(s=>s.field==='app.detail.'+key),id+' '+key);
  for(let i=0;i<5;i++){
   assert.equal(frame.texts.filter(s=>s.field===`app.detail.oa.${i}.name`).length,1);
   assert.equal(frame.texts.filter(s=>s.field===`app.detail.oa.${i}.status`).length,1);
   assert.ok(frame.visibility.some(s=>s.field===`app.detail.oa.${i}.visible`));
  }
  assert.equal(frame.messageDrawing.oaRows.length,5);assert.equal(frame.messageDrawing.progress.box[2],328);assert.equal(frame.messageDrawing.progress.box[3],6);
 }
});

test('scheduled subtitle and timeline timestamps have dedicated source slots',()=>{
 const frame=messageControls()['1086:73413'];
 assert.equal(frame.texts.find(s=>s.field==='app.detail.statusDetail')?.text,'Dự kiến gửi lúc 09:00, 14/11/2026');
 assert.deepEqual(frame.texts.filter(s=>/^app\.detail\.timeline\./.test(s.field)).map(s=>s.field),['app.detail.timeline.0.time','app.detail.timeline.1.time']);
});

test('native history manifests preserve source status selection and individual icon/badge ownership',()=>{
 const frames=messageControls();
 for(const [id,status] of [['784:48201','all'],['1303:79880','sent'],['1303:80128','success'],['1303:80614','failed'],['1085:71117','scheduled']]){
  const frame=frames[id];assert.equal(frame.historyStatus,status,id);
  assert.ok(frame.messageDrawing.history.length>0);
  for(const row of frame.messageDrawing.history){assert.deepEqual(row.iconBox.slice(2),[35,35]);assert.deepEqual(row.badgeBox.slice(2),[70,25]);}
 }
});

test('history visibility owns the complete native row drawing even when its hit area is clipped at the bottom bar',()=>{
 const frame=messageControls()['784:48201'],last=frame.controls.filter(c=>c.action==='app.history.detail').at(-1);
 assert.equal(last.box[3],44,'interactive hit area remains clipped');
 assert.deepEqual(frame.visibility.find(r=>r.id===last.id).box,[12,712,358,65],'drawing includes the full native card outline');
});

test('multi-OA confirmation binds native totals and only the secondary allocation row without moving text',()=>{
 const frames=messageControls();
 for(const id of ['1313:75767','1430:88099','1635:105774']){
  const source=messageFixtures.find(f=>f.id===id),frame=frames[id],expected={oaCountDisplay:'2 OA',totalMessages:'4 tin',extraOA:'OA phụ 1 ',extraAllocation:'1 tin V4 + 1 tin V6'};
  for(const [key,text]of Object.entries(expected)){
   const slots=frame.texts.filter(s=>s.field==='app.send.'+key);assert.equal(slots.length,1,id+' '+key);
   const slot=slots[0],node=source.nodes.find(n=>n.id===slot.id);assert.equal(slot.text,text);assert.deepEqual(slot.box,node.bbox);assert.deepEqual(slot.font,node.font);
  }
  const secondary=source.nodes.find(n=>n.name==='Secondary Operator'),allocation=frame.texts.find(s=>s.field==='app.send.extraAllocation');
  assert.equal(source.nodes.find(n=>n.id===allocation.id).parentId,secondary.parentId,id+' secondary row owns its allocation');
  const primary=source.nodes.find(n=>n.name==='Primary Operator'),primaryAllocation=source.nodes.find(n=>n.name==='Allocation Details'&&n.parentId===primary.parentId);
  assert.ok(!frame.texts.some(s=>s.id===primaryAllocation.id),'primary one-OA allocation remains literal source');
 }
});

test('both native send-mode rows own clickable labels and icons even without a prototype action',()=>{
 const frames=messageControls();
 for(const id of ['1279:8766','1430:88175','1635:109001','1313:75767','1430:88099','1635:105774']){
  const source=messageFixtures.find(f=>f.id===id),frame=frames[id];
  for(const [text,action]of [['Gửi ngay','app.schedule.now'],['Hẹn giờ gửi','app.schedule.open']]){
   const label=source.nodes.find(n=>n.type==='TEXT'&&n.text===text),owner=source.nodes.find(n=>n.id===source.nodes.find(n=>n.id===label.parentId).parentId);
   if(text==='Gửi ngay'&&['1279:8766','1430:88175','1635:109001'].includes(id))assert.equal((owner.prototypeInteractions||[]).length,0,'actual source has no immediate-row prototype');
   const buttons=frame.controls.filter(c=>c.type==='button'&&c.action===action&&c.id===owner.id);assert.equal(buttons.length,1,id+' '+text);
   assert.deepEqual(buttons[0].box,owner.bbox);assert.equal(buttons[0].label,text);
   assert.ok(frame.controls.some(c=>c.type==='radio'&&c.action===action),'native circle remains independently interactive');
  }
 }
});
test('App controls preserve source rectangles and label based semantics for nested component inputs and login',()=>{
 assert.equal(typeof module.buildAppInteractiveFrames,'function','App source control builder is required');
 const f={id:'658:1036',name:'A1',platform:'app',theme:'light',group:'Light mode app',width:390,height:844,nodes:[
  node('username','INSTANCE','Input Field',[24,341,342,46]),node('username-text','TEXT','value',[38,353.5,207,21],{parentId:'username',text:'Email hoặc tên đăng nhập',font:{family:'Inter',size:14}}),
  node('password','INSTANCE','Input Field',[24,397,342,46]),node('password-text','TEXT','value',[38,409.5,207,21],{parentId:'password',text:'Mật khẩu'}),
  node('button','FRAME','Buttons',[24,503,342,48],{prototypeInteractions:[{event:{interactionType:'ON_CLICK'},actions:[{navigationType:'NAVIGATE',transitionNodeID:{sessionID:658,localID:34375}}]}]}),node('label','TEXT','Label Text',[156.5,515,77,24],{parentId:'button',text:'Đăng nhập'})]};
 const out=module.buildAppInteractiveFrames([f])['658:1036'];const login=out.controls.find(c=>c.action==='app.login');assert.ok(login);assert.deepEqual(login.box,[24,503,342,48]);assert.equal(login.label,'Đăng nhập');assert.equal(out.controls.find(c=>c.field==='app.auth.password').inputType,'password');assert.ok(out.controls.find(c=>c.field==='app.auth.username').textSlots[0].font);
});
test('bottom navigation uses the actual component hit area and label, without inventing a navigation layout',()=>{
 assert.equal(typeof module.buildAppInteractiveFrames,'function');const f={id:'506:23873',name:'T1',platform:'app',theme:'light',width:390,height:844,nodes:[node('menu','INSTANCE','Menu button',[106,755.5,90,60]),node('text','TEXT','Label',[133.5,787,35,16],{parentId:'menu',text:'Gửi tin'})]};const out=module.buildAppInteractiveFrames([f])[f.id];const button=out.controls.find(c=>c.label==='Gửi tin');assert.deepEqual(button.box,[106,755.5,90,60]);assert.equal(button.action,'app.navigate');assert.equal(button.route,'send');
});
test('Lỗi frames are errors rather than history detail states',()=>{assert.equal(module.appFrameRoute({name:'Lỗi 1',family:'error',nodes:[]}),'error');});
test('scheduled detail action strips bind their two atomic source rectangles independently',()=>{
 const f={id:'1086:73413',name:'L2.5',platform:'app',theme:'light',width:390,height:844,nodes:[
  node('strip','FRAME','Button',[14,736,362,66]),
  node('edit','FRAME','Frame 427321891',[24,746,166,46],{parentId:'strip'}),node('edit-text','TEXT','Đổi lịch',[80,757,54,24],{parentId:'edit',text:'Đổi lịch'}),
  node('cancel','FRAME','Frame 427321892',[200,746,166,46],{parentId:'strip'}),node('cancel-text','TEXT','Hủy lịch',[254,757,58,24],{parentId:'cancel',text:'Hủy lịch'})]};
 const out=module.buildAppInteractiveFrames([f])[f.id];assert.deepEqual(out.controls.filter(c=>c.action.startsWith('app.schedule.')).map(c=>[c.action,c.box]),[['app.schedule.edit',[24,746,166,46]],['app.schedule.cancel',[200,746,166,46]]]);
});
test('original Flow profile labels own their matching input column rather than nearby values',()=>{
 const out=sourceControls();
 for(const id of ['891:1762','1635:111726']){
  const controls=out[id].controls;
  assert.equal(controls.find(c=>c.value==='Vinhahihi@gmail.com')?.field,'app.profile.email',id+' Email label');
  assert.equal(controls.find(c=>c.box[0]===143&&c.type==='input')?.field,'app.profile.verification',id+' verification column');
  assert.equal(controls.filter(c=>c.field==='app.profile.phone').length,0,id+' has no phone field');
 }
 const normal=out['1635:110900'].controls;
 assert.deepEqual(normal.filter(c=>c.type==='input').map(c=>c.field),['app.profile.name','app.profile.phone','app.profile.email','app.profile.verification']);
});
test('original verification send action and clipped countdown are not editable inputs',()=>{
 const out=sourceControls(),send=out['1635:111726'].controls.find(c=>c.label==='Gửi');
 assert.equal(send?.type,'button');assert.equal(send?.action,'app.profile.verify.send');assert.deepEqual(send.box,[316,339,52,40]);
 const countdown=out['891:1762'].controls;
 assert.equal(countdown.some(c=>c.type==='input'&&c.box[0]===305&&c.box[1]===339),false);
 assert.equal(countdown.some(c=>c.type==='input'&&c.textSlots.some(s=>s.box[3]>100)),false);
});
test('required verification markers remain source labels rather than changing field identity',()=>{
 const field=sourceControls()['916:3226'].controls.find(c=>c.box[0]===143&&c.box[1]===600&&c.type==='input');
 assert.equal(field?.field,'app.profile.verification');assert.equal(field?.placeholder,'Mã xác thực');
});
test('native profile loading overlays block background fields and finish through a timer',()=>{
 const out=sourceControls();
 for(const id of ['1635:108310','1635:111940','1635:112035']){
  const frame=out[id];assert.equal(frame.route,'profile-loading',id);assert.deepEqual(frame.controls,[],id+' background is blocked');
  assert.equal(frame.timers.length,1);assert.equal(frame.timers[0].control.action,'app.profile.finish');
 }
 assert.equal(out['1635:112035'].timers[0].delay,1365.0000095367432);
 assert.equal(out['1635:112035'].timers[0].control.targetId,'843:50893');
});
test('blocked native profile loading fields retain dynamic source values behind their overlay',()=>{
 const out=sourceControls();
 for(const id of ['1635:108310','1635:111940','1635:112035']){
  const frame=out[id];assert.deepEqual(frame.controls,[]);
  const fields=frame.texts.map(slot=>slot.field);
  for(const field of ['name','email','verification','gender'])assert.ok(fields.includes('app.profile.'+field),id+' '+field);
  assert.ok(frame.texts.filter(slot=>slot.field.startsWith('app.profile.')).every(slot=>slot.box[3]<=40));
 }
 assert.ok(out['1635:112035'].texts.some(slot=>slot.field==='app.profile.phone'&&slot.text==='Số điện thoại'));
});
test('native code-sent countdown keeps original compound glyph ownership within its visible source clip',()=>{
 const frame=sourceControls()['891:1762'];assert.equal(frame.codeCountdown,true);
 const prefix=frame.texts.find(t=>t.field==='app.profile.code.prefix'),seconds=frame.texts.find(t=>t.field==='app.profile.code.seconds');
 assert.equal(prefix.text,'00:');assert.deepEqual(prefix.box,[321,355,17,10]);
 assert.equal(seconds.text.split('\n')[0],'60');assert.deepEqual(seconds.box,[338,355,14,835]);assert.deepEqual(seconds.sourceClipBox,[338,355,14,10]);
 const tick=frame.timers.find(t=>t.control.action==='app.profile.verify.tick');assert.equal(tick.delay,1000);assert.equal(tick.repeat,true);
 assert.equal(sourceControls()['1635:108310'].codeCountdown,undefined,'loading completion owns its lifecycle');
});
test('native processing exposes its copy and history buttons and binds the pending request ID',()=>{
 const frame={id:'1635:109115',name:'B 1.4.1',platform:'app',theme:'light',group:'Flow',width:390,height:844,nodes:[
  node('1635:109168','TEXT','Mã yêu cầu',[28,253,248,19],{text:'MKS-20260917-0191'}),
  node('1635:109169','FRAME','Sao chép mã tin',[284,242,78,28]),node('1635:109170','TEXT','Sao chép',[284,249,78,14],{parentId:'1635:109169',text:'Sao chép'}),
  node('1635:109216','FRAME','Submit Button',[16,757,358,40]),node('1635:109220','TEXT','Tiếp tục label',[167,765,86,24],{parentId:'1635:109216',text:'Về lịch sử'})]};
 const result=module.buildAppInteractiveFrames([frame])[frame.id],copy=result.controls.find(c=>c.action==='app.copy'),history=result.controls.find(c=>c.route==='history');
 assert.equal(copy?.field,'app.pending.id');assert.deepEqual(copy.box,[284,242,78,28]);assert.equal(history?.action,'app.navigate');assert.deepEqual(history.box,[16,757,358,40]);
 assert.ok(result.texts.some(t=>t.field==='app.pending.id'&&t.text==='MKS-20260917-0191'));
});
test('selected native Nam variant remains a single gender select rather than a duplicate verification input',()=>{
 const controls=sourceControls()['1456:12611'].controls;
 const gender=controls.filter(c=>c.field==='app.profile.gender');
 assert.equal(gender.length,1);assert.equal(gender[0].type,'select');assert.equal(gender[0].value,'Nam');
 assert.equal(controls.some(c=>c.type==='input'&&c.box[0]<130&&c.box[1]>400&&c.value==='Nam'),false);
 assert.equal(controls.filter(c=>c.field==='app.profile.verification').length,1);
});
test('canonical Flow SVG starts at one OA and limits source-backed choices to its MAX 2 permission',()=>{
 const frame=sourceControls()['1635:105527'],count=frame.controls.find(c=>c.field==='app.send.oaCount');
 assert.equal(frame.oaLimit,2);assert.equal(count.value,'1');assert.deepEqual(count.options.map(o=>o.value),['1','2']);
 const component=frame.componentStates[0];assert.equal(component.initialValue,'1');assert.deepEqual(Object.keys(component.states),['1','2']);
 assert.equal(component.states['2'].controls.find(c=>c.action==='app.oa.plus')?.disabled,true);
 assert.ok(frame.controls.some(c=>c.action==='app.oa.plus'&&c.box[0]===332));
 assert.equal(frame.controls.some(c=>c.action==='app.oa.minus'),false);
});
test('profile contact mode follows source labels and profile views keep their fields read-only',()=>{
 const out=sourceControls();
 assert.equal(out['1635:111726'].profileContact,'email');assert.equal(out['1635:108310'].profileContact,'email');
 assert.equal(out['1635:110900'].profileContact,'phone');assert.equal(out['1635:112035'].profileContact,'phone');
 const frame={...sourceFixtures.find(f=>f.id==='1635:110900'),name:'H1'},view=module.buildAppInteractiveFrames([frame])[frame.id];
 assert.equal(view.readOnly,true);assert.ok(view.controls.filter(c=>['input','select'].includes(c.type)).every(c=>c.readOnly===true));
});
test('send mode controls use native circle geometry and persistent boolean radio state',()=>{
 const frame={id:'1635:109001',name:'B1.4',platform:'app',theme:'light',group:'Flow',width:390,height:844,nodes:[
  node('now-row','FRAME','Gửi ngay',[28,530,120,22]),node('now','INSTANCE','chấm chọn quyền',[28,532,18,18],{parentId:'now-row',masterId:'604:31543'}),node('now-label','TEXT','Label',[54,530,65,22],{parentId:'now-row',text:'Gửi ngay'}),
  node('scheduled-row','FRAME','Hẹn giờ gửi',[28,562,140,24]),node('scheduled','INSTANCE','chấm chọn quyền',[28,565,18,18],{parentId:'scheduled-row',masterId:'604:31545'}),node('scheduled-label','TEXT','Label',[54,562,90,24],{parentId:'scheduled-row',text:'Hẹn giờ gửi'})]};
 const controls=module.buildAppInteractiveFrames([frame])[frame.id].controls.filter(c=>c.type==='radio');assert.equal(controls.length,2);
 for(const c of controls){assert.equal(c.field,'app.send.scheduled');assert.equal(c.activateOnClick,true);assert.deepEqual(c.box.slice(2),[18,18]);assert.match(c.checkedAsset,/interactive-app\/send-mode-checked\.[a-f0-9]{12}\.svg/);assert.match(c.uncheckedAsset,/interactive-app\/send-mode-unchecked\.[a-f0-9]{12}\.svg/);}
 assert.equal(controls.find(c=>c.action==='app.schedule.now').value,false);assert.equal(controls.find(c=>c.action==='app.schedule.now').checked,true);
 assert.equal(controls.find(c=>c.action==='app.schedule.open').value,true);assert.equal(controls.find(c=>c.action==='app.schedule.open').checked,false);
});
test('Flow account and privacy switches use their original App palettes rather than the general control masters',()=>{
 const frames=[{id:'1635:110138',name:'TK 1',platform:'app',theme:'light',group:'Flow',width:390,height:844,nodes:[node('fingerprint','INSTANCE','ON OFF',[316,471,50,26],{masterId:'540:24478'})]},
 {id:'1635:112462',name:'P1',platform:'app',theme:'light',group:'Flow',width:390,height:844,nodes:[node('notifications','INSTANCE','ON OFF',[311,365,48,26],{masterId:'557:34966'})]}];
 const out=module.buildAppInteractiveFrames(frames);
 for(const frame of Object.values(out)){const control=frame.controls[0];assert.match(control.checkedAsset,/assets\/interactive-app\/toggle-checked-/);assert.match(control.uncheckedAsset,/assets\/interactive-app\/toggle-unchecked-/);}
 assert.equal(out['1635:110138'].controls[0].value,false);assert.equal(out['1635:112462'].controls[0].value,true);
});
test('native fingerprint completion verifies the preference before opening its success state',()=>{
 const frame={id:'1635:110452',name:'ĐN 2',platform:'app',theme:'light',group:'Flow',width:390,height:844,nodes:[node('fingerprint-completion','INSTANCE','Fingerprint',[155,670,80,80],{prototypeInteractions:[{event:{interactionType:'AFTER_TIMEOUT',transitionTimeout:1.8350000381469727},actions:[{navigationType:'NAVIGATE',transitionNodeID:{sessionID:916,localID:2740}}]}]})]};
 const target={id:'916:2740',name:'ĐN 2.1',platform:'app',theme:'light',width:390,height:844,nodes:[]};
 const timers=module.buildAppInteractiveFrames([frame,target])[frame.id].timers;
 assert.equal(timers.length,1);assert.equal(timers[0].delay,1835.0000381469727);assert.equal(timers[0].control.action,'app.fingerprint.verify');assert.equal(timers[0].control.targetId,undefined);
});
