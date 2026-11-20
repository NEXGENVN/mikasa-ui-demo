import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeFrames} from './native-frames.mjs';
import {appInteractiveFrames} from './app-interactive-controls.mjs';
import {createDemoState} from './core.mjs';
import {createInteractiveSession} from './interactive-session.mjs';
const policy=await import('./app-permission-policy.mjs').catch(error=>{if(error.code==='ERR_MODULE_NOT_FOUND')return{};throw error;});

test('permission copies resolve real full and single send sources without the standard Flow cap',()=>{
 assert.equal(typeof policy.resolveAppPermissionFrameId,'function');
 for(const [variant,theme,expected]of [['full','light','773:88074'],['full','dark','1430:86331'],['single','light','734:77892'],['single','dark','1430:86270'],['standard','light','1635:105527']]){
  assert.equal(policy.resolveAppPermissionFrameId('send',{variant,theme}),expected);
  assert.ok(nativeFrames.some(frame=>frame.id===expected));
 }
 assert.equal(policy.resolveAppPermissionFrameId('figma-1430-86331',{variant:'full',theme:'light'}),'1430:86331','an explicit dark deep link retains its source theme');
 assert.equal(policy.resolveAppPermissionFrameId('figma-1432-10827',{variant:'full',theme:'light'}),'1430:86331','an alternate dark permission source retains its source theme');
 assert.equal(policy.resolveAppPermissionFrameId('1635:105527',{variant:'full',theme:'light'}),'773:88074');
});

test('single source omits the chooser and defensive metadata locks any directly supplied counter',()=>{
 assert.equal(typeof policy.appPermissionFrameMetadata,'function');
 const raw={...nativeFrames.find(f=>f.id==='773:88074'),...appInteractiveFrames['773:88074']},before=JSON.stringify(raw);
 const s=createInteractiveSession(createDemoState());s.context.appPermissionVariant='single';
 const frame=policy.appPermissionFrameMetadata(raw,{variant:'single',session:s});
 assert.equal(frame.oaLimit,1);assert.equal(frame.standardFlow,false);
 assert.deepEqual(Object.keys(frame.componentStates[0].states),['1']);
 assert.ok(!frame.componentStates[0].states['1'].controls.some(c=>c.action==='app.oa.plus'&&!c.disabled));
 assert.equal(JSON.stringify(raw),before);
 const singleId=policy.resolveAppPermissionFrameId('send',{variant:'single'});
 assert.ok(!appInteractiveFrames[singleId].controls.some(c=>c.field==='app.send.oaCount'));
});

test('themed history and status details retain their existing source branch in both copies',()=>{
 assert.equal(typeof policy.resolveAppPermissionFrameId,'function');
 for(const variant of ['full','single'])for(const [id,theme,expected]of [['1303:79880','dark','1444:91774'],['1303:80128','dark','1444:92022'],['1303:80614','dark','1444:92328'],['1085:71117','dark','1444:92629']]){
  assert.equal(policy.resolveAppPermissionFrameId(id,{variant,theme}),expected);
 }
 for(const [id,expected]of [['1450:9014','1308:7021'],['1450:9130','1308:7105']])assert.equal(policy.resolveAppPermissionFrameId(id,{variant:'full',theme:'light'}),expected);
});

test('Single picker and explicit deep links resolve every multi-OA example to a one-OA source',()=>{
 for(const [source,expected]of [['1313:75767','1279:8766'],['1430:88099','1430:88175'],['1308:6902','784:48751'],['1450:8895','1430:86619'],['1308:7021','784:50672'],['1450:9014','1444:95125'],['1308:7105','784:49355'],['1450:9130','1430:87138'],['1309:7446','784:50672'],['1450:9522','1444:95125'],['1635:105774','1279:8766']]){
  const sourceTheme=nativeFrames.find(frame=>frame.id===source).theme;
  assert.equal(policy.resolveAppPermissionFrameId(source,{variant:'single',theme:sourceTheme}),expected,source+' picker');
  assert.equal(policy.resolveAppPermissionFrameId('figma-'+source.replace(':','-'),{variant:'single',theme:sourceTheme==='dark'?'light':'dark'}),expected,source+' explicit deep link');
 }
 assert.equal(policy.resolveAppPermissionFrameId('figma-1635-109806',{variant:'single',theme:'dark'}),'784:48751');
 assert.equal(policy.resolveAppPermissionFrameId('figma-1308-7105',{variant:'full',theme:'dark'}),'1308:7105');
 assert.equal(policy.resolveAppPermissionFrameId('figma-1450-9130',{variant:'standard',theme:'light'}),'1450:9130');
});
