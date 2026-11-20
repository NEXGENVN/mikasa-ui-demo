import {boxFromSvgElement} from './source-text-slots.mjs';

const field='app.send.scheduled',actions=['app.schedule.now','app.schedule.open'];
const contained=(inner,outer)=>inner[0]>=outer[0]-.5&&inner[1]>=outer[1]-.5&&inner[0]+inner[2]<=outer[0]+outer[2]+.5&&inner[1]+inner[3]<=outer[1]+outer[3]+.5;
const paint=value=>value&&!/^(?:none|transparent|url\()/i.test(value)?value:null;
const noop=()=>({project(){},restore(){}});

/** Keep the original send-time label and icon paints aligned with its radio.
 * Colors come from the checked/unchecked original SVG rows, never .fig text
 * metadata. Only owned fill/stroke attributes change; radio patches own circles.
 */
export function mountSourceSendModeDrawing({document,frame}){
 const svg=document?.querySelector('svg');if(!svg)return noop();
 const controls=frame.controls||[],radios=actions.map(action=>controls.find(c=>c.type==='radio'&&c.field===field&&c.action===action));
 if(radios.some(c=>!c)||radios.filter(c=>c.checked===true).length!==1)return noop();
 const buttons=actions.map(action=>controls.find(c=>c.type==='button'&&c.action===action&&c.box?.[2]>18));
 if(buttons.every(c=>!c))return noop();
 const origin=svg.viewBox?.baseVal||{x:Number((svg.getAttribute('viewBox')||'').split(/[\s,]+/)[0])||0,y:Number((svg.getAttribute('viewBox')||'').split(/[\s,]+/)[1])||0};
 const boxes=buttons.map((button,i)=>{
  if(button)return button.box;
  // The native selected-immediate row has no full-row hotspot in some exports.
  // Its paired radio gives the exact translation of the other original row.
  const other=1-i,[x,y,w,h]=buttons[other].box;
  return[x+radios[i].box[0]-radios[other].box[0],y+radios[i].box[1]-radios[other].box[1],w,h];
 });
 const rows=boxes.map(()=>[]);
 for(const element of svg.querySelectorAll('path,line,polyline,polygon')){
  if(!['path','line','polyline','polygon'].includes(element.localName)||element.closest('defs,mask,clipPath,filter,pattern'))continue;
  let bounds;try{bounds=boxFromSvgElement(element,svg);bounds[0]-=origin.x;bounds[1]-=origin.y;}catch{continue;}
  if(radios.some(radio=>contained(bounds,radio.box)))continue;
  const index=boxes.findIndex(box=>contained(bounds,box));if(index<0)continue;
  for(const attribute of ['fill','stroke']){const value=paint(element.getAttribute(attribute));if(value)rows[index].push({element,attribute,value});}
 }
 const colors=rows.map(records=>{const counts=new Map();for(const record of records)counts.set(record.value,(counts.get(record.value)||0)+1);return[...counts].sort((a,b)=>b[1]-a[1])[0]?.[0];});
 if(colors.some(color=>!color)||colors[0]===colors[1])return noop();
 const selected=radios.findIndex(radio=>radio.checked===true),active=colors[selected],muted=colors[1-selected],owned=rows.map((records,i)=>records.filter(record=>record.value===colors[i]));
 function project(session){
  if(!session.dirty?.has(field)||typeof session.values?.[field]!=='boolean')return;
  const selectedIndex=session.values[field]?1:0;
  owned.forEach((records,i)=>{for(const record of records)record.element.setAttribute(record.attribute,i===selectedIndex?active:muted);});
 }
 function restore(){for(const records of owned)for(const record of records)record.element.setAttribute(record.attribute,record.value);}
 return{project,restore};
}
