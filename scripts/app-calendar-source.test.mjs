import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildCalendarMetadata,calendarSummarySlots} from './app-calendar-source.mjs';
const fixture=JSON.parse(fs.readFileSync(new URL('../figma-preview/fixtures/source-calendar.json',import.meta.url),'utf8'));

test('reuses the actual native calendar grid and binds both real month arrows',()=>{
 const controls=[];const calendar=buildCalendarMetadata(fixture,controls);
 assert.equal(calendar.cells.length,42);assert.deepEqual(calendar.gridBox,[20,386,350,125]);
 assert.deepEqual(calendar.cells[0].box,[25,386,40,24]);
 assert.deepEqual(calendar.cells[35].box,[25,511,40,24]);
 assert.deepEqual(controls.filter(c=>c.action==='app.schedule.month').map(c=>c.value),[-1,1]);
 assert.deepEqual(controls.filter(c=>c.action==='app.schedule.month').map(c=>c.box),[[28,343,20,20],[342,343,20,20]]);
 assert.deepEqual(calendar.selectedSourceBox,[325,411,40,24]);
 assert.equal(calendar.selectedFont.color.r,1);
});

test('time selectors use the source highlighted value and expose neighbors for consistent wheel projection',()=>{
 const controls=fixture.nodes.filter(n=>/^(Hour|Minute) wheel$/.test(n.name)).map(n=>({id:n.id,box:n.bbox,type:'select',textSlots:[]}));
 const calendar=buildCalendarMetadata(fixture,controls);
 assert.equal(calendar.wheels.length,2);
 const hour=controls.find(c=>c.field==='app.schedule.hour');
 assert.equal(hour.value,'22');assert.equal(hour.textSlots[0].text,'22');
 assert.equal(calendar.wheels.find(w=>w.field==='app.schedule.hour').slots.length,3);
 assert.equal(calendar.wheels.find(w=>w.field==='app.schedule.minute').selectedIndex,0);
});

test('binds only native scheduled-result date/time values with their actual sending labels',()=>{
 const frame={nodes:[{id:'date-label',parentId:'date-row',type:'TEXT',text:'Ngày gửi'},{id:'date',parentId:'date-row',type:'TEXT',name:'Date',text:'12/11/2026',bbox:[280,326,86,24]},{id:'time-label',parentId:'time-row',type:'TEXT',text:'Giờ gửi'},{id:'time',parentId:'time-row',type:'TEXT',name:'Time',text:'10:00',bbox:[325,378,41,24]},{id:'status',parentId:'statusbar',type:'TEXT',name:'Time',text:'09:41',bbox:[43,24,44,22]}]};
 assert.deepEqual(calendarSummarySlots(frame).map(s=>[s.id,s.field]),[['date','app.schedule.dateDisplay'],['time','app.schedule.timeDisplay']]);
});

test('binds the actual current-time value and leaves its source label intact',()=>{
 const frame={nodes:[{id:'label',parentId:'current',type:'TEXT',name:'Current schedule label',text:'Thời gian hiện tại'},{id:'value',parentId:'current',type:'TEXT',name:'Current schedule value',text:'09:00 · 14/11/2026',bbox:[175,276,195,22]}]};
 assert.deepEqual(calendarSummarySlots(frame).map(s=>[s.id,s.field]),[['value','app.schedule.nowDisplay']]);
});
