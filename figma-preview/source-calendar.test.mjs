import test from 'node:test';
import assert from 'node:assert/strict';
import {mountSourceCalendar} from './source-calendar.mjs';
import {sourceGlyphLibrary} from './source-glyph-library.mjs';
import {createInteractiveSession} from './interactive-session.mjs';
import {createDemoState} from './core.mjs';
import {syncAppSchedule,scheduleISO} from './app-calendar.mjs';
const I={a:1,b:0,c:0,d:1,e:0,f:0};
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
test('projects six-week months inside the original grid and clones the actual native selection artwork',()=>{
 const f=fixture(),calendar=mountSourceCalendar({document:f.doc,form:f.form,frame:f.frame,session:f.session,library:sourceGlyphLibrary});
 const p=calendar.project();assert.equal(p.rows,6);assert.equal(calendar.scroller.style.height,'125px');
 assert.equal(calendar.scroller.scrollTop,25);assert.equal(f.buttons[36].getAttribute('aria-selected'),'true');
 assert.equal(f.bg.getAttribute('opacity'),'0');assert.ok(calendar.layer.querySelectorAll('rect').some(n=>n.clonedFrom&&n.getAttribute('fill')===f.bg.getAttribute('fill')&&n.getAttribute('rx')==='4'));
 assert.equal(f.buttons[0].getAttribute('aria-label'),'Ngày 26 tháng 7 năm 2026');
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
 let changed=0;select.addEventListener('change',()=>changed++);
 const calendar=mountSourceCalendar({document:f.doc,form:f.form,frame:f.frame,session:f.session,library:sourceGlyphLibrary});
 const event=extra=>({prevented:false,preventDefault(){this.prevented=true;},stopPropagation(){},...extra});
 const pointer=event({clientY:668});host.listeners.pointerdown(pointer);assert.equal(select.value,'10');assert.equal(pointer.prevented,true);
 const wheel=event({deltaY:100});host.listeners.wheel(wheel);assert.equal(select.value,'11');assert.equal(wheel.prevented,true);
 const space=event({key:' '});select.listeners.keydown(space);assert.equal(space.prevented,true);assert.equal(changed,2);
 const up=event({key:'ArrowUp'});select.listeners.keydown(up);assert.equal(select.value,'10');assert.equal(changed,3);
 calendar.restore();assert.equal(host.listeners.pointerdown,undefined);assert.equal(select.listeners.keydown,undefined);
});
