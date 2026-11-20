export const APP_TIME_ZONE='Asia/Bangkok';
// The supported demo dates use Bangkok's UTC+07:00 civil time, without DST.
const offset=7*60*60*1000,pad=n=>String(n).padStart(2,'0');
const set=(s,key,value)=>{s.values[key]=value;s.dirty.add(key);};
export const daysInMonth=(year,month)=>new Date(Date.UTC(year,month,0)).getUTCDate();

export function scheduleParts(iso){
 const date=new Date(new Date(iso).getTime()+offset);
 if(!Number.isFinite(date.getTime()))throw new Error('Invalid schedule date');
 const year=date.getUTCFullYear(),month=date.getUTCMonth()+1,day=date.getUTCDate();
 return {year,month,day,hour:date.getUTCHours(),minute:date.getUTCMinutes(),date:`${year}-${pad(month)}-${pad(day)}`};
}
export function scheduleISO({year,month,day,hour=0,minute=0}){
 if(![year,month,day,hour,minute].every(Number.isInteger)||year<1970||year>9999||month<1||month>12||day<1||day>daysInMonth(year,month)||hour<0||hour>23||minute<0||minute>59)throw new Error('Invalid schedule date or time');
 return new Date(Date.UTC(year,month-1,day,hour,minute)-offset).toISOString();
}
export function withSchedulePart(iso,part,value){
 const p=scheduleParts(iso),n=Number(value);
 if(!Number.isInteger(n))throw new Error('Invalid schedule value');
 if(part==='month'){
  const month=new Date(Date.UTC(p.year,p.month-1+n,1));p.year=month.getUTCFullYear();p.month=month.getUTCMonth()+1;p.day=Math.min(p.day,daysInMonth(p.year,p.month));
 }else if(['day','hour','minute'].includes(part))p[part]=n;
 else throw new Error('Invalid schedule part');
 return scheduleISO(p);
}
export function calendarProjection(iso,{now=Date.now()}={}){
 const p=scheduleParts(iso),weekday=new Date(Date.UTC(p.year,p.month-1,1)).getUTCDay(),today=scheduleParts(new Date(now).toISOString()).date,rows=Math.max(5,Math.ceil((weekday+daysInMonth(p.year,p.month))/7));
 const cells=Array.from({length:rows*7},(_,index)=>{
  const d=new Date(Date.UTC(p.year,p.month-1,1-weekday+index)),year=d.getUTCFullYear(),month=d.getUTCMonth()+1,day=d.getUTCDate(),date=`${year}-${pad(month)}-${pad(day)}`;
  return {index,year,month,day,date,inMonth:month===p.month,selected:date===p.date,today:date===today,iso:scheduleISO({year,month,day,hour:p.hour,minute:p.minute})};
 });
 return {...p,monthLabel:`Tháng ${p.month}. ${p.year}`,rows,cells,timeZone:APP_TIME_ZONE};
}
export function syncAppSchedule(session,iso,{now=Date.now()}={}){
 const exact=scheduleISO(scheduleParts(iso)),p=calendarProjection(exact,{now}),current=scheduleParts(new Date(now).toISOString());
 session.context.appScheduleDate=exact;
 set(session,'app.send.schedule',exact);set(session,'app.schedule.month',p.monthLabel);set(session,'app.schedule.hour',pad(p.hour));set(session,'app.schedule.minute',pad(p.minute));set(session,'app.schedule.date',p.date);set(session,'app.schedule.dateDisplay',`${pad(p.day)}/${pad(p.month)}/${p.year}`);set(session,'app.schedule.timeDisplay',`${pad(p.hour)}:${pad(p.minute)}`);
 set(session,'app.schedule.nowDisplay',`${pad(current.hour)}:${pad(current.minute)} · ${pad(current.day)}/${pad(current.month)}/${current.year}`);
 return exact;
}
export function initializeAppSchedule(session,{now=Date.now(),iso}={}){
 const existing=iso||session.context.appScheduleDate||session.values['app.send.schedule'];
 const chosen=existing&&Number.isFinite(new Date(existing).getTime())?existing:new Date(Math.floor((Number(now)+3600000)/60000)*60000).toISOString();
 return syncAppSchedule(session,chosen,{now});
}
export function changeAppSchedule(session,{part,value,calendarIndex}){
 const current=session.context.appScheduleDate||initializeAppSchedule(session);
 const next=part==='day'&&calendarIndex!=null?calendarProjection(current).cells[Number(calendarIndex)]?.iso:withSchedulePart(current,part,value);
 if(!next)throw new Error('Invalid calendar cell');
 return syncAppSchedule(session,next);
}
