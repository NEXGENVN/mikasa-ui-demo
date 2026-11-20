import test from 'node:test';
import assert from 'node:assert/strict';
const module=await import('./app-interactive-source.mjs').catch(error=>{if(error.code==='ERR_MODULE_NOT_FOUND')return{};throw error;});
const node=(id,type,name,bbox,extra={})=>({id,type,name,bbox,clippedBBox:bbox,visible:true,rendered:true,parentId:null,...extra});
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
