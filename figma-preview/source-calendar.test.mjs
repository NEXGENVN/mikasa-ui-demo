import test from 'node:test';
import assert from 'node:assert/strict';
import {mountSourceCalendar,calendarDateAppearance} from './source-calendar.mjs';
import {sourceGlyphLibrary} from './source-glyph-library.mjs';
import {generateGlyphPaths} from './source-glyphs.mjs';
import {createInteractiveSession} from './interactive-session.mjs';
import {createDemoState} from './core.mjs';
import {syncAppSchedule,scheduleISO,changeAppSchedule} from './app-calendar.mjs';
const I={a:1,b:0,c:0,d:1,e:0,f:0};
const now=Date.parse('2026-11-20T03:12:37Z');
class Element{
 constructor(name,doc,attrs={},box){this.localName=name;this.ownerDocument=doc;this.attrs=new Map(Object.entries(attrs));this.children=[];this.style={};this.dataset={};this.listeners={};this.box=box;this.hidden=false;for(const[k,v]of this.attrs)if(k.startsWith('data-'))this.dataset[k.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=v;}
 setAttribute(k,v){this.attrs.set(k,String(v));}getAttribute(k){return this.attrs.get(k)??null;}removeAttribute(k){this.attrs.delete(k);}
 append(...nodes){for(const n of nodes){n.remove();n.parentNode=this;this.children.push(n);}}replaceChildren(...nodes){for(const n of this.children)n.parentNode=null;this.children=[];this.append(...nodes);}insertBefore(n,anchor){n.remove();const i=this.children.indexOf(anchor);n.parentNode=this;if(i<0)this.children.push(n);else this.children.splice(i,0,n);}
 remove(){if(this.parentNode){this.parentNode.children=this.parentNode.children.filter(n=>n!==this);this.parentNode=null;}}
 get nextSibling(){return this.parentNode?.children[this.parentNode.children.indexOf(this)+1]||null;}
 getBoundingClientRect(){const b=this.box||[0,0,0,0];return{left:b[0],top:b[1],width:b[2],height:b[3]};}
 contains(n){return this===n||this.children.some(c=>c.contains(n));}closest(){return null;}getBBox(){const b=this.box||[0,0,0,0];return{x:b[0],y:b[1],width:b[2],height:b[3]};}getCTM(){return I;}
 cloneNode(deep){const n=new Element(this.localName,this.ownerDocument,Object.fromEntries(this.attrs),this.box);n.clonedFrom=this;if(deep)n.append(...this.children.map(c=>c.cloneNode(true)));return n;}
 addEventListener(k,v){this.listeners[k]=v;}removeEventListener(k){delete this.listeners[k];}focus(){this.ownerDocument.activeElement=this;}
 dispatchEvent(event){this.listeners[event.type]?.(event);return true;}
 querySelectorAll(selector){const all=this.children.flatMap(n=>[n,...n.querySelectorAll('*')]);if(selector==='*')return all;if(selector==='[data-interactive-control]')return all.filter(n=>n.dataset.interactiveControl);return all.filter(n=>selector.split(',').includes(n.localName));}
}
function fixture(){
 const doc={createElementNS(ns,name){return new Element(name,this);},createElement(name){return new Element(name,this);}};
 const svg=new Element('svg',doc);svg.viewBox={baseVal:{x:0,y:0}};doc.querySelector=()=>svg;
 const bg=new Element('rect',doc,{fill:'#195CFA',rx:'4'},[325,125,40,24]),glyph=new Element('path',doc,{d:'M30 103 L35 103 L35 113 Z'},[30,103,5,10]);svg.append(bg,glyph);
 const form=new Element('form',doc),cells=Array.from({length:42},(_,i)=>({id:'day-'+i,calendarIndex:i,box:[25+i%7*50,100+Math.floor(i/7)*25,40,24]}));
 const buttons=cells.map(c=>new Element('button',doc,{'data-interactive-control':c.id,style:'original-'+c.id}));form.append(...buttons);
 const font={family:'Roboto',style:'Medium',weight:500,fontKey:'Roboto|Medium|500',size:12,baseline:16.1015625,color:'#121212'};
 const frame={calendar:{gridBox:[20,100,350,125],cellSize:[40,24],columnPitch:50,rowPitch:25,sourceRows:5,cells,selectedSourceBox:[325,125,40,24],normalFont:font,mutedFont:{...font,color:'#C2C9D6'},todayFont:font,selectedFont:{...font,color:'#FFFFFF'},wheels:[],arrows:[]}};
 const session=createInteractiveSession(createDemoState());syncAppSchedule(session,scheduleISO({year:2026,month:8,day:31,hour:9,minute:15}));
 return{doc,svg,form,bg,glyph,cells,buttons,frame,session};
}
test('projects six-week months inside the original grid and preserves the native selection shape with the specified selected paint',()=>{
 const f=fixture(),calendar=mountSourceCalendar({document:f.doc,form:f.form,frame:f.frame,session:f.session,library:sourceGlyphLibrary,now:Date.parse('2026-08-18T03:00:00Z')});
 const p=calendar.project();assert.equal(p.rows,6);assert.equal(calendar.scroller.style.height,'125px');
 assert.equal(calendar.scroller.scrollTop,25);assert.equal(f.buttons[36].getAttribute('aria-selected'),'true');
 assert.equal(f.bg.getAttribute('opacity'),'0');assert.ok(calendar.layer.querySelectorAll('rect').some(n=>n.getAttribute('fill')==='#14538E'&&n.getAttribute('rx')==='4'));
 assert.equal(f.buttons[0].getAttribute('aria-label'),'Ngày 26 tháng 7 năm 2026 (ngoài tháng đang xem)');
 calendar.restore();assert.equal(f.bg.getAttribute('opacity'),null);assert.equal(f.buttons[0].parentNode,f.form);assert.equal(f.buttons[0].getAttribute('style'),'original-day-0');
});
test('five-week projection hides unused sixth-row controls without changing their identity or listeners',()=>{
 const f=fixture(),button=f.buttons[0];button.addEventListener('click',()=>{});
 const calendar=mountSourceCalendar({document:f.doc,form:f.form,frame:f.frame,session:f.session,library:sourceGlyphLibrary});
 syncAppSchedule(f.session,scheduleISO({year:2026,month:11,day:20,hour:9,minute:15}));calendar.project();
 assert.equal(f.buttons[35].hidden,true);assert.equal(f.buttons[0],button);assert.equal(typeof button.listeners.click,'function');
});

test('native wheel rows, scrolling and arrows change the existing select without opening an OS menu',()=>{
 const f=fixture(),host=new Element('span',f.doc,{},[40,567,126,200]),select=new Element('select',f.doc,{'data-interactive-control':'hour'});select.value='09';host.append(select);f.form.append(host);
 const font=f.frame.calendar.normalFont;
 f.frame.calendar.wheels=[{controlId:'hour',field:'app.schedule.hour',box:[40,567,126,200],limit:24,selectedIndex:1,slots:[0,1,2].map(i=>({id:'wheel-'+i,text:'',box:[40,568+i*40,126,40],font}))}];
 syncAppSchedule(f.session,'2026-11-21T02:00:00Z',{now});
 let changed=0;select.addEventListener('change',()=>changed++);
 const calendar=mountSourceCalendar({document:f.doc,form:f.form,frame:f.frame,session:f.session,library:sourceGlyphLibrary,now});
 const event=extra=>({prevented:false,preventDefault(){this.prevented=true;},stopPropagation(){},...extra});
 const pointer=event({clientY:707});host.listeners.pointerdown(pointer);assert.equal(select.value,'10');assert.equal(pointer.prevented,true);
 const wheel=event({deltaY:100});host.listeners.wheel(wheel);assert.equal(select.value,'11');assert.equal(wheel.prevented,true);
 const space=event({key:' '});select.listeners.keydown(space);assert.equal(space.prevented,true);assert.equal(changed,2);
 const up=event({key:'ArrowUp'});select.listeners.keydown(up);assert.equal(select.value,'10');assert.equal(changed,3);
 calendar.restore();assert.equal(host.listeners.pointerdown,undefined);assert.equal(select.listeners.keydown,undefined);
});

test('source calendar disables unavailable dates and month arrows and excludes disabled dates from keyboard focus',()=>{
 const f=fixture(),previous=new Element('button',f.doc,{'data-interactive-control':'previous'}),next=new Element('button',f.doc,{'data-interactive-control':'next'});f.form.append(previous,next);
 Object.assign(f.frame.calendar,{previousControlId:'previous',nextControlId:'next',arrows:[{controlId:'previous',sourceVectorId:'967:65123',graphicBox:[0,0,12,6]},{controlId:'next',sourceVectorId:'967:65123',graphicBox:[0,0,12,6]}]});
 syncAppSchedule(f.session,'2026-11-20T03:30:00Z',{now});
 const calendar=mountSourceCalendar({document:f.doc,form:f.form,frame:f.frame,session:f.session,library:sourceGlyphLibrary,assetBase:'http://localhost/',now});calendar.project();
 assert.equal(f.buttons[18].disabled,true);assert.equal(f.buttons[18].getAttribute('aria-disabled'),'true');assert.equal(f.buttons[19].disabled,false);assert.equal(previous.disabled,true);assert.equal(next.disabled,false);
 const images=f.svg.querySelectorAll('image');assert.equal(images[0].getAttribute('opacity'),'0.35');assert.equal(images[1].getAttribute('opacity'),'1');
 const key={target:f.buttons[19],key:'ArrowLeft',preventDefault(){},altKey:false,ctrlKey:false,metaKey:false};calendar.scroller.listeners.keydown(key);assert.notEqual(f.doc.activeElement,f.buttons[18]);
 syncAppSchedule(f.session,'2026-12-04T03:00:00Z',{now});calendar.project();assert.equal(previous.disabled,false);assert.equal(next.disabled,true);assert.equal(f.buttons[6].disabled,true);
 calendar.restore();assert.equal(previous.disabled,false);assert.equal(f.buttons[18].getAttribute('aria-disabled'),null);
});

test('minute wheel pointer, scrolling and keys cycle only 00 and 30 and preserve the finite select options',()=>{
 const f=fixture(),host=new Element('span',f.doc,{},[224,567,126,200]),select=new Element('select',f.doc,{'data-interactive-control':'minute'});select.value='00';
 for(let i=0;i<60;i++){const option=new Element('option',f.doc);option.value=String(i).padStart(2,'0');select.append(option);}host.append(select);f.form.append(host);
 const font=f.frame.calendar.normalFont;f.frame.calendar.wheels=[{controlId:'minute',field:'app.schedule.minute',box:[224,567,126,200],limit:60,selectedIndex:0,slots:[0,1].map(i=>({id:'minute-'+i,text:i?'30':'00',box:[224,647+i*40,126,40],font}))}];
 syncAppSchedule(f.session,'2026-11-21T03:00:00Z',{now});const values=[];select.addEventListener('change',()=>{values.push(select.value);changeAppSchedule(f.session,{part:'minute',value:select.value},{now});});
 const calendar=mountSourceCalendar({document:f.doc,form:f.form,frame:f.frame,session:f.session,library:sourceGlyphLibrary,now});calendar.project();
 assert.deepEqual(select.children.map(o=>o.value),['00','30']);
 const event=extra=>({preventDefault(){},stopPropagation(){},...extra});
 host.listeners.pointerdown(event({clientY:707}));host.listeners.wheel(event({deltaY:100}));select.listeners.keydown(event({key:'ArrowUp'}));select.listeners.keydown(event({key:'Home'}));select.listeners.keydown(event({key:'End'}));
 assert.deepEqual(values,['30','00','30','00','30']);assert.equal(f.session.values['app.schedule.minute'],'30');
});

test('time options and wheel changes enforce the business hours and the inclusive final calendar date',()=>{
 const f=fixture(),host=new Element('span',f.doc,{},[40,567,126,200]),select=new Element('select',f.doc,{'data-interactive-control':'hour'});select.value='10';
 for(let i=0;i<24;i++){const option=new Element('option',f.doc);option.value=String(i).padStart(2,'0');select.append(option);}host.append(select);f.form.append(host);
 f.frame.calendar.wheels=[{controlId:'hour',field:'app.schedule.hour',box:[40,567,126,200],limit:24,selectedIndex:1,slots:[0,1,2].map(i=>({id:'hour-'+i,text:String(9+i),box:[40,568+i*40,126,40],font:f.frame.calendar.normalFont}))}];
 syncAppSchedule(f.session,'2026-12-04T03:00:00Z',{now});const calendar=mountSourceCalendar({document:f.doc,form:f.form,frame:f.frame,session:f.session,library:sourceGlyphLibrary,now});calendar.project();
 assert.equal(select.children.find(o=>o.value==='10').disabled,false);assert.equal(select.children.find(o=>o.value==='11').disabled,false);assert.equal(select.children.find(o=>o.value==='23').disabled,false);assert.equal(select.children.some(o=>Number(o.value)<7),false);
 host.listeners.wheel({deltaY:1,preventDefault(){},stopPropagation(){}});assert.equal(select.value,'11');
 syncAppSchedule(f.session,'2026-11-20T03:30:00Z',{now});calendar.project();assert.equal(select.children.find(o=>o.value==='09').disabled,true);assert.equal(select.children.find(o=>o.value==='10').disabled,false);
});

test('specified date paints, selected/today priority and disabled hover are applied to actual SVG cells',()=>{
 const f=fixture(),fixed=Date.parse('2026-11-13T10:10:00+07:00');syncAppSchedule(f.session,'2026-11-14T10:00:00+07:00',{now:fixed});const calendar=mountSourceCalendar({document:f.doc,form:f.form,frame:f.frame,session:f.session,library:sourceGlyphLibrary,now:fixed});calendar.project();
 const group=date=>calendar.layer.querySelectorAll('g').find(n=>n.getAttribute('data-calendar-date')===date),parts=date=>group(date).children;
 assert.equal(parts('2026-11-12')[1].getAttribute('fill'),'#9CAAC1');assert.equal(parts('2026-11-12')[0].getAttribute('fill'),'none');assert.equal(f.buttons[11].disabled,true);
 assert.equal(parts('2026-11-13')[1].getAttribute('fill'),'#14538E');assert.equal(parts('2026-11-13')[0].getAttribute('stroke-width'),'1.5');
 assert.equal(parts('2026-11-14')[0].getAttribute('fill'),'#14538E');assert.equal(parts('2026-11-14')[1].getAttribute('fill'),'#FFFFFF');
 assert.equal(parts('2026-11-27')[1].getAttribute('fill'),'#172033');f.buttons[26].listeners.pointerenter();assert.equal(parts('2026-11-27')[0].getAttribute('fill'),'#EDF4FB');assert.equal(parts('2026-11-27')[1].getAttribute('fill'),'#14538E');f.buttons[26].listeners.pointerleave();assert.equal(parts('2026-11-27')[0].getAttribute('fill'),'none');
 f.buttons[27].listeners.pointerenter();assert.equal(parts('2026-11-28')[0].getAttribute('fill'),'none');assert.equal(parts('2026-11-28')[1].getAttribute('fill'),'#9CAAC1');
 syncAppSchedule(f.session,'2026-11-13T11:00:00+07:00',{now:fixed});calendar.project();assert.equal(parts('2026-11-13')[0].getAttribute('fill'),'#14538E');assert.equal(parts('2026-11-13')[1].getAttribute('fill'),'#FFFFFF');assert.equal(parts('2026-11-13')[0].getAttribute('stroke'),'none');calendar.restore();
});
test('the native save button dims and disables for unchanged or expired schedules and enables only valid changes',()=>{
 const f=fixture();let clock=Date.parse('2026-11-13T10:10:00+07:00');syncAppSchedule(f.session,'2026-11-13T10:30:00+07:00',{now:clock});f.session.context.appScheduleOriginal='2026-11-13T03:30:00Z';
 const save=new Element('button',f.doc,{'data-interactive-control':'save'}),paint=new Element('rect',f.doc,{fill:'#0F4D88'},[20,300,200,40]);f.form.append(save);f.svg.append(paint);f.frame.controls=[{id:'save',action:'app.schedule.save',box:[20,300,200,40]}];
 const calendar=mountSourceCalendar({document:f.doc,form:f.form,frame:f.frame,session:f.session,library:sourceGlyphLibrary,now:()=>clock});calendar.project();assert.equal(save.disabled,true);assert.equal(paint.getAttribute('opacity'),'0.38');
 syncAppSchedule(f.session,'2026-11-13T11:00:00+07:00',{now:clock});calendar.project();assert.equal(save.disabled,false);assert.equal(paint.getAttribute('opacity'),'1');
 clock=Date.parse('2026-11-13T11:00:00+07:00');calendar.project();assert.equal(save.disabled,true);assert.equal(save.getAttribute('aria-disabled'),'true');calendar.restore();assert.equal(paint.getAttribute('opacity'),null);
});

test('available adjacent-month dates keep their exact colors and a visible outside-month marker',()=>{
 const f=fixture(),clock=Date.parse('2026-11-25T10:10:00+07:00');syncAppSchedule(f.session,'2026-11-26T10:00:00+07:00',{now:clock});const calendar=mountSourceCalendar({document:f.doc,form:f.form,frame:f.frame,session:f.session,library:sourceGlyphLibrary,now:clock});calendar.project();const g=calendar.layer.querySelectorAll('g').find(n=>n.getAttribute('data-calendar-date')==='2026-12-01');assert.equal(g.getAttribute('opacity'),'1');assert.equal(g.children[1].getAttribute('fill'),'#172033');assert.ok(g.children.some(n=>n.getAttribute('data-outside-month-marker')==='true'));calendar.restore();
});
test('crossing midnight retains an enabled keyboard date target without changing the expired selection',()=>{
 const f=fixture();let clock=Date.parse('2026-11-13T10:10:00+07:00');syncAppSchedule(f.session,'2026-11-13T11:00:00+07:00',{now:clock});const calendar=mountSourceCalendar({document:f.doc,form:f.form,frame:f.frame,session:f.session,library:sourceGlyphLibrary,now:()=>clock});calendar.project();clock=Date.parse('2026-11-14T00:01:00+07:00');calendar.project();const targets=f.buttons.filter(n=>!n.disabled&&n.getAttribute('tabindex')==='0');assert.equal(targets.length,1);assert.match(targets[0].getAttribute('aria-label'),/^Ngày 14 /);assert.equal(f.session.values['app.send.schedule'],'2026-11-13T04:00:00.000Z');calendar.restore();
});
test('one wheel step from an expired hour chooses the nearest valid next hour',()=>{
 const f=fixture(),host=new Element('span',f.doc,{},[40,567,126,200]),select=new Element('select',f.doc,{'data-interactive-control':'hour'});select.value='10';host.append(select);f.form.append(host);f.frame.calendar.wheels=[{controlId:'hour',field:'app.schedule.hour',box:[40,567,126,200],selectedIndex:1,slots:[0,1,2].map(i=>({id:'hour-'+i,text:String(9+i),box:[40,568+i*40,126,40],font:f.frame.calendar.normalFont}))}];
 let clock=Date.parse('2026-11-13T10:10:00+07:00');syncAppSchedule(f.session,'2026-11-13T10:30:00+07:00',{now:clock});const calendar=mountSourceCalendar({document:f.doc,form:f.form,frame:f.frame,session:f.session,library:sourceGlyphLibrary,now:()=>clock});calendar.project();clock=Date.parse('2026-11-13T10:31:00+07:00');calendar.project();host.listeners.wheel({deltaY:1,preventDefault(){},stopPropagation(){}});assert.equal(select.value,'11');calendar.restore();
});

test('a truncated source hour list still draws both lower neighbors and keeps the chosen hour centered with native active paint',()=>{
 const f=fixture(),host=new Element('span',f.doc,{},[40,567,126,200]),select=new Element('select',f.doc,{'data-interactive-control':'hour'});host.append(select);f.form.append(host);
 const font={...f.frame.calendar.normalFont,size:18,baseline:26.15234375,weight:400,style:'Regular',fontKey:'Roboto|Regular|400',align:'CENTER'},slots=[21,22,23].map((n,i)=>({id:'hour-'+i,text:String(n),box:[40,568+i*40,126,40],font:{...font,color:i===1?'#195CFA':'#B0BAC9'}}));
 const originals=slots.map((slot,i)=>{const p=new Element('path',f.doc,{d:generateGlyphPaths(sourceGlyphLibrary,{...font,value:slot.text,x:slot.box[0],baseline:slot.box[1]+font.baseline,width:126}).d,fill:i===2?'#0F4D88':'#B0BAC9'},slot.box);f.svg.append(p);return p;});
 f.frame.controls=[{id:'hour',field:'app.schedule.hour',type:'select',textSlots:[slots[1]]}];f.frame.calendar.wheels=[{controlId:'hour',field:'app.schedule.hour',box:[40,567,126,200],selectedIndex:1,slots}];
 syncAppSchedule(f.session,'2026-11-21T14:00:00+07:00',{now});select.addEventListener('change',()=>changeAppSchedule(f.session,{part:'hour',value:select.value},{now}));
 const calendar=mountSourceCalendar({document:f.doc,form:f.form,frame:f.frame,session:f.session,library:sourceGlyphLibrary,now});calendar.project();
 const visible=()=>f.svg.querySelectorAll('path').filter(p=>p.getAttribute('data-source-hour-row')!==null&&p.getAttribute('display')!=='none');
 assert.equal(calendar.ownsField('app.schedule.hour'),true);assert.equal(calendar.ownsField('app.schedule.minute'),false);
 assert.deepEqual(visible().map(p=>p.getAttribute('data-source-value')),['12','13','14','15','16']);
 assert.deepEqual(visible().map(p=>p.getAttribute('data-source-hour-row')),['0','1','2','3','4']);
 assert.equal(visible()[2].getAttribute('fill'),'#0F4D88');assert.ok(originals.every(p=>p.getAttribute('opacity')==='0'));
 host.listeners.pointerdown({clientY:747,preventDefault(){},stopPropagation(){}});assert.equal(select.value,'16');calendar.project();assert.deepEqual(visible().map(p=>p.getAttribute('data-source-value')),['14','15','16','17','18']);
 syncAppSchedule(f.session,'2026-11-21T07:00:00+07:00',{now});calendar.project();assert.deepEqual(visible().map(p=>p.getAttribute('data-source-value')),['07','08','09']);assert.equal(visible()[0].getAttribute('data-source-hour-row'),'2');
 syncAppSchedule(f.session,'2026-11-21T23:00:00+07:00',{now});calendar.project();assert.deepEqual(visible().map(p=>p.getAttribute('data-source-value')),['21','22','23']);assert.equal(visible()[2].getAttribute('data-source-hour-row'),'2');
 calendar.restore();assert.equal(visible().length,0);assert.ok(originals.every(p=>p.getAttribute('opacity')===null));
});
