import test from 'node:test';
import assert from 'node:assert/strict';
import {scheduleParts,scheduleISO,withSchedulePart,calendarProjection,initializeAppSchedule,syncAppSchedule,changeAppSchedule} from './app-calendar.mjs';
import {createDemoState} from './core.mjs';
import {createInteractiveSession} from './interactive-session.mjs';
import {handleAppInteraction,prepareAppFrame} from './app-interactive-controller.mjs';
import * as calendar from './app-calendar.mjs';
const now=Date.parse('2026-11-20T03:12:37Z'); // 10:12:37 in Bangkok.

test('converts the actual user date in Asia/Ho_Chi_Minh across a UTC midnight boundary',()=>{
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
 assert.equal(s.values['app.schedule.hour'],'07');assert.equal(s.values['app.schedule.minute'],'00');
 assert.equal(s.values['app.send.schedule'],'2026-11-20T00:00:00.000Z');
 assert.equal(s.values['app.schedule.month'],'Tháng 11. 2026');
 assert.equal(s.values['app.schedule.dateDisplay'],'20/11/2026');assert.equal(s.values['app.schedule.timeDisplay'],'07:00');
 assert.equal(s.values['app.schedule.nowDisplay'],'23:45 · 19/11/2026');
});

test('selecting a valid adjacent-month cell preserves its shown date and rejects arbitrary minutes',()=>{
 const s=createInteractiveSession(createDemoState());syncAppSchedule(s,scheduleISO({year:2026,month:11,day:30,hour:9,minute:30}),{now});
 changeAppSchedule(s,{part:'day',calendarIndex:30},{now});
 assert.equal(scheduleParts(s.values['app.send.schedule']).date,'2026-12-01');
 changeAppSchedule(s,{part:'hour',value:'23'},{now});
 assert.throws(()=>changeAppSchedule(s,{part:'minute',value:'59'},{now}));
 assert.equal(s.values['app.send.schedule'],'2026-12-01T16:30:00.000Z');
 assert.equal(s.values['app.schedule.hour'],'23');assert.equal(s.values['app.schedule.minute'],'30');
});

test('scheduling rejects the past and dates beyond fourteen Bangkok civil days, including UTC rollover',()=>{
 assert.equal(typeof calendar.validateAppSchedule,'function');
 for(const iso of ['2026-11-20T03:00:00Z','2026-12-05T00:00:00Z','2026-12-04T17:00:00Z','2026-11-20T04:09:00Z','2026-11-20T04:30:01Z','invalid'])assert.throws(()=>calendar.validateAppSchedule(iso,{now}),undefined,iso);
 assert.equal(calendar.validateAppSchedule('2026-12-04T03:00:00Z',{now}),'2026-12-04T03:00:00.000Z');
 const midnight=Date.parse('2026-12-31T16:59:59Z');
 assert.equal(calendar.validateAppSchedule('2027-01-01T00:00:00Z',{now:midnight}),'2027-01-01T00:00:00.000Z');
 assert.equal(calendar.validateAppSchedule('2027-01-14T16:30:00Z',{now:midnight}),'2027-01-14T16:30:00.000Z');
 assert.throws(()=>calendar.validateAppSchedule('2027-01-14T17:00:00Z',{now:midnight}));
 assert.throws(()=>calendar.validateAppSchedule('2026-11-20T03:30:00Z',{now:Date.parse('2026-11-20T03:30:00Z')}));
});

test('initialization normalizes old fixtures and off-step values to bounded future half-hours',()=>{
 const s=createInteractiveSession(createDemoState());
 for(const [iso,want]of [['2026-11-20T04:09:00Z','2026-11-20T04:30:00.000Z'],['2020-01-01T00:00:00Z','2026-11-20T03:30:00.000Z'],['2030-01-01T00:00:00Z','2026-12-04T16:30:00.000Z']])assert.equal(initializeAppSchedule(s,{now,iso}),want);
 assert.equal(initializeAppSchedule(s,{now,iso:null}),'2026-11-20T03:30:00.000Z');
 assert.equal(initializeAppSchedule(s,{now:Date.parse('2026-11-20T03:30:00Z'),iso:null}),'2026-11-20T04:00:00.000Z');
});

test('calendar disables unavailable days and bounds month navigation to the allowed date window',()=>{
 const s=createInteractiveSession(createDemoState());initializeAppSchedule(s,{now});
 const p=calendarProjection(s.context.appScheduleDate,{now});
 assert.equal(p.cells.find(c=>c.date==='2026-11-19').disabled,true);
 assert.equal(p.cells.find(c=>c.date==='2026-11-20').disabled,false);
 assert.equal(p.canPreviousMonth,false);assert.equal(p.canNextMonth,true);
 const before=s.context.appScheduleDate;assert.throws(()=>changeAppSchedule(s,{part:'day',value:19},{now}));assert.equal(s.context.appScheduleDate,before);
 assert.throws(()=>changeAppSchedule(s,{part:'month',value:-1},{now}));
 changeAppSchedule(s,{part:'month',value:1},{now});
 assert.equal(scheduleParts(s.context.appScheduleDate).date,'2026-12-04');
 const december=calendarProjection(s.context.appScheduleDate,{now});
 assert.equal(december.cells.find(c=>c.date==='2026-12-04').disabled,false);assert.equal(december.cells.find(c=>c.date==='2026-12-05').disabled,true);
 assert.equal(december.canNextMonth,false);assert.throws(()=>changeAppSchedule(s,{part:'month',value:1},{now}));
});

test('an enabled current-day cell advances an earlier selected time to the next valid half-hour',()=>{
 const s=createInteractiveSession(createDemoState());initializeAppSchedule(s,{now,iso:'2026-11-21T01:00:00Z'});
 changeAppSchedule(s,{part:'day',value:20},{now});assert.equal(s.context.appScheduleDate,'2026-11-20T03:30:00.000Z');
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
