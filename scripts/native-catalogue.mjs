import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createNativeFlowMap} from './native-flow-map.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=async name=>JSON.parse(await fs.readFile(path.join(root,name),'utf8'));
const write=async(name,data)=>fs.writeFile(path.join(root,name),JSON.stringify(data,null,2)+'\n');
export async function prepareCatalogue(){
 const web=await read('.audit/web-native-manifest.json'),mobile=await read('.audit/mobile-native-inventory.json');
 const all=[...web,...mobile].map(f=>({...f,width:Number(f.width??f.w),height:Number(f.height??f.h)}));
 all.push({id:'1635:105527',name:'B1.2 full quyền',width:390,height:844,platform:'app',theme:'light',family:'send',group:'Mobile · Quyền gửi tin',contextPath:'.audit/contexts/native-mobile-1635-105527.txt',screenshotPath:'.audit/native-reference/1635-105527.png'});
 const frames=[];for(const f of all){let code='';try{code=await fs.readFile(path.join(root,f.contextPath),'utf8');}catch{}if(/export default function|export default \w+/.test(code)&&/return\s*\(?\s*</.test(code)){frames.push(f);f.sourceReady=true;}else f.sourceReady=false;}
 await write('.audit/full-native-inventory.json',all);
 await write('.audit/combined-native-manifest.json',{frames,metadataPaths:['.audit/web-page-current.xml','.audit/mobile-page-current.xml']});
 return {total:all.length,ready:frames.length,pending:all.length-frames.length};
}
export async function publishCatalogue(){
 const inventory=await read('.audit/full-native-inventory.json'),compiled=await read('figma-preview/native/manifest.json');
 const byId=new Map(compiled.map(f=>[f.id,f])),flows=createNativeFlowMap();
 const publicFrames=inventory.map(f=>{const native=byId.get(f.id),flow=flows.get(f.id);return {id:f.id,name:f.name,width:f.width,height:f.height,platform:f.platform,theme:f.theme||'light',family:f.family||'',group:f.group||f.sourceSection||'',flowRoute:flow?.flowRoute||f.flowRoute||null,flowState:flow?.flowState||null,file:native?.file||null};});
 await fs.writeFile(path.join(root,'figma-preview/native-frames.mjs'),'// Generated from the complete Figma source inventory and strict native build.\nexport const nativeFrames='+JSON.stringify(publicFrames)+';\n');
 const coverage={total:publicFrames.length,ready:publicFrames.filter(f=>f.file).length,pending:publicFrames.filter(f=>!f.file).length,platforms:Object.fromEntries(['web','web-portrait','app'].map(p=>{const rows=publicFrames.filter(f=>f.platform===p);return[p,{total:rows.length,ready:rows.filter(f=>f.file).length,pending:rows.filter(f=>!f.file).length}];}))};
 await write('figma-preview/native-coverage.json',coverage);return coverage;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.includes('--publish'))console.log(JSON.stringify(await publishCatalogue()));
 else console.log(JSON.stringify(await prepareCatalogue()));
}
