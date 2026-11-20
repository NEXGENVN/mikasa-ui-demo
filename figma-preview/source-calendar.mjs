import {calendarProjection,initializeAppSchedule,withSchedulePart,validateAppSchedule,scheduleSaveState} from './app-calendar.mjs';
import {generateGlyphPaths} from './source-glyphs.mjs';
import {bindSourceTextSlots,sourceColor} from './source-text-slots.mjs';
import {bindSourceDrawingRegions} from './source-drawing-slots.mjs';
import {sourceControlArtwork} from './source-control-artwork.mjs';

const NS='http://www.w3.org/2000/svg',I={a:1,b:0,c:0,d:1,e:0,f:0};
const mul=(a,b)=>({a:a.a*b.a+a.c*b.b,b:a.b*b.a+a.d*b.b,c:a.a*b.c+a.c*b.d,d:a.b*b.c+a.d*b.d,e:a.a*b.e+a.c*b.f+a.e,f:a.b*b.e+a.d*b.f+a.f});
const inv=m=>{const z=m.a*m.d-m.b*m.c;return{a:m.d/z,b:-m.b/z,c:-m.c/z,d:m.a/z,e:(m.c*m.f-m.d*m.e)/z,f:(m.b*m.e-m.a*m.f)/z};};
const matrix=m=>`matrix(${m.a} ${m.b} ${m.c} ${m.d} ${m.e} ${m.f})`;
const same=(a,b)=>a.every((n,i)=>Math.abs(n-b[i])<.6);

export function calendarDateAppearance(date,{hover=false}={}){
 const disabled=Boolean(date.disabled),selected=Boolean(date.selected&&!disabled),today=Boolean(date.today&&!disabled&&!selected),activeHover=hover&&!disabled&&!selected;
 return {state:disabled?'disabled':selected?'selected':today?'today':'available',text:disabled?'#9CAAC1':selected?'#FFFFFF':today||activeHover?'#14538E':'#172033',background:disabled?'none':selected?'#14538E':activeHover?'#EDF4FB':'none',border:today?'#14538E':'none',borderWidth:today?1.5:0,opacity:1};
}

/** Project real dates into the original calendar; native selection artwork and fonts are reused. */
export function mountSourceCalendar({document,form,frame,session,library,assetBase,onIssue=()=>{},now=Date.now}){
 const currentTime=()=>typeof now==='function'?now():now;
 const metadata=frame.calendar,svg=document.querySelector('svg');
 if(!metadata||!svg)return {project:()=>null,restore(){}};
 const colors={normal:{...metadata.normalFont,color:'#172033'},selected:{...metadata.selectedFont,color:'#FFFFFF'},today:{...metadata.todayFont,color:'#14538E'},muted:{...metadata.mutedFont,color:'#9CAAC1'}};
 const saveControl=frame.controls?.find(c=>c.action==='app.schedule.save');
 const [gx,gy,gw,gh]=metadata.gridBox,origin=[svg.viewBox?.baseVal?.x||0,svg.viewBox?.baseVal?.y||0],regions=bindSourceDrawingRegions(document,[{id:'calendar-grid',box:metadata.gridBox},...(saveControl?[{id:'calendar-save',box:saveControl.box}]:[])]);
 const selectedRecords=(regions.bound.get('calendar-grid')?.allRecords||[]).filter(r=>r.element.localName!=='g'&&metadata.selectedSourceBox&&same(r.box,metadata.selectedSourceBox));
 const selection=selectedRecords.map(r=>({node:r.element.cloneNode(true),transform:mul(inv(svg.getCTM()||I),r.element.getCTM()||I)}));
 if(!selection.length)onIssue({frameId:frame.id,status:'calendar-selection-artwork-missing'});
 const layer=document.createElementNS(NS,'svg');layer.setAttribute('x',gx+origin[0]);layer.setAttribute('y',gy+origin[1]);layer.setAttribute('width',gw);layer.setAttribute('height',gh);layer.setAttribute('viewBox',`0 0 ${gw} ${gh}`);layer.setAttribute('overflow','hidden');layer.setAttribute('pointer-events','none');layer.setAttribute('aria-hidden','true');layer.setAttribute('data-source-calendar','true');
 const content=document.createElementNS(NS,'g');layer.append(content);svg.append(layer);
 const html=form.ownerDocument,scroller=html.createElement('div');scroller.className='interactive-calendar-grid';Object.assign(scroller.style,{position:'absolute',left:gx+'px',top:gy+'px',width:gw+'px',height:gh+'px',overflowX:'hidden',overflowY:'auto',scrollbarWidth:'none',pointerEvents:'auto',touchAction:'pan-y'});scroller.setAttribute('role','grid');scroller.setAttribute('aria-colcount','7');
 const rowgroup=html.createElement('div');rowgroup.setAttribute('role','rowgroup');scroller.append(rowgroup);
 const rows=Array.from({length:6},()=>{const row=html.createElement('div');row.setAttribute('role','row');Object.assign(row.style,{position:'relative',height:metadata.rowPitch+'px',width:gw+'px'});rowgroup.append(row);return row;});
 const controls=new Map([...form.querySelectorAll('[data-interactive-control]')].map(n=>[n.dataset.interactiveControl,n])),moved=[];
 for(const cell of metadata.cells){const node=controls.get(cell.id);if(!node)continue;moved.push({node,parent:node.parentNode,next:node.nextSibling,style:node.getAttribute('style'),role:node.getAttribute('role'),tabindex:node.getAttribute('tabindex'),label:node.getAttribute('aria-label'),disabled:Boolean(node.disabled),ariaDisabled:node.getAttribute('aria-disabled')});rows[Math.floor(cell.calendarIndex/7)].append(node);Object.assign(node.style,{position:'absolute',left:cell.box[0]-gx+'px',top:'0px',width:cell.box[2]+'px',height:cell.box[3]+'px'});node.setAttribute('role','gridcell');}
 form.append(scroller);
 const visuals=new Map(),hoverListeners=[];let hovered=null;
 function hover(id,active){const visual=visuals.get(id);if(!visual||visual.date.disabled||visual.date.selected)return;const appearance=calendarDateAppearance(visual.date,{hover:active});visual.rect.setAttribute('fill',appearance.background);visual.path.setAttribute('fill',appearance.text);visual.marker?.setAttribute('stroke',appearance.text);}
 for(const cell of metadata.cells){const node=controls.get(cell.id);if(!node)continue;const enter=()=>{hovered=cell.id;hover(cell.id,true);},leave=()=>{if(hovered===cell.id)hovered=null;hover(cell.id,false);};for(const name of ['pointerenter','focus'])node.addEventListener(name,enter);for(const name of ['pointerleave','blur'])node.addEventListener(name,leave);hoverListeners.push(()=>{for(const name of ['pointerenter','focus'])node.removeEventListener(name,enter);for(const name of ['pointerleave','blur'])node.removeEventListener(name,leave);});}

 const arrowLayer=document.createElementNS(NS,'g');arrowLayer.setAttribute('aria-hidden','true');arrowLayer.setAttribute('pointer-events','none');
 const arrowImages=new Map(),arrowControls=[metadata.previousControlId,metadata.nextControlId].map(id=>controls.get(id)).filter(Boolean).map(node=>({node,disabled:Boolean(node.disabled),ariaDisabled:node.getAttribute('aria-disabled')}));
 for(const arrow of metadata.arrows||[]){const art=sourceControlArtwork[arrow.sourceVectorId];if(!art)continue;const image=document.createElementNS(NS,'image');image.setAttribute('href',new URL(art.file,assetBase||globalThis.document?.baseURI||document.baseURI).href);image.setAttribute('width',art.width);image.setAttribute('height',art.height);const t=arrow.transform;image.setAttribute('transform',t?`matrix(${t.m00} ${t.m10} ${t.m01} ${t.m11} ${t.m02+origin[0]} ${t.m12+origin[1]})`:`translate(${arrow.graphicBox?.[0]+origin[0]} ${arrow.graphicBox?.[1]+origin[1]})`);arrowLayer.append(image);arrowImages.set(arrow.controlId,image);}
 svg.append(arrowLayer);
 const neighborSlots=(metadata.wheels||[]).flatMap(w=>w.slots.filter((s,i)=>i!==w.selectedIndex)),wheelBinder=bindSourceTextSlots(document,neighborSlots,{library}),wheelListeners=[];
 for(const wheel of metadata.wheels||[]){
  const select=controls.get(wheel.controlId)||controls.get(frame.controls?.find(c=>c.field===wheel.field)?.id);if(!select)continue;
  const choices=wheel.field.endsWith('minute')?[0,30]:Array.from({length:17},(_,i)=>i+7);
  {const options=choices.map(value=>{const option=html.createElement('option');option.value=String(value).padStart(2,'0');option.textContent=option.value;return option;});select.replaceChildren(...options);select.value=String(session.values[wheel.field]??'00').padStart(2,'0');}
  const host=select.closest('.interactive-control')||select.parentElement||select.parentNode;
  const available=()=>choices.filter(value=>{try{validateAppSchedule(withSchedulePart(session.context.appScheduleDate||initializeAppSchedule(session,{now:currentTime()}),wheel.field.endsWith('hour')?'hour':'minute',value),{now:currentTime()});return true;}catch{return false;}});
  const choose=(delta,edge)=>{const values=available();if(!values.length)return;const current=Number(select.value||session.values[wheel.field]||0),index=values.indexOf(current),next=edge==='first'?values[0]:edge==='last'?values.at(-1):index<0?(delta>0?values.find(v=>v>current)??values.at(-1):values.findLast(v=>v<current)??values[0]):values[((index+delta)%values.length+values.length)%values.length],value=String(next).padStart(2,'0');if(value===select.value)return;select.value=value;const EventType=html.defaultView?.Event||globalThis.Event;select.dispatchEvent(new EventType('change',{bubbles:true}));};
  const consume=event=>{event.preventDefault();event.stopPropagation();};
  const pointer=event=>{consume(event);select.focus({preventScroll:true});const r=host.getBoundingClientRect(),y=wheel.box[1]+(event.clientY-r.top)*wheel.box[3]/r.height,index=wheel.slots.findIndex(s=>y>=s.box[1]&&y<=s.box[1]+s.box[3]);if(index>=0&&index!==wheel.selectedIndex)choose(index-wheel.selectedIndex);};
  const scroll=event=>{if(!event.deltaY)return;consume(event);choose(event.deltaY>0?1:-1);};
  const key=event=>{if([' ','Enter','F4'].includes(event.key)){consume(event);return;}if(['ArrowUp','ArrowDown','Home','End','PageUp','PageDown'].includes(event.key)){consume(event);choose(['ArrowUp','PageUp'].includes(event.key)?-1:1,event.key==='Home'?'first':event.key==='End'?'last':undefined);}};
  host.addEventListener('pointerdown',pointer,true);host.addEventListener('wheel',scroll,{passive:false});select.addEventListener('keydown',key,true);wheelListeners.push(()=>{host.removeEventListener('pointerdown',pointer,true);host.removeEventListener('wheel',scroll);select.removeEventListener('keydown',key,true);});
 }
 const onScroll=()=>content.setAttribute('transform',`translate(0 ${-(Number(scroller.scrollTop)||0)})`);scroller.addEventListener('scroll',onScroll);
 function onKey(event){
  const index=metadata.cells.findIndex(c=>controls.get(c.id)===event.target);if(index<0||event.altKey||event.ctrlKey||event.metaKey)return;
  const step={ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7}[event.key],next=event.key==='Home'?Math.floor(index/7)*7:event.key==='End'?Math.floor(index/7)*7+6:step==null?null:index+step;
  const node=next==null?null:controls.get(metadata.cells[next]?.id);if(!node||node.hidden||node.disabled)return;
  event.preventDefault();for(const c of metadata.cells)controls.get(c.id)?.setAttribute('tabindex',c.calendarIndex===next?'0':'-1');node.focus({preventScroll:true});const y=Math.floor(next/7)*metadata.rowPitch;if(y<(scroller.scrollTop||0))scroller.scrollTop=y;else if(y+metadata.rowPitch>(scroller.scrollTop||0)+gh)scroller.scrollTop=y+metadata.rowPitch-gh;onScroll();
 }
 scroller.addEventListener('keydown',onKey);
 let previousDate=null,lastClockMinute=null;
 function project(){
  lastClockMinute=Math.floor(currentTime()/60000);
  const iso=session.context.appScheduleDate||initializeAppSchedule(session,{now:currentTime()}),projection=calendarProjection(iso,{now:currentTime()});regions.setVisible('calendar-grid',false);content.replaceChildren();visuals.clear();
  const focusDate=projection.cells.find(d=>d.selected&&!d.disabled)||projection.cells.find(d=>d.today&&!d.disabled)||projection.cells.find(d=>!d.disabled);
  rowgroup.style.height=projection.rows*metadata.rowPitch+'px';rows.forEach((row,i)=>row.hidden=i>=projection.rows);scroller.setAttribute('aria-label',projection.monthLabel);scroller.setAttribute('aria-rowcount',projection.rows);
  for(const cell of metadata.cells){const date=projection.cells[cell.calendarIndex],node=controls.get(cell.id);if(node){node.hidden=!date;node.disabled=!date||date.disabled;node.setAttribute('aria-disabled',String(node.disabled));if(date){node.setAttribute('aria-label',`Ngày ${date.day} tháng ${date.month} năm ${date.year}${date.inMonth?'':' (ngoài tháng đang xem)'}`);node.setAttribute('aria-selected',String(date.selected&&!date.disabled));node.setAttribute('tabindex',date===focusDate?'0':'-1');if(date.today)node.setAttribute('aria-current','date');else node.removeAttribute('aria-current');}}
   if(!date)continue;
   const x=cell.box[0]-gx,y=cell.box[1]-gy,appearance=calendarDateAppearance(date),font=date.disabled?colors.muted:date.selected?colors.selected:date.today?colors.today:colors.normal;
   const group=document.createElementNS(NS,'g');group.setAttribute('data-calendar-date',date.date);group.setAttribute('data-calendar-state',appearance.state);group.setAttribute('opacity',String(appearance.opacity));group.setAttribute('data-outside-month',String(!date.inMonth));
   const rect=document.createElementNS(NS,'rect'),inset=appearance.borderWidth/2;rect.setAttribute('x',x+inset);rect.setAttribute('y',y+inset);rect.setAttribute('width',cell.box[2]-inset*2);rect.setAttribute('height',cell.box[3]-inset*2);rect.setAttribute('rx',selection[0]?.node.getAttribute('rx')||'4');rect.setAttribute('fill',appearance.background);rect.setAttribute('stroke',appearance.border);rect.setAttribute('stroke-width',appearance.borderWidth);
   const generated=generateGlyphPaths(library,{...font,value:String(date.day),size:font.size,x,baseline:y+(font.baseline??font.size),width:cell.box[2],align:'center'}),path=document.createElementNS(NS,'path');path.setAttribute('d',generated.d);path.setAttribute('fill',appearance.text);group.append(rect,path);let marker;if(!date.inMonth){marker=document.createElementNS(NS,'line');marker.setAttribute('x1',x+cell.box[2]/2-5);marker.setAttribute('x2',x+cell.box[2]/2+5);marker.setAttribute('y1',y+cell.box[3]-2);marker.setAttribute('y2',y+cell.box[3]-2);marker.setAttribute('stroke',appearance.text);marker.setAttribute('stroke-width','1');marker.setAttribute('stroke-dasharray','2 1');marker.setAttribute('data-outside-month-marker','true');group.append(marker);}content.append(group);visuals.set(cell.id,{date,rect,path,marker});if(hovered===cell.id)hover(cell.id,true);

  }
  if(previousDate!==projection.date){const selected=projection.cells.find(c=>c.selected);scroller.scrollTop=selected&&Math.floor(selected.index/7)>=metadata.sourceRows?(projection.rows-metadata.sourceRows)*metadata.rowPitch:0;previousDate=projection.date;}onScroll();
  for(const [id,enabled]of [[metadata.previousControlId,projection.canPreviousMonth],[metadata.nextControlId,projection.canNextMonth]]){const node=controls.get(id);if(node){node.disabled=!enabled;node.setAttribute('aria-disabled',String(!enabled));}arrowImages.get(id)?.setAttribute('opacity',enabled?'1':'0.35');}
  for(const wheel of metadata.wheels||[]){const hour=wheel.field.endsWith('hour'),choices=hour?Array.from({length:17},(_,i)=>i+7):[0,30],selected=Number(session.values[wheel.field]??(hour?projection.hour:projection.minute)),at=Math.max(0,choices.indexOf(selected)),select=controls.get(wheel.controlId)||controls.get(frame.controls?.find(c=>c.field===wheel.field)?.id);if(select){select.value=String(selected).padStart(2,'0');for(const option of select.children){try{validateAppSchedule(withSchedulePart(iso,hour?'hour':'minute',option.value),{now:currentTime()});option.disabled=false;}catch{option.disabled=true;}}}wheel.slots.forEach((slot,index)=>{if(index!==wheel.selectedIndex)wheelBinder.setTextSlot(slot,String(choices[((at+index-wheel.selectedIndex)%choices.length+choices.length)%choices.length]).padStart(2,'0'),{nativeFallback:true});});}
  const save=scheduleSaveState(session,{now:currentTime()}),enabled=save.valid&&save.changed,node=controls.get(saveControl?.id);if(node){node.disabled=!enabled;node.setAttribute('aria-disabled',String(!enabled));}for(const record of regions.bound.get('calendar-save')?.records||[])record.element.setAttribute('opacity',enabled?record.opacity??'1':'0.38');
  return projection;
 }
 const clockTimer=setInterval(()=>{if(Math.floor(currentTime()/60000)!==lastClockMinute)project();},1000);clockTimer.unref?.();
 function restore(){clearInterval(clockTimer);hoverListeners.forEach(remove=>remove());regions.restore();wheelBinder.restore();wheelListeners.forEach(remove=>remove());layer.remove();arrowLayer.remove();scroller.removeEventListener('scroll',onScroll);scroller.removeEventListener('keydown',onKey);for(const saved of moved.reverse()){const {node,parent,next}=saved;parent.insertBefore(node,next?.parentNode===parent?next:null);for(const [key,value]of [['style',saved.style],['role',saved.role],['tabindex',saved.tabindex],['aria-label',saved.label],['aria-disabled',saved.ariaDisabled]]){if(value==null)node.removeAttribute(key);else node.setAttribute(key,value);}node.disabled=saved.disabled;node.removeAttribute('aria-selected');node.removeAttribute('aria-current');node.hidden=false;}for(const saved of arrowControls){saved.node.disabled=saved.disabled;if(saved.ariaDisabled==null)saved.node.removeAttribute('aria-disabled');else saved.node.setAttribute('aria-disabled',saved.ariaDisabled);}scroller.remove();}
 return {project,restore,layer,scroller};
}
