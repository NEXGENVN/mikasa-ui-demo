import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {parseArgs} from 'node:util';
import {createHash} from 'node:crypto';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const NAVIGATION=new Set(['NAVIGATE','OVERLAY','SWAP_OVERLAY','SWAP_STATE']);
const BACK=new Set(['BACK','CLOSE_OVERLAY']);
const ACTION_FIELDS=new Set(['transitionNodeID','transitionType','transitionDuration','easingType','connectionType','navigationType','easingFunction','transitionOverridesEnabled','transitionResetVideoPosition','enableJitSmartAnimate','transitionShouldSmartAnimate']);
const SKIP_REASONS=['invisible','nonClick','unknownSourceFrame','invalidNodeId','externalAction','unsupportedAction','unsupportedNavigation','componentOnlyTarget','unknownDestinationFrame','invalidFrameDimensions','invalidBounds','outsideFrame'];
const finite=value=>typeof value==='number'&&Number.isFinite(value);
const cleanLabel=value=>String(value??'').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,256);
const targetKey=item=>item.back?'back':item.destinationId;

/** Compile metadata into data-only hit areas. No source text is evaluated. */
export function buildSourceHotspots(links,frames){
 const catalogue=new Map();let duplicateCatalogueIds=0;
 for(const frame of frames){if(!frame?.id)continue;if(catalogue.has(frame.id)){duplicateCatalogueIds++;continue;}catalogue.set(frame.id,frame);}
 const report={inputLinks:links.length,catalogueFrames:catalogue.size,duplicateCatalogueIds,includedHotspots:0,framesWithHotspots:0,clampedHotspots:0,deduplicatedHotspots:0,excludedConflictingHotspots:0,skipped:Object.fromEntries(SKIP_REASONS.map(reason=>[reason,0])),eventCounts:{},navigationCounts:{},conflicts:[],omitted:[]};
 const byFrame=new Map();
 const skip=(link,reason)=>{report.skipped[reason]++;report.omitted.push({sourceFrameId:link.sourceFrameId,id:link.nodeId,reason});};
 for(const link of links){
  const event=link.event?.interactionType??'NONE',navigation=link.navigationType??link.action?.navigationType??'NONE';
  report.eventCounts[event]=(report.eventCounts[event]??0)+1;report.navigationCounts[navigation]=(report.navigationCounts[navigation]??0)+1;
  if(link.visible!==true){skip(link,'invisible');continue;}
  if(event!=='ON_CLICK'){skip(link,'nonClick');continue;}
  const source=catalogue.get(link.sourceFrameId);
  if(!source){skip(link,'unknownSourceFrame');continue;}
  if(typeof link.nodeId!=='string'||!link.nodeId){skip(link,'invalidNodeId');continue;}
  const action=link.action??{};
  if(!action||typeof action!=='object'||Array.isArray(action)){skip(link,'unsupportedAction');continue;}
  if(/URL|EXTERNAL/i.test(action.connectionType??'')||action.url||action.href||link.url||/^[a-z][a-z0-9+.-]*:\/\//i.test(link.destinationId??'')){skip(link,'externalAction');continue;}
  if(Object.keys(action).some(key=>!ACTION_FIELDS.has(key))||(action.navigationType&&link.navigationType&&action.navigationType!==link.navigationType)){skip(link,'unsupportedAction');continue;}
  const back=BACK.has(navigation)||(!link.navigationType&&!action.navigationType&&BACK.has(action.connectionType));
  if(!back&&!NAVIGATION.has(navigation)){skip(link,'unsupportedNavigation');continue;}
  if(!back&&action.connectionType&&action.connectionType!=='INTERNAL_NODE'){skip(link,'unsupportedAction');continue;}
  const destination=back?null:catalogue.get(link.destinationId);
  if(!back&&!destination){skip(link,navigation==='SWAP_STATE'?'componentOnlyTarget':'unknownDestinationFrame');continue;}
  if(!back&&action.transitionNodeID){
   const {sessionID,localID}=action.transitionNodeID;
   if(!Number.isInteger(sessionID)||!Number.isInteger(localID)||`${sessionID}:${localID}`!==link.destinationId){skip(link,'unsupportedAction');continue;}
  }
  const frameWidth=source.width??source.w??source.globalBounds?.width,frameHeight=source.height??source.h??source.globalBounds?.height;
  if(!finite(frameWidth)||!finite(frameHeight)||frameWidth<=0||frameHeight<=0){skip(link,'invalidFrameDimensions');continue;}
  const bounds=link.relativeBounds??{};const {x,y,width,height}=bounds;
  if(![x,y,width,height,x+width,y+height].every(finite)||width<=0||height<=0){skip(link,'invalidBounds');continue;}
  const left=Math.max(0,x),top=Math.max(0,y),right=Math.min(frameWidth,x+width),bottom=Math.min(frameHeight,y+height);
  if(right<=left||bottom<=top){skip(link,'outsideFrame');continue;}
  const bbox=[left,top,right-left,bottom-top].map(value=>value===0?0:value);
  if(bbox.some((value,index)=>value!==[x,y,width,height][index]))report.clampedHotspots++;
  const item={id:link.nodeId,bbox,...(back?{back:true}:{destinationId:link.destinationId}),label:cleanLabel(back?(link.nodeName||'Quay lại'):(destination.name||link.nodeName||link.destinationId))};
  if(!byFrame.has(source.id))byFrame.set(source.id,[]);
  const current=byFrame.get(source.id);
  if(current.some(other=>targetKey(other)===targetKey(item)&&other.bbox.every((value,index)=>value===bbox[index]))){report.deduplicatedHotspots++;continue;}
  current.push(item);
 }
 const hotspots=Object.create(null);
 for(const [sourceFrameId,items] of [...byFrame].sort(([a],[b])=>a.localeCompare(b))){
  const conflicts=new Set();
  for(let i=0;i<items.length;i++)for(let j=i+1;j<items.length;j++){
   const first=items[i],second=items[j];if(targetKey(first)===targetKey(second))continue;
   const [ax,ay,aw,ah]=first.bbox,[bx,by,bw,bh]=second.bbox;
   const x=Math.max(ax,bx),y=Math.max(ay,by),width=Math.min(ax+aw,bx+bw)-x,height=Math.min(ay+ah,by+bh)-y;
   if(width>0&&height>0){conflicts.add(i);conflicts.add(j);report.conflicts.push({sourceFrameId,first,second,intersection:[x,y,width,height]});}
  }
  report.excludedConflictingHotspots+=conflicts.size;
  const safe=items.filter((item,index)=>!conflicts.has(index));
  if(safe.length){hotspots[sourceFrameId]=safe;report.includedHotspots+=safe.length;report.framesWithHotspots++;}
 }
 report.accountedLinks=Object.values(report.skipped).reduce((sum,n)=>sum+n,0)+report.deduplicatedHotspots+report.excludedConflictingHotspots+report.includedHotspots;
 return {hotspots,report};
}

async function main(){
 const {values}=parseArgs({options:{links:{type:'string',default:resolve(ROOT,'.audit/fig-prototype-links.json')},inventory:{type:'string',default:resolve(ROOT,'.audit/full-native-inventory.json')},flow:{type:'string',default:resolve(ROOT,'.audit/fig-flow-frames.json')},out:{type:'string',default:resolve(ROOT,'figma-preview/source-hotspots.mjs')},report:{type:'string',default:resolve(ROOT,'.audit/source-hotspots-report.json')}}});
 const inputs=await Promise.all([values.links,values.inventory,values.flow].map(async path=>({path,text:await readFile(path,'utf8')})));
 const linkData=JSON.parse(inputs[0].text),inventory=JSON.parse(inputs[1].text),flow=JSON.parse(inputs[2].text);
 const {hotspots,report}=buildSourceHotspots(linkData.links??linkData,[...(inventory.frames??inventory),...(flow.frames??flow)]);
 if(report.accountedLinks!==report.inputLinks)throw new Error('Hotspot input accounting failed.');
 report.provenance=inputs.map(({path,text})=>({path,sha256:createHash('sha256').update(text).digest('hex')}));
 report.policy='Only visible ON_CLICK exact catalogue destinations or actual BACK/CLOSE_OVERLAY. Bounds intersected with source viewport. Identical target/bounds deduplicated. All different-target overlapping hit areas omitted and reported; no stacking choice inferred.';
 await mkdir(dirname(values.out),{recursive:true});await mkdir(dirname(values.report),{recursive:true});
 await writeFile(values.out,'// Generated from local Figma prototype metadata; source-frame coordinates.\nexport const sourceHotspots='+JSON.stringify(hotspots)+';\nexport default sourceHotspots;\n');
 await writeFile(values.report,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({inputLinks:report.inputLinks,catalogueFrames:report.catalogueFrames,includedHotspots:report.includedHotspots,framesWithHotspots:report.framesWithHotspots,clampedHotspots:report.clampedHotspots,deduplicatedHotspots:report.deduplicatedHotspots,conflictPairs:report.conflicts.length,excludedConflictingHotspots:report.excludedConflictingHotspots,skipped:report.skipped}));
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)await main();
