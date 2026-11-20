import test from 'node:test';import assert from 'node:assert/strict';
import {nativeFrames} from './native-frames.mjs';
const module=await import('./app-standard-flow.mjs').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return{};throw e;});
test('Flow picker follows all31 actual exported grid frames rather than old canvas ordering',()=>{
 assert.equal(typeof module.appStandardFlowFrames,'function');const frames=module.appStandardFlowFrames(nativeFrames);assert.equal(frames.length,31);assert.equal(frames[0].id,'1635:105270');assert.equal(frames[2].id,'1635:105527');assert.equal(frames[10].id,'1635:109376');assert.equal(frames[30].id,'1635:112462');assert.ok(frames.every(f=>f.file===nativeFrames.find(n=>n.id===f.id).file));
});
test('legacy empty send entry and semantic routes resolve to the source Flow chooser',()=>{
 assert.equal(typeof module.standardAppEntryFrameId,'function');for(const route of ['send','figma-734-77892','figma-773-88074'])assert.equal(module.standardAppEntryFrameId(route),'1635:105527');assert.equal(module.standardAppEntryFrameId('login'),'1635:105270');assert.equal(module.standardAppEntryFrameId('figma-1635-111726'),'1635:111726');assert.equal(module.standardAppEntryFrameId('figma-1450-10174'),'1450:10174');assert.equal(module.standardAppEntryFrameId('history'),'784:48201');
});
