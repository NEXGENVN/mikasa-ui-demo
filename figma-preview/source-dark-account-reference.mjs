import {boxFromSvgElement} from './source-text-slots.mjs';

const ns='http://www.w3.org/2000/svg',mounted=new WeakMap();
const accountFrames=new Set(['1450:9744','1450:9996','1456:11813']);
const dataFrames=new Set(['1450:9816','1450:9840','1450:9878','1450:9918','1450:9956']);
const contains=(outer,box,tolerance=.08)=>box[0]>=outer[0]-tolerance&&box[1]>=outer[1]-tolerance&&box[0]+box[2]<=outer[0]+outer[2]+tolerance&&box[1]+box[3]<=outer[1]+outer[3]+tolerance;
const near=(a,b)=>Math.abs(Number(a)-b)<.02;
const region=(box,targetBox)=>({box,targetBox});

function accountLayout({dialog=false,cardY,rowsDy,titleDy=0}){
 const dx=dialog?-2:0,dy=dialog?-5:0,sourceCardY=107+dy,centerDy=cardY-sourceCardY+2.5;
 const regions=[
  region([39.5+dx,130.5+dy,59,63],[39.5+dx,cardY+23,69,69]),
  region([111+dx,136+dy,122,52],[121+dx,136+dy+centerDy,122,52]),
  region([313+dx,150+dy,52,24],[313+dx,150+dy+centerDy,52,24]),
  region([16+dx,sourceCardY,362,110],[16+dx,cardY,358,115]),
  region([16+dx,229+dy,70,24],[16+dx,229+dy+rowsDy,70,24]),
  region([16+dx,381+dy,60,24],[16+dx,381+dy+rowsDy,60,24]),
  ...[[268,42],[325,42],[419,42],[473,44],[529,42],[583,42],[637,42]].map(([y,height])=>region([16+dx,y+dy,358,height],[16+dx,y+dy+rowsDy,358,height]))
 ];
 if(titleDy)regions.push(region([16,72,87,28],[16,72+titleDy,87,28]));
 return regions;
}

const backgroundLayouts={
 '1450:9744':accountLayout({cardY:124,rowsDy:22,titleDy:10}),
 '1450:9996':accountLayout({dialog:true,cardY:147,rowsDy:49}),
 '1456:11813':accountLayout({dialog:true,cardY:102,rowsDy:5})
};
const successPromptRegion=region([20,592,350,203],[20,622,350,203]);
/** First matching region owns both source SVG ink and its metadata/control bounds. */
export const darkAccountReferenceLayout={...backgroundLayouts,'1456:11813':[...backgroundLayouts['1456:11813'],successPromptRegion]};

/** Apply screenshot-backed corrections to a loaded Dark App SVG, after avatar rounding.
 * All source vectors, source files, modal dimming, and sheet bounds are retained.
 * The returned handle is idempotent and restores every attribute owned by this helper.
 */
export function mountSourceDarkAccountReference(document,{frameId,measure=boxFromSvgElement}={}){
 const empty=()=>({changed:0,restore(){}});
 if(!accountFrames.has(frameId)&&!dataFrames.has(frameId)&&frameId!=='1450:10174')return empty();
 const svg=document?.querySelector('svg');if(!svg)return empty();
 const previous=mounted.get(svg);if(previous)return previous;
 const view=(svg.getAttribute('viewBox')||'').trim().split(/[\s,]+/).map(Number);
 if(view.length!==4||!view.every(Number.isFinite)||!near(view[2],390)||!near(view[3],844))return empty();
 const records=[],changes=[],added=[];let background=true;
 for(const node of svg.querySelectorAll('g,path,rect,circle,ellipse,line,polyline,polygon')){
  if(node.closest('defs,clipPath,mask,pattern,filter'))continue;
  if(frameId!=='1450:9744'&&node.localName==='rect'&&node.getAttribute('fill')==='#121212'&&near(node.getAttribute('width'),390)&&near(node.getAttribute('height'),844))background=false;
  try{const bounds=measure(node,svg);if(Array.isArray(bounds)&&bounds.length===4&&bounds.every(Number.isFinite))records.push({node,background,box:[bounds[0]-view[0],bounds[1]-view[1],bounds[2],bounds[3]]});}catch{/* Unmeasurable drawing is never guessed. */}
 }
 const set=(node,key,value)=>{if(node.getAttribute(key)===value)return;changes.push([node,key,node.getAttribute(key)]);node.setAttribute(key,value);};
 if(accountFrames.has(frameId)){
  const dialog=frameId!=='1450:9744',dx=dialog?-2:0,dy=dialog?-5:0;
  const icons=[277,334,428,483,538,592,646].map(y=>[25+dx,y+dy,24,24]);
  const chevrons=[436,546,600,654].map(y=>[355+dx,y+dy,4,8]);
  const transformed=new Set();
  for(const {node,box,background}of records){
   if(background&&node.localName==='path'&&node.getAttribute('stroke')==='#0F4D88'&&icons.some(area=>contains(area,box)))set(node,'stroke','#F8FAFF');
   if(background&&node.localName==='path'&&node.getAttribute('stroke')==='#F8FAFF'&&chevrons.some(area=>contains(area,box)))set(node,'stroke','#64748B');
   if(frameId==='1450:9744'&&contains([16,691,358,42],box))set(node,'display','none');
   if(frameId==='1450:9996'&&node.localName==='rect'&&node.getAttribute('fill')==='#0F4D88'&&near(node.getAttribute('width'),40)&&near(node.getAttribute('height'),2)&&contains([175,687,40,2],box))set(node,'display','none');
   let ancestor=node.parentElement,alreadyTransformed=false;while(ancestor&&ancestor!==svg){if(transformed.has(ancestor)){alreadyTransformed=true;break;}ancestor=ancestor.parentElement;}
   const layout=background?backgroundLayouts[frameId]:frameId==='1456:11813'?[successPromptRegion]:[];
   const match=!alreadyTransformed&&layout.find(item=>contains(item.box,box));
   if(match){
    const {box:from,targetBox:to}=match,sx=to[2]/from[2],sy=to[3]/from[3],tx=view[0]+to[0]-sx*(view[0]+from[0]),ty=view[1]+to[1]-sy*(view[1]+from[1]);
    const existing=node.getAttribute('transform'),matrix=`matrix(${sx} 0 0 ${sy} ${tx} ${ty})`;
    set(node,'transform',matrix+(existing?' '+existing:''));transformed.add(node);
   }
  }
 }
 if(dataFrames.has(frameId))for(const {node,box}of records)if(node.localName==='path'&&node.getAttribute('stroke')==='#0F4D88'&&contains([25,115,24,24],box))set(node,'stroke','#F8FAFF');
 if(frameId==='1450:10174'){
  const border=document.createElementNS(ns,'rect');
  for(const [key,value]of Object.entries({x:view[0]+16.5,y:view[1]+124,width:357,height:189,rx:19.5,fill:'none',stroke:'#555555','stroke-width':1,'pointer-events':'none','data-dark-account-reference':'appearance-outline'}))border.setAttribute(key,String(value));
  svg.append(border);added.push(border);
 }
 const handle={changed:changes.length+added.length,restore(){
  if(mounted.get(svg)!==handle)return;
  for(const node of added)node.remove();
  for(let index=changes.length-1;index>=0;index--){const [node,key,value]=changes[index];if(value==null)node.removeAttribute(key);else node.setAttribute(key,value);}
  mounted.delete(svg);
 }};
 mounted.set(svg,handle);return handle;
}
