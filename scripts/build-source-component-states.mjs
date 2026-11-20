import fs from 'node:fs/promises';
import path from 'node:path';
import {deserialize} from 'node:v8';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {expandSourceFrames} from './figma-control-source.mjs';
import {decodeCommandsBlob} from '../figma-preview/source-glyphs.mjs';
import {sourceColor} from '../figma-preview/source-text-slots.mjs';

const guid=n=>n?`${n.sessionID}:${n.localID}`:null;
const num=n=>String(Math.round(n*1e6)/1e6),esc=s=>String(s).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
const identity=()=>({m00:1,m01:0,m02:0,m10:0,m11:1,m12:0});
const multiply=(a,b)=>({m00:a.m00*b.m00+a.m01*b.m10,m01:a.m00*b.m01+a.m01*b.m11,m02:a.m00*b.m02+a.m01*b.m12+a.m02,m10:a.m10*b.m00+a.m11*b.m10,m11:a.m10*b.m01+a.m11*b.m11,m12:a.m10*b.m02+a.m11*b.m12+a.m12});
const inverse=m=>{const d=m.m00*m.m11-m.m01*m.m10;if(!d)throw Error('Singular native source transform');return{m00:m.m11/d,m01:-m.m01/d,m02:(m.m01*m.m12-m.m11*m.m02)/d,m10:-m.m10/d,m11:m.m00/d,m12:(m.m10*m.m02-m.m00*m.m12)/d};};
const transform=m=>`matrix(${[m.m00,m.m10,m.m01,m.m11,m.m02,m.m12].map(num).join(' ')})`;
const intersection=(a,b)=>{const x=Math.max(a[0],b[0]),y=Math.max(a[1],b[1]);return[x,y,Math.max(0,Math.min(a[0]+a[2],b[0]+b[2])-x),Math.max(0,Math.min(a[1]+a[3],b[1]+b[3])-y)];};
const union=boxes=>{const x=Math.min(...boxes.map(b=>b[0])),y=Math.min(...boxes.map(b=>b[1]));return[x,y,Math.max(...boxes.map(b=>b[0]+b[2]))-x,Math.max(...boxes.map(b=>b[1]+b[3]))-y];};
const bounds=(m,w,h)=>{const ps=[[0,0],[w,0],[0,h],[w,h]].map(([x,y])=>[m.m00*x+m.m01*y+m.m02,m.m10*x+m.m11*y+m.m12]);const x=Math.min(...ps.map(p=>p[0])),y=Math.min(...ps.map(p=>p[1]));return[x,y,Math.max(...ps.map(p=>p[0]))-x,Math.max(...ps.map(p=>p[1]))-y];};
const outlines=new WeakMap();
function sourceOutline(message,id){let cache=outlines.get(message);if(!cache)outlines.set(message,cache=new Map());if(!cache.has(id)){const bytes=message.blobs?.[id]?.bytes;if(!bytes)throw Error('Missing native commands blob '+id);cache.set(id,decodeCommandsBlob(bytes));}return cache.get(id);}
const click=n=>(n.prototypeInteractions||n.raw?.prototypeInteractions||[]).filter(i=>!i.isDeleted&&i.event?.interactionType==='ON_CLICK').flatMap(i=>i.actions||[]);

function nativeTree(frame,rootId,{layout=false}={}){
 const original=new Map(frame.nodes.map(n=>[n.id,n])),root=original.get(rootId);if(!root)throw Error('Missing expanded native root '+rootId);
 const included=frame.nodes.filter(n=>{if(n.id===rootId||n.id.startsWith(rootId+';'))return true;for(let p=original.get(n.parentId);p;p=original.get(p.parentId))if(p.id===rootId)return true;return false;});
 const tree=new Map(included.map(n=>[n.id,{...n,raw:n.raw||{},w:n.raw?.size?.x??n.bbox[2],h:n.raw?.size?.y??n.bbox[3],children:[]}]));
 for(const n of tree.values()){const parent=tree.get(n.parentId);n.local=n.id===rootId?identity():multiply(inverse((parent||root).globalTransform),n.globalTransform);if(parent)parent.children.push(n);}
 const top=tree.get(rootId);
 function sizeChildren(parent,authoredWidth){
  const delta=parent.w-authoredWidth,raw=parent.raw,growing=parent.children.filter(n=>(n.raw.stackChildPrimaryGrow||0)>0),growTotal=growing.reduce((s,n)=>s+n.raw.stackChildPrimaryGrow,0);let precedingGrow=0;
  for(const child of parent.children){const oldWidth=child.w,absolute=child.raw.stackPositioning==='ABSOLUTE';
   if(Math.abs(delta)>.001&&!absolute){const constraint=child.raw.horizontalConstraint||child.raw.horizontalConstraints;
    if(child.raw.stackChildAlignSelf==='STRETCH'||constraint==='STRETCH'||Math.abs(child.w-authoredWidth)<2){if(Math.abs(child.w-parent.w)>1)child.w+=delta;}
    else if(raw.stackMode==='HORIZONTAL'&&child.raw.stackChildPrimaryGrow>0)child.w+=delta*child.raw.stackChildPrimaryGrow/growTotal;
    else if(constraint==='MAX')child.local.m02+=delta;
    else if(constraint==='CENTER')child.local.m02+=delta/2;
    if(raw.stackMode==='HORIZONTAL'&&growTotal){child.local.m02+=delta*precedingGrow/growTotal;precedingGrow+=child.raw.stackChildPrimaryGrow||0;}
   }
   if((layout||parent.sourceSize)&&raw.stackMode==='VERTICAL'&&!absolute){const left=raw.stackHorizontalPadding||0,right=raw.stackPaddingRight??left;if(raw.stackCounterAlignItems==='MAX')child.local.m02=parent.w-right-child.w;else if(raw.stackCounterAlignItems==='CENTER')child.local.m02=left+(parent.w-left-right-child.w)/2;}
   sizeChildren(child,oldWidth);
  }
 }
 sizeChildren(top,top.masterSize?.[0]??top.w);
 function world(n,parent=identity(),clip=null,visible=true){n.world=multiply(parent,n.local);n.localBox=bounds(n.world,n.w,n.h);n.nativeClip=clip;n.actualVisible=visible&&n.visible!==false&&(n.raw.opacity??1)>0;const nextClip=n.raw.frameMaskDisabled===false?(clip?intersection(clip,n.localBox):n.localBox):clip;for(const c of n.children)world(c,n.world,nextClip,n.actualVisible);}
 world(top);return{top,nodes:[...tree.values()]};
}

/** Render only decoded native source geometry; text is emitted as original glyph paths. */
export function renderExpandedSourceSvg(message,frame,{rootId=frame.id,layout=false,ignoreRootClip=false,sourceHeader,backgroundOnly=false,paintFrom}={}){
 const tree=nativeTree(frame,rootId,{layout}),top=tree.top;let nodes=tree.nodes;
 if(paintFrom){top.raw={...top.raw};for(const key of ['fillPaints','strokePaints','strokeWeight','strokeAlign','cornerRadius','rectangleTopLeftCornerRadius','rectangleTopRightCornerRadius','rectangleBottomLeftCornerRadius','rectangleBottomRightCornerRadius','effects'])if(Object.hasOwn(paintFrom,key))top.raw[key]=paintFrom[key];}
 if(backgroundOnly){top.children=[];nodes=[top];}
 if(sourceHeader){const closed=nativeTree(sourceHeader,rootId),headerHeight=top.sourceSize?.[1]??Math.min(top.h,top.children[0]?.h||top.h),old=closed.nodes.filter(n=>n.type==='TEXT'&&n.actualVisible&&n.localBox[1]>=0&&n.localBox[1]<headerHeight).sort((a,b)=>a.localBox[1]-b.localBox[1]||a.localBox[0]-b.localBox[0]),current=nodes.filter(n=>n.type==='TEXT'&&n.actualVisible&&n.localBox[1]>=0&&n.localBox[1]<headerHeight).sort((a,b)=>a.localBox[1]-b.localBox[1]||a.localBox[0]-b.localBox[0]);if(old.length===current.length)for(let i=0;i<old.length;i++){const a=old[i],b=current[i];b.text=a.text;b.font=a.font;b.raw={...b.raw,textData:a.raw.textData,derivedTextData:a.raw.derivedTextData,fillPaints:a.raw.fillPaints,fontName:a.raw.fontName,fontSize:a.raw.fontSize};}}
 const defs=[],prefix='native-'+createHash('sha256').update(rootId).digest('hex').slice(0,10);let sequence=0;
 const visible=n=>n.actualVisible&&(!n.nativeClip||intersection(n.localBox,n.nativeClip)[2]>0&&intersection(n.localBox,n.nativeClip)[3]>0);
 const paintColor=p=>sourceColor({...p.color,a:(p.color?.a??1)*(p.opacity??1)});
 function paint(p){if(!p||p.visible===false)return null;if(p.type==='SOLID')return esc(paintColor(p));
  if(!['GRADIENT_LINEAR','GRADIENT_RADIAL'].includes(p.type))throw Error('Unsupported native popup paint '+p.type);
  const id=prefix+'-paint'+sequence++,t=inverse(p.transform||identity()),stops=(p.stops||[]).map(s=>`<stop offset="${num(s.position)}" stop-color="${esc(sourceColor({...s.color,a:(s.color.a??1)*(p.opacity??1)}))}"/>`).join('');
  if(p.type==='GRADIENT_LINEAR'){const start=[t.m01*.5+t.m02,t.m11*.5+t.m12],end=[t.m00+t.m01*.5+t.m02,t.m10+t.m11*.5+t.m12];defs.push(`<linearGradient id="${id}" x1="${num(start[0])}" y1="${num(start[1])}" x2="${num(end[0])}" y2="${num(end[1])}" color-interpolation="sRGB">${stops}</linearGradient>`);}
  else defs.push(`<radialGradient id="${id}" cx=".5" cy=".5" r=".5" gradientTransform="${transform(t)}" color-interpolation="sRGB">${stops}</radialGradient>`);
  return'url(#'+id+')';
 }
 function geometry(list,paints){return(list||[]).map((g,index)=>{const color=paint(paints?.[g.styleID??index]||paints?.[0]);return color?`<path d="${sourceOutline(message,g.commandsBlob)}" fill="${color}" fill-rule="${g.windingRule==='EVENODD'?'evenodd':'nonzero'}"/>`:'';}).join('');}
 function shape(n,{clip=false}={}){const r=n.raw,w=n.w,h=n.h,radius=Math.min(r.cornerRadius??0,w/2,h/2);let out='';const primitive=['FRAME','SYMBOL','INSTANCE','ROUNDED_RECTANGLE','ELLIPSE'].includes(n.type);
  if(!primitive)return geometry(r.fillGeometry,r.fillPaints)+geometry(r.strokeGeometry,r.strokePaints);
  const path=(fill,stroke,weight=0,inset=0)=>n.type==='ELLIPSE'?`<ellipse cx="${num(w/2)}" cy="${num(h/2)}" rx="${num(Math.max(0,w/2-inset))}" ry="${num(Math.max(0,h/2-inset))}" fill="${fill}"${stroke?` stroke="${stroke}" stroke-width="${num(weight)}"`:''}/>`:`<rect x="${num(inset)}" y="${num(inset)}" width="${num(Math.max(0,w-2*inset))}" height="${num(Math.max(0,h-2*inset))}" rx="${num(Math.max(0,radius-inset))}" fill="${fill}"${stroke?` stroke="${stroke}" stroke-width="${num(weight)}"`:''}/>`;
  if(clip)return path('white');
  if((r.cornerSmoothing||0)>0&&r.fillGeometry?.length)out+=geometry(r.fillGeometry,r.fillPaints);else for(const p of r.fillPaints||[]){const color=paint(p);if(color)out+=path(color);}
  for(const p of r.strokePaints||[]){const color=paint(p);if(!color)continue;const weight=r.strokeWeight??1,inset=r.strokeAlign==='INSIDE'?weight/2:r.strokeAlign==='OUTSIDE'?-weight/2:0;out+=path('none',color,weight,inset);}return out;
 }
 function text(n){const r=n.raw,g=r.derivedTextData||n.textGeometry;if(!g?.glyphs?.length){if(n.text?.trim())throw Error('Missing native text glyphs '+n.id);return'';}const fill=paint(r.fillPaints?.find(p=>p.visible!==false))||'black',delta=n.w-(r.size?.x??n.w),align=r.textAlignHorizontal,shift=align==='CENTER'?delta/2:align==='RIGHT'?delta:0;
  return g.glyphs.map(glyph=>{const size=glyph.fontSize??r.fontSize??n.font?.size;if(!Number.isFinite(size))throw Error('Missing native glyph font size '+n.id);const m={m00:size,m01:0,m02:(glyph.position?.x||0)+shift,m10:0,m11:-size,m12:glyph.position?.y||0};return`<path d="${sourceOutline(message,glyph.commandsBlob)}" transform="${transform(m)}" fill="${fill}"/>`;}).join('');
 }
 function effects(n){const items=(n.raw.effects||[]).filter(e=>e.visible!==false);if(!items.length)return'';const id=prefix+'-effect'+sequence++,steps=[],behind=[],front=[];let margin=0,graphic='SourceGraphic';
  for(const [index,e]of items.entries()){if(e.type==='LAYER_BLUR'){steps.push(`<feGaussianBlur in="SourceGraphic" stdDeviation="${num((e.radius||0)/2)}" result="nativeBlur"/>`);graphic='nativeBlur';continue;}if(!['DROP_SHADOW','INNER_SHADOW'].includes(e.type))throw Error('Unsupported native popup effect '+e.type);const inner=e.type==='INNER_SHADOW',c=e.color||{},offset=e.offset||{},name='shadow'+index,spread=e.spread||0;let input='SourceAlpha';if(!inner)margin=Math.max(margin,Math.abs(spread)+2*(e.radius||0)+Math.max(Math.abs(offset.x||0),Math.abs(offset.y||0)));
   if(spread){steps.push(`<feMorphology in="SourceAlpha" operator="${spread>0!==inner?'dilate':'erode'}" radius="${num(Math.abs(spread))}" result="spread${index}"/>`);input='spread'+index;}
   steps.push(`<feGaussianBlur in="${input}" stdDeviation="${num((e.radius||0)/2)}" result="blur${index}"/><feOffset in="blur${index}" dx="${num(offset.x||0)}" dy="${num(offset.y||0)}" result="offset${index}"/>`);input='offset'+index;
   if(inner){steps.push(`<feComposite in="SourceAlpha" in2="${input}" operator="out" result="cut${index}"/>`);input='cut'+index;}
   else if(e.showShadowBehindNode===false){steps.push(`<feComposite in="${input}" in2="SourceAlpha" operator="out" result="cut${index}"/>`);input='cut'+index;}
   steps.push(`<feColorMatrix in="${input}" type="matrix" values="0 0 0 0 ${c.r||0} 0 0 0 0 ${c.g||0} 0 0 0 0 ${c.b||0} 0 0 0 ${c.a??1} 0" result="${name}"/>`);(inner?front:behind).push(name);
  }
  defs.push(`<filter id="${id}" x="${-margin}" y="${-margin}" width="${n.w+2*margin}" height="${n.h+2*margin}" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">${steps.join('')}<feMerge>${[...behind,graphic,...front].map(name=>`<feMergeNode in="${name}"/>`).join('')}</feMerge></filter>`);return` filter="url(#${id})"`;
 }
 function draw(n){if(!n.actualVisible)return'';const own=n.type==='TEXT'?text(n):shape(n),children=n.children.map(draw).join('');let body=own+children;if(n.raw.frameMaskDisabled===false&&!(ignoreRootClip&&n===top)){const id=prefix+'-clip'+sequence++;defs.push(`<clipPath id="${id}">${shape(n,{clip:true})}</clipPath>`);body=`<g clip-path="url(#${id})">${body}</g>`;}return`<g transform="${transform(n.local)}"${n.raw.opacity!=null&&n.raw.opacity!==1?` opacity="${num(n.raw.opacity)}"`:''}${effects(n)}>${body}</g>`;}
 const drawing=draw(top),boxes=nodes.filter(visible).map(n=>{const r=n.raw;let margin=0;for(const e of r.effects||[])if(e.visible!==false&&e.type!=='INNER_SHADOW')margin=Math.max(margin,2*(e.radius||0)+Math.max(Math.abs(e.offset?.x||0),Math.abs(e.offset?.y||0))+Math.abs(e.spread||0));const b=n.nativeClip?intersection(n.localBox,n.nativeClip):n.localBox;return[b[0]-margin,b[1]-margin,b[2]+2*margin,b[3]+2*margin];});
 const box=union([[0,0,top.w,top.h],...boxes]),offset=[box[0],box[1]],headerHeight=top.sourceSize?.[1]??Math.min(top.h,top.children[0]?.h||top.h),headerBox=[-box[0]||0,-box[1]||0,top.w,headerHeight];
 const texts=nodes.filter(n=>n.type==='TEXT'&&n.text&&visible(n)),descendant=(n,p)=>{for(let parent=n.parentId;parent;parent=nodes.find(n=>n.id===parent)?.parentId)if(parent===p)return true;return false;};
 const optionNodes=nodes.filter(n=>n!==top&&visible(n)&&click(n).length&&n.localBox[1]>=headerHeight-.1&&n.h<=64&&texts.some(t=>descendant(t,n.id)));
 const options=[];
 for(const n of optionNodes){const ts=texts.filter(t=>descendant(t,n.id)),label=ts.map(t=>t.text).join(' ').replace(/\s+/g,' ').trim();if(!label||optionNodes.some(p=>p!==n&&descendant(n,p.id)&&p.h<=n.h&&p.w<=n.w))continue;const clipped=n.nativeClip?intersection(n.localBox,n.nativeClip):n.localBox,b=clipped.map((v,i)=>i<2?v-offset[i]:v);if(!options.some(o=>o.label===label&&o.box.every((v,i)=>Math.abs(v-b[i])<.01)))options.push({label,value:label,box:b});}
 const sourceBox=[top.bbox[0]+box[0],top.bbox[1]+box[1],box[2],box[3]];
 return{width:box[2],height:box[3],box,sourceBox,headerBox,options,visibleTexts:texts.map(n=>({id:n.id,text:n.text,box:n.localBox})),nodes,svg:`<svg xmlns="http://www.w3.org/2000/svg" width="${num(box[2])}" height="${num(box[3])}" viewBox="${box.map(num).join(' ')}" fill="none">${defs.length?'<defs>'+defs.join('')+'</defs>':''}${drawing}</svg>`};
}

export function discoverPopupCandidates(expandedFrames,controlMaps,inventory){
 const byNative=new Map(inventory.nodes.map(n=>[n.id,n])),records=[];
 for(const frame of expandedFrames){const metadata=controlMaps[frame.id];if(!metadata)continue;const byId=new Map(frame.nodes.map(n=>[n.id,n]));
  for(const control of metadata.controls.filter(c=>!['checkbox','radio','file'].includes(c.type))){const node=byId.get(control.id);if(!node)continue;const instances=[];for(let p=node;p;p=byId.get(p.parentId)){if(p.type==='INSTANCE')instances.push(p);if(instances.length>2)break;}if(control.type==='select')instances.push(...frame.nodes.filter(n=>n.type==='INSTANCE'&&n.id.startsWith(control.id+';')));
   for(const instance of instances)for(const action of click(instance)){if(action.navigationType!=='SWAP_STATE')continue;const destination=guid(action.transitionNodeID),target=byNative.get(destination);if(target?.type!=='SYMBOL')continue;
    if(records.some(r=>r.controlId===control.id&&r.instanceId===instance.id&&r.masterId===destination))continue;
    records.push({frameId:frame.id,controlId:control.id,control,instanceId:instance.id,masterId:destination,sourceMasterId:instance.masterId,closedBox:instance.bbox});
   }
  }
 }
 return records;
}

export async function buildSourceComponentStates({root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),message,inventory,frames,expandedFrames,controlMaps}={}){
 if(!message||!inventory||!frames||!expandedFrames){const inputs=await Promise.all([!message?fs.readFile(path.join(root,'.audit/fig-parser/decoded.v8')):null,!inventory?fs.readFile(path.join(root,'.audit/fig-current-inventory.json'),'utf8'):null,!frames?fs.readFile(path.join(root,'.audit/svg-extraction/manifest.json'),'utf8'):null,!expandedFrames?fs.readFile(path.join(root,'.audit/interactive-expanded-source.json'),'utf8'):null]);message??=deserialize(inputs[0]);inventory??=JSON.parse(inputs[1]);frames??=JSON.parse(inputs[2]).frames;expandedFrames??=JSON.parse(inputs[3]).frames;}
 if(!controlMaps){const [app,web]=await Promise.all([import(pathToFileURL(path.join(root,'figma-preview/app-interactive-controls.mjs')).href),import(pathToFileURL(path.join(root,'figma-preview/web-interactive-controls.mjs')).href)]);controlMaps={...app.appInteractiveFrames,...web.webInteractiveFrames};}
 const raw=new Map(message.nodeChanges.map(n=>[guid(n.guid),n])),native=new Map(inventory.nodes.map(n=>[n.id,n])),children=new Map();for(const n of inventory.nodes){if(!children.has(n.parentId))children.set(n.parentId,[]);children.get(n.parentId).push(n);}
 const allCandidates=discoverPopupCandidates(expandedFrames,controlMaps,inventory),candidates=allCandidates.filter(r=>{const t=native.get(r.masterId);return t.height>r.closedBox[3]+4||(children.get(r.masterId)||[]).some(c=>c.visible!==false&&c.y>=r.closedBox[3]&&c.height>0);});
 const overrides={};for(const r of candidates){const old=overrides[r.instanceId],target=native.get(r.masterId);if(!old||native.get(old.masterId).height<target.height)overrides[r.instanceId]={masterId:r.masterId};}
 const requiredFrames=new Set(candidates.map(c=>c.frameId));
 const offfoldFrames=frames.filter(f=>controlMaps[f.id]?.scrollHeight>f.height);for(const f of offfoldFrames)requiredFrames.add(f.id);
 const cardFrames=frames.filter(f=>f.platform!=='app'&&controlMaps[f.id]?.controls.some(c=>c.type==='radio'&&c.field==='web.account.role'));for(const f of cardFrames)requiredFrames.add(f.id);
 const ordinary=expandSourceFrames({message,inventory,frames:frames.filter(f=>requiredFrames.has(f.id)),includeRaw:true,includeTextGeometry:true}),byOrdinary=new Map(ordinary.map(f=>[f.id,f]));
 const opened=expandSourceFrames({message,inventory,frames:frames.filter(f=>requiredFrames.has(f.id)),includeRaw:true,includeTextGeometry:true,instanceStateOverrides:overrides}),byOpened=new Map(opened.map(f=>[f.id,f]));
 const directory=path.join(root,'figma-preview/assets/interactive-components');await fs.mkdir(directory,{recursive:true});
 const popups={},counters={},extra={},cards={},report={popupCandidates:candidates.length,popups:0,counterStates:0,extraArtwork:0,cardStates:0,failures:[],unavailable:[]},written=new Map();
 async function write(art,label){const hash=createHash('sha256').update(art.svg).digest('hex').slice(0,12),name=label.replace(/[^a-zA-Z0-9_-]/g,'-').slice(0,70)+'.'+hash+'.svg',file='assets/interactive-components/'+name;if(!written.has(file)){await fs.writeFile(path.join(directory,name),art.svg+'\n');written.set(file,true);}return file;}
 const valueFor=(label,c)=>{const item=c.options?.find(o=>o.label===label);if(item)return item.value;if(c.field==='app.history.sort')return /cũ|old/i.test(label)?'oldest':'newest';return label;};
 for(const candidate of candidates){const selected=overrides[candidate.instanceId];if(selected.masterId!==candidate.masterId)continue;try{const art=renderExpandedSourceSvg(message,byOpened.get(candidate.frameId),{rootId:candidate.instanceId,sourceHeader:byOrdinary.get(candidate.frameId)});if(!art.options.length)continue;const headerLabel=art.visibleTexts.filter(t=>t.box[1]>=0&&t.box[1]<art.headerBox[3]).map(t=>t.text).join(' ').replace(/\s+/g,' ').trim(),current=candidate.control.options?.find(o=>o.label===headerLabel);if(current&&!art.options.some(o=>o.label===headerLabel))art.options.unshift({label:headerLabel,value:current.value,box:art.headerBox});const file=await write(art,'popup-'+candidate.masterId.replace(':','-'));popups[candidate.controlId]={file,width:art.width,height:art.height,headerBox:art.headerBox,offset:art.box.slice(0,2),options:art.options.map(o=>({...o,value:valueFor(o.label,candidate.control)})),masterId:candidate.masterId,sourceInstanceId:candidate.instanceId};report.popups++;}catch(error){report.failures.push({kind:'popup',id:candidate.controlId,masterId:candidate.masterId,error:error.message});}}
 // The source component state names are numbered by variant order. Their actual
 // clipped numeric glyph is authoritative ("Chọn số tin 2" displays the value 1).
 const representatives=[['light','773:88074'],['dark','1430:86331']];
 for(const [theme,frameId]of representatives){let sourceFrame=byOrdinary.get(frameId);if(!sourceFrame){sourceFrame=expandSourceFrames({message,inventory,frames:[frames.find(f=>f.id===frameId)],includeRaw:true,includeTextGeometry:true})[0];}
  const instance=sourceFrame.nodes.find(n=>n.type==='INSTANCE'&&/Chọn số tin full quyền/.test(n.name));if(!instance)continue;const master=raw.get(instance.masterId),parent=guid(master?.parentIndex?.guid),siblings=message.nodeChanges.filter(n=>n.type==='SYMBOL'&&guid(n.parentIndex?.guid)===parent),clones=[];
  for(const [index,target]of siblings.entries()){const id={sessionID:4294967200,localID:theme==='dark'?100+index:index},clone={...raw.get(instance.sourceId),guid:id,parentIndex:undefined,transform:identity(),overriddenSymbolID:target.guid,symbolData:{...raw.get(instance.sourceId).symbolData,symbolID:target.guid},size:{x:instance.bbox[2],y:target.size.y}};clones.push(clone);}
  const augmented={...message,nodeChanges:[...message.nodeChanges,...clones]},states=expandSourceFrames({message:augmented,inventory,frames:clones.map(n=>({id:guid(n.guid),width:n.size.x,height:n.size.y})),includeRaw:true,includeTextGeometry:true});const output={states:{}};
  for(const state of states)try{const art=renderExpandedSourceSvg(augmented,state),digit=art.visibleTexts.find(n=>/^\d$/.test(n.text)),value=Number(digit?.text);if(!Number.isInteger(value)||value<1||value>5)continue;const file=await write(art,'counter-'+theme+'-'+value),nodeMap=new Map(art.nodes.map(n=>[n.id,n]));let numberNode=nodeMap.get(digit.id);while(numberNode?.parentId&&!/^Số tin$/i.test(numberNode.name))numberNode=nodeMap.get(numberNode.parentId);const controls=[{id:'count',type:'input',inputType:'text',inputMode:'numeric',maxLength:1,box:numberNode?.localBox||digit.box,field:'app.send.oaCount',action:'app.input',onInput:true,value:String(value),label:'Số OA gửi',textSlots:[]}];
   for(const n of art.nodes.filter(n=>n.actualVisible&&n.type==='INSTANCE'&&/^Component 10(?: dark)?$|^Component 11(?: dark)?$/.test(n.name))){const minus=/Component 10/.test(n.name);controls.push({id:minus?'minus':'plus',type:'button',box:n.localBox,action:minus?'app.oa.minus':'app.oa.plus',label:minus?'Giảm số OA':'Tăng số OA'});}output.states[String(value)]={file,width:art.width,height:art.height,controls};report.counterStates++;}catch(error){report.failures.push({kind:'counter',id:state.id,error:error.message});}
  counters[theme]=output;
 }
 // Off-fold tiles are complete native controls. Runtime clipping at the original
 // fold preserves initial pixels and can be lifted once the user scrolls.
 for(const frame of offfoldFrames){const source=byOrdinary.get(frame.id),metadata=controlMaps[frame.id];if(!source)continue;const nodes=new Map(source.nodes.map(n=>[n.id,n])),targets=new Map();
  for(const control of metadata.controls.filter(c=>c.box[1]+c.box[3]>frame.height)){const n=nodes.get(control.id);if(n)targets.set(n.id,n);let parent=nodes.get(n?.parentId);for(let i=0;parent&&i<2;i++,parent=nodes.get(parent.parentId))for(const label of source.nodes.filter(c=>c.parentId===parent.id&&c.type==='TEXT'&&c.bbox[1]>=frame.height&&c.bbox[1]+c.bbox[3]<=control.box[1]+2))targets.set(label.id,label);}
  const selected=[...targets.values()].filter(n=>![...targets.keys()].some(id=>id!==n.id&&n.id.startsWith(id+';')));extra[frame.id]=[];
  for(const n of selected)try{const art=renderExpandedSourceSvg(message,source,{rootId:n.id}),file=await write(art,'offfold-'+frame.id.replace(':','-')+'-'+n.sourceId.replace(':','-'));extra[frame.id].push({id:n.id,file,box:art.sourceBox,clipAtFold:true});report.extraArtwork++;}catch(error){report.failures.push({kind:'offfold',id:n.id,error:error.message});}
 }
 const selectedPaint=raw.get('64:5156'),unselectedPaint=raw.get('64:5161');
 for(const frame of cardFrames){const source=byOrdinary.get(frame.id),nodeMap=new Map(source.nodes.map(n=>[n.id,n]));for(const control of controlMaps[frame.id].controls.filter(c=>c.type==='radio'&&c.field==='web.account.role')){let card=nodeMap.get(control.cardNodeId);if(!card){for(let n=nodeMap.get(control.id);n;n=nodeMap.get(n.parentId))if(n.type==='FRAME'&&n.bbox[2]>=200&&n.bbox[3]>=48&&n.bbox[3]<=130){card=n;break;}}if(!card)continue;try{const on=renderExpandedSourceSvg(message,source,{rootId:card.id,backgroundOnly:true,paintFrom:selectedPaint}),off=renderExpandedSourceSvg(message,source,{rootId:card.id,backgroundOnly:true,paintFrom:unselectedPaint});cards[control.id]={checkedAsset:await write(on,'card-on-'+card.sourceId.replace(':','-')),uncheckedAsset:await write(off,'card-off-'+card.sourceId.replace(':','-')),box:card.bbox,sourceId:card.id};report.cardStates+=2;}catch(error){report.failures.push({kind:'card',id:control.id,error:error.message});}}}
 for(const [frameId,metadata]of Object.entries(controlMaps))for(const c of metadata.controls.filter(c=>c.type==='select'))if(!popups[c.id])report.unavailable.push({frameId,id:c.id,label:c.label,reason:'No supplied native popup with selectable rows was found.'});
 const text='// Generated only from local Figma native component geometry and glyph commands.\nexport const sourceComponentPopups='+JSON.stringify(popups)+';\nexport const sourceComponentCounters='+JSON.stringify(counters)+';\nexport const sourceComponentExtraArtwork='+JSON.stringify(extra)+';\nexport const sourceComponentCards='+JSON.stringify(cards)+';\n';
 await fs.writeFile(path.join(root,'figma-preview/source-component-states.mjs'),text);await fs.writeFile(path.join(root,'.audit/source-component-states-report.json'),JSON.stringify(report,null,2)+'\n');return{popups,counters,extra,cards,report};
}
if(typeof process!=='undefined'&&process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){const {report}=await buildSourceComponentStates();console.log(JSON.stringify({...report,unavailable:report.unavailable.length}));}
