import {calendarProjection,initializeAppSchedule} from './app-calendar.mjs';
import {generateGlyphPaths} from './source-glyphs.mjs';
import {bindSourceTextSlots,sourceColor} from './source-text-slots.mjs';
import {bindSourceDrawingRegions} from './source-drawing-slots.mjs';
import {sourceControlArtwork} from './source-control-artwork.mjs';

const NS='http://www.w3.org/2000/svg',I={a:1,b:0,c:0,d:1,e:0,f:0};
const mul=(a,b)=>({a:a.a*b.a+a.c*b.b,b:a.b*b.a+a.d*b.b,c:a.a*b.c+a.c*b.d,d:a.b*b.c+a.d*b.d,e:a.a*b.e+a.c*b.f+a.e,f:a.b*b.e+a.d*b.f+a.f});
const inv=m=>{const z=m.a*m.d-m.b*m.c;return{a:m.d/z,b:-m.b/z,c:-m.c/z,d:m.a/z,e:(m.c*m.f-m.d*m.e)/z,f:(m.b*m.e-m.a*m.f)/z};};
const matrix=m=>`matrix(${m.a} ${m.b} ${m.c} ${m.d} ${m.e} ${m.f})`;
const same=(a,b)=>a.every((n,i)=>Math.abs(n-b[i])<.6);

/** Project real dates into the original calendar; native selection artwork and fonts are reused. */
export function mountSourceCalendar({document,form,frame,session,library,assetBase,onIssue=()=>{}}){
 const metadata=frame.calendar,svg=document.querySelector('svg');
 if(!metadata||!svg)return {project:()=>null,restore(){}};
 const dayPaints=bindSourceTextSlots(document,metadata.sourceDaySlots||[],{library});
 const nativeFont=font=>{const slot=(metadata.sourceDaySlots||[]).find(s=>s.font?.size===font.size&&s.font?.weight===font.weight&&sourceColor(s.font?.color)===sourceColor(font.color));return {...font,color:dayPaints.ready.get(slot?.id)?.paint||font.color};};
 const colors={normal:nativeFont(metadata.normalFont),selected:nativeFont(metadata.selectedFont),today:nativeFont(metadata.todayFont),muted:nativeFont(metadata.mutedFont)};
 const [gx,gy,gw,gh]=metadata.gridBox,origin=[svg.viewBox?.baseVal?.x||0,svg.viewBox?.baseVal?.y||0],regions=bindSourceDrawingRegions(document,[{id:'calendar-grid',box:metadata.gridBox}]);
 const selectedRecords=(regions.bound.get('calendar-grid')?.allRecords||[]).filter(r=>r.element.localName!=='g'&&metadata.selectedSourceBox&&same(r.box,metadata.selectedSourceBox));
 const selection=selectedRecords.map(r=>({node:r.element.cloneNode(true),transform:mul(inv(svg.getCTM()||I),r.element.getCTM()||I)}));
 if(!selection.length)onIssue({frameId:frame.id,status:'calendar-selection-artwork-missing'});
 const layer=document.createElementNS(NS,'svg');layer.setAttribute('x',gx+origin[0]);layer.setAttribute('y',gy+origin[1]);layer.setAttribute('width',gw);layer.setAttribute('height',gh);layer.setAttribute('viewBox',`0 0 ${gw} ${gh}`);layer.setAttribute('overflow','hidden');layer.setAttribute('pointer-events','none');layer.setAttribute('aria-hidden','true');layer.setAttribute('data-source-calendar','true');
 const content=document.createElementNS(NS,'g');layer.append(content);svg.append(layer);
 const html=form.ownerDocument,scroller=html.createElement('div');scroller.className='interactive-calendar-grid';Object.assign(scroller.style,{position:'absolute',left:gx+'px',top:gy+'px',width:gw+'px',height:gh+'px',overflowX:'hidden',overflowY:'auto',scrollbarWidth:'none',pointerEvents:'auto',touchAction:'pan-y'});scroller.setAttribute('role','grid');scroller.setAttribute('aria-colcount','7');
 const rowgroup=html.createElement('div');rowgroup.setAttribute('role','rowgroup');scroller.append(rowgroup);
 const rows=Array.from({length:6},()=>{const row=html.createElement('div');row.setAttribute('role','row');Object.assign(row.style,{position:'relative',height:metadata.rowPitch+'px',width:gw+'px'});rowgroup.append(row);return row;});
 const controls=new Map([...form.querySelectorAll('[data-interactive-control]')].map(n=>[n.dataset.interactiveControl,n])),moved=[];
 for(const cell of metadata.cells){const node=controls.get(cell.id);if(!node)continue;moved.push({node,parent:node.parentNode,next:node.nextSibling,style:node.getAttribute('style'),role:node.getAttribute('role'),tabindex:node.getAttribute('tabindex'),label:node.getAttribute('aria-label')});rows[Math.floor(cell.calendarIndex/7)].append(node);Object.assign(node.style,{position:'absolute',left:cell.box[0]-gx+'px',top:'0px',width:cell.box[2]+'px',height:cell.box[3]+'px'});node.setAttribute('role','gridcell');}
 form.append(scroller);
 const arrowLayer=document.createElementNS(NS,'g');arrowLayer.setAttribute('aria-hidden','true');arrowLayer.setAttribute('pointer-events','none');
 for(const arrow of metadata.arrows||[]){const art=sourceControlArtwork[arrow.sourceVectorId];if(!art)continue;const image=document.createElementNS(NS,'image');image.setAttribute('href',new URL(art.file,assetBase||globalThis.document?.baseURI||document.baseURI).href);image.setAttribute('width',art.width);image.setAttribute('height',art.height);const t=arrow.transform;image.setAttribute('transform',t?`matrix(${t.m00} ${t.m10} ${t.m01} ${t.m11} ${t.m02+origin[0]} ${t.m12+origin[1]})`:`translate(${arrow.graphicBox?.[0]+origin[0]} ${arrow.graphicBox?.[1]+origin[1]})`);arrowLayer.append(image);}
 svg.append(arrowLayer);
 const neighborSlots=(metadata.wheels||[]).flatMap(w=>w.slots.filter((s,i)=>i!==w.selectedIndex)),wheelBinder=bindSourceTextSlots(document,neighborSlots,{library}),wheelListeners=[];
 for(const wheel of metadata.wheels||[]){
  const select=controls.get(wheel.controlId)||controls.get(frame.controls?.find(c=>c.field===wheel.field)?.id);if(!select)continue;
  const host=select.closest('.interactive-control')||select.parentElement||select.parentNode;
  const choose=delta=>{const current=Number(select.value||session.values[wheel.field]||0),value=String((current+delta+wheel.limit)%wheel.limit).padStart(2,'0');select.value=value;const EventType=html.defaultView?.Event||globalThis.Event;select.dispatchEvent(new EventType('change',{bubbles:true}));};
  const consume=event=>{event.preventDefault();event.stopPropagation();};
  const pointer=event=>{consume(event);select.focus({preventScroll:true});const r=host.getBoundingClientRect(),y=wheel.box[1]+(event.clientY-r.top)*wheel.box[3]/r.height,index=wheel.slots.findIndex(s=>y>=s.box[1]&&y<=s.box[1]+s.box[3]);if(index>=0&&index!==wheel.selectedIndex)choose(index-wheel.selectedIndex);};
  const scroll=event=>{if(!event.deltaY)return;consume(event);choose(event.deltaY>0?1:-1);};
  const key=event=>{if([' ','Enter','F4'].includes(event.key)){consume(event);return;}if(event.key==='ArrowUp'||event.key==='ArrowDown'){consume(event);choose(event.key==='ArrowUp'?-1:1);}};
  host.addEventListener('pointerdown',pointer,true);host.addEventListener('wheel',scroll,{passive:false});select.addEventListener('keydown',key,true);wheelListeners.push(()=>{host.removeEventListener('pointerdown',pointer,true);host.removeEventListener('wheel',scroll);select.removeEventListener('keydown',key,true);});
 }
 const onScroll=()=>content.setAttribute('transform',`translate(0 ${-(Number(scroller.scrollTop)||0)})`);scroller.addEventListener('scroll',onScroll);
 function onKey(event){
  const index=metadata.cells.findIndex(c=>controls.get(c.id)===event.target);if(index<0||event.altKey||event.ctrlKey||event.metaKey)return;
  const step={ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7}[event.key],next=event.key==='Home'?Math.floor(index/7)*7:event.key==='End'?Math.floor(index/7)*7+6:step==null?null:index+step;
  const node=next==null?null:controls.get(metadata.cells[next]?.id);if(!node||node.hidden)return;
  event.preventDefault();for(const c of metadata.cells)controls.get(c.id)?.setAttribute('tabindex',c.calendarIndex===next?'0':'-1');node.focus({preventScroll:true});const y=Math.floor(next/7)*metadata.rowPitch;if(y<(scroller.scrollTop||0))scroller.scrollTop=y;else if(y+metadata.rowPitch>(scroller.scrollTop||0)+gh)scroller.scrollTop=y+metadata.rowPitch-gh;onScroll();
 }
 scroller.addEventListener('keydown',onKey);
 let previousDate=null;
 function project(){
  const iso=session.context.appScheduleDate||initializeAppSchedule(session),projection=calendarProjection(iso);regions.setVisible('calendar-grid',false);content.replaceChildren();
  rowgroup.style.height=projection.rows*metadata.rowPitch+'px';rows.forEach((row,i)=>row.hidden=i>=projection.rows);scroller.setAttribute('aria-label',projection.monthLabel);scroller.setAttribute('aria-rowcount',projection.rows);
  for(const cell of metadata.cells){const date=projection.cells[cell.calendarIndex],node=controls.get(cell.id);if(node){node.hidden=!date;if(date){node.setAttribute('aria-label',`Ngày ${date.day} tháng ${date.month} năm ${date.year}`);node.setAttribute('aria-selected',String(date.selected));node.setAttribute('tabindex',date.selected?'0':'-1');if(date.today)node.setAttribute('aria-current','date');else node.removeAttribute('aria-current');}}
   if(!date)continue;
   const x=cell.box[0]-gx,y=cell.box[1]-gy,font=date.selected&&selection.length?colors.selected:date.today?colors.today:date.inMonth?colors.normal:colors.muted;
   if(date.selected)for(const source of selection){const g=document.createElementNS(NS,'g'),clone=source.node.cloneNode(true);g.setAttribute('transform',`translate(${x-metadata.selectedSourceBox[0]-origin[0]} ${y-metadata.selectedSourceBox[1]-origin[1]})`);clone.setAttribute('transform',matrix(source.transform));g.append(clone);content.append(g);}
   const generated=generateGlyphPaths(library,{...font,value:String(date.day),size:font.size,x,baseline:y+(font.baseline??font.size),width:cell.box[2],align:'center'}),path=document.createElementNS(NS,'path');path.setAttribute('d',generated.d);path.setAttribute('fill',sourceColor(font.color));content.append(path);
  }
  if(previousDate!==projection.date){const selected=projection.cells.find(c=>c.selected);scroller.scrollTop=selected&&Math.floor(selected.index/7)>=metadata.sourceRows?(projection.rows-metadata.sourceRows)*metadata.rowPitch:0;previousDate=projection.date;}onScroll();
  for(const wheel of metadata.wheels||[]){const selected=Number(session.values[wheel.field]??(wheel.field.endsWith('hour')?projection.hour:projection.minute));wheel.slots.forEach((slot,index)=>{if(index!==wheel.selectedIndex)wheelBinder.setTextSlot(slot,String((selected+index-wheel.selectedIndex+wheel.limit)%wheel.limit).padStart(2,'0'),{nativeFallback:true});});}
  return projection;
 }
 function restore(){regions.restore();wheelBinder.restore();wheelListeners.forEach(remove=>remove());layer.remove();arrowLayer.remove();scroller.removeEventListener('scroll',onScroll);scroller.removeEventListener('keydown',onKey);for(const saved of moved.reverse()){const {node,parent,next}=saved;parent.insertBefore(node,next?.parentNode===parent?next:null);for(const [key,value]of [['style',saved.style],['role',saved.role],['tabindex',saved.tabindex],['aria-label',saved.label]]){if(value==null)node.removeAttribute(key);else node.setAttribute(key,value);}node.removeAttribute('aria-selected');node.removeAttribute('aria-current');node.hidden=false;}scroller.remove();}
 return {project,restore,layer,scroller};
}
