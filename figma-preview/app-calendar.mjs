export const APP_TIME_ZONE='Asia/Ho_Chi_Minh';
// The supported demo dates use Bangkok's UTC+07:00 civil time, without DST.
const offset=7*60*60*1000,pad=n=>String(n).padStart(2,'0');
const halfHour=30*60*1000;
const clock=new Intl.DateTimeFormat('en-CA',{timeZone:APP_TIME_ZONE,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
const set=(s,key,value)=>{s.values[key]=value;s.dirty.add(key);};
export const daysInMonth=(year,month)=>new Date(Date.UTC(year,month,0)).getUTCDate();

export function scheduleParts(iso){
 const date=new Date(iso);if(!Number.isFinite(date.getTime()))throw new Error('Invalid schedule date');
 const parts=Object.fromEntries(clock.formatToParts(date).map(p=>[p.type,p.value])),year=Number(parts.year),month=Number(parts.month),day=Number(parts.day);
 return {year,month,day,hour:Number(parts.hour),minute:Number(parts.minute),date:`${year}-${pad(month)}-${pad(day)}`};
}
export function scheduleISO({year,month,day,hour=0,minute=0}){
 if(![year,month,day,hour,minute].every(Number.isInteger)||year<1970||year>9999||month<1||month>12||day<1||day>daysInMonth(year,month)||hour<0||hour>23||minute<0||minute>59)throw new Error('Invalid schedule date or time');
 return new Date(Date.UTC(year,month-1,day,hour,minute)-offset).toISOString();
}
function scheduleTime(iso){
 if(typeof iso!=='string')return NaN;
 const match=/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})?$/.exec(iso);
 if(!match)return NaN;
 try{const [,year,month,day,hour,minute,second='0',fraction='',zone]=match;if(Number(second)>59)return NaN;const local=scheduleISO({year:Number(year),month:Number(month),day:Number(day),hour:Number(hour),minute:Number(minute)});return zone?Date.parse(iso):Date.parse(local)+Number(second)*1000+Number(fraction||0)*1000;}catch{return NaN;}
}
/** Future business half-hours, from today through today + fourteen civil dates, inclusive. */
export function scheduleBounds({now=Date.now()}={}){
 const current=Number(now);if(!Number.isFinite(current))throw new Error('Invalid current time');
 const today=scheduleParts(new Date(current).toISOString()),last=new Date(Date.UTC(today.year,today.month-1,today.day+14)),end={year:last.getUTCFullYear(),month:last.getUTCMonth()+1,day:last.getUTCDate()};
 let first=scheduleParts(new Date((Math.floor(current/halfHour)+1)*halfHour).toISOString());if(first.hour<7)first={...first,hour:7,minute:0};
 const min=scheduleISO(first),max=scheduleISO({...end,hour:23,minute:30});
 return {now:current,min,max,minDate:today.date,maxDate:scheduleParts(max).date};
}
export function validateAppSchedule(iso,{now=Date.now()}={}){
 const time=scheduleTime(iso),bounds=scheduleBounds({now}),p=Number.isFinite(time)?scheduleParts(new Date(time).toISOString()):null;
 if(!p||time%halfHour!==0||p.hour<7||p.hour>23||time<=Number(now)||time>Date.parse(bounds.max)||p.date<bounds.minDate)throw new Error('Chọn thời gian trong tương lai từ 07 đến 23 giờ, phút 00 hoặc 30, từ hôm nay đến hôm nay + 14 ngày.');
 return new Date(time).toISOString();
}
export function scheduleSaveState(session,{now=Date.now()}={}){
 try{const value=validateAppSchedule(session.values['app.send.schedule']||session.context.appScheduleDate,{now}),original=scheduleTime(session.context.appScheduleOriginal);return {valid:true,changed:!Number.isFinite(original)||Date.parse(value)!==original,value};}catch(error){return {valid:false,changed:false,message:error.message};}
}
export function openAppSchedule(session,options={}){
 const explicit=Object.hasOwn(options,'iso'),value=explicit?options.iso:session.values['app.send.schedule']||session.data?.draft?.schedule||'',original=explicit||session.values['app.send.scheduled']||session.data?.draft?.scheduled?value:'',time=scheduleTime(original);
 session.context.appScheduleOriginal=Number.isFinite(time)?new Date(time).toISOString():'';session.context.appScheduleOpen=true;
 return initializeAppSchedule(session,{...options,iso:value});
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
 const p=scheduleParts(iso),bounds=scheduleBounds({now}),weekday=new Date(Date.UTC(p.year,p.month-1,1)).getUTCDay(),today=scheduleParts(new Date(now).toISOString()).date,rows=Math.max(5,Math.ceil((weekday+daysInMonth(p.year,p.month))/7));
 const cells=Array.from({length:rows*7},(_,index)=>{
  const d=new Date(Date.UTC(p.year,p.month-1,1-weekday+index)),year=d.getUTCFullYear(),month=d.getUTCMonth()+1,day=d.getUTCDate(),date=`${year}-${pad(month)}-${pad(day)}`;
  return {index,year,month,day,date,inMonth:month===p.month,selected:date===p.date,today:date===today,disabled:date<bounds.minDate||date>bounds.maxDate,iso:scheduleISO({year,month,day,hour:p.hour,minute:p.minute})};
 });
 const month=p.date.slice(0,7);
 return {...p,monthLabel:`Tháng ${p.month}. ${p.year}`,rows,cells,timeZone:APP_TIME_ZONE,canPreviousMonth:month>bounds.minDate.slice(0,7),canNextMonth:month<bounds.maxDate.slice(0,7),bounds};
}
export function syncAppSchedule(session,iso,{now=Date.now()}={}){
 const exact=scheduleISO(scheduleParts(iso)),p=calendarProjection(exact,{now}),current=scheduleParts(new Date(now).toISOString());
 session.context.appScheduleDate=exact;
 set(session,'app.send.schedule',exact);set(session,'app.schedule.month',p.monthLabel);set(session,'app.schedule.hour',pad(p.hour));set(session,'app.schedule.minute',pad(p.minute));set(session,'app.schedule.date',p.date);set(session,'app.schedule.dateDisplay',`${pad(p.day)}/${pad(p.month)}/${p.year}`);set(session,'app.schedule.timeDisplay',`${pad(p.hour)}:${pad(p.minute)}`);
 set(session,'app.schedule.nowDisplay',`${pad(current.hour)}:${pad(current.minute)} · ${pad(current.day)}/${pad(current.month)}/${current.year}`);
 return exact;
}
export function initializeAppSchedule(session,options={}){
 const {now=Date.now()}=options,bounds=scheduleBounds({now}),existing=Object.hasOwn(options,'iso')?options.iso:session.context.appScheduleDate||session.values['app.send.schedule'],time=scheduleTime(existing);
 let chosen=Number.isFinite(time)?Math.max(Date.parse(bounds.min),Math.min(Date.parse(bounds.max),Math.ceil(time/halfHour)*halfHour)):Date.parse(bounds.min);
 const p=scheduleParts(new Date(chosen).toISOString());if(p.hour<7)chosen=Date.parse(scheduleISO({...p,hour:7,minute:0}));
 return syncAppSchedule(session,validateAppSchedule(new Date(chosen).toISOString(),{now}),{now});
}
export function changeAppSchedule(session,{part,value,calendarIndex},{now=Date.now()}={}){
 const current=session.context.appScheduleDate||initializeAppSchedule(session,{now}),projection=calendarProjection(current,{now}),bounds=projection.bounds;
 let next;
 if(part==='month'){
  if(![-1,1].includes(Number(value))||Number(value)<0&&!projection.canPreviousMonth||Number(value)>0&&!projection.canNextMonth)throw new Error('Unavailable calendar month');
  next=withSchedulePart(current,part,value);
 }else next=part==='day'&&calendarIndex!=null?projection.cells[Number(calendarIndex)]?.iso:withSchedulePart(current,part,value);
 if(!next)throw new Error('Invalid calendar cell');
 if(part==='day'&&((scheduleParts(next).date<bounds.minDate)||(scheduleParts(next).date>bounds.maxDate)))throw new Error('Unavailable calendar day');
 if(part==='day'||part==='month'){
  const targetDate=scheduleParts(next).date;
  if(part==='month')next=new Date(Math.max(Date.parse(bounds.min),Math.min(Date.parse(bounds.max),Date.parse(next)))).toISOString();
  else {if(targetDate===bounds.minDate&&Date.parse(next)<Date.parse(bounds.min)){if(scheduleParts(bounds.min).date!==targetDate)throw new Error('Không còn khung giờ hợp lệ trong ngày.');next=bounds.min;}}
  const p=scheduleParts(next);if(p.hour<7)next=scheduleISO({...p,hour:7,minute:0});
 }
 return syncAppSchedule(session,validateAppSchedule(next,{now}),{now});
}
