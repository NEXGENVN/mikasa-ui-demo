import test from 'node:test';
import assert from 'node:assert/strict';
import {buildWebInteractiveFrames,buildWebSourceRecords} from './build-web-interactive-controls.mjs';

const n=(id,name,type,box,parentId=null,text='')=>({id,sourceId:id,name,type,bbox:box,clippedBBox:box,parentId,text,rendered:true,visible:true,font:{family:'Roboto',style:'Regular',size:14,weight:400,lineHeight:20,baseline:15}});
test('native form input uses its actual nearby label instead of a misleading copied node name',()=>{
 const frames=[{id:'64:4748',platform:'web',group:'Web ngang',family:'accounts',name:'TK ngang 3',width:1440,height:1024,nodes:[
 n('root','Form','FRAME',[371,150,1050,700]),n('group','Password field','FRAME',[931,188,462,100],'root'),n('label','Mật khẩu','TEXT',[931,188,80,18],'group','Mật khẩu'),n('input','Tên đăng nhập input','FRAME',[931,210,462,58],'group'),n('text','Password placeholder','TEXT',[948,230,80,19],'input','********'),n('submit','Tạo tài khoản submit','FRAME',[1249,802,152,44],'root'),n('submitText','Button Label','TEXT',[1269,814,110,20],'submit','Tạo tài khoản')]}];
 const result=buildWebInteractiveFrames(frames)['64:4748'];
 const input=result.controls.find(c=>c.id==='input');
 assert.equal(input.field,'web.account.password');assert.equal(input.inputType,'password');assert.deepEqual(input.box,[931,210,462,58]);assert.equal(input.textSlots[0].text,'********');
 assert.equal(result.controls.find(c=>c.id==='submit').submit,true);
});
test('unrendered clipped menu options are not clickable overlays',()=>{
 const frames=[{id:'1:1',platform:'web',family:'accounts',group:'Web ngang',width:1440,height:1024,nodes:[n('filter','Trạng thái','INSTANCE',[400,200,110,30]),{...n('option','Button','FRAME',[400,240,110,30],'filter'),rendered:false,clippedBBox:[400,240,110,0]},n('t','Trạng thái','TEXT',[415,204,70,22],'filter','Trạng thái')]}];
 const result=buildWebInteractiveFrames(frames)['1:1'];
 assert.equal(result.controls.some(c=>c.id==='option'),false);
 assert.equal(result.controls.find(c=>c.id==='filter').type,'select');
});
test('Vietnamese login submit is actionable and a text link does not cover its neighboring checkbox',()=>{
 const frames=[{id:'67:1340',platform:'web',group:'Web ngang',family:'auth',width:1440,height:1024,nodes:[n('root','Login form','FRAME',[700,300,440,500]),n('button','Login Button','FRAME',[700,631.5,440,52],'root'),n('buttonText','Label','TEXT',[881.5,648,77,19],'button','Đăng nhập'),n('options','Options','FRAME',[700,587.5,440,24],'root'),n('remember','Remember','TEXT',[729,591.5,118,16],'options','Ghi nhớ đăng nhập'),n('forgot','Forgot link','TEXT',[1038,591.5,102,16],'options','Quên mật khẩu?')]}];
 const result=buildWebInteractiveFrames(frames)['67:1340'];assert.equal(result.controls.find(c=>c.action==='web.auth.login').submit,true);assert.deepEqual(result.controls.find(c=>c.targetId==='64:2776')?.box||result.controls.find(c=>c.label==='Quên mật khẩu?').box,[1038,591.5,102,16]);
});
test('table projection binds actual native cell slots and row visibility rather than drawing replacement rows',()=>{
 const frames=[{id:'64:3513',platform:'web',group:'Web ngang',family:'accounts',width:1440,height:1024,nodes:[n('table','Daily summary table','FRAME',[389,320,600,200]),n('h1','Header','INSTANCE',[389,320,100,43],'table'),n('h1t','Label','TEXT',[400,330,30,16],'h1','STT'),n('h2','Header','INSTANCE',[489,320,200,43],'table'),n('h2t','Label','TEXT',[500,330,80,16],'h2','Tài khoản'),n('r1c1','Cell','INSTANCE',[389,363,100,43],'table'),n('r1c1t','Label','TEXT',[400,373,20,16],'r1c1','1'),n('r1c2','Cell','INSTANCE',[489,363,200,43],'table'),n('r1c2t','Label','TEXT',[500,373,100,16],'r1c2','Source Name')]}];
 const frame=buildWebInteractiveFrames(frames)['64:3513'];assert.equal(frame.table.rows.length,1);assert.equal(frame.table.rows[0].slots.find(s=>s.column==='Tài khoản').text,'Source Name');assert.deepEqual(frame.visibility.find(v=>v.id==='r1c2').box,[489,363,200,43]);assert.equal(frame.controls.find(c=>c.id==='r1c2').action,'web.account.open');
});
test('a copied overview selector containing the native date placeholder remains a date filter',()=>{
 const frames=[{id:'1144:70434',platform:'web',group:'Web ngang',family:'overview',width:1440,height:1024,nodes:[n('date','Tổng quan','INSTANCE',[1040,275,300,30]),n('dateText','Label','TEXT',[1060,279,100,22],'date','DD/MM/YYYY')]}];
 const control=buildWebInteractiveFrames(frames)['1144:70434'].controls[0];assert.equal(control.type,'input');assert.equal(control.inputType,'date');assert.equal(control.field,'web.filter.overview.date');assert.equal(control.onChange,true);
});
test('source provider inputs below the fold declare scroll extent without revealing clipped component options',()=>{
 const input={...n('provider','API Key Input','FRAME',[394,1022,644,40]),rendered:false,clippedBBox:[394,1022,644,0],scrollRendered:true,scrollBBox:[394,1022,644,40]};const label={...n('providerText','Placeholder','TEXT',[410,1032,100,20],'provider','Khóa API ZNS mới'),rendered:false,clippedBBox:[410,1032,100,0],scrollRendered:true,scrollBBox:[410,1032,100,20]};
 const frames=[{id:'557:36756',platform:'web',group:'Web ngang',family:'oa',width:1440,height:1024,nodes:[input,label]}];const frame=buildWebInteractiveFrames(frames)['557:36756'];assert.equal(frame.controls[0].field,'web.oa.key');assert.ok(frame.scrollHeight>=1062);assert.deepEqual(frame.controls[0].box,[394,1022,644,40]);
});
test('partially clipped input text carries its exact effective native ancestor clip',()=>{
 const panel={...n('panel','Native clipped panel','FRAME',[371,150,1050,862]),clipsContent:true};
 const input={...n('provider','API Key Input','FRAME',[409,999,319,40],'panel'),scrollBBox:[409,999,319,13],scrollRendered:true};
 const label={...n('providerText','Placeholder','TEXT',[424,1008,52,22],'provider','Tài khoản'),scrollBBox:[424,1008,52,4],scrollRendered:true};
 const frame=buildWebInteractiveFrames([{id:'clipped',platform:'web',group:'Web ngang',family:'oa',width:1440,height:1024,nodes:[panel,input,label]}]).clipped;
 assert.deepEqual(frame.controls[0].box,[409,999,319,13]);
 assert.deepEqual(frame.controls[0].textSlots[0].sourceClipBox,[371,150,1050,862]);
});
test('a profile name and confirmation sentence use independent source slot values',()=>{
 const frames=[{id:'98:2356',platform:'web',group:'Web ngang',family:'accounts',width:1440,height:1024,nodes:[n('title','Page title','TEXT',[371,70,300,32],null,'Chi tiết tài khoản'),n('name','Full Name','TEXT',[450,220,200,24],null,'Nguyễn Minh Anh'),n('question','Question','TEXT',[470,450,500,24],null,'Bạn muốn vô hiệu hóa Nguyễn Minh Anh ?')]}];const texts=buildWebInteractiveFrames(frames)['98:2356'].texts.filter(t=>t.field.startsWith('web.account.detail.name'));assert.equal(texts.length,2);assert.notEqual(texts[0].field,texts[1].field);assert.equal(texts[1].valueSuffix,' ?');
});
test('recovery submits the source Tiếp button while static wizard step labels stay noninteractive',()=>{
 const frames=[{id:'64:2776',platform:'web',group:'Web ngang',family:'auth',width:1440,height:1024,nodes:[n('step','Step','FRAME',[881,321,50,50]),n('stepText','Nhãn bước Xác minh','TEXT',[881,357,50,14],'step','Xác minh'),n('next','Tiếp tục','FRAME',[610,653,620,50]),n('nextText','Tiếp tục label','TEXT',[869,668.5,102,19],'next','Tiếp')]}];const controls=buildWebInteractiveFrames(frames)['64:2776'].controls;assert.equal(controls.length,1);assert.equal(controls[0].id,'next');assert.equal(controls[0].action,'web.auth.next');assert.equal(controls[0].submit,true);
});
test('editing accounts uses the actual Cập nhật thay đổi submit label',()=>{
 const frames=[{id:'98:2568',platform:'web',group:'Web ngang',family:'accounts',width:1440,height:1024,nodes:[n('save','Tạo tài khoản submit','FRAME',[1249,802,152,44]),n('label','Tạo tài khoản submit label','TEXT',[1282,816.5,102,15],'save','Cập nhật thay đổi')]}];const c=buildWebInteractiveFrames(frames)['98:2568'].controls[0];assert.equal(c.action,'web.account.save');assert.equal(c.submit,true);
});
test('account-list sidebar collapse and expansion preserve the actual scene despite different frame numbering',()=>{
 const frames=[{id:'64:3513',name:'TK ngang 2',platform:'web',group:'Web ngang',family:'accounts',width:1440,height:1024,nodes:[n('sidebar','Sider bar ','INSTANCE',[16,0,331,1024]),n('toggle','sidebar-right','FRAME',[303,55,24,24],'sidebar'),n('title','Page title','TEXT',[371,70,329,32],null,'Tài khoản Admin'),n('list','Heading','TEXT',[500,320,40,16],null,'STT')]},{id:'714:54971',name:'TK 1',platform:'web',group:'Sider bar thu nhỏ kích thước các màn',family:'accounts',width:1440,height:1024,nodes:[n('smallbar','Sider bar ','INSTANCE',[16,0,81,1024]),n('logo','logo','FRAME',[38,40,36,46],'smallbar'),n('title2','Page title','TEXT',[121,70,329,32],null,'Tài khoản Admin'),n('list2','Heading','TEXT',[180,320,40,16],null,'STT')]},{id:'714:55346',name:'TK 2',platform:'web',group:'Sider bar thu nhỏ kích thước các màn',family:'accounts',width:1440,height:1024,nodes:[n('formtitle','Page title','TEXT',[125,70,329,32],null,'Tạo tài khoản'),n('form','Heading','TEXT',[149,142,738,28],null,'Thông tin tài khoản')]}];const result=buildWebInteractiveFrames(frames);assert.equal(result['64:3513'].controls.find(c=>c.label==='Thu nhỏ thanh bên').targetId,'714:54971');assert.equal(result['714:54971'].controls.find(c=>c.label==='Mở thanh bên').targetId,'64:3513');
});
test('source reference records preserve the visible native username and email',()=>{
 const records=buildWebSourceRecords({'64:3513':{table:{rows:[{index:0,slots:[{column:'Tài khoản',part:0,text:'Nguyễn Minh Anh'},{column:'Tài khoản',part:1,text:'minhanh_01'},{column:'Email',part:0,text:'minhanh@gmail.com'},{column:'Vai trò',part:0,text:'Quản trị viên'},{column:'Trạng thái',part:0,text:'Đang hoạt động'}]}]}}});assert.equal(records.accounts[0].username,'minhanh_01');assert.equal(records.accounts[0].email,'minhanh@gmail.com');assert.equal(records.accounts[0].name,'Nguyễn Minh Anh');
});
test('portrait report KPI roles come from their native labels rather than horizontal coordinate order',()=>{
 const nodes=[];for(const [id,x,y,label,value]of [['cost',300,200,'Chi phí','₫ 20.320.000'],['sent',600,200,'Tin đã gửi','24.860'],['success',300,350,'Tin thành công','23.914'],['average',600,350,'Chi phí / tin gửi','₫ 817']])nodes.push(n(id,'KPI card','FRAME',[x,y,250,110]),n(id+'label','KPI label','TEXT',[x+10,y+10,200,14],id,label),n(id+'value','KPI value','TEXT',[x+10,y+40,200,25],id,value));const frame=buildWebInteractiveFrames([{id:'470:16153',platform:'web-portrait',group:'Web dọc',family:'reports',width:1024,height:1440,nodes}])['470:16153'];assert.equal(frame.texts.find(t=>t.id==='sentvalue').field,'web.report.sent');assert.equal(frame.texts.find(t=>t.id==='successvalue').field,'web.report.success');
});
test('retry on a source system-error page retains an existing same-platform overview fallback',()=>{
 const frames=[{id:'error',platform:'web-portrait',group:'Web dọc',family:'system-errors',width:1024,height:1440,nodes:[n('retry','Button','FRAME',[400,600,100,40]),n('retryLabel','Label','TEXT',[410,610,70,20],'retry','Thử lại')]},{id:'1214:84730',platform:'web-portrait',group:'Web dọc',family:'overview',width:1024,height:1440,nodes:[]}];
 const control=buildWebInteractiveFrames(frames).error.controls[0];assert.equal(control.action,'web.retry');assert.equal(control.targetId,'1214:84730');
});
test('OA section detection prioritizes native page and list labels over copied tabs and placeholders',()=>{
 const cases=[['oa','OA / GIF & Lịch sử','Danh sách / cấu hình','Tạo cấu hình','Tab OA'],['gif','Quản lý GIF','Danh sách / cấu hình','Thêm GIF','Tab GIF'],['messages','Tin nhắn','Danh sách GIF','Tạo tin nhắn','Tab GIF'],['messages','OA / GIF & Lịch sử','Danh sách tin nhắn','Tạo tin nhắn','Tab GIF'],['gif','','','Thêm GIF','Tab GIF']];
 for(const [want,title,list,cta,activeTab]of cases){const nodes=[n('title','Page title','TEXT',[125,70,329,32],null,title),n('list','List title','TEXT',[150,330,420,21],null,list),n('search','Placeholder','TEXT',[200,250,100,20],null,'Tìm tên GIF'),n('tab',activeTab,'FRAME',[400,170,100,49]),n('indicator','Active tab indicator','FRAME',[400,210,100,5],'tab'),n('button','CTA button','FRAME',[1250,100,150,40]),n('label','Label','TEXT',[1260,110,125,20],'button',cta)];const frame=buildWebInteractiveFrames([{id:'copied-section',platform:'web',group:'Sider bar thu nhỏ kích thước các màn',family:'oa',width:1440,height:1024,nodes}])['copied-section'];assert.equal(frame.scene,want);assert.equal(frame.controls.find(c=>c.id==='button')?.action,'web.oa.add');}
});
