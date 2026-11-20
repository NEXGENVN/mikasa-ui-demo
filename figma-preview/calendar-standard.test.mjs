import test from 'node:test';
import assert from 'node:assert/strict';
import {scheduleBounds,scheduleParts,scheduleISO,calendarProjection,validateAppSchedule,initializeAppSchedule,changeAppSchedule,APP_TIME_ZONE} from './app-calendar.mjs';
const at=s=>Date.parse(s+'+07:00');
const now=at('2026-11-13T10:10:00');
const session=()=>({values:{},dirty:new Set(),context:{}});
test('November13 specification: inclusive civil dates13–27, independent of host timezone',()=>{
 assert.equal(APP_TIME_ZONE,'Asia/Ho_Chi_Minh');
 const p=calendarProjection('2026-11-14T03:00:00Z',{now});
 for(const [date,disabled,today]of [['2026-11-12',true,false],['2026-11-13',false,true],['2026-11-14',false,false],['2026-11-27',false,false],['2026-11-28',true,false],['2026-12-01',true,false]]){const c=p.cells.find(c=>c.date===date);assert.equal(c.disabled,disabled,date);assert.equal(c.today,today,date);}
 assert.equal(validateAppSchedule('2026-11-27T23:30:00+07:00',{now}),'2026-11-27T16:30:00.000Z');
 assert.throws(()=>validateAppSchedule('2026-11-28T07:00:00+07:00',{now}));
 assert.equal(p.cells[0].date,'2026-11-01');assert.equal(p.timeZone,APP_TIME_ZONE);
});
test('opening hours and future half-hour slots across midnight',()=>{
 for(const [clock,want]of [['06:59:00','07:00'],['07:00:00','07:30'],['23:29:00','23:30'],['23:30:00','07:00'],['23:59:59','07:00']]){const s=session();initializeAppSchedule(s,{now:at('2026-11-13T'+clock),iso:null});assert.equal(s.values['app.schedule.timeDisplay'],want,clock);assert.equal(s.values['app.schedule.date'],clock>='23:30:00'?'2026-11-14':'2026-11-13');}
 for(const value of ['2026-11-14T06:30:00+07:00','2026-11-14T07:15:00+07:00','2026-11-14T23:30:01+07:00','2026-11-14T00:00:00+07:00'])assert.throws(()=>validateAppSchedule(value,{now}));
});
test('calendar limits cross month, year and leap day and use Vietnamese civil midnight',()=>{
 for(const [clock,max]of [['2026-11-25T10:00:00','2026-12-09'],['2026-12-25T10:00:00','2027-01-08'],['2028-02-20T10:00:00','2028-03-05']])assert.equal(scheduleBounds({now:at(clock)}).maxDate,max);
 assert.equal(scheduleBounds({now:Date.parse('2026-11-12T17:01:00Z')}).minDate,'2026-11-13');
});
test('changing to today adjusts an expired time and rejects today after the final slot',()=>{
 const s=session();initializeAppSchedule(s,{now,iso:'2026-11-14T07:00:00+07:00'});changeAppSchedule(s,{part:'day',value:13},{now});assert.equal(s.values['app.schedule.timeDisplay'],'10:30');
 const late=at('2026-11-13T23:31:00');initializeAppSchedule(s,{now:late,iso:null});const before=s.context.appScheduleDate;assert.throws(()=>changeAppSchedule(s,{part:'day',value:13},{now:late}));assert.equal(s.context.appScheduleDate,before);
});
