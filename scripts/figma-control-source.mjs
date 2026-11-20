import fs from 'node:fs/promises';
import path from 'node:path';
import v8 from 'node:v8';
import {fileURLToPath,pathToFileURL} from 'node:url';

const guid=value=>value?`${value.sessionID}:${value.localID}`:null;
const identity=()=>({m00:1,m01:0,m02:0,m10:0,m11:1,m12:0});
const multiply=(a,b)=>({m00:a.m00*b.m00+a.m01*b.m10,m01:a.m00*b.m01+a.m01*b.m11,m02:a.m00*b.m02+a.m01*b.m12+a.m02,m10:a.m10*b.m00+a.m11*b.m10,m11:a.m10*b.m01+a.m11*b.m11,m12:a.m10*b.m02+a.m11*b.m12+a.m12});
function bounds(m,w,h){const p=[[0,0],[w,0],[0,h],[w,h]].map(([x,y])=>[m.m00*x+m.m01*y+m.m02,m.m10*x+m.m11*y+m.m12]);const xs=p.map(p=>p[0]),ys=p.map(p=>p[1]);return [Math.min(...xs),Math.min(...ys),Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys)];}
function intersect(a,b){const x=Math.max(a[0],b[0]),y=Math.max(a[1],b[1]);return [x,y,Math.max(0,Math.min(a[0]+a[2],b[0]+b[2])-x),Math.max(0,Math.min(a[1]+a[3],b[1]+b[3])-y)];}
const valueOf=prop=>prop?.varValue?.value||prop?.value||prop?.initialValue;
const statePaintFields=['frameMaskDisabled','fillPaints','fillGeometry','strokePaints','strokeGeometry','strokeWeight','strokeAlign','strokeJoin','cornerRadius','rectangleTopLeftCornerRadius','rectangleTopRightCornerRadius','rectangleBottomLeftCornerRadius','rectangleBottomRightCornerRadius','effects','blendMode','isMask','maskType'];

/** Resolve local Figma component instances into frame-relative native node data.
 * No rendering or browser measurement is used. IDs retain the complete instance path.
 */
export function expandSourceFrames({inventory,message,frames,includeTextGeometry=false,includeRaw=false,instanceStateOverrides={}}){
 const raw=new Map((message.nodeChanges||[]).map(n=>[guid(n.guid),n]));
 const children=new Map();
 for(const [id,n]of raw){const parent=guid(n.parentIndex?.guid);if(parent){if(!children.has(parent))children.set(parent,[]);children.get(parent).push(id);}}
 // Figma's position strings use byte ordering, not locale ordering.
 for(const ids of children.values())ids.sort((a,b)=>{const x=raw.get(a).parentIndex?.position||'',y=raw.get(b).parentIndex?.position||'';return x<y?-1:x>y?1:0;});
 const propDefs=new Map();for(const n of raw.values())for(const d of n.componentPropDefs||[])propDefs.set(guid(d.id),d);
 function propKey(id,seen=new Set()){const d=propDefs.get(id);if(!d?.parentPropDefId||seen.has(id))return id;seen.add(id);return propKey(guid(d.parentPropDefId),seen);}
 const alias=id=>guid(raw.get(id)?.overrideKey)||id;
 const pathKey=o=>(o.guidPath?.guids||[]).map(g=>alias(guid(g))).join('/');
 const contextFor=n=>({path:[],overrides:new Map((n.symbolData?.symbolOverrides||[]).map(o=>[pathKey(o),o])),derived:new Map((n.derivedSymbolData||[]).map(o=>[pathKey(o),o]))});
 function merge(n,patch){
  if(!patch)return n;
  for(const [k,value]of Object.entries(patch))if(!['componentPropAssignments','prototypeInteractions'].includes(k))n[k]=value;
  if(patch.componentPropAssignments){const props=new Map((n.componentPropAssignments||[]).map(a=>[propKey(guid(a.defID)),a]));for(const a of patch.componentPropAssignments)props.set(propKey(guid(a.defID)),a);n.componentPropAssignments=[...props.values()];}
  if(patch.prototypeInteractions){const interactions=new Map((n.prototypeInteractions||[]).map(i=>[guid(i.id),i]));for(const p of patch.prototypeInteractions){const old=interactions.get(guid(p.id))||{};interactions.set(guid(p.id),{...old,...p,event:{...old.event,...p.event},actions:p.actions?.map((a,i)=>({...old.actions?.[i],...a}))||old.actions});}n.prototypeInteractions=[...interactions.values()];}
  return n;
 }
 const inventoryMap=new Map((inventory?.nodes||[]).map(n=>[n.id,n]));
 return frames.map(frame=>{
  const nodes=[];const width=frame.width??frame.w,height=frame.height??frame.h;
  function visit(id,parentMatrix,parentId,contexts,props,clip,scrollClip,parentVisible,depth,pathIds){
   if(depth>40)throw new Error(`Component recursion exceeds 40 levels in ${frame.id}: ${id}`);
   const source=raw.get(id);if(!source)return;
   const nodePath=[...pathIds,id],expandedId=nodePath.join(';');
   let n=merge({},source);
   for(const c of [...contexts].reverse()){const k=c.path.join('/');merge(n,c.overrides.get(k));merge(n,c.derived.get(k));}
   const stateOverride=instanceStateOverrides instanceof Map?instanceStateOverrides.get(expandedId)||instanceStateOverrides.get(id):instanceStateOverrides[expandedId]||instanceStateOverrides[id];
   let sourceSize=null;
   if(stateOverride&&n.type==='INSTANCE'){
    const state=typeof stateOverride==='string'?{masterId:stateOverride}:stateOverride;
    const target=raw.get(state.masterId);if(!target)throw new Error(`Unknown native component state ${state.masterId}`);
    sourceSize=[n.size?.x||0,n.size?.y||0];
    const [sessionID,localID]=state.masterId.split(':').map(Number);
    n.overriddenSymbolID={sessionID,localID};n.symbolData={...n.symbolData,symbolID:{sessionID,localID}};
    for(const k of statePaintFields){delete n[k];if(Object.hasOwn(target,k))n[k]=target[k];}
    n.size={x:state.width??sourceSize[0],y:state.height??target.size?.y??sourceSize[1]};
    n.prototypeInteractions=target.prototypeInteractions||[];
   }
   let masterId=null;
   if(n.type==='INSTANCE'){
    masterId=guid(n.overriddenSymbolID||n.symbolData?.symbolID);
    const master=raw.get(masterId);
    if(master){const inherited=merge({},master);const ownContext=contextFor(n);merge(inherited,ownContext.overrides.get(alias(masterId)));n=merge(inherited,n);n.type='INSTANCE';}
   }
   for(const entry of n.parameterConsumptionMap?.entries||[]){
    const ref=entry.variableData?.value?.propRefValue?.defId;if(!ref)continue;
    const key=propKey(guid(ref)),value=props.get(key)||valueOf(propDefs.get(key));
    if(entry.variableField==='TEXT_DATA'&&value?.textDataValue)n.textData=value.textDataValue;
    if(entry.variableField==='VISIBLE'&&value?.boolValue!==undefined)n.visible=value.boolValue;
   }
   const matrix=depth===0?identity():multiply(parentMatrix,n.transform||identity());
   const bbox=bounds(matrix,n.size?.x||0,n.size?.y||0),clippedBBox=intersect(bbox,clip),scrollBBox=intersect(bbox,scrollClip);
   const visible=parentVisible&&n.visible!==false&&(n.opacity??1)>0;
   const textGeometry=n.derivedTextData;
   const meta=textGeometry?.fontMetaData?.[0],fontName=meta?.key||n.fontName||{};
   const fill=n.fillPaints?.find(p=>p.visible!==false&&p.type==='SOLID');
   const fontSize=meta?textGeometry.glyphs?.[0]?.fontSize??n.fontSize:n.fontSize;
   const lineHeight=n.lineHeight?.units==='PERCENT'?n.lineHeight.value*fontSize/100:n.lineHeight?.units==='PIXELS'?n.lineHeight.value:textGeometry?.baselines?.[0]?.lineHeight;
   const font={family:fontName.family||'Roboto',style:fontName.style||'Regular',size:fontSize,weight:meta?.fontWeight??(/Bold|Black/.test(fontName.style||'')?700:/Medium/.test(fontName.style||'')?500:400),lineHeight,color:fill?.color,baseline:textGeometry?.baselines?.[0]?.position?.y,align:n.textAlignHorizontal};
   font.fontKey=`${font.family}|${font.style}|${font.weight}`;
   const row={id:expandedId,sourceId:id,parentId,path:nodePath,type:n.type,name:n.name||'',text:n.textData?.characters||'',bbox,clippedBBox,scrollBBox,globalTransform:matrix,visible,rendered:visible&&clippedBBox[2]>0&&clippedBBox[3]>0,scrollRendered:visible&&scrollBBox[2]>0&&scrollBBox[3]>0,...(n.type==='TEXT'?{font}:{}),...(masterId?{masterId}:{}),...(sourceSize?{sourceSize,masterSize:[raw.get(masterId)?.size?.x||0,raw.get(masterId)?.size?.y||0]}:{}),...(n.prototypeInteractions?.some(i=>!i.isDeleted)?{prototypeInteractions:n.prototypeInteractions.filter(i=>!i.isDeleted)}:{}),...(n.frameMaskDisabled===false?{clipsContent:true}:{}),...(includeTextGeometry&&n.type==='TEXT'&&textGeometry?{textGeometry:{baselines:textGeometry.baselines,glyphs:textGeometry.glyphs,fontMetaData:textGeometry.fontMetaData}}:{}),...(includeRaw?{raw:n}:{})};
   nodes.push(row);
   let childIds=children.get(id)||[],nextContexts=contexts,nextProps=props;
   if(masterId){childIds=children.get(masterId)||[];nextContexts=[...contexts,contextFor(n)];nextProps=new Map(props);for(const a of n.componentPropAssignments||[])nextProps.set(propKey(guid(a.defID)),valueOf(a));}
   const nextClip=n.frameMaskDisabled===false?intersect(clip,bbox):clip;
   const nextScrollClip=depth>0&&n.frameMaskDisabled===false?intersect(scrollClip,bbox):scrollClip;
   // A Figma guidPath lists nested INSTANCE boundaries and the final descendant;
   // ordinary FRAME/GROUP ancestors are deliberately absent from that address.
   for(const child of childIds)visit(child,matrix,expandedId,nextContexts.map(c=>({...c,path:[...(masterId?c.path:c.path.slice(0,-1)),alias(child)]})),nextProps,nextClip,nextScrollClip,visible,depth+1,nodePath);
  }
  visit(frame.id,identity(),null,[],new Map(),[0,0,width,height],[0,0,width,1e7],true,0,[]);
  const native=inventoryMap.get(frame.id);
  return {...frame,...(native?{canvasOrigin:[native.globalX,native.globalY]}:{}),nodes};
 });
}

export async function loadExpandedSource({root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),includeTextGeometry=false}={}){
 const [inventoryBytes,messageBytes,frameBytes]=await Promise.all([fs.readFile(path.join(root,'.audit/fig-current-inventory.json'),'utf8'),fs.readFile(path.join(root,'.audit/fig-parser/decoded.v8')),fs.readFile(path.join(root,'.audit/svg-extraction/manifest.json'),'utf8')]);
 return expandSourceFrames({inventory:JSON.parse(inventoryBytes),message:v8.deserialize(messageBytes),frames:JSON.parse(frameBytes).frames,includeTextGeometry});
}

if(typeof process!=='undefined'&&process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const frames=await loadExpandedSource({includeTextGeometry:process.argv.includes('--glyphs')});
 const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
 const output=path.join(root,'.audit/interactive-expanded-source.json');
 await fs.writeFile(output,JSON.stringify({format:'figma-expanded-native-controls-v1',frames})+'\n');
 console.log(JSON.stringify({frames:frames.length,nodes:frames.reduce((s,f)=>s+f.nodes.length,0),output}));
}
