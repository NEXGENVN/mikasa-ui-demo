import test from 'node:test';
import assert from 'node:assert/strict';
import {createInteractiveSession,seedInteractiveValues,setInteractiveValue,navigateInteractiveSession,interactiveDisplayValue} from './interactive-session.mjs';

test('typed values survive source variants while untouched fields follow the active original',()=>{
 const session=createInteractiveSession({profile:{name:'Bizzy'}});
 seedInteractiveValues(session,{controls:[{field:'app.send.phone',value:''},{field:'app.send.template',value:'Đơn hàng'}]});
 setInteractiveValue(session,'app.send.phone','0901234567');
 seedInteractiveValues(session,{controls:[{field:'app.send.phone',value:'0332225555'},{field:'app.send.template',value:'Lịch hẹn'}]});
 assert.equal(session.values['app.send.phone'],'0901234567');
 assert.equal(session.values['app.send.template'],'Lịch hẹn');
 assert.equal(session.data.profile.name,'Bizzy');
});

test('interactive history rejects a destination from another form factor and restores the previous original',()=>{
 const session=createInteractiveSession({}),frames=new Map([
  ['1:1',{id:'1:1',platform:'web'}],['2:2',{id:'2:2',platform:'web'}],['3:3',{id:'3:3',platform:'web-portrait'}]
 ]);
 assert.equal(navigateInteractiveSession(session,'1:1',{catalogue:frames}),'1:1');
 assert.equal(navigateInteractiveSession(session,'2:2',{catalogue:frames}),'2:2');
 assert.equal(navigateInteractiveSession(session,'3:3',{catalogue:frames}),null);
 assert.equal(session.currentFrameId,'2:2');
 assert.equal(navigateInteractiveSession(session,null,{back:true,catalogue:frames}),'1:1');
});

test('input state rejects unsafe object keys without changing sample data',()=>{
 const session=createInteractiveSession({});
 assert.throws(()=>setInteractiveValue(session,'__proto__',{polluted:true}),/field/i);
 assert.equal({}.polluted,undefined);
 setInteractiveValue(session,'web.active',false);
 assert.equal(session.values['web.active'],false);
});

test('radio groups seed the selected source option instead of the last available choice',()=>{
 const session=createInteractiveSession({});
 seedInteractiveValues(session,{controls:[{type:'radio',field:'app.theme',value:'light',checked:true},{type:'radio',field:'app.theme',value:'dark',checked:false},{type:'radio',field:'app.theme',value:'system',checked:false}]});
 assert.equal(session.values['app.theme'],'light');
 setInteractiveValue(session,'app.theme','dark');
 seedInteractiveValues(session,{controls:[{type:'radio',field:'app.theme',value:'light',checked:true}]});
 assert.equal(session.values['app.theme'],'dark');
});

test('vector password values stay masked until the actual eye control reveals them',()=>{
 const control={inputType:'password',maskCharacter:'•'};
 assert.equal(interactiveDisplayValue(control,'Secr3t!'),'•••••••');
 assert.equal(interactiveDisplayValue(control,'Secr3t!',{revealed:true}),'Secr3t!');
 assert.equal(interactiveDisplayValue({inputType:'text'},'Secr3t!'),'Secr3t!');
});
