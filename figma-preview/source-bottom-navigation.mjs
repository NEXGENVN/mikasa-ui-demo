import {nativeFrames} from './native-frames.mjs';
import {boxFromSvgElement} from './source-text-slots.mjs';
const ns='http://www.w3.org/2000/svg';
const appFrames=new Set(nativeFrames.filter(f=>f.platform==='app').map(f=>f.id)),restored=new WeakSet();
const near=(a,b)=>Math.abs(Number(a)-b)<.02;
function clipOrigin(rect){
 const transform=rect.getAttribute('transform')||'',match=/^translate\(([^)]+)\)$/.exec(transform);
 if(transform&&!match)return null;
 const [dx=0,dy=0]=match?match[1].trim().split(/[\s,]+/).map(Number):[];
 return [Number(rect.getAttribute('x')||0)+dx,Number(rect.getAttribute('y')||0)+dy];
}
/** Native menu backgrounds must stay within the source's rounded navigation outline. */
export function restoreSourceBottomNavigation(document,{frameId,measure=boxFromSvgElement}={}){
 if(!appFrames.has(frameId))return 0;
 const svg=document?.querySelector('svg');if(!svg)return 0;let count=0;
 for(const border of svg.querySelectorAll('rect[stroke]')){
  if(restored.has(border)||!near(border.getAttribute('width'),357)||!near(border.getAttribute('height'),59)||!near(border.getAttribute('rx'),19.5))continue;
  const group=border.closest('g[clip-path]'),clipId=/^url\(#([^\s)]+)\)$/.exec(group?.getAttribute('clip-path')||'')?.[1],clip=document.getElementById(clipId),rect=clip?.querySelector('rect'),origin=rect&&clipOrigin(rect);
  const aligned=rect&&origin&&near(rect.getAttribute('width'),358)&&near(rect.getAttribute('height'),60)&&near(origin[0],Number(border.getAttribute('x'))-.5)&&near(origin[1],Number(border.getAttribute('y'))-.5);
  if(aligned){rect.setAttribute('rx','20');rect.setAttribute('ry','20');}
  else{
   // Some original page exports flatten the menu's clip group entirely. Wrap
   // only its contiguous native ink, stopping before the home indicator/modal.
   let bounds;try{bounds=measure(border,svg);}catch{continue;}
   if(!Array.isArray(bounds)||bounds.length!==4||!bounds.every(Number.isFinite))continue;
   const outer=[bounds[0]-.5,bounds[1]-.5,bounds[2]+1,bounds[3]+1],members=[];
   for(let node=border;node;node=node.nextElementSibling){let box;try{box=measure(node,svg);}catch{break;}
    if(!box||box[0]<outer[0]-.05||box[1]<outer[1]-.05||box[0]+box[2]>outer[0]+outer[2]+.05||box[1]+box[3]>outer[1]+outer[3]+.05)break;members.push(node);
   }
   if(members.filter(n=>n.localName==='rect'&&near(n.getAttribute('width'),90)&&near(n.getAttribute('height'),60)).length!==4)continue;
   let defs=svg.querySelector('defs');if(!defs){defs=document.createElementNS(ns,'defs');svg.append(defs);}
   const nativeClip=document.createElementNS(ns,'clipPath'),shape=document.createElementNS(ns,'rect'),wrapper=document.createElementNS(ns,'g'),id='bottom-navigation-'+frameId.replace(':','-');
   nativeClip.setAttribute('id',id);nativeClip.setAttribute('clipPathUnits','userSpaceOnUse');
   for(const [key,value]of Object.entries({x:Number(border.getAttribute('x'))-.5,y:Number(border.getAttribute('y'))-.5,width:358,height:60,rx:20,ry:20}))shape.setAttribute(key,String(value));
   nativeClip.append(shape);defs.append(nativeClip);wrapper.setAttribute('clip-path','url(#'+id+')');border.parentElement.insertBefore(wrapper,border);for(const node of members)wrapper.append(node);
  }
  const outline=border.cloneNode(false);outline.setAttribute('fill','none');outline.setAttribute('data-source-navigation-outline',frameId);border.parentElement.append(outline);restored.add(border);restored.add(outline);count++;
 }
 return count;
}
