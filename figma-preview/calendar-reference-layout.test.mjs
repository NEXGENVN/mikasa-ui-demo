import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {nativeFrames} from './native-frames.mjs';
import {appInteractiveFrames} from './app-interactive-controls.mjs';
import * as layout from './dark-reference-layout.mjs';
import {renderNativeFrame} from './native-preview.mjs';
const original=id=>({...nativeFrames.find(f=>f.id===id),...appInteractiveFrames[id]});
test('new calendar vector exports replace the rendered source without mutating the original catalogue',()=>{
 for(const id of ['1430:87964','1107:4929']){
  const source=original(id),frame=layout.withDarkReferenceLayout(source);
  assert.notEqual(frame.file,source.file,'new reference source '+id);
  assert.ok(fs.existsSync(new URL(frame.file,import.meta.url)));
  assert.match(renderNativeFrame(nativeFrames.find(f=>f.id===id)),new RegExp(frame.file.replaceAll('.','\\.')));
 }
});
test('both new calendars align the date viewport, wheels, arrows and footer to their actual SVGs',()=>{
 for(const id of ['1430:87964','1107:4929','1635:109376']){
  const frame=layout.withDarkReferenceLayout(original(id)),c=frame.calendar;
  assert.deepEqual(c.gridBox,[20,415,350,96]);assert.equal(c.sourceRows,3);assert.equal(c.rowPitch,32);
  assert.deepEqual(c.cells[0].box,[25,417,40,24]);
  assert.deepEqual(c.wheels.map(w=>w.box),[[40,583,126,200],[224,583,126,200]]);
  assert.equal(frame.controls.find(c=>c.action==='app.schedule.save').box[1],799);
  assert.equal(frame.controls.find(control=>control.id===c.previousControlId).box[1],370);
 }
});
test('the calendar reference adapter is idempotent and leaves unrelated screens alone',()=>{
 const frame=original('1430:87964'),adapted=layout.withDarkReferenceLayout(frame);
 assert.deepEqual(layout.withDarkReferenceLayout(adapted),adapted);
 const unrelated=original('1279:8468');assert.equal(layout.withDarkReferenceLayout(unrelated),unrelated);
 assert.notEqual(original('1430:87964').file,adapted.file);
});
