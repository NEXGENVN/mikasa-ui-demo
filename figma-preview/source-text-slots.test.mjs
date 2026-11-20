import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {sourceGlyphLibrary} from './source-glyph-library.mjs';
import {generateGlyphPaths} from './source-glyphs.mjs';
import {canonicalPath,matchSourceTextSlot,boxFromSvgElement,bindSourceTextSlots,sourceColor} from './source-text-slots.mjs';

test('canonicalizes source H/V and native quadratic outlines to the same cubic geometry',()=>{
 assert.deepEqual(canonicalPath('M1 2 H4 V5 L1 2 Z'),canonicalPath('M1 2 L4 2 L4 5 L1 2 Z'));
 assert.deepEqual(canonicalPath('M0 0 Q3 6 6 0'),canonicalPath('M0 0 C2 4 4 4 6 0'));
 assert.deepEqual(canonicalPath('M1e1 2e1 H2e1'),canonicalPath('M10 20 L20 20'));
});

test('converts native RGBA colors to valid CSS paint',()=>{
 assert.equal(sourceColor({r:1,g:.5,b:0,a:.75}),'rgba(255, 128, 0, 0.75)');
 assert.equal(sourceColor('#64748B'),'#64748B');
});

test('requires one exact outline match so icons inside a text rectangle remain untouched',()=>{
 const slot={box:[0,0,40,20],outline:'M1 2 L8 2 L8 10 Z'};
 const text={id:'text',bounds:[1,2,7,8],d:'M1 2 H8 V10 Z'};
 const icon={id:'icon',bounds:[20,2,8,8],d:'M20 2 L28 10 M28 2 L20 10'};
 assert.equal(matchSourceTextSlot(slot,[icon,text]).paths[0].id,'text');
 const duplicate=matchSourceTextSlot(slot,[text,{...text,id:'duplicate'}]);
 assert.equal(duplicate.status,'matched');
 assert.deepEqual(duplicate.duplicatePaths.map(p=>p.id),['duplicate']);
 assert.equal(matchSourceTextSlot(slot,[text,{...text,id:'other',d:'M20 2 H27 V10 Z',bounds:[20,2,7,8]}]).status,'ambiguous');
});

test('coalesces a compound source run and a native glyph copy only within export rounding',()=>{
 const slot={box:[0,0,40,20],text:'AB',outline:'M1 2 L8 2 L8 10 Z M12 2 L19 2 L19 10 Z'};
 const original={id:'original',bounds:[1,2,18,8],d:slot.outline};
 const a={id:'a',bounds:[1,2.1,7,8],d:'M1 2.1 H8 V10.1 Z'},b={id:'b',bounds:[12,2.1,7,8],d:'M12 2.1 H19 V10.1 Z'};
 const result=matchSourceTextSlot(slot,[original,a,b]);
 assert.equal(result.status,'matched');
 assert.deepEqual(result.paths.map(p=>p.id),['original']);
 assert.deepEqual(result.duplicatePaths.map(p=>p.id),['a','b']);
 assert.equal(matchSourceTextSlot(slot,[original,a,b,{id:'other',bounds:[1,12,18,8],d:'M1 12 H8 V20 Z M12 12 H19 V20 Z'}]).status,'ambiguous');
});

test('matches a compound text run without absorbing an unrelated path in its box',()=>{
 const slot={box:[0,0,40,20],text:'AB',outline:'M1 2 L8 2 L8 10 Z M12 2 L19 2 L19 10 Z'};
 const a={id:'a',bounds:[1,2,7,8],d:'M1 2 H8 V10 Z'},b={id:'b',bounds:[12,2,7,8],d:'M12 2 H19 V10 Z'},icon={id:'icon',bounds:[25,2,8,8],d:'M25 2 L33 10 M33 2 L25 10'};
 const result=matchSourceTextSlot(slot,[a,icon,b]);
 assert.equal(result.status,'matched');assert.deepEqual(result.paths.map(p=>p.id),['a','b']);
});

test('fails closed when a glyph hangs outside the supplied Figma layout box',()=>{
 const result=matchSourceTextSlot({box:[0,0,10,10]},[{id:'border',bounds:[0,0,10,10],tag:'rect'},{id:'glyph',bounds:[9,0,3,8],d:'M9 0 H12 V8 Z'}]);
 assert.equal(result.status,'unresolved');
});

test('proves an absent original is fully clipped from its glyph ink and native ancestor clip',()=>{
 const outline='M1 12 L8 12 L8 20 Z',slot={box:[0,8,20,20],text:'A',outline,sourceClipBox:[0,0,40,11]};
 assert.equal(matchSourceTextSlot(slot,[]).status,'empty-clipped');
 assert.equal(matchSourceTextSlot({...slot,sourceClipBox:[0,0,40,13]},[]).status,'unresolved');
 assert.equal(matchSourceTextSlot({...slot,sourceClipBox:undefined},[]).status,'unresolved');
});

test('maps element geometry into SVG user coordinates without multiplying viewport scale twice',()=>{
 const e={getBBox:()=>({x:1,y:2,width:3,height:4}),getCTM:()=>({a:2,b:0,c:0,d:2,e:20,f:40})};
 const svg={getCTM:()=>({a:2,b:0,c:0,d:2,e:10,f:10})};
 assert.deepEqual(boxFromSvgElement(e,svg),[6,17,3,4]);
});

// A small SVG DOM harness exercises actual attributes/order without adding a browser dependency.
function svgFixture(){
 const mutations=[];
 const parent={getCTM:()=>({a:1,b:0,c:0,d:1,e:30,f:40}),insertBefore(node){node.parentNode=this;this.replacement=node;mutations.push(['insert']);}};
 const attributes=new Map([['d','M1 2 L8 2 L8 10 Z']]);
 const original={localName:'path',parentNode:parent,nextSibling:null,closest:()=>null,getBBox:()=>({x:1,y:2,width:7,height:8}),getCTM:parent.getCTM,getAttribute:k=>attributes.get(k)??null,setAttribute(k,v){attributes.set(k,v);mutations.push(['set',k,v]);},removeAttribute(k){attributes.delete(k);mutations.push(['remove',k]);}};
 const svg={viewBox:{baseVal:{x:0,y:0}},getCTM:()=>({a:1,b:0,c:0,d:1,e:0,f:0}),querySelectorAll:()=>[original]};
 const doc={querySelector:()=>svg,createElementNS(){const attrs=new Map();return {attrs,children:[],append(...nodes){this.children.push(...nodes);},getAttribute:k=>attrs.get(k)??null,setAttribute(k,v){attrs.set(k,v);},remove(){this.removed=true;}};}};
 const library={fonts:{'Roboto|Regular|400':{family:'Roboto',style:'Regular',weight:400,glyphs:{A:{d:'M0 0 L7 0 L7 -8 Z',advance:.8}},pairs:{},runs:{}}}};
 return {doc,svg,original,parent,attributes,mutations,library};
}

test('binding and unchanged values leave all source attributes untouched; restoring recovers them',()=>{
 const f=svgFixture(),slot={id:'name',text:'A',box:[30,40,20,20],outline:'M31 42 L38 42 L38 50 Z',font:{family:'Roboto',style:'Regular',weight:400,size:1,baseline:2}};
 const binding=bindSourceTextSlots(f.doc,[slot],{library:f.library});
 assert.equal(binding.ready.size,1);
 assert.deepEqual(f.mutations,[]);
 binding.setTextSlot('name','A');
 assert.deepEqual(f.mutations,[]);
 assert.equal(binding.setTextSlot('name','AA').ok,true);
 assert.equal(f.attributes.get('opacity'),'0');
 assert.equal(f.parent.replacement.attrs.get('transform'),'matrix(1 0 0 1 -30 -40)');
 binding.restore('name');
 assert.equal(f.attributes.has('opacity'),false);
 assert.equal(f.parent.replacement.removed,true);
});

test('typing replaces all proven coincident source copies with one drawing and restores both',()=>{
 const f=svgFixture(),copyAttributes=new Map([['d','M1 2.1 L8 2.1 L8 10.1 Z'],['opacity','.7']]);
 const copy={...f.original,getBBox:()=>({x:1,y:2.1,width:7,height:8}),getAttribute:k=>copyAttributes.get(k)??null,setAttribute:(k,v)=>copyAttributes.set(k,v),removeAttribute:k=>copyAttributes.delete(k)};
 f.svg.querySelectorAll=()=>[f.original,copy];
 const slot={id:'name',text:'A',box:[30,40,20,20],outline:'M31 42 L38 42 L38 50 Z',font:{family:'Roboto',style:'Regular',weight:400,size:1,baseline:2}};
 const binding=bindSourceTextSlots(f.doc,[slot],{library:f.library});
 assert.equal(binding.ready.size,1);
 assert.deepEqual(f.mutations,[]);
 assert.equal(copyAttributes.get('opacity'),'.7');
 assert.equal(binding.setTextSlot('name','AA').ok,true);
 assert.equal(f.attributes.get('opacity'),'0');
 assert.equal(copyAttributes.get('opacity'),'0');
 assert.equal(f.mutations.filter(m=>m[0]==='insert').length,1);
 binding.restore('name');
 assert.equal(f.attributes.has('opacity'),false);
 assert.equal(copyAttributes.get('opacity'),'.7');
});

test('typing in a fully clipped source slot retains its exact native clip without changing initial art',()=>{
 const f=svgFixture(),appended=[];
 f.svg.querySelectorAll=()=>[];f.svg.append=node=>appended.push(node);
 const slot={id:'clipped',text:'A',box:[0,0,20,20],outline:'M1 12 L8 12 L8 20 Z',sourceClipBox:[0,0,40,11],font:{family:'Roboto',style:'Regular',weight:400,size:1,baseline:12}};
 const binding=bindSourceTextSlots(f.doc,[slot],{library:f.library});
 assert.equal(binding.ready.size,1);assert.equal(appended.length,0);
 assert.equal(binding.setTextSlot(slot,'AA').ok,true);
 const clip=appended.find(node=>node.attrs.get('clipPathUnits')==='userSpaceOnUse'),replacement=appended.find(node=>node.attrs.has('data-source-text-slot'));
 assert.ok(clip);assert.deepEqual([...clip.children[0].attrs],[['x',0],['y',0],['width',40],['height',11]]);
 assert.equal(replacement.attrs.get('clip-path'),'url(#'+clip.attrs.get('id')+')');
 binding.restore(slot);assert.equal(clip.removed,true);assert.equal(replacement.removed,true);
});

test('a missing glyph hands off to native text with no stale vector text left behind',()=>{
 const f=svgFixture(),slot={id:'name',text:'A',box:[30,40,20,20],outline:'M31 42 L38 42 L38 50 Z',font:{family:'Roboto',style:'Regular',weight:400,size:1,baseline:2}};
 const binding=bindSourceTextSlots(f.doc,[slot],{library:f.library});
 binding.setTextSlot('name','AA');
 const result=binding.setTextSlot('name','☃');
 assert.equal(result.status,'missing-glyphs');
 assert.equal(result.sourceHidden,true);
 assert.equal(f.parent.replacement.removed,true);
 assert.equal(f.attributes.get('opacity'),'0');
 binding.setTextSlot('name','A');
 assert.equal(f.attributes.has('opacity'),false);
});

test('uses a supplied value font paint after matching the original placeholder font',()=>{
 const f=svgFixture(),slot={id:'name',text:'A',box:[30,40,20,20],outline:'M31 42 L38 42 L38 50 Z',font:{family:'Roboto',style:'Regular',weight:400,size:1,baseline:2,color:'#64748B'}};
 const binding=bindSourceTextSlots(f.doc,[slot],{library:f.library});
 binding.setTextSlot(slot,'AA',{font:{color:'#0F172A'}});
 assert.equal(f.parent.replacement.attrs.get('fill'),'#0F172A');
});

test('uses safe SVG text for unsupported new Unicode only after original ownership is proven',()=>{
 const f=svgFixture(),slot={id:'name',text:'A',box:[30,40,20,20],outline:'M31 42 L38 42 L38 50 Z',font:{family:'Roboto',style:'Regular',weight:400,size:1,baseline:2}};
 const binding=bindSourceTextSlots(f.doc,[slot],{library:f.library});
 const result=binding.setTextSlot(slot,'漢字\n<svg>',{nativeFallback:true});
 assert.equal(result.ok,true);assert.equal(result.status,'font-fallback');
 assert.equal(f.parent.replacement.attrs.get('font-family'),'Roboto');
 assert.equal(f.parent.replacement.children[0].textContent,'漢字');
 assert.equal(f.parent.replacement.children[1].textContent,'<svg>');
 assert.equal(f.attributes.get('opacity'),'0');
 binding.restore(slot);assert.equal(f.attributes.has('opacity'),false);
});

test('matches original App phone, Web login and date-filter curve exports one to one',()=>{
 const fixtures=JSON.parse(fs.readFileSync(new URL('./fixtures/source-text-slots.json',import.meta.url),'utf8'));
 for(const {slot,candidate} of fixtures){
  const generated=generateGlyphPaths(sourceGlyphLibrary,{...slot.font,value:slot.text,x:slot.box[0],baseline:slot.box[1]+slot.font.baseline,width:slot.box[2]});
  assert.deepEqual(generated.missingGlyphs,[],slot.text);
  assert.equal(matchSourceTextSlot({...slot,outline:generated.d},[candidate]).status,'matched',slot.text);
 }
});

test('keeps the original black greeting prefix and replaces only the orange name',()=>{
 const {slot,candidates}=JSON.parse(fs.readFileSync(new URL('./fixtures/source-greeting.json',import.meta.url),'utf8'));
 const origin=[1240,4345],layers=[],parent={getCTM:()=>({a:1,b:0,c:0,d:1,e:0,f:0}),insertBefore(node,anchor){layers.push({node,anchor});}};
 const sources=candidates.map(p=>{const attrs=new Map([['d',p.d],['fill',p.fill]]);return {attrs,parentNode:parent,nextSibling:null,getAttribute:k=>attrs.get(k)??null,setAttribute:(k,v)=>attrs.set(k,v),removeAttribute:k=>attrs.delete(k),closest:()=>null,getCTM:parent.getCTM,getBBox:()=>({x:p.bounds[0]+origin[0],y:p.bounds[1]+origin[1],width:p.bounds[2],height:p.bounds[3]})};});
 const svg={viewBox:{baseVal:{x:origin[0],y:origin[1]}},getCTM:parent.getCTM,querySelectorAll:()=>sources};
 const doc={querySelector:()=>svg,createElementNS(ns,type){const attrs=new Map();return {type,attrs,setAttribute:(k,v)=>attrs.set(k,v),remove(){this.removed=true;}};}};
 const binding=bindSourceTextSlots(doc,[slot],{library:sourceGlyphLibrary});
 assert.equal(binding.ready.size,1);
 assert.equal(binding.setTextSlot(slot,'Hello, Alice').ok,true);
 assert.equal(sources[0].attrs.has('opacity'),false);
 assert.equal(sources[1].attrs.get('opacity'),'0');
 assert.equal(layers.at(-1).node.attrs.get('fill'),'#F34B26');
 assert.equal(layers.at(-1).node.type,'path');
 binding.setTextSlot(slot,'Hello, 漢字',{nativeFallback:true});
 assert.equal(sources[0].attrs.has('opacity'),false);
 assert.equal(layers.at(-1).node.type,'text');
 assert.equal(layers.at(-1).node.textContent,'漢字');
 assert.equal(layers.at(-1).node.attrs.get('fill'),'#F34B26');
 binding.restore(slot);assert.equal(sources[1].attrs.has('opacity'),false);
});
