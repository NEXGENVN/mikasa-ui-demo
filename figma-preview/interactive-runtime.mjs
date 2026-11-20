import {bindSourceTextSlots} from './source-text-slots.mjs';
import {sourceGlyphLibrary} from './source-glyph-library.mjs';
import {setInteractiveValue,interactiveDisplayValue} from './interactive-session.mjs';
import {bindSourceDrawingRegions} from './source-drawing-slots.mjs';
import {prepareSourceScrollCanvas} from './source-scroll-canvas.mjs';
import {mountSourceExtraArtwork,mountSourcePopup,mountSourceCards,componentMembers} from './source-component-dom.mjs';
import {mountSourceCalendar} from './source-calendar.mjs';

const own=(object,key)=>Object.prototype.hasOwnProperty.call(object,key);
const inputValue=element=>element.type==='checkbox'||element.type==='radio'?element.checked:element.value;

/** Attach controls to the original document without replacing the active input on typing. */
export function mountInteractiveFrame({root,frame,session,handleInteraction,projectValues=()=>{},onResult,onIssue=()=>{}}){
 const form=root.querySelector('[data-interactive-frame]'),iframe=root.querySelector('.native-frame');
 if(!form||!iframe)return ()=>{};
 let active=true,binder=null,drawingRegions=null,prepared=false,closePopup=null,removeExtras=null,calendar=null,cards=null;const timers=new Set(),controls=new Map(frame.controls.map(control=>[control.id,control]));
 const slots=new Map();for(const control of controls.values())if(control.field&&!['checkbox','radio','button','file'].includes(control.type))for(const slot of control.textSlots||[])slots.set(slot.id,slot);for(const slot of frame.texts||[])slots.set(slot.id,slot);
 const elements=new Map([...form.querySelectorAll('[data-interactive-control]')].map(element=>[element.dataset.interactiveControl,element]));
 for(const img of form.querySelectorAll('img'))if(img.tagName==='IMG')img.src=new URL(img.getAttribute('src'),document.baseURI).href;
 // Fields can retain focus while the cached vector document finishes loading.
 form.inert=false;
 const controlFor=element=>controls.get(element?.closest('[data-interactive-control]')?.dataset.interactiveControl);
 const elementForField=field=>[...elements].find(([id])=>controls.get(id)?.field===field)?.[1];
 function patchSlot(slot,value,element,font){
  for(const output of form.querySelectorAll('[data-interactive-output]'))if(output.dataset.interactiveOutput===slot.id)output.textContent=String(value??'');
  const result=binder?.setTextSlot(slot,value,{nativeFallback:true,...(font?{font}:{})});
  if(result?.ok){if(element)delete element.dataset.nativeTextFallback;return true;}
  if(result?.status==='missing-glyphs'&&(result.sourceHidden||binder?.hideOriginal?.(slot))){if(element)element.dataset.nativeTextFallback='true';return false;}
  if(result&&!result.ok)onIssue({frameId:frame.id,slotId:slot.id,status:result.status,missingGlyphs:result.missingGlyphs});
  return false;
 }
 function patchControl(control,element){
  if(!control.field||!own(session.values,control.field))return;
  const value=session.values[control.field];
  if(control.type==='checkbox'||control.type==='radio'){patchCheck(control,element,control.type==='radio'?String(value)===String(control.value):!!value);return;}
  const text=control.type==='select'?(control.options||[]).find(option=>String(option.value)===String(value))?.label??value:interactiveDisplayValue(control,value,{revealed:element?.type==='text'});
  for(const [index,slot] of (control.textSlots||[]).entries())patchSlot(slot,control.splitSlots?String(text??'')[index]||'':String(text??'')||(control.placeholder??''),element,String(text??'')?control.valueFont:undefined);
 }
 function patchCheck(control,element,checked){
  const original=control.type==='radio'?control.checked===true:!!control.value;
  if(checked===original){drawingRegions?.setVisible('check:'+control.id,true);element?.parentElement?.querySelector('.interactive-checkbox-patch')?.remove();return;}
  // An alternate exact source graphic is supplied by the domain adapter.
  const file=checked?control.checkedAsset:control.uncheckedAsset;
  if(!file)return;
  drawingRegions?.setVisible('check:'+control.id,false);
  const host=element?.parentElement;if(!host)return;
  let patch=host.querySelector('.interactive-checkbox-patch');if(!patch){patch=document.createElement('span');patch.className='interactive-checkbox-patch';host.append(patch);}
  const img=document.createElement('img');img.src=new URL(file,document.baseURI).href;img.alt='';patch.replaceChildren(img);
 }
 function patchValues(){
  if(!binder)return;
  for(const component of frame.componentStates||[]){
   const {value,state,members}=componentMembers(component,session),changed=session.dirty.has(component.field)&&value!==String(component.initialValue),host=[...form.querySelectorAll('[data-source-component]')].find(host=>host.dataset.sourceComponent===component.id);
   drawingRegions?.setVisible('component:'+component.id,!changed);
   if(host&&state){host.hidden=!changed;host.style.width=state.width+'px';host.style.height=state.height+'px';const img=host.querySelector('img');img.src=new URL(state.file,document.baseURI).href;img.width=state.width;img.height=state.height;}
   for(const control of controls.values())if(control.componentStateId===component.id){const native=members.get(control.componentMemberKey),element=elements.get(control.id),outer=element?.closest('.interactive-control');control.hidden=!native;if(native){control.box=[component.box[0]+native.box[0],component.box[1]+native.box[1],native.box[2],native.box[3]];if(outer){const [x,y,w,h]=control.box;Object.assign(outer.style,{left:x+'px',top:y+'px',width:w+'px',height:h+'px'});}}}
  }
  for(const control of controls.values())if(control.field&&session.dirty.has(control.field)){const element=elements.get(control.id);if(element){if(control.type==='checkbox')element.checked=!!session.values[control.field];else if(control.type==='radio')element.checked=String(control.value)===String(session.values[control.field]);else if(control.type!=='file'&&element.value!==String(session.values[control.field]??''))element.value=String(session.values[control.field]??'');}}
  for(const control of controls.values())if(control.field&&session.dirty.has(control.field))patchControl(control,elements.get(control.id));
  for(const slot of frame.texts||[])if(slot.field&&session.dirty.has(slot.field)&&own(session.values,slot.field))patchSlot(slot,session.values[slot.field]);
  const hiddenControls=new Set();
  for(const region of frame.visibility||[])if(session.dirty.has(region.field)){
   const visible=session.values[region.field]!==false;drawingRegions?.setVisible(region.id,visible);
   if(!visible)for(const control of controls.values())if(drawingRegions?.containsControl(region,control))hiddenControls.add(control.id);
  }
  for(const control of controls.values()){const element=elements.get(control.id);if(element)(element.closest('.interactive-control')||element).hidden=!!control.hidden||hiddenControls.has(control.id);}
  for(const region of frame.transforms||[])if(session.dirty.has(region.field))drawingRegions?.setMapZoom(region.id,session.values[region.field]);
  calendar?.project();
  cards?.project(session);
 }
 function dispatch(control,value,eventType='click'){
  if(!active||!control||control.disabled)return;
  const result=handleInteraction({frame,control,session,value,eventType})||((control.action==='back'||control.action==='close')?{back:true}:control.targetId?{targetId:control.targetId}:null);
  if(!result){onIssue({frameId:frame.id,controlId:control.id,status:'unhandled-action',action:control.action});return;}
  if(!result.targetId&&!result.back)projectValues({frame,session});
  if(result.togglePassword){const input=elementForField(result.togglePassword);if(input){input.type=input.type==='password'?'text':'password';input.focus();}}
  if(result.focusField){const element=elementForField(result.focusField);if(element){element.focus();if(result.message)element.setAttribute('aria-invalid','true');}}
  patchValues();onResult(result);
 }
 function onClick(event){
  const element=event.target.closest('[data-interactive-control]'),control=controlFor(element);
  if(!control)return;
  event.stopPropagation();
  if(control.type==='select'&&control.popup){event.preventDefault();if(event.detail===0&&!closePopup)openPopup(control,element);return;}
  if(control.type==='button'){event.preventDefault();dispatch(control,undefined,control.submit?'submit':'click');}
 }
 function openPopup(control,element){
  closePopup?.();element.dataset.assetBase=document.baseURI;
  closePopup=mountSourcePopup({form,control,element,onSelect:value=>{element.value=String(value);if(control.field)setInteractiveValue(session,control.field,String(value));dispatch(control,String(value),'change');},onClose:()=>{closePopup=null;}});
 }
 function onPointerDown(event){const element=event.target.closest('[data-interactive-control]'),control=controlFor(element);if(control?.type==='select'&&control.popup){event.preventDefault();event.stopPropagation();if(closePopup)closePopup();else openPopup(control,element);}}
 function onKeyDown(event){const element=event.target,control=controlFor(element);if(control?.type==='select'&&control.popup&&['ArrowDown','ArrowUp','Enter',' '].includes(event.key)){event.preventDefault();event.stopPropagation();if(!closePopup)openPopup(control,element);}else if(control?.type==='input'&&event.key==='Enter'&&!event.isComposing&&!control.multiline){const submit=frame.controls.find(c=>c.submit&&!c.disabled);if(submit){event.preventDefault();event.stopPropagation();dispatch(submit,undefined,'submit');}}}
 function onFieldContainerClick(event){
  const host=event.target.closest('.interactive-field');if(host&&!event.target.matches('input,select,textarea'))host.querySelector('input,select,textarea')?.focus();
 }
 function onInput(event){
  const element=event.target,control=controlFor(element);if(!control?.field)return;
  event.stopPropagation();element.removeAttribute('aria-invalid');
  let value=control.type==='radio'?control.value:inputValue(element);if(control.maxLength&&typeof value==='string')value=value.slice(0,control.maxLength);
  setInteractiveValue(session,control.field,value);patchControl(control,element);
  for(const slot of frame.texts||[])if(slot.field===control.field)patchSlot(slot,value);
  if(control.onInput)dispatch(control,value,'input');
 }
 function onChange(event){
  const element=event.target,control=controlFor(element);if(!control)return;event.stopPropagation();
  if(control.type==='file'){
   const file=element.files?.[0];if(file){session.context.uploadFile=file;dispatch(control,file.name,'change');}return;
  }
  const value=control.type==='radio'?control.value:inputValue(element);
  if(control.field){setInteractiveValue(session,control.field,value);patchControl(control,element);}
  if(control.type!=='input'&&control.type!=='textarea'||control.onChange)dispatch(control,value,'change');
 }
 function onSubmit(event){event.preventDefault();event.stopPropagation();const control=controlFor(event.submitter)||frame.controls.find(control=>control.submit);if(control)dispatch(control,undefined,'submit');}
 function onEscape(event){if(event.key==='Escape'&&!event.isComposing){const control=frame.controls.find(control=>control.action==='back'||control.action==='close'||control.escape);if(control){event.preventDefault();dispatch(control);}}}
 async function prepare(){
  if(!active||prepared)return;
  const doc=iframe.contentDocument;if(!doc?.querySelector('svg'))return;
  prepared=true;
  try{await prepareSourceScrollCanvas({iframe,form,frame,stylesheets:[...document.querySelectorAll('link[rel="stylesheet"]')].map(link=>link.href)});}catch(error){onIssue({frameId:frame.id,status:'scroll-styles-failed',message:error.message});return;}
  if(!active)return;
  try{removeExtras=await mountSourceExtraArtwork({document:doc,frame,baseURI:document.baseURI});}catch(error){onIssue({frameId:frame.id,status:'native-component-failed',message:error.message});}
  if(!active){removeExtras?.();return;}
  // Native text is used only for a new glyph absent from the original font subset.
  for(const link of document.querySelectorAll('link[rel="stylesheet"]'))if(/\/fonts\//.test(link.href)&&![...doc.querySelectorAll('link[rel="stylesheet"]')].some(existing=>existing.href===link.href)){const copy=doc.createElement('link');copy.rel='stylesheet';copy.href=link.href;doc.head.append(copy);}
  binder=bindSourceTextSlots(doc,[...slots.values()],{library:sourceGlyphLibrary});
  drawingRegions=bindSourceDrawingRegions(doc,[...(frame.visibility||[]),...(frame.transforms||[]),...(frame.componentStates||[]).map(c=>({id:'component:'+c.id,box:c.box})),...[...controls.values()].filter(c=>['checkbox','radio'].includes(c.type)).map(c=>({id:'check:'+c.id,box:c.box}))]);
  cards=mountSourceCards({document:doc,frame,baseURI:document.baseURI});
  calendar=mountSourceCalendar({document:doc,form,frame,session,library:sourceGlyphLibrary,assetBase:document.baseURI,onIssue});
  form.dataset.ready='true';form.inert=false;
  form.dataset.slotCount=String(slots.size);form.dataset.matchedSlots=String(binder.ready.size);form.dataset.unresolvedSlots=String(binder.unresolved.length);
  for(const issue of binder.unresolved)onIssue({frameId:frame.id,slotId:issue.id,status:issue.status});
  patchValues();
  if(session.context.focusField){const element=elementForField(session.context.focusField);element?.focus();delete session.context.focusField;}
  for(const timer of frame.timers||[]){const id=setTimeout(()=>{timers.delete(id);if(active)dispatch(timer.control,undefined,'timer');},Math.max(0,Number(timer.delay)||0));timers.add(id);}
 }
 form.addEventListener('click',onClick);form.addEventListener('click',onFieldContainerClick);form.addEventListener('pointerdown',onPointerDown);form.addEventListener('keydown',onKeyDown);form.addEventListener('input',onInput);form.addEventListener('change',onChange);form.addEventListener('submit',onSubmit);form.addEventListener('keydown',onEscape);
 iframe.addEventListener('load',prepare);prepare();
 if(session.context.focusField){elementForField(session.context.focusField)?.focus();}
 return ()=>{active=false;closePopup?.(false);removeExtras?.();calendar?.restore();cards?.restore();for(const timer of timers)clearTimeout(timer);iframe.removeEventListener('load',prepare);form.removeEventListener('click',onClick);form.removeEventListener('click',onFieldContainerClick);form.removeEventListener('pointerdown',onPointerDown);form.removeEventListener('keydown',onKeyDown);form.removeEventListener('input',onInput);form.removeEventListener('change',onChange);form.removeEventListener('submit',onSubmit);form.removeEventListener('keydown',onEscape);};
}
