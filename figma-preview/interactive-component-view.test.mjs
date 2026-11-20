import test from 'node:test';import assert from 'node:assert/strict';
import {composeSourceComponents} from './interactive-component-view.mjs';
import {createInteractiveSession,setInteractiveValue} from './interactive-session.mjs';
test('counter native states replace only their own hit areas and retain one stable field identity',()=>{
 const session=createInteractiveSession({}),frame={id:'1:1',file:'original.html',controls:[{id:'old-count',field:'app.send.oaCount',type:'select',box:[260,400,40,24]},{id:'next',type:'button',box:[16,700,358,40]}],texts:[{id:'old-glyph',field:'app.send.oaCount'}],componentStates:[{id:'counter',box:[244,390,130,46],field:'app.send.oaCount',initialValue:'1',states:{'1':{file:'one.svg',controls:[{id:'count',type:'input',field:'app.send.oaCount',box:[56,12,30,22]},{id:'plus',type:'button',action:'app.oa.plus',box:[94,10,26,26]}]},'5':{file:'five.svg',controls:[{id:'minus',type:'button',action:'app.oa.minus',box:[12,10,26,26]},{id:'count',type:'input',field:'app.send.oaCount',box:[56,12,30,22]}]}}}]};
 const initial=composeSourceComponents(frame,session),input=initial.controls.find(c=>c.field==='app.send.oaCount');
 assert.equal(input.value,'1');assert.deepEqual(input.box,[300,402,30,22]);assert.equal(initial.controls.some(c=>c.id==='old-count'),false);assert.equal(initial.texts.length,0);assert.equal(initial.file,'original.html');
 setInteractiveValue(session,'app.send.oaCount','5');const changed=composeSourceComponents(frame,session);
 assert.equal(changed.controls.find(c=>c.field==='app.send.oaCount').id,input.id);
 assert.equal(changed.controls.find(c=>c.action==='app.oa.plus').hidden,true);
 assert.equal(changed.controls.find(c=>c.action==='app.oa.minus').hidden,false);
 assert.equal(changed.controls.find(c=>c.id==='next').hidden,undefined);
});
test('native popup descriptors keep source labels and extra artwork does not change the original canvas',()=>{
 const frame={id:'1:1',file:'original.html',controls:[{id:'role',type:'select',value:'Vai trò',options:[{label:'Vai trò',value:'Vai trò'}]}]},popup={file:'role.123.svg',width:110,height:130,options:[{label:'QL hệ thống',value:'Quản lý hệ thống',box:[0,68,110,30]}]};
 const result=composeSourceComponents(frame,createInteractiveSession({}),{popups:{role:popup},extraArtwork:[{file:'extra.svg',box:[0,1024,100,40]}]});
 assert.equal(result.controls[0].popup.file,popup.file);assert.equal(result.controls[0].options[1].label,'QL hệ thống');assert.equal(result.extraArtwork.length,1);assert.equal(result.file,'original.html');
});
