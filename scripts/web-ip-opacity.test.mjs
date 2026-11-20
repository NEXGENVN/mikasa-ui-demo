import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeFrames} from '../figma-preview/native-frames.mjs';
import fs from 'node:fs';
import {readSourceSvgPaths} from '../scripts/source-svg-paths.mjs';
import {canonicalPath,bindSourceTextSlots} from '../figma-preview/source-text-slots.mjs';
import {sourceGlyphLibrary} from '../figma-preview/source-glyph-library.mjs';
import {bindSourceDrawingRegions} from '../figma-preview/source-drawing-slots.mjs';
import {webInteractiveFrames} from '../figma-preview/web-interactive-controls.mjs';

const identity={a:1,b:0,c:0,d:1,e:0,f:0};
const serialize=segments=>segments.map(s=>s[0]==='M'?`M${s[1]} ${s[2]}`:s[0]==='L'?`L${s[3]} ${s[4]}`:`C${s.slice(3).join(' ')}`).join(' ');
for(const id of ['557:49673','31:5251','714:63144','1408:84257','557:50194','98:3079'])test('Web IP originals stay hidden across repeated projection: '+id,()=>{
 const source=nativeFrames.find(f=>f.id===id),frame=webInteractiveFrames[id],parsed=readSourceSvgPaths(fs.readFileSync(new URL('../figma-preview/'+source.file,import.meta.url),'utf8').match(/<svg[\s\S]*<\/svg>/)[0]),inserted=[];
 const parent={getCTM:()=>identity,insertBefore(node){inserted.push(node);node.parentNode=parent;}};
 const elements=parsed.paths.map(p=>{const attrs=new Map([['d',serialize(canonicalPath(p.d,{matrix:p.matrix}))],['fill',p.fill]]);return {localName:'path',parentNode:parent,nextSibling:null,getCTM:()=>identity,getBBox:()=>({x:p.bounds[0],y:p.bounds[1],width:p.bounds[2],height:p.bounds[3]}),closest:()=>null,contains:()=>false,getAttribute:k=>attrs.get(k)??null,setAttribute:(k,v)=>attrs.set(k,v),removeAttribute:k=>attrs.delete(k)};});
 const svg={viewBox:{baseVal:{x:0,y:0}},getCTM:()=>identity,querySelectorAll:()=>elements};
 const document={querySelector:()=>svg,createElementNS(){const attrs=new Map();return {localName:'path',attrs,getAttribute:k=>attrs.get(k)??null,setAttribute:(k,v)=>attrs.set(k,v),remove(){this.removed=true;}};}};
 const binder=bindSourceTextSlots(document,frame.texts,{library:sourceGlyphLibrary}),drawing=bindSourceDrawingRegions(document,frame.visibility);
 const region=frame.visibility?.[0];
 const slots=frame.table?.rows[0]?.slots.filter(s=>/ipv/i.test(s.column))||frame.texts.filter(s=>['ipv4','ipv6'].includes(s.dataField));assert.ok(slots.length,id);
 for(const slot of slots){
  const record=binder.ready.get(slot.id);assert.ok(record,slot.id);const value=slot.dataField==='ipv4'?'192.0.2.17':slot.dataField==='ipv6'?'2001:db8::25':'192.0.2.17\n2001:db8::25',result=binder.setTextSlot(slot,value);assert.equal(result.ok,true,slot.id);assert.deepEqual(result.missingGlyphs,[]);
  for(let repeat=0;repeat<3;repeat++){if(region)drawing.setVisible(region.id,true);assert.ok(record.paths.every(p=>p.element.getAttribute('opacity')==='0'),slot.id+' old ink stays hidden');}
  assert.ok(record.replacement||record.partLayers?.length,slot.id+' replacement exists');assert.deepEqual(record.slot.box,slot.box,'native coordinates unchanged');
 }
 binder.restore();drawing.restore();for(const record of binder.ready.values())assert.ok(record.paths.every((p,i)=>p.element.getAttribute('opacity')===record.originalOpacity[i]));
});
