import {calendarReferences} from './calendar-reference-data.mjs';

const aliases={'1635:109376':'1107:4929'};
export function calendarReferenceFile(frame){return calendarReferences[aliases[frame?.id]||frame?.id]?.file||frame?.file;}
/** New vector exports and their hit areas travel together; the original 791 assets stay immutable. */
export function withCalendarReferenceLayout(frame){
 const sourceId=aliases[frame?.id]||frame?.id,reference=frame?.platform==='app'&&calendarReferences[sourceId];
 if(!reference||frame.calendarReference===sourceId)return frame;
 const file=reference.file;
 if(!frame.calendar)return {...frame,file,calendarReference:sourceId};
 const remap=value=>Array.isArray(value)?value.map(remap):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([key,v])=>[key,remap(v)])):typeof value==='string'?value.replaceAll(sourceId,frame.id):value;
 const data=remap(reference),cells=frame.calendar.cells.map(cell=>({...cell,box:[25+cell.calendarIndex%7*50,417+Math.floor(cell.calendarIndex/7)*32,40,24]}));
 const controls=[...data.controls,...cells.map(cell=>{const original=frame.controls.find(c=>c.id===cell.id)||{};return {...original,...cell,type:'button',action:'app.schedule.day',textSlots:[]};})];
 return {...frame,file,calendarReference:sourceId,controls,texts:data.texts,calendar:{...data.calendar,cells,scrollSelectionToStart:true,wheels:data.calendar.wheels.map(w=>({...w,activePaint:'#14538E'}))},visibility:[],transforms:[],componentStates:[]};
}
