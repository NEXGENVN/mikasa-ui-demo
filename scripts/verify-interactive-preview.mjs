import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {nativeFrames} from '../figma-preview/native-frames.mjs';
import {appInteractiveFrames} from '../figma-preview/app-interactive-controls.mjs';
import {webInteractiveFrames} from '../figma-preview/web-interactive-controls.mjs';
import {handleAppInteraction,prepareAppFrame} from '../figma-preview/app-interactive-controller.mjs';
import {handleWebInteraction,prepareWebFrame} from '../figma-preview/web-interactive-controller.mjs';
import {createDemoState} from '../figma-preview/core.mjs';
import {createInteractiveSession,seedInteractiveValues} from '../figma-preview/interactive-session.mjs';
import {composeSourceComponents} from '../figma-preview/interactive-component-view.mjs';
import {renderInteractiveFrame} from '../figma-preview/interactive-preview.mjs';
import {sourceComponentPopups,sourceComponentExtraArtwork} from '../figma-preview/source-component-states.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export async function verifyInteractivePreview(){
 const catalogue=new Map(nativeFrames.map(f=>[f.id,f])),report={format:'original-figma-interactive-v1',frames:0,platforms:{},controls:0,timers:0,checkedActions:0,sourceFilesRetained:0,sourceComponentAssets:0,errors:[]},assets=new Set();
 const collect=value=>{if(!value||typeof value!=='object')return;for(const [k,v]of Object.entries(value))if(typeof v==='string'&&/^(file|checkedAsset|uncheckedAsset)$/.test(k)&&v.startsWith('assets/'))assets.add(v);else if(v&&typeof v==='object')collect(v);};
 for(const original of nativeFrames){
  const metadata=(original.platform==='app'?appInteractiveFrames:webInteractiveFrames)[original.id];if(!metadata){report.errors.push({frameId:original.id,status:'missing-metadata'});continue;}
  const session=createInteractiveSession(createDemoState()),frame=composeSourceComponents({...original,...metadata,id:original.id,width:original.width,height:original.height,file:original.file,platform:original.platform},session,{popups:sourceComponentPopups,extraArtwork:sourceComponentExtraArtwork[original.id]||[]});
  seedInteractiveValues(session,frame);const prepare=frame.platform==='app'?prepareAppFrame:prepareWebFrame,handle=frame.platform==='app'?handleAppInteraction:handleWebInteraction;prepare({frame,session});session.currentFrameId=frame.id;
  try{const html=renderInteractiveFrame(frame,session);if(!html.includes(original.file)||frame.file!==original.file)throw Error('Original frame identity changed');report.sourceFilesRetained++;}catch(error){report.errors.push({frameId:frame.id,status:'renderer',message:error.message});}
  collect(frame);report.frames++;report.platforms[frame.platform]=(report.platforms[frame.platform]||0)+1;report.controls+=frame.controls.length;report.timers+=frame.timers?.length||0;
  for(const control of [...frame.controls,...(frame.timers||[]).map(t=>t.control)]){
   const state=createInteractiveSession(createDemoState());seedInteractiveValues(state,frame);prepare({frame,session:state});state.currentFrameId=frame.id;
   try{const result=handle({frame,control,session:state,value:control.field?state.values[control.field]:control.value,eventType:control.type==='button'?'click':'change'}),destination=result?.targetId||control.targetId;report.checkedActions++;
    if(!result&&!destination&&!['back','close'].includes(control.action))report.errors.push({frameId:frame.id,controlId:control.id,status:'unhandled-action',action:control.action});
    if(destination&&(!catalogue.has(destination)||catalogue.get(destination).platform!==frame.platform))report.errors.push({frameId:frame.id,controlId:control.id,status:'invalid-destination',destination});
   }catch(error){report.errors.push({frameId:frame.id,controlId:control.id,status:'action-exception',message:error.message});}
  }
 }
 for(const file of assets)try{await fs.access(path.join(root,'figma-preview',file));}catch{report.errors.push({file,status:'missing-source-artwork'});}report.sourceComponentAssets=assets.size;
 return report;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const report=await verifyInteractivePreview();console.log(JSON.stringify(report,null,2));if(report.errors.length)process.exitCode=1;else await fs.writeFile(path.join(root,'figma-preview/interactive-coverage.json'),JSON.stringify(report,null,2)+'\n');
}
