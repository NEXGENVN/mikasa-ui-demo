import test from 'node:test';
import assert from 'node:assert/strict';
import {handleWebInteraction,prepareWebFrame,initializeWebSourceData,filteredWebRows} from './web-interactive-controller.mjs';
import {createDemoState} from './core.mjs';
import {webInteractiveFrames} from './web-interactive-controls.mjs';
import {seedInteractiveValues,setInteractiveValue} from './interactive-session.mjs';
const session=()=>({data:{accounts:[],messages:[{id:'MK1',phone:'0912345678',status:'success',oa:'OA A',cost:100}],preferences:{},roles:[]},values:Object.create(null),dirty:new Set(),context:Object.create(null),history:[]});
test('system-error retry returns through session history or uses the source overview fallback',()=>{
 const s=session(),frame={targets:{overview:'portrait-overview'}},control={action:'web.retry',targetId:'portrait-overview'};
 assert.deepEqual(handleWebInteraction({frame,control,session:s}),{targetId:'portrait-overview'});s.history.push('portrait-accounts');assert.deepEqual(handleWebInteraction({frame,control,session:s}),{back:true});assert.deepEqual(s.history,['portrait-accounts']);
});
test('native GIF and message create actions persist the selected section channel',()=>{
 for(const [id,channel]of [['714:60246','GIF'],['714:60465','Tin nhắn']]){const s=session(),frame=webInteractiveFrames[id],control={action:'web.oa.add'};handleWebInteraction({frame,control,session:s});assert.equal(s.data.configurations[0].channel,channel);}
});
test('switching native role cards hydrates role-specific permissions before saving',()=>{
 const s=session(),frame=webInteractiveFrames['552:25880'],field='web.permission.department-permissions.xem';seedInteractiveValues(s,frame);prepareWebFrame({frame,session:s});assert.equal(s.values[field],true);setInteractiveValue(s,field,false);handleWebInteraction({frame,control:frame.controls.find(c=>c.field===field),session:s,value:false});
 const select=role=>{handleWebInteraction({frame,control:frame.controls.find(c=>c.action==='web.role.select'&&c.role===role),session:s});seedInteractiveValues(s,frame);prepareWebFrame({frame,session:s});};select('Branch Head');assert.equal(s.values[field],true);handleWebInteraction({frame,control:{action:'web.permissions.save'},session:s});assert.equal(s.data.permissions['Branch Head'][field],true);assert.equal(s.data.permissions.Director[field],false);select('Director');assert.equal(s.values[field],false);select('Branch Head');assert.equal(s.values[field],true);
});
test('account submit creates a persistent sample row and rejects a mismatched edit',()=>{
 const s=session();Object.assign(s.values,{'web.account.username':'new-admin','web.account.email':'new@example.com','web.account.password':'Aa123456!','web.account.phone':'0912345678','web.account.role':'Admin'});
 const result=handleWebInteraction({frame:{id:'64:4748',targets:{accounts:'64:3513'}},control:{action:'web.account.save'},session:s});
 assert.equal(s.data.accounts.length,1);assert.equal(s.data.accounts[0].username,'new-admin');assert.equal(result.targetId,'64:3513');
 s.context.accountId=s.data.accounts[0].id;s.values['web.account.email']='bad';
 const rejected=handleWebInteraction({frame:{id:'98:2568',scene:'account-edit'},control:{action:'web.account.save'},session:s});
 assert.equal(rejected.focusField,'web.account.email');assert.equal(s.data.accounts[0].email,'new@example.com');
});
test('filter and pagination update actual rows and CSV export uses the filtered data',()=>{
 const s=session();s.data.messages.push({id:'MK2',phone:'0988888888',status:'failed',oa:'OA B',cost:200});s.values['web.filter.history.query']='0912';
 handleWebInteraction({frame:{family:'history',scene:'history'},control:{action:'web.filter',field:'web.filter.history.query'},session:s,value:'0912'});
 const result=handleWebInteraction({frame:{family:'history'},control:{action:'web.export',format:'csv'},session:s});
 assert.match(result.download.text,/MK1/);assert.doesNotMatch(result.download.text,/MK2/);assert.equal(s.context.filteredRows.length,1);
});
test('MFA submission checks confirmation before enabling policy and device decisions persist',()=>{
 const s=session();Object.assign(s.values,{'web.security.password':'Aa123456!','web.security.confirm':'different','web.security.acknowledge':true});
 const rejected=handleWebInteraction({frame:{},control:{action:'web.security.save'},session:s});assert.equal(rejected.focusField,'web.security.confirm');assert.equal(s.data.preferences.adminMfa,undefined);
 s.values['web.security.confirm']='Aa123456!';handleWebInteraction({frame:{},control:{action:'web.security.save'},session:s});assert.equal(s.data.preferences.adminMfa,true);
 handleWebInteraction({frame:{},control:{id:'request1',action:'web.device.approve',recordId:'r1'},session:s});assert.equal(s.context.deviceDecisions.r1,'Đã duyệt');
});
test('changed table data projects into source slots and hides empty source row graphics',()=>{
 const s=session();s.data.accounts=[{id:1,username:'new-admin',name:'New Name',email:'new@example.com',active:true}];s.context.webChanged=true;
 const frame={family:'accounts',table:{pageSize:10,rows:[{index:0,visibilityField:'web.table.accounts.0.visible',slots:[{field:'name',column:'Tài khoản',part:0}]},{index:1,visibilityField:'web.table.accounts.1.visible',slots:[{field:'name2',column:'Tài khoản',part:0}]}]}};
 prepareWebFrame({frame,session:s});assert.equal(s.values.name,'New Name');assert.equal(s.values['web.table.accounts.0.visible'],true);assert.equal(s.values['web.table.accounts.1.visible'],false);assert.equal(s.values.name2,'');
});
test('CSV export preserves the existing spreadsheet formula escaping contract',()=>{
 const s=session();s.data.messages[0].template='=HYPERLINK("bad")';const result=handleWebInteraction({frame:{family:'history'},control:{action:'web.export',format:'csv'},session:s});assert.match(result.download.text,/'=HYPERLINK/);
});
test('OA row selection and report metrics update original source text fields',()=>{
 const s=session();s.data.configurations=[{id:'oa1',name:'OA mới',channel:'OA',status:'Hoạt động',updated:'19/11/2026'}];
 handleWebInteraction({frame:{family:'oa'},control:{action:'web.oa.open',recordIndex:0},session:s});prepareWebFrame({frame:{family:'oa',texts:[{field:'web.oa.detail.name'}]},session:s});assert.equal(s.values['web.oa.detail.name'],'OA mới');
 prepareWebFrame({frame:{family:'reports',metrics:[{field:'cost',kind:'cost'},{field:'sent',kind:'sent'}]},session:s});assert.equal(s.values.sent,'1');assert.match(s.values.cost,/100/);
});
test('role menu edits the chosen role and deletion persists in source card projection',()=>{
 const s=session();const frame={family:'settings',targets:{roleCreate:'role-create'},roleCards:[{name:'Director',index:0,field:'role0',visibilityField:'visible0'}]};prepareWebFrame({frame,session:s});
 const edit=handleWebInteraction({frame,control:{action:'web.role.menu',role:'Director'},session:s,value:'edit'});assert.equal(edit.targetId,'role-create');assert.equal(s.values['web.role.name'],'Director');
 handleWebInteraction({frame,control:{action:'web.role.menu',role:'Director'},session:s,value:'delete'});prepareWebFrame({frame,session:s});assert.equal(s.values.visible0,false);
});
test('account detail projection preserves native labels and confirmation prose around edited values',()=>{
 const s=session();s.data.accounts=[{id:1,name:'Trần Quốc Bảo',email:'bao@example.com'}];s.context.accountId=1;s.context.webChanged=true;prepareWebFrame({frame:{family:'accounts',texts:[{field:'web.account.detail.email',valuePrefix:'Email\n'},{field:'web.account.detail.name',valuePrefix:'Vô hiệu hóa ',valueSuffix:' ?'}]},session:s});assert.equal(s.values['web.account.detail.email'],'Email\nbao@example.com');assert.equal(s.values['web.account.detail.name'],'Vô hiệu hóa Trần Quốc Bảo ?');
});
test('recovery requires a valid registered phone format and exactly six OTP digits',()=>{
 const s=session();s.values['web.auth.phone']='123';assert.equal(handleWebInteraction({frame:{scene:'forgot'},control:{action:'web.auth.next'},session:s}).focusField,'web.auth.phone');s.values['web.auth.otp']='1234';assert.equal(handleWebInteraction({frame:{scene:'otp'},control:{action:'web.auth.next'},session:s}).focusField,'web.auth.otp');s.values['web.auth.otp']='123456';assert.equal(handleWebInteraction({frame:{scene:'otp'},control:{action:'web.auth.next',targetId:'new-password'},session:s}).targetId,'new-password');
});
test('initial Web search and detail use the literal Figma account data and preserve a new App message',()=>{
 const data=createDemoState();data.messages.unshift({id:'MK1001',phone:'0999999999',status:'success',template:'App-created'});initializeWebSourceData(data);const s={...session(),data};s.values['web.filter.accounts.query']='minhanh_01';const rows=filteredWebRows(s,'accounts');assert.equal(rows.length,1);assert.equal(rows[0].name,'Nguyễn Minh Anh');assert.equal(rows[0].email,'minhanh@gmail.com');assert.ok(data.messages.some(m=>m.id==='MK1001'));assert.ok(data.messages.some(m=>m.id.startsWith('source-web-')&&m.displayId==='MK001'));
 handleWebInteraction({frame:{},control:{action:'web.account.open',recordIndex:0,targetId:'details'},session:s});assert.equal(s.values['web.account.email'],'minhanh@gmail.com');const length=data.accounts.length;data.accounts[0].email='changed@example.com';initializeWebSourceData(data);assert.equal(data.accounts.length,length);assert.equal(data.accounts[0].email,'changed@example.com');
});
test('row actions use the visible page and history details project the selected record into native slots',()=>{
 const s=session();s.data.accounts=Array.from({length:20},(_,i)=>({id:i+1,username:'user'+(i+1),email:'user'+(i+1)+'@example.com'}));s.context.webPage=2;handleWebInteraction({frame:{table:{pageSize:10}},control:{action:'web.account.open',recordIndex:0},session:s});assert.equal(s.context.accountId,11);
 s.data.messages=Array.from({length:20},(_,i)=>({id:'row'+i,displayId:'MK'+i,phone:'09000000'+i,time:'19/11/2026',status:'success',template:'Template '+i,ipv4:'192.0.2.'+i}));handleWebInteraction({frame:{table:{pageSize:15}},control:{action:'web.history.open',recordIndex:0},session:s});assert.equal(s.context.messageId,'row15');s.context.webChanged=true;prepareWebFrame({frame:{family:'history',texts:[{field:'web.history.detail.phone',dataField:'phone'},{field:'web.history.detail.id',dataField:'displayId'}]},session:s});assert.equal(s.values['web.history.detail.phone'],'0900000015');assert.equal(s.values['web.history.detail.id'],'MK15');assert.equal(handleWebInteraction({frame:{},control:{action:'web.copy',copyField:'ipv4',value:'old native IP'},session:s}).copy,'192.0.2.15');
});
test('unfiltered report export uses the displayed source aggregate and incorporates a new App send',()=>{
 const data=createDemoState();initializeWebSourceData(data,{accounts:[],configurations:[],messages:[{id:'source-web-message-0',displayId:'MK001',status:'success',cost:817}],report:{sent:24860,success:23914,cost:20320000,average:817,byOa:[{name:'OA chính',sent:24860,cost:20320000}],metricTexts:{}}});const s={...session(),data};let result=handleWebInteraction({frame:{family:'reports'},control:{action:'web.export',format:'csv'},session:s});assert.match(result.download.text,/20320000/);s.data.messages.push({id:'MK1001',status:'success',oa:'OA chính',cost:4000});result=handleWebInteraction({frame:{family:'reports'},control:{action:'web.export',format:'csv'},session:s});assert.match(result.download.text,/20324000/);
});
test('collapsing the editor preserves typed values and edits the same account in the native compact form',()=>{
 const s=session();s.data.accounts=[{id:1,username:'old',name:'Native user',email:'old@example.com'}];s.context.accountId=1;Object.assign(s.values,{'web.account.username':'edited','web.account.email':'edited@example.com','web.account.password':'','web.account.phone':'0912345678'});handleWebInteraction({frame:{scene:'accountEdit'},control:{action:'web.sidebar',sourceScene:'accountEdit',targetId:'compact-form'},session:s});prepareWebFrame({frame:{family:'accounts',scene:'accountCreate'},session:s});assert.equal(s.values['web.account.scene.title'],'Chỉnh sửa Admin');assert.equal(s.values['web.account.username'],'edited');const result=handleWebInteraction({frame:{scene:'accountCreate',targets:{accountDetail:'details'}},control:{action:'web.account.save',targetId:'list'},session:s});assert.equal(result.targetId,'details');assert.equal(s.data.accounts.length,1);assert.equal(s.data.accounts[0].id,1);assert.equal(s.data.accounts[0].email,'edited@example.com');
});
test('native abbreviated role filtering and collapsed create keep their intended business operation',()=>{
 const s={...session(),data:createDemoState()};const list=webInteractiveFrames['64:3513'];prepareWebFrame({frame:list,session:s});const role=list.controls.find(c=>c.field==='web.filter.accounts.role');s.values[role.field]='QL hệ thống';handleWebInteraction({frame:list,control:role,session:s,value:'QL hệ thống'});assert.ok(filteredWebRows(s,'accounts').some(a=>a.username==='quocbao_02'));
 const empty=webInteractiveFrames['714:58440'],create=empty.controls.find(c=>c.label==='Tạo tài khoản');handleWebInteraction({frame:empty,control:create,session:s});Object.assign(s.values,{'web.account.username':'figma_demo_19','web.account.email':'figma_demo_19@example.com','web.account.password':'Aa123456!','web.account.phone':'0912345678','web.account.role':'Super Admin'});const form=webInteractiveFrames['714:55346'];const result=handleWebInteraction({frame:form,control:form.controls.find(c=>c.action==='web.account.save'),session:s});assert.equal(s.data.accounts.length,31);assert.equal(s.data.accounts[0].username,'figma_demo_19');assert.match(result.message,/Tạo tài khoản/);assert.equal(filteredWebRows(s,'accounts').length,31);
});
test('portrait live search projects one native account row and hides nine rows without requesting a reload',()=>{
 const s={...session(),data:createDemoState()},frame=webInteractiveFrames['458:15284'];prepareWebFrame({frame,session:s});const input=frame.controls.find(c=>c.field==='web.filter.accounts.query');assert.equal(input.onInput,true);s.values[input.field]='minhanh';const result=handleWebInteraction({frame,control:input,session:s,value:'minhanh',eventType:'input'});assert.equal(result.repaint,false);prepareWebFrame({frame,session:s});assert.equal(s.context.filteredRows.length,1);assert.equal(s.context.filteredRows[0].username,'minhanh_01');assert.equal(frame.table.rows.filter(r=>s.values[r.visibilityField]===false).length,9);assert.match(s.values[frame.table.countField],/1 tài khoản/);assert.equal(s.values[frame.table.rows[1].slots[0].field],'');
});

test('opening the other Web orientation for the first time projects already changed shared sample records',()=>{
 const data=createDemoState(),horizontal={...session(),data},portrait={...session(),data};
 prepareWebFrame({frame:webInteractiveFrames['64:3513'],session:horizontal});
 data.accounts.unshift({id:999,username:'cross_orientation',name:'New sample account',email:'sample@example.com',role:'Quản trị viên',active:true});
 const frame=webInteractiveFrames['458:15284'];prepareWebFrame({frame,session:portrait});
 assert.equal(portrait.values[frame.table.rows[0].slots.find(s=>s.column==='Tài khoản'&&s.part===1).field],'cross_orientation');
 assert.match(portrait.values[frame.table.countField],/31 tài khoản/);
});

test('all native Web history tables and both detail orientations project and copy each selected IP exactly once',()=>{
 const expected4='14.238.43.142',expected6='2401:d800:8d9:ad64:48f6:7357:a9f0:4ce6';let checked=0;
 for(const [id,frame]of Object.entries(webInteractiveFrames)){
  const slots=frame.table?.rows?.[0]?.slots.filter(s=>/ipv/i.test(s.column));if(!slots?.length)continue;
  const s={...session(),data:createDemoState()};initializeWebSourceData(s.data);s.context.webChanged=true;s.values['web.filter.history.query']='MK002';prepareWebFrame({frame,session:s});
  for(const slot of slots)assert.equal(s.values[slot.field],expected4+'\n'+expected6,id);
  handleWebInteraction({frame,control:{action:'web.history.open',recordIndex:0},session:s});assert.equal(s.context.messageId,'source-web-message-1');
  const detail=webInteractiveFrames[frame.orientation==='portrait'?'98:3079':'557:50194'];prepareWebFrame({frame:detail,session:s});
  for(const slot of detail.texts.filter(t=>['ipv4','ipv6'].includes(t.dataField)))assert.equal(s.values[slot.field],slot.dataField==='ipv4'?expected4:expected6,id);
  for(const [copyField,expected]of [['ipv4',expected4],['ipv6',expected6]])assert.equal(handleWebInteraction({frame:detail,control:{action:'web.copy',copyField},session:s}).copy,expected,id);
  checked++;
 }
 assert.equal(checked,52);
});
