import test from 'node:test';
import assert from 'node:assert/strict';
import {scheduleParts,scheduleISO,withSchedulePart,calendarProjection,initializeAppSchedule,syncAppSchedule,changeAppSchedule} from './app-calendar.mjs';
import {createDemoState} from './core.mjs';
import {createInteractiveSession} from './interactive-session.mjs';
import {handleAppInteraction,prepareAppFrame} from './app-interactive-controller.mjs';

test('converts the actual user date in Asia/Bangkok across a UTC midnight boundary',()=>{
 const p=scheduleParts('2026-11-19T17:30:00.000Z');
 assert.deepEqual(p,{year:2026,month:11,day:20,hour:0,minute:30,date:'2026-11-20'});
 assert.equal(scheduleISO(p),'2026-11-19T17:30:00.000Z');
});

test('clamps month navigation without silently rolling 31 January into March',()=>{
 const january=scheduleISO({year:2027,month:1,day:31,hour:23,minute:5});
 assert.equal(scheduleParts(withSchedulePart(january,'month',1)).date,'2027-02-28');
 assert.equal(scheduleParts(withSchedulePart(january,'month',-1)).date,'2026-12-31');
 assert.throws(()=>withSchedulePart(withSchedulePart(january,'month',1),'day',31),/Invalid/);
});

test('projects real Sunday-first dates and six-week months into the existing cell grid',()=>{
 const august=calendarProjection(scheduleISO({year:2026,month:8,day:31,hour:9,minute:15}));
 assert.equal(august.rows,6);assert.equal(august.cells.length,42);
 assert.equal(august.cells[0].date,'2026-07-26');
 assert.equal(august.cells[6].date,'2026-08-01');
 assert.equal(august.cells.find(c=>c.selected).date,'2026-08-31');
 const february=calendarProjection(scheduleISO({year:2028,month:2,day:29,hour:9,minute:15}));
 assert.equal(february.cells.filter(c=>c.inMonth).length,29);
});

test('initializing a schedule synchronizes its visible hour and minute with its saved ISO',()=>{
 const s=createInteractiveSession(createDemoState());
 initializeAppSchedule(s,{now:Date.parse('2026-11-19T16:45:37Z')});
 assert.equal(s.values['app.schedule.hour'],'00');assert.equal(s.values['app.schedule.minute'],'45');
 assert.equal(s.values['app.send.schedule'],'2026-11-19T17:45:00.000Z');
 assert.equal(s.values['app.schedule.month'],'Tháng 11. 2026');
 assert.equal(s.values['app.schedule.dateDisplay'],'20/11/2026');assert.equal(s.values['app.schedule.timeDisplay'],'00:45');
 assert.equal(s.values['app.schedule.nowDisplay'],'23:45 · 19/11/2026');
});

test('selecting an adjacent-month cell and changing time preserves the exact shown date',()=>{
 const s=createInteractiveSession(createDemoState());syncAppSchedule(s,scheduleISO({year:2026,month:8,day:31,hour:9,minute:15}));
 changeAppSchedule(s,{part:'day',calendarIndex:0});
 assert.equal(scheduleParts(s.values['app.send.schedule']).date,'2026-07-26');
 changeAppSchedule(s,{part:'hour',value:'23'});changeAppSchedule(s,{part:'minute',value:'59'});
 assert.equal(s.values['app.send.schedule'],'2026-07-26T16:59:00.000Z');
 assert.equal(s.values['app.schedule.hour'],'23');assert.equal(s.values['app.schedule.minute'],'59');
});

test('the actual App schedule operation seeds exactly the displayed time and rejects impossible days',()=>{
 const s=createInteractiveSession(createDemoState()),frame={id:'1279:8597',theme:'light',platform:'app'};
 const result=handleAppInteraction({frame,session:s,control:{action:'app.schedule.open'}});
 assert.equal(result.targetId,'1279:8468');
 const p=scheduleParts(s.values['app.send.schedule']);
 assert.equal(Number(s.values['app.schedule.hour']),p.hour);assert.equal(Number(s.values['app.schedule.minute']),p.minute);
 syncAppSchedule(s,scheduleISO({year:2027,month:2,day:28,hour:9,minute:15}));
 const rejected=handleAppInteraction({frame,session:s,control:{action:'app.schedule.day',value:'31'}});
 assert.equal(rejected.focusField,'app.send.schedule');
 assert.equal(scheduleParts(s.values['app.send.schedule']).date,'2027-02-28');
});

test('directly opening a schedule source frame prepares a real Bangkok selection',()=>{
 const s=createInteractiveSession(createDemoState());
 prepareAppFrame({frame:{id:'1279:8468',route:'schedule'},session:s});
 assert.ok(s.context.appScheduleDate);assert.equal(s.values['app.send.schedule'],s.context.appScheduleDate);
});
