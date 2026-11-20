import {componentValue} from './interactive-component-view.mjs';
import {bindSourceDrawingRegions} from './source-drawing-slots.mjs';
const ns='http://www.w3.org/2000/svg';
export function componentMembers(component,session){
 const value=componentValue(component,session),state=component.states[value]||component.states[String(component.initialValue)]||Object.values(component.states)[0];
 return {value,state,members:new Map((state?.controls||[]).map(c=>[c.field?'field:'+c.field:c.action||c.id,c]))};
}
export function popupPosition(control,popup){return [control.box[0]+(popup.offset?.[0]||0),control.box[1]+(popup.offset?.[1]||0),popup.width,popup.height];}

/** Repaint card backgrounds at their original paint order, beneath existing labels. */
export function mountSourceCards({document:doc,frame,baseURI}){
 const svg=doc.querySelector('svg'),cards=(frame.controls||[]).filter(c=>c.cardAssets);if(!svg||!cards.length)return {project(){},restore(){}};
 const origin=svg.viewBox.baseVal,regions=bindSourceDrawingRegions(doc,cards.map(c=>({id:c.id,box:c.cardAssets.box}))),entries=[];
 for(const control of cards){const box=control.cardAssets.box,records=(regions.bound.get(control.id)?.allRecords||[]).filter(r=>r.element.localName!=='g'&&r.box.every((value,i)=>Math.abs(value-box[i])<=1));if(!records.length)continue;
  const first=records[0].element,parent=first.parentNode,group=doc.createElementNS(ns,'g'),image=doc.createElementNS(ns,'image');group.append(image);group.hidden=true;group.setAttribute('display','none');parent.insertBefore(group,first);
  const relative=parent.getCTM().inverse().multiply(svg.getCTM());group.setAttribute('transform',`matrix(${relative.a} ${relative.b} ${relative.c} ${relative.d} ${relative.e} ${relative.f})`);image.setAttribute('x',String(origin.x+box[0]));image.setAttribute('y',String(origin.y+box[1]));image.setAttribute('width',String(box[2]));image.setAttribute('height',String(box[3]));entries.push({control,records,group,image});
 }
 function project(session){for(const {control,records,group,image}of entries){const checked=String(session.values[control.field])===String(control.value),changed=session.dirty.has(control.field)&&checked!==!!control.checked;group.setAttribute('display',changed?'inline':'none');for(const record of records)if(changed)record.element.setAttribute('opacity','0');else if(record.opacity==null)record.element.removeAttribute('opacity');else record.element.setAttribute('opacity',record.opacity);if(changed)image.setAttribute('href',new URL(checked?control.cardAssets.checkedAsset:control.cardAssets.uncheckedAsset,baseURI).href);}}
 return {project,restore(){for(const {records,group}of entries){group.remove();for(const record of records)if(record.opacity==null)record.element.removeAttribute('opacity');else record.element.setAttribute('opacity',record.opacity);}}};
}

/** Insert only native artwork that the original viewport export clipped away. */
export async function mountSourceExtraArtwork({document:doc,frame,baseURI,fetchAsset=fetch}){
 const svg=doc.querySelector('svg');if(!svg||!frame.extraArtwork?.length)return ()=>{};
 const origin=svg.viewBox.baseVal,groups=[],clips=[];
 const loaded=await Promise.all(frame.extraArtwork.map(async(art,index)=>{
  const response=await fetchAsset(new URL(art.file,baseURI));if(!response.ok)throw new Error('Native component unavailable: '+art.file);
  const parsed=new doc.defaultView.DOMParser().parseFromString(await response.text(),'image/svg+xml'),source=parsed.documentElement;
  if(source.localName!=='svg'||source.querySelector('parsererror,script,foreignObject'))throw new Error('Invalid native component: '+art.file);
  const prefix='extra-'+frame.id.replace(':','-')+'-'+index+'-',ids=new Map([...source.querySelectorAll('[id]')].map(n=>[n.id,prefix+n.id]));
  for(const node of [source,...source.querySelectorAll('*')])for(const attr of [...node.attributes]){
   if(attr.name==='id')node.setAttribute('id',ids.get(attr.value));
   else if(/url\(|^#/.test(attr.value)){let value=attr.value;for(const [old,next]of ids)value=value.replaceAll('url(#'+old+')','url(#'+next+')').replaceAll('url("#'+old+'")','url("#'+next+'")');if(value.startsWith('#')&&ids.has(value.slice(1)))value='#'+ids.get(value.slice(1));node.setAttribute(attr.name,value);}
  }
  const group=doc.createElementNS(ns,'g');group.dataset.sourceExtraArtwork=art.id;group.setAttribute('transform',`translate(${origin.x+art.box[0]} ${origin.y+art.box[1]})`);
  // Native exported bounds and viewBox remain one source unit per CSS pixel.
  const vb=(source.getAttribute('viewBox')||'0 0').split(/[ ,]+/).map(Number),inner=doc.createElementNS(ns,'g');inner.setAttribute('transform',`translate(${-vb[0]} ${-vb[1]})`);
  for(const child of [...source.childNodes])inner.append(doc.importNode(child,true));group.append(inner);
  let clip;if(art.clipAtFold){clip=doc.createElementNS(ns,'clipPath');clip.id=prefix+'fold';const rect=doc.createElementNS(ns,'rect');rect.setAttribute('x','-100');rect.setAttribute('y',String(Math.max(0,frame.height-art.box[1])));rect.setAttribute('width',String(art.box[2]+200));rect.setAttribute('height',String(art.box[3]+200));clip.append(rect);group.prepend(clip);group.setAttribute('clip-path','url(#'+clip.id+')');}
  return {group,clip};
 }));
 for(const {group,clip}of loaded){svg.append(group);groups.push(group);if(clip)clips.push({group,clip});}
 const scroll=()=>{const moved=(doc.scrollingElement?.scrollTop||0)>0;for(const {group,clip}of clips)if(moved)group.removeAttribute('clip-path');else group.setAttribute('clip-path','url(#'+clip.id+')');};
 doc.addEventListener('scroll',scroll,{passive:true});scroll();return ()=>{doc.removeEventListener('scroll',scroll);for(const group of groups)group.remove();};
}

/** Native vector menu with semantic, keyboard-operable options. */
export function mountSourcePopup({form,control,element,onSelect,onClose}){
 const doc=form.ownerDocument,popup=control.popup,[x,y,w,h]=popupPosition(control,popup),host=doc.createElement('div');
 host.className='interactive-source-popup';host.setAttribute('role','listbox');host.setAttribute('aria-label',control.label||'Lựa chọn');Object.assign(host.style,{left:x+'px',top:y+'px',width:w+'px',height:h+'px'});
 const img=doc.createElement('img');img.src=new URL(popup.file,element.dataset.assetBase||doc.baseURI).href;img.alt='';img.width=w;img.height=h;host.append(img);
 const buttons=(popup.options||[]).map(option=>{const button=doc.createElement('button');button.type='button';button.className='interactive-menu-option';button.setAttribute('role','option');button.setAttribute('aria-label',option.label);button.setAttribute('aria-selected',String(String(option.value)===element.value));const [a,b,c,d]=option.box;Object.assign(button.style,{left:a+'px',top:b+'px',width:c+'px',height:d+'px'});button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();onSelect(option.value);close();});host.append(button);return button;});
 const dismiss=event=>{if(!host.contains(event.target)&&event.target!==element)close(false);};
 const key=event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();}else if(['ArrowUp','ArrowDown','Home','End'].includes(event.key)){event.preventDefault();const current=buttons.indexOf(doc.activeElement),index=event.key==='Home'?0:event.key==='End'?buttons.length-1:(current+(event.key==='ArrowUp'?-1:1)+buttons.length)%buttons.length;buttons[index]?.focus();}};
 let closed=false;function close(focus=true){if(closed)return;closed=true;host.remove();doc.removeEventListener('pointerdown',dismiss,true);host.removeEventListener('keydown',key);element.setAttribute('aria-expanded','false');if(focus)element.focus({preventScroll:true});onClose?.();}
 form.append(host);element.setAttribute('aria-expanded','true');host.addEventListener('keydown',key);doc.addEventListener('pointerdown',dismiss,true);(buttons.find(button=>button.getAttribute('aria-selected')==='true')||buttons[0])?.focus({preventScroll:true});return close;
}
