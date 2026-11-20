import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeFrames} from '../figma-preview/native-frames.mjs';
import fs from 'node:fs';
import {readSourceSvgPaths} from '../scripts/source-svg-paths.mjs';
import {canonicalPath,bindSourceTextSlots} from '../figma-preview/source-text-slots.mjs';
import {sourceGlyphLibrary} from '../figma-preview/source-glyph-library.mjs';
import {bindSourceDrawingRegions} from '../figma-preview/source-drawing-slots.mjs';
import {appInteractiveFrames} from '../figma-preview/app-interactive-controls.mjs';

const identity={a:1,b:0,c:0,d:1,e:0,f:0};
const serialize=segments=>segments.map(s=>s[0]==='M'?`M${s[1]} ${s[2]}`:s[0]==='L'?`L${s[3]} ${s[4]}`:`C${s.slice(3).join(' ')}`).join(' ');
for(const id of ['784:48201','1430:85846','1635:105349'])test('App history source originals stay hidden after visible-row projection: '+id,()=>{
 const source=nativeFrames.find(f=>f.id===id),frame=appInteractiveFrames[id],parsed=readSourceSvgPaths(fs.readFileSync(new URL('../figma-preview/'+source.file,import.meta.url),'utf8').match(/<svg[\s\S]*<\/svg>/)[0]),inserted=[];
 const parent={getCTM:()=>identity,insertBefore(node){inserted.push(node);node.parentNode=parent;}};
 const elements=parsed.paths.map(p=>{const attrs=new Map([['d',serialize(canonicalPath(p.d,{matrix:p.matrix}))],['fill',p.fill]]);return {localName:'path',parentNode:parent,nextSibling:null,getCTM:()=>identity,getBBox:()=>({x:p.bounds[0],y:p.bounds[1],width:p.bounds[2],height:p.bounds[3]}),closest:()=>null,contains:()=>false,getAttribute:k=>attrs.get(k)??null,setAttribute:(k,v)=>attrs.set(k,v),removeAttribute:k=>attrs.delete(k)};});
 const svg={viewBox:{baseVal:{x:0,y:0}},getCTM:()=>identity,querySelectorAll:()=>elements};
 const document={querySelector:()=>svg,createElementNS(){const attrs=new Map();return {localName:'path',attrs,getAttribute:k=>attrs.get(k)??null,setAttribute:(k,v)=>attrs.set(k,v),remove(){this.removed=true;}};}};
 const binder=bindSourceTextSlots(document,frame.texts,{library:sourceGlyphLibrary}),drawing=bindSourceDrawingRegions(document,frame.visibility);
 const region=frame.visibility[0];
 for(const [field,value]of [['phone','0901234567'],['description','Thông báo đơn hàng\nHôm nay, 10:30'],['status','Thất bại']]){
  const slot=frame.texts.find(s=>s.field==='app.history.0.'+field),record=binder.ready.get(slot.id);assert.ok(record,slot.id);const result=binder.setTextSlot(slot,value);assert.equal(result.ok,true);
  for(let i=0;i<3;i++){drawing.setVisible(region.id,true);assert.ok(record.paths.every(p=>p.element.getAttribute('opacity')==='0'),field+' original must remain hidden');}
  assert.ok(record.replacement||record.partLayers?.length,field+' replacement exists');
 }
 binder.restore();drawing.restore();for(const record of binder.ready.values())assert.ok(record.paths.every((p,i)=>p.element.getAttribute('opacity')===record.originalOpacity[i]));
});
