import test from 'node:test';
import assert from 'node:assert/strict';
import {appInteractiveFrames} from './app-interactive-controls.mjs';
import {sourceFieldFont} from './source-field-appearance.mjs';
import {sourceFieldAppearances} from './source-field-appearance-catalog.mjs';

test('profile typing uses the source entered gray paint instead of stale black metadata',()=>{
 const control=appInteractiveFrames['843:50360'].controls.find(c=>c.field==='app.profile.name');
 const result=sourceFieldFont(control,control.textSlots[0],{entered:true});
 assert.equal(result.color,'#64748B');assert.equal(result.size,12);
});

test('the generated field appearance catalog covers App controls only',()=>{
 const appSlotIds=new Set(Object.values(appInteractiveFrames).flatMap(frame=>frame.controls.flatMap(control=>(control.textSlots||[]).map(slot=>slot.id))));
 assert.ok(Object.keys(sourceFieldAppearances).length>0);
 for(const id of Object.keys(sourceFieldAppearances))assert.ok(appSlotIds.has(id),id);
});

test('the entered phone source keeps its exported gray paint and 24px line height',()=>{
 const control=appInteractiveFrames['843:50716'].controls.find(c=>c.field==='app.profile.phone'&&c.type==='input');
 const result=sourceFieldFont(control,control.textSlots[0],{entered:true});
 assert.equal(result.color,'#64748B');assert.equal(result.lineHeight,24);
});

test('an unproven or mixed source paint cannot be overridden by raw native metadata',()=>{
 const slot={id:'unknown-mixed-source',font:{family:'Roboto',size:12,color:'#000000'}};
 const result=sourceFieldFont({textSlots:[slot]},slot,{entered:true});
 assert.equal(Object.hasOwn(result,'color'),false);
 assert.equal(result.size,12);
});

test('the standard Flow profile keeps actual source paint, size, and baseline after typing',()=>{
 const control=appInteractiveFrames['1635:110900'].controls.find(c=>c.field==='app.profile.name');
 const result=sourceFieldFont(control,control.textSlots[0],{entered:true});
 assert.equal(result.color,'#64748B');assert.equal(result.size,12);assert.equal(result.baseline,12.1015625);
});
