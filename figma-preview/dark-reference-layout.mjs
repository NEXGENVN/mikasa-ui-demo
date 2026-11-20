import {darkAccountReferenceLayout} from './source-dark-account-reference.mjs';
const contains=(outer,box)=>Array.isArray(box)&&box[0]>=outer[0]-.1&&box[1]>=outer[1]-.1&&box[0]+box[2]<=outer[0]+outer[2]+.1&&box[1]+box[3]<=outer[1]+outer[3]+.1;
/** Keep native click/field geometry aligned with the screenshot-backed SVG transforms. */
export function withDarkReferenceLayout(frame){
 const regions=frame?.platform==='app'&&darkAccountReferenceLayout[frame.id],schedule=frame?.platform==='app'&&frame.id==='1444:94627'&&frame.calendar;if(!regions&&!schedule)return frame;
 const mapBox=box=>{const region=(regions||[]).find(r=>contains(r.box,box));if(!region)return box;const {box:b,targetBox:t}=region,sx=t[2]/b[2],sy=t[3]/b[3];return[t[0]+(box[0]-b[0])*sx,t[1]+(box[1]-b[1])*sy,box[2]*sx,box[3]*sy];};
 const slot=s=>({...s,box:mapBox(s.box),...(s.sourceClipBox?{sourceClipBox:mapBox(s.sourceClipBox)}:{})});
 const controls=frame.controls?.filter(c=>!(frame.id==='1450:9744'&&contains([16,691,358,42],c.box))).map(c=>({...c,box:mapBox(c.box),...(c.textSlots?{textSlots:c.textSlots.map(slot)}:{})}));
 let result={...frame,...(controls?{controls}:{}),...(frame.texts?{texts:frame.texts.map(slot)}:{}),...Object.fromEntries(['visibility','transforms','componentStates'].filter(key=>frame[key]).map(key=>[key,frame[key].map(r=>({...r,box:mapBox(r.box)}))]))};
 const minute=schedule?.wheels?.find(w=>w.field==='app.schedule.minute'),active=minute?.slots[minute.selectedIndex],muted=minute?.slots.find(s=>s!==active);
 // The screenshot-backed source sample is 30 at center and 00 one row above.
 // Match that artwork while leaving the live control's initial/session value alone.
 if(active?.text==='00'&&active.box[1]===644&&muted?.text==='30'){
  const selected={...active,text:'30'},above={...muted,text:'00',box:[muted.box[0],604,muted.box[2],muted.box[3]]};
  result={...result,calendar:{...schedule,wheels:schedule.wheels.map(w=>w===minute?{...w,selectedIndex:1,slots:[above,selected]}:w)},controls:result.controls?.map(c=>c.field==='app.schedule.minute'?{...c,textSlots:[selected]}:c)};
 }
 return result;
}
