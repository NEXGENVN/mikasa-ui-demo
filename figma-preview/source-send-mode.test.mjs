import test from 'node:test';
import assert from 'node:assert/strict';
const module=await import('./source-send-mode.mjs').catch(error=>error.code==='ERR_MODULE_NOT_FOUND'?{}:Promise.reject(error));
const I={a:1,b:0,c:0,d:1,e:0,f:0};
class Element{
 constructor(name,box,attrs={}){this.localName=name;this.box=box;this.attrs=new Map(Object.entries(attrs));}
 getAttribute(key){return this.attrs.get(key)??null;}setAttribute(key,value){this.attrs.set(key,String(value));}removeAttribute(key){this.attrs.delete(key);}
 getBBox(){const [x,y,width,height]=this.box;return{x,y,width,height};}getCTM(){return I;}closest(){return null;}
}
function fixture({scheduled=false,active='#0F4D88',muted='#64748B',bothButtons=false}={}){
 const origin=[1000,2000],shape=(name,box,attrs)=>new Element(name,[box[0]+origin[0],box[1]+origin[1],box[2],box[3]],attrs),nowPaint=scheduled?muted:active,laterPaint=scheduled?active:muted;
 const nowLabel=shape('path',[93.12,534.74,54.39,14.25],{d:'native-now-label',fill:nowPaint}),nowIcon=shape('path',[60.49,533.49,15,15],{d:'native-now-icon',stroke:nowPaint,'stroke-linecap':'round'}),laterLabel=shape('path',[97.07,567.74,70.04,14.18],{d:'native-schedule-label',fill:laterPaint}),laterIcon=shape('path',[61,566,18,18],{d:'native-schedule-icon',stroke:laterPaint}),radio=shape('path',[28,532,18,18],{d:'native-radio',fill:active}),background=shape('rect',[16,490,358,120],{fill:'#292929'}),outside=shape('path',[190,535,40,14],{fill:active}),decoration=shape('path',[61,564,2,2],{fill:'white'});
 const nodes=[nowLabel,nowIcon,laterLabel,laterIcon,radio,background,outside,decoration],svg={getCTM:()=>I,viewBox:{baseVal:{x:1000,y:2000}},querySelectorAll:()=>nodes},document={querySelector:()=>svg};
 const controls=[{type:'radio',action:'app.schedule.now',field:'app.send.scheduled',value:false,checked:!scheduled,box:[28,532,18,18]},{type:'radio',action:'app.schedule.open',field:'app.send.scheduled',value:true,checked:scheduled,box:[28,565,18,18]},{type:'button',action:'app.schedule.open',box:[28,562,140,24]}];
 if(bothButtons)controls.push({type:'button',action:'app.schedule.now',box:[28,530,120,22]});
 return{document,frame:{id:'fixture',platform:'app',controls},nodes,nowLabel,nowIcon,laterLabel,laterIcon,radio,background,outside,decoration,session:{values:{'app.send.scheduled':scheduled},dirty:new Set()}};
}
test('scheduled selection moves native active paint from immediate label and icon while preserving radio and card geometry',()=>{
 assert.equal(typeof module.mountSourceSendModeDrawing,'function');const f=fixture(),originals=f.nodes.map(n=>new Map(n.attrs)),drawing=module.mountSourceSendModeDrawing(f);
 drawing.project(f.session);f.nodes.forEach((n,i)=>assert.deepEqual(n.attrs,originals[i]));
 f.session.values['app.send.scheduled']=true;f.session.dirty.add('app.send.scheduled');drawing.project(f.session);
 assert.equal(f.nowLabel.getAttribute('fill'),'#64748B');assert.equal(f.nowIcon.getAttribute('stroke'),'#64748B');assert.equal(f.laterLabel.getAttribute('fill'),'#0F4D88');assert.equal(f.laterIcon.getAttribute('stroke'),'#0F4D88');
 for(const n of [f.radio,f.background,f.outside,f.decoration])assert.deepEqual(n.attrs,originals[f.nodes.indexOf(n)]);
 for(const n of [f.nowLabel,f.nowIcon,f.laterLabel,f.laterIcon])assert.equal(n.getAttribute('d'),originals[f.nodes.indexOf(n)].get('d'));
 drawing.restore();f.nodes.forEach((n,i)=>assert.deepEqual(n.attrs,originals[i]));
});
test('immediate selection derives its active and muted colors from native source rows rather than stale font metadata',()=>{
 assert.equal(typeof module.mountSourceSendModeDrawing,'function');const f=fixture({scheduled:true,active:'#7BB0EE',muted:'#99AABB',bothButtons:true}),drawing=module.mountSourceSendModeDrawing(f);
 f.session.values['app.send.scheduled']=false;f.session.dirty.add('app.send.scheduled');drawing.project(f.session);
 assert.equal(f.nowLabel.getAttribute('fill'),'#7BB0EE');assert.equal(f.nowIcon.getAttribute('stroke'),'#7BB0EE');assert.equal(f.laterLabel.getAttribute('fill'),'#99AABB');assert.equal(f.laterIcon.getAttribute('stroke'),'#99AABB');
 f.session.values['app.send.scheduled']=true;drawing.project(f.session);assert.equal(f.nowLabel.getAttribute('fill'),'#99AABB');assert.equal(f.laterIcon.getAttribute('stroke'),'#7BB0EE');
});
test('unrelated frames and incomplete native row ownership leave source paint unchanged',()=>{
 assert.equal(typeof module.mountSourceSendModeDrawing,'function');for(const controls of [[],[{type:'radio',action:'app.schedule.now',field:'app.send.scheduled',value:false,checked:true,box:[28,532,18,18]}]]){const f=fixture();f.frame.controls=controls;const before=f.nodes.map(n=>new Map(n.attrs)),drawing=module.mountSourceSendModeDrawing(f);f.session.dirty.add('app.send.scheduled');f.session.values['app.send.scheduled']=true;drawing.project(f.session);drawing.restore();f.nodes.forEach((n,i)=>assert.deepEqual(n.attrs,before[i]));}
});
