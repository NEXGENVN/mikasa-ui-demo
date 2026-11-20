import test from 'node:test';
import assert from 'node:assert/strict';
import {createDemoState} from './core.mjs';
import {nativeFrames} from './native-frames.mjs';
import {appInteractiveFrames} from './app-interactive-controls.mjs';
import {createInteractiveSession,seedInteractiveValues,setInteractiveValue,navigateInteractiveSession} from './interactive-session.mjs';
import {composeSourceComponents} from './interactive-component-view.mjs';
import {handleAppInteraction,prepareAppFrame} from './app-interactive-controller.mjs';

const now=Date.parse('2026-11-20T10:10:00+07:00'),catalogue=new Map(nativeFrames.map(f=>[f.id,f]));
function darkHarness(id='1450:9744'){
 const s=createInteractiveSession(createDemoState());let frame;
 const enter=id=>{const source=catalogue.get(id);assert.ok(source,id);frame=composeSourceComponents({...source,...appInteractiveFrames[id]},s);seedInteractiveValues(s,frame);prepareAppFrame({frame,session:s,now});return frame;};enter(id);s.currentFrameId=id;
 const act=(action,value,extra={})=>{const control=frame.controls.find(c=>c.action===action&&!c.hidden&&(!extra.field||c.field===extra.field))||frame.timers?.map(t=>t.control).find(c=>c.action===action);assert.ok(control,'Source control '+action+' in '+frame.id);const actual={...control,...extra};if(actual.field&&value!==undefined)setInteractiveValue(s,actual.field,value);const result=handleAppInteraction({frame,control:actual,session:s,value,now});assert.ok(result,action);if(result.targetId||result.back){const dest=navigateInteractiveSession(s,result.targetId,{catalogue,back:result.back,replace:result.replace});assert.ok(dest,'Valid destination '+JSON.stringify(result));enter(dest);}else{prepareAppFrame({frame,session:s,now});frame=composeSourceComponents({...catalogue.get(frame.id),...appInteractiveFrames[frame.id]},s);}return result;};
 return{s,act,get frame(){return frame;},enter(id){navigateInteractiveSession(s,id,{catalogue});return enter(id);}};
}

test('dark change-password uses its own security OTP before its password screen',()=>{
 const h=darkHarness();h.act('app.navigate',undefined,{route:'password'});assert.equal(h.frame.id,'1456:15057');h.act('app.otp','123456');assert.equal(h.frame.id,'1456:14695');
 const direct=darkHarness('1456:15057');direct.act('app.otp','123456');assert.equal(direct.frame.id,'1456:14695');
});

test('dark fingerprint starts with its supplied OTP and opens the dark prompt',()=>{
 const h=darkHarness();h.act('app.fingerprint');assert.equal(h.frame.id,'1450:10188');h.act('app.otp','123456');assert.equal(h.frame.id,'1450:9996');assert.equal(h.s.data.preferences.fingerprint,false);h.act('app.fingerprint.verify');assert.equal(h.frame.id,'1456:11813');assert.equal(h.s.data.preferences.fingerprint,true);h.act('app.navigate');assert.equal(h.frame.id,'1450:9744');
 const direct=darkHarness('1450:10188');direct.act('app.otp','123456');assert.equal(direct.frame.id,'1450:9996');
});

test('dark profile updates wait for the supplied phone loading frame before committing',()=>{
 const h=darkHarness('1456:12749'),previous=h.s.data.profile.name;h.act('app.input','Lan',{field:'app.profile.name'});h.act('app.input','0901234567',{field:'app.profile.phone'});h.act('app.input','123456',{field:'app.profile.verification'});h.act('app.profile.save');assert.equal(h.frame.id,'1456:12806');assert.equal(h.s.data.profile.name,previous);h.act('app.profile.finish');assert.equal(h.frame.id,'1456:12865');assert.equal(h.s.data.profile.name,'Lan');
});

test('dark contact switching and code sending use the actual email and countdown originals',()=>{
 const h=darkHarness('1456:12749');h.act('app.profile.contact-switch');assert.equal(h.frame.id,'1456:12566');h.act('app.input','Lan',{field:'app.profile.name'});h.act('app.input','lan@example.com',{field:'app.profile.email'});h.act('app.profile.verify.send');assert.equal(h.frame.id,'1456:12656');h.act('app.input','123456',{field:'app.profile.verification'});h.act('app.profile.save');assert.equal(h.frame.id,'1456:12702');h.act('app.profile.finish');assert.equal(h.frame.id,'1456:12865');assert.equal(h.s.data.profile.email,'lan@example.com');
});

test('dark multi-OA confirmation preserves its source chooser when returning to edit',()=>{
 const entry=darkHarness('1430:86270');entry.act('app.input','0901234567',{field:'app.send.phone'});assert.equal(entry.frame.id,'1430:86331');assert.equal(entry.frame.oaLimit,5);
 const h=darkHarness('1430:86331');h.act('app.input','0901234567',{field:'app.send.phone'});h.act('app.input',3,{field:'app.send.oaCount'});h.act('app.send.next');assert.equal(h.frame.id,'1430:88099');h.act('app.navigate',undefined,{route:'send-ready'});assert.equal(h.frame.id,'1430:86331');assert.equal(h.s.values['app.send.oaCount'],3);
 const limited=darkHarness('1432:10827');limited.act('app.input','0901234567',{field:'app.send.phone'});limited.act('app.input',2,{field:'app.send.oaCount'});limited.act('app.send.next');limited.act('app.navigate',undefined,{route:'send-ready'});assert.equal(limited.frame.id,'1432:10827');
});

test('dark scheduled detail opens its supplied edit sheet and saves back to the same theme',()=>{
 const h=darkHarness('1444:93591');h.act('app.schedule.edit');assert.equal(h.frame.id,'1444:94357');h.act('app.schedule.hour','11');h.act('app.schedule.save');assert.equal(h.frame.id,'1444:93591');assert.equal(h.s.data.selectedId,'SCH-6472');
});

test('a directly opened dark scheduled result keeps its scheduled detail branch',()=>{
 const h=darkHarness('1442:91277');h.act('app.navigate',undefined,{route:'detail'});assert.equal(h.frame.id,'1444:93591');
});

test('a Flow theme round trip preserves Flow destinations and themed back history',()=>{
 const h=darkHarness('1635:110138');h.act('app.navigate',undefined,{route:'appearance'});h.act('app.theme',undefined,{value:'dark'});assert.equal(h.frame.id,'1450:10174');h.act('app.theme',undefined,{value:'light'});assert.equal(h.frame.id,'1635:110779');h.act('app.theme',undefined,{value:'dark'});h.act('app.navigate',undefined,{route:'account'});assert.equal(h.frame.id,'1450:9744');
 const back=darkHarness('1635:110138');back.act('app.navigate',undefined,{route:'appearance'});back.act('app.theme',undefined,{value:'dark'});back.act('app.navigate');assert.equal(back.frame.id,'1450:9744');
});

test('stale dark master links resolve to existing dark counterparts',()=>{
 for(const id of ['1456:12425','1456:12472']){const h=darkHarness(id);h.act('app.navigate');assert.equal(h.frame.id,'1450:9744');}
});
