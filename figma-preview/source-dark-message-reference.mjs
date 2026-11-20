import {boxFromSvgElement} from './source-text-slots.mjs';

const ns='http://www.w3.org/2000/svg',owned=new WeakMap();
const confirmations=new Set(['1430:88032','1430:88099','1430:88175']);
const details=new Set(['1430:86619','1444:95125','1450:8895','1450:9014','1444:93591']);
const successes=new Set(['1430:87138','1450:9130','1450:9522']);
const within=(a,b,t=.1)=>a[0]>=b[0]-t&&a[1]>=b[1]-t&&a[0]+a[2]<=b[0]+b[2]+t&&a[1]+a[3]<=b[1]+b[3]+t;
const sameBox=(a,b)=>a.every((n,i)=>Math.abs(n-b[i])<.1);

/** Restore the user reference's native message icon backplates and paints.
 * Rect primitives come from original SVGs 1313:75767 / 1279:8597 (44/48 × 40)
 * and 1450:9130 (40 × 40 / 40 × 30), aligned to the Dark glyphs' source origin.
 * Original glyph paths, text, clips, outlines and section layout stay intact.
 * Run before binding dynamic source drawing regions so they own the added tiles.
 */
export function restoreSourceDarkMessageReference(document,{frameId,measure=boxFromSvgElement}={}){
 const confirmation=confirmations.has(frameId),detail=details.has(frameId),success=successes.has(frameId);
 if(!confirmation&&!detail&&!success)return 0;
 const svg=document?.querySelector('svg');if(!svg||owned.has(svg))return 0;
 const [ox=0,oy=0]=(svg.getAttribute('viewBox')||'').trim().split(/[\s,]+/).map(Number);
 if(!Number.isFinite(ox)||!Number.isFinite(oy))return 0;
 const records=[];
 for(const element of svg.querySelectorAll('path,rect')){
  if(element.closest('defs,clipPath,mask,pattern,filter'))continue;
  let box;try{box=measure(element,svg);box=[box[0]-ox,box[1]-oy,box[2],box[3]];}catch{continue;}
  if(box.length===4&&box.every(Number.isFinite))records.push({element,box});
 }
 const changes={added:[],paints:[]},changed=new Set();
 const paint=(element,key,value)=>{const original=element.getAttribute(key);if(original===value)return;changes.paints.push({element,key,original});element.setAttribute(key,value);changed.add(element);};
 const multi=frameId==='1430:88099',dy=frameId==='1444:93591'?1:0;
 const tiles=confirmation?(multi?[[29,277,44,40],[29,342,48,40]]:[[29,279,44,40],[29,346,48,40],[29,411,44,40]]):success?[[29,254,40,40],[29,317,40,40],[29,383,40,30],[29,444,40,30]]:[[29,254+dy,40,40],[29,319+dy,40,40],[29,384+dy,40,40],[29,452+dy,40,30]];
 for(const tileBox of tiles){
  const ink=records.filter(({element,box})=>element.localName==='path'&&['#0F4D88','#195CFA'].includes(element.getAttribute('stroke'))&&within(box,tileBox));
  if(!ink.length)continue;
  if(!records.some(({element,box})=>element.localName==='rect'&&element.getAttribute('fill')==='#E0F2FE'&&sameBox(box,tileBox))){
   const [x,y,width,height]=tileBox,tile=document.createElementNS(ns,'rect');
   for(const [key,value]of Object.entries({x:ox+x,y:oy+y,width,height,rx:6,fill:'#E0F2FE','aria-hidden':'true','pointer-events':'none','data-source-dark-message-tile':frameId}))tile.setAttribute(key,String(value));
   ink[0].element.parentNode.insertBefore(tile,ink[0].element);changes.added.push(tile);changed.add(tile);
  }
  // L17 deliberately retains the brighter clock blue shown in reference154110.
  if(frameId!=='1450:9522')for(const {element}of ink)paint(element,'stroke','#0F4D88');
 }
 if(confirmation)for(const {element,box}of records){
  if(element.localName==='path'&&element.getAttribute('mask')&&element.getAttribute('fill')==='#D9D9D9'&&Math.abs(box[0]-29)<.1&&Math.abs(box[2]-332)<.1&&box[3]<=2.1&&box[1]>=270&&box[1]<=470)paint(element,'fill','#454545');
 }
 if(frameId==='1430:86619')for(const {element,box}of records){
  if(element.localName==='path'&&element.getAttribute('fill')==='#64748B'&&within(box,[60,580,280,155]))paint(element,'fill','#B3B3B3');
 }
 if(['1450:9130','1450:9522'].includes(frameId))for(const {element,box}of records)if(within(box,[16,1100,358,98]))for(const key of ['fill','stroke'])if(['#121212','#000000','#000'].includes(element.getAttribute(key)))paint(element,key,'#F8FAFF');
 if(changed.size)owned.set(svg,changes);
 return changed.size;
}

/** Undo only this helper's added tiles and owned paint attributes. */
export function revertSourceDarkMessageReference(document){
 const svg=document?.querySelector('svg'),changes=svg&&owned.get(svg);if(!changes)return 0;
 for(const tile of changes.added)tile.remove();
 for(const {element,key,original}of changes.paints){if(original===null)element.removeAttribute(key);else element.setAttribute(key,original);}
 owned.delete(svg);return changes.added.length+changes.paints.length;
}
