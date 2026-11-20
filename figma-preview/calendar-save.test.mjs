import test from 'node:test';
import assert from 'node:assert/strict';
import {openAppSchedule,syncAppSchedule,scheduleSaveState} from './app-calendar.mjs';
import {createDemoState} from './core.mjs';
import {handleAppInteraction,prepareAppFrame} from './app-interactive-controller.mjs';
const now=Date.parse('2026-11-13T10:10:00+07:00');
const s=()=>({values:{},dirty:new Set(),context:{},data:createDemoState()});
test('save compares canonical instants and becomes disabled again after reverting',()=>{
 const session=s();openAppSchedule(session,{now,iso:'2026-11-14T10:00:00+07:00'});assert.deepEqual(scheduleSaveState(session,{now}),{valid:true,changed:false,value:'2026-11-14T03:00:00.000Z'});
 syncAppSchedule(session,'2026-11-14T03:30:00Z',{now});assert.equal(scheduleSaveState(session,{now}).changed,true);
 syncAppSchedule(session,'2026-11-14T03:00:00Z',{now});assert.equal(scheduleSaveState(session,{now}).changed,false);
});
test('save revalidates after a long-open modal and cannot silently normalize an expired selection',()=>{
 const session=s(),frame={id:'1279:8468',route:'schedule',theme:'light'};openAppSchedule(session,{now,iso:'2026-11-13T10:30:00+07:00'});syncAppSchedule(session,'2026-11-13T11:00:00+07:00',{now});
 const late=Date.parse('2026-11-13T11:01:00+07:00');prepareAppFrame({frame,session,now:late});assert.equal(session.values['app.send.schedule'],'2026-11-13T04:00:00.000Z');assert.equal(scheduleSaveState(session,{now:late}).valid,false);
 const result=handleAppInteraction({frame,session,control:{action:'app.schedule.save'},now:late});assert.equal(result.focusField,'app.send.schedule');assert.equal(result.targetId,undefined);
});
