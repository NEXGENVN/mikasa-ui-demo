const slot=n=>({id:n.id,box:n.bbox,text:n.text,font:n.font});
const blue=n=>(n.font?.color?.b||0)>.8&&(n.font?.color?.r||0)<.4;
const white=n=>['r','g','b'].every(k=>(n.font?.color?.[k]||0)>.95);
const order=(a,b)=>a.bbox[1]-b.bbox[1]||a.bbox[0]-b.bbox[0];

export function calendarSummarySlots(frame){
 return frame.nodes.filter(n=>n.rendered!==false&&n.type==='TEXT'&&['Date','Time','Current schedule value'].includes(n.name)).flatMap(n=>{const labels=frame.nodes.filter(c=>c.parentId===n.parentId&&c.id!==n.id).map(c=>c.text||'').join(' ');const field=n.name==='Date'&&/Ngày gửi/.test(labels)?'app.schedule.dateDisplay':n.name==='Time'&&/Giờ gửi/.test(labels)?'app.schedule.timeDisplay':n.name==='Current schedule value'&&/Thời gian hiện tại/.test(labels)?'app.schedule.nowDisplay':null;return field?[{...slot(n),field}]:[];});
}

/** Calendar-only metadata from the original Day, Month selector and time-wheel nodes. */
export function buildCalendarMetadata(frame,controls){
 const nodes=frame.nodes.filter(n=>n.rendered!==false),byId=new Map(nodes.map(n=>[n.id,n])),days=nodes.filter(n=>n.name==='Day'&&/^\d{1,2}$/.test(n.text)).sort(order);
 if(!days.length)return null;
 const xs=[...new Set(days.map(n=>n.bbox[0]))].sort((a,b)=>a-b),ys=[...new Set(days.map(n=>n.bbox[1]))].sort((a,b)=>a-b),first=days[0],cellSize=first.bbox.slice(2),columnPitch=xs[1]-xs[0]||cellSize[0]+10,rowPitch=ys[1]-ys[0]||cellSize[1]+1,gridBox=[xs[0]-(columnPitch-cellSize[0])/2,ys[0],columnPitch*7,rowPitch*5];
 const selected=days.find(white),normal=days.find(n=>!white(n)&&!blue(n)&&(n.font?.color?.r||0)<.5)||first,muted=days.find(n=>!white(n)&&(n.font?.color?.r||0)>.5)||normal,today=days.find(blue)||normal;
 const cells=Array.from({length:42},(_,calendarIndex)=>{
  const row=Math.floor(calendarIndex/7),col=calendarIndex%7,box=[xs[0]+col*columnPitch,ys[0]+row*rowPitch,...cellSize],source=days.find(n=>Math.abs(n.bbox[0]-box[0])<.1&&Math.abs(n.bbox[1]-box[1])<.1),parent=source&&byId.get(source.parentId),id=parent?.id||`${frame.id};calendar-cell-${calendarIndex}`;
  let control=controls.find(c=>c.id===id||c.action==='app.schedule.day'&&source&&c.textSlots?.some(s=>s.id===source.id));
  if(!control){control={id,type:'button',box,label:'Ngày '+(calendarIndex+1),action:'app.schedule.day',textSlots:source?[slot(source)]:[],sourceCellId:first.parentId};controls.push(control);}
  Object.assign(control,{calendarIndex,box,action:'app.schedule.day'});
  return {id:control.id,calendarIndex,box};
 });
 const month=nodes.find(n=>n.name==='Month selector'),arrows=month?frame.nodes.filter(n=>n.parentId===month.id&&n.type==='INSTANCE'&&n.bbox[2]<=30).sort((a,b)=>a.bbox[0]-b.bbox[0]):[];
 for(const [i,n]of arrows.entries()){
  let control=controls.find(c=>c.id===n.id);if(!control){control={id:n.id,type:'button',box:n.clippedBBox||n.bbox};controls.push(control);}
  Object.assign(control,{action:'app.schedule.month',value:i===0?-1:1,label:i===0?'Tháng trước':'Tháng sau'});
 }
 const wheels=[];
 for(const node of nodes.filter(n=>/^(Hour|Minute) wheel$/i.test(n.name))){
  const hour=/^Hour/i.test(node.name),field=hour?'app.schedule.hour':'app.schedule.minute',values=nodes.filter(n=>n.type==='TEXT'&&n.id.startsWith(node.id+';')&&/^\d{1,2}$/.test(n.text)&&n.bbox[1]>=node.bbox[1]&&n.bbox[1]+n.bbox[3]<=node.bbox[1]+node.bbox[3]+1).sort(order);
  const selected=values.find(blue)||values.find(n=>n.bbox[1]>=node.bbox[1]+node.bbox[3]*.39&&n.bbox[1]<=node.bbox[1]+node.bbox[3]*.51)||values[0];
  if(!selected)continue;
  const control=controls.find(c=>c.id===node.id);
  const choices=hour?Array.from({length:17},(_,i)=>i+7):[0,30];
  if(control)Object.assign(control,{field,value:selected.text,textSlots:[slot(selected)],action:hour?'app.schedule.hour':'app.schedule.minute',options:choices.map(value=>({label:String(value).padStart(2,'0'),value:String(value).padStart(2,'0')}))});
  wheels.push({controlId:control?.id||node.id,field,box:node.bbox,limit:hour?24:60,values:choices,selectedIndex:values.indexOf(selected),slots:values.map(slot)});
 }
 const arrowGraphics=arrows.map(n=>{const vector=frame.nodes.find(v=>v.parentId===n.id&&v.type==='VECTOR');return {controlId:n.id,box:n.bbox,sourceVectorId:vector?.sourceId||vector?.id.split(';').at(-1),transform:vector?.globalTransform,graphicBox:vector?.bbox};});
 return {timeZone:'Asia/Ho_Chi_Minh',weekStartsOn:0,gridBox,cellSize,columnPitch,rowPitch,sourceRows:5,cells,sourceDaySlots:days.map(slot),selectedSourceBox:selected?.bbox,normalFont:normal.font,mutedFont:muted.font,todayFont:today.font,selectedFont:selected?.font||normal.font,wheels,arrows:arrowGraphics,previousControlId:arrows[0]?.id,nextControlId:arrows[1]?.id};
}
