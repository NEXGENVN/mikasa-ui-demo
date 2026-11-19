import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createNativeFlowMap} from './native-flow-map.mjs';
import {createHash} from 'node:crypto';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=async file=>JSON.parse(await fs.readFile(path.join(root,file),'utf8'));
export function assembleSourceCatalogue({inventory,compiled,svgFrames,flowFrames=[],flows=createNativeFlowMap()}){
 const all=new Map(inventory.map(f=>[f.id,f]));
 for(const f of flowFrames)if(!all.has(f.id))all.set(f.id,{...f,platform:'app',theme:'light',family:'prototype',group:'Mobile · Flow'});
 const vectors=new Map(svgFrames.map(f=>[f.id,f])),html=new Map(compiled.map(f=>[f.id,f]));
 return [...all.values()].map(f=>{
  let vector=vectors.get(f.id),equivalentTo=null;
  if(!vector&&f.equivalentSourceIds?.length){for(const id of f.equivalentSourceIds){const candidate=vectors.get(id);if(candidate&&candidate.width===f.width&&candidate.height===f.height){vector=candidate;equivalentTo=id;break;}}}
  const flow=flows.get(f.id),native=html.get(f.id);
  return {id:f.id,name:f.name,width:Number(f.width??f.w),height:Number(f.height??f.h),platform:f.platform,theme:f.theme||'light',family:f.family||'',group:f.group||f.sourceSection||'',flowRoute:flow?.flowRoute||f.flowRoute||null,flowState:flow?.flowState||null,file:vector?.publicFile||native?.file||null,sourceKind:vector?(equivalentTo?'exact-equivalent-svg':'original-svg'):native?'native-code':'pending',...(equivalentTo?{equivalentTo}:{})};
 });
}
export async function publishSourceSVG(){
 const inventory=await read('.audit/full-native-inventory.json'),extracted=await read('.audit/svg-extraction/manifest.json'),flow=await read('.audit/fig-flow-frames.json');
 // Optional legacy compiler output is never required for the complete SVG export.
 let compiled=[];try{compiled=await read('figma-preview/native/manifest.json');}catch(error){if(error.code!=='ENOENT')throw error;}
 await fs.mkdir(path.join(root,'figma-preview/source-frames'),{recursive:true});
 const runtimeFrames=[];
 for(const f of extracted.frames){
  if(!/^frames\/\d+-\d+\.svg$/.test(f.file)||!/^source-frames\/\d+-\d+\.[a-f\d]{12}\.svg$/.test(f.publicFile))throw Error('Invalid source SVG path');
  const svg=(await fs.readFile(path.join(root,'.audit/svg-extraction',f.file),'utf8')).replace(/^<\?xml[^>]+>\s*/,''),title=String(f.name).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
  const html='<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+title+'</title><style>html,body{margin:0;padding:0;width:'+f.width+'px;height:'+f.height+'px;overflow:hidden;background:transparent}svg{display:block}</style></head><body data-source-frame="'+f.id+'">'+svg+'</body></html>';
  const hash=createHash('sha256').update(html).digest('hex').slice(0,12),publicFile='source-frames/'+f.id.replace(':','-')+'.'+hash+'.html';
  await fs.writeFile(path.join(root,'figma-preview',publicFile),html);runtimeFrames.push({...f,publicFile});
 }
 const media=path.join(root,'.audit/svg-extraction/assets');for(const name of await fs.readdir(media)){if(!/^[a-f\d]{64}\.(png|jpe?g|webp|gif|svg)$/.test(name))throw Error('Invalid original image file '+name);await fs.copyFile(path.join(media,name),path.join(root,'figma-preview/assets',name));}
 const frames=assembleSourceCatalogue({inventory,compiled,svgFrames:runtimeFrames,flowFrames:flow.frames});
 if(frames.some(f=>f.sourceKind!=='original-svg'))throw Error('Every published product frame must have its own original SVG export.');
 await fs.writeFile(path.join(root,'figma-preview/native-frames.mjs'),'// Generated from the original local Figma SVG exports.\nexport const nativeFrames='+JSON.stringify(frames)+';\n');
 const coverage={total:frames.length,ready:frames.filter(f=>f.file).length,originalVectors:frames.filter(f=>f.sourceKind==='original-svg').length,equivalentVectors:frames.filter(f=>f.sourceKind==='exact-equivalent-svg').length,nativeCode:frames.filter(f=>f.sourceKind==='native-code').length,pending:frames.filter(f=>!f.file).length,platforms:Object.fromEntries(['web','web-portrait','app'].map(p=>{const rows=frames.filter(f=>f.platform===p);return[p,{total:rows.length,ready:rows.filter(f=>f.file).length,pending:rows.filter(f=>!f.file).length}];}))};
 await fs.writeFile(path.join(root,'figma-preview/native-coverage.json'),JSON.stringify(coverage,null,2)+'\n');return coverage;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(await publishSourceSVG()));
