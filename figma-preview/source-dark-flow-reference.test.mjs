import test from 'node:test';import assert from 'node:assert/strict';
import {sourceGlyphLibrary} from './source-glyph-library.mjs';import {generateGlyphPaths} from './source-glyphs.mjs';
const m=await import('./source-dark-flow-reference.mjs').catch(e=>e.code==='ERR_MODULE_NOT_FOUND'?{}:Promise.reject(e));
const I={a:1,b:0,c:0,d:1,e:0,f:0};
class Element{
 constructor(name,attrs={},box){this.localName=name;this.attrs=new Map(Object.entries(attrs));this.children=[];this.box=box;}
 getAttribute(k){return this.attrs.get(k)??null;}setAttribute(k,v){this.attrs.set(k,String(v));}removeAttribute(k){this.attrs.delete(k);}
 append(n){n.parentNode=this;this.children.push(n);}insertBefore(n,a){if(n.parentNode)n.remove();n.parentNode=this;const i=this.children.indexOf(a);if(i<0)this.children.push(n);else this.children.splice(i,0,n);}remove(){if(this.parentNode)this.parentNode.children=this.parentNode.children.filter(n=>n!==this);}
 querySelectorAll(q){return this.children.flatMap(n=>[...(q==='*'||q.split(',').includes(n.localName)?[n]:[]),...n.querySelectorAll(q)]);}closest(){return null;}getCTM(){return I;}getBBox(){const[x=0,y=0,width=0,height=0]=this.box||[];return{x,y,width,height};}
}
function fixture(){const svg=new Element('svg',{viewBox:'0 0 390 844'});svg.viewBox={baseVal:{x:0,y:0}};return{svg,doc:{querySelector:()=>svg,createElementNS:(ns,name)=>new Element(name)}};}
test('ZIP progress colors affect only active Dark step ink and restore exactly',()=>{
 assert.equal(typeof m.mountSourceDarkFlowReference,'function');const f=fixture(),circle=new Element('circle',{fill:'#0F4D88'},[60,109,26,26]),label=new Element('path',{fill:'#0F4D88'},[33,146,78,13]),icon=new Element('path',{stroke:'#0F4D88'},[44,285,20,20]),notice=new Element('path',{fill:'#0F4D88'},[60,178,130,13]);f.svg.append(circle);f.svg.append(label);f.svg.append(icon);f.svg.append(notice);
 const handle=m.mountSourceDarkFlowReference(f.doc,{frameId:'1430:88099',measure:n=>n.box});assert.equal(circle.getAttribute('fill'),'#F34B26');assert.equal(label.getAttribute('fill'),'#F34B26');assert.equal(icon.getAttribute('stroke'),'#0F4D88');assert.equal(notice.getAttribute('fill'),'#0F4D88');assert.equal(m.mountSourceDarkFlowReference(f.doc,{frameId:'1430:88099'}),handle);handle.restore();assert.equal(circle.getAttribute('fill'),'#0F4D88');
});
test('Dark schedule edits use edit-specific source glyph labels and orange warning heading',()=>{
 assert.equal(typeof m.mountSourceDarkFlowReference,'function');const f=fixture(),fonts=[{fontKey:'Roboto|Bold|700',size:20,baseline:18.3359375,weight:700},{fontKey:'Roboto|Bold|700',size:14,baseline:14.78515625,weight:700},{fontKey:'Roboto|Bold|700',size:14,baseline:14.78515625,weight:700}],boxes=[[20,232,260,30],[20,316,350,20],[20,519,350,20]],texts=['Hẹn giờ gửi','Ngày gửi ','Giờ gửi '];
 const originals=texts.map((text,i)=>{const b=boxes[i],p=new Element('path',{d:generateGlyphPaths(sourceGlyphLibrary,{...fonts[i],value:text,x:b[0],baseline:b[1]+fonts[i].baseline,width:b[2]}).d,fill:'#111827'},b);f.svg.append(p);return p;});const warning=new Element('path',{fill:'#121212'},[58,36,150,13]);f.svg.append(warning);
 const h=m.mountSourceDarkFlowReference(f.doc,{frameId:'1444:94627',measure:n=>n.box});assert.deepEqual(h.issues,[]);assert.deepEqual(f.svg.querySelectorAll('path').map(p=>p.getAttribute('data-source-value')).filter(Boolean),['Đổi lịch gửi','Ngày gửi mới','Giờ gửi mới']);assert.equal(warning.getAttribute('fill'),'#F59E0B');assert.ok(originals.every(p=>p.getAttribute('opacity')==='0'));h.restore();assert.equal(warning.getAttribute('fill'),'#121212');assert.ok(originals.every(p=>p.getAttribute('opacity')===null));
});
test('Light and unrelated Dark screens retain their source paint',()=>{assert.equal(typeof m.mountSourceDarkFlowReference,'function');for(const id of ['1279:8468','1430:85846','557:49673']){const f=fixture(),p=new Element('path',{fill:'#0F4D88'},[40,110,20,20]);f.svg.append(p);assert.equal(m.mountSourceDarkFlowReference(f.doc,{frameId:id}).changed,0);assert.equal(p.getAttribute('fill'),'#0F4D88');}});

test('Dark send form template icon matches the white native label without changing its blue notice icon',()=>{const f=fixture(),icon=new Element('path',{stroke:'#0F4D88'},[44,363,18,18]),notice=new Element('path',{stroke:'#0F4D88'},[36,544,20,20]);f.svg.append(icon);f.svg.append(notice);const h=m.mountSourceDarkFlowReference(f.doc,{frameId:'1432:10566',measure:n=>n.box});assert.equal(icon.getAttribute('stroke'),'#F8FAFF');assert.equal(notice.getAttribute('stroke'),'#0F4D88');h.restore();assert.equal(icon.getAttribute('stroke'),'#0F4D88');});

test('the native Dark OA decrement uses the reference light stroke before any interaction',()=>{const f=fixture(),minus=new Element('path',{stroke:'#121212'},[269,430,7,0]);f.svg.append(minus);const h=m.mountSourceDarkFlowReference(f.doc,{frameId:'1432:10566',measure:n=>n.box});assert.equal(minus.getAttribute('stroke'),'#F8FAFF');h.restore();assert.equal(minus.getAttribute('stroke'),'#121212');});

test('the late Dark edit sample shows 00 above selected 30 and restores its literal source minute glyphs',()=>{
 const f=fixture(),fonts=[{fontKey:'Roboto|Medium|500',family:'Roboto',style:'Medium',size:20,weight:500,baseline:26.8359375,align:'CENTER'},{fontKey:'Roboto|Regular|400',family:'Roboto',style:'Regular',size:18,weight:400,baseline:26.15234375,align:'CENTER'}],slots=[['00',[224,644,126,40]],['30',[224,684,126,40]]];
 const originals=slots.map(([text,box],i)=>{const p=new Element('path',{d:generateGlyphPaths(sourceGlyphLibrary,{...fonts[i],value:text,x:box[0],baseline:box[1]+fonts[i].baseline,width:box[2]}).d,fill:i?'#64748B':'#0F4D88'},box);f.svg.append(p);return p;});
 const h=m.mountSourceDarkFlowReference(f.doc,{frameId:'1444:94627',measure:n=>n.box});const minute=f.svg.querySelectorAll('path').filter(p=>p.getAttribute('data-source-minute-row')!==null&&p.getAttribute('display')!=='none');
 assert.deepEqual(minute.map(p=>[p.getAttribute('data-source-minute-row'),p.getAttribute('data-source-value')]),[['1','00'],['2','30']]);assert.ok(originals.every(p=>p.getAttribute('opacity')==='0'));h.restore();assert.ok(originals.every(p=>p.getAttribute('opacity')===null));assert.equal(f.svg.querySelectorAll('path').filter(p=>p.getAttribute('data-source-minute-row')!==null).length,0);
});
