import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {nativeFrames} from '../figma-preview/native-frames.mjs';
const source=await import('./build-app-flow-artwork.mjs').catch(error=>{if(error.code==='ERR_MODULE_NOT_FOUND')return{};throw error;});
const cases=[['1635:109001',[28,532,18,18],true],['1635:109001',[28,565,18,18],false],['1635:105774',[28,617,18,18],true],['1635:105774',[28,584,18,18],false]];
test('send-mode assets preserve exact original Flow paints and inset geometry across both confirmation states',async()=>{
 assert.equal(typeof source.extractSourceSendModeArtwork,'function');
 const variants={};
 for(const [id,box,checked]of cases){const frame=nativeFrames.find(f=>f.id===id),html=await fs.readFile(new URL('../figma-preview/'+frame.file,import.meta.url),'utf8');
  const asset=source.extractSourceSendModeArtwork(html,{box});
  assert.equal(asset.checked,checked);assert.equal(asset.width,18);assert.equal(asset.height,18);
  assert.match(asset.svg,/<rect x="0.5" y="0.5" width="17" height="17" rx="8.5" fill="white"\/>/);
  assert.match(asset.svg,new RegExp('stroke="'+(checked?'#0F4D88':'#A9A9A9')+'"'));assert.doesNotMatch(asset.svg,/#195CFA/i);
  if(checked)assert.match(asset.svg,/<circle cx="9" cy="9" r="4" fill="#0F4D88"\/>/);
  if(variants[checked])assert.equal(asset.svg,variants[checked]);variants[checked]=asset.svg;
 }
});
test('narrow App artwork build writes hashed assets without deleting existing control assets',async()=>{
 assert.equal(typeof source.buildAppFlowArtwork,'function');
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'mikasa-flow-art-'));
 try{
  const output=path.join(root,'figma-preview/assets/interactive-app');await fs.mkdir(output,{recursive:true});
  await fs.writeFile(path.join(output,'retained.svg'),'<svg/>');
  const result=await source.buildAppFlowArtwork({root,sourceRoot:path.resolve('figma-preview')});
  assert.deepEqual(Object.keys(result).sort(),['540:24477@50x26','540:24478@50x26','557:34960@48x26','557:34966@48x26','604:31543','604:31545']);
  for(const asset of Object.values(result)){assert.match(asset.file,/\.([a-f0-9]{12})\.svg$/);await fs.access(path.join(root,'figma-preview',asset.file));}
  assert.equal(await fs.readFile(path.join(output,'retained.svg'),'utf8'),'<svg/>');
 }finally{assert.ok(!path.relative(os.tmpdir(),root).startsWith('..'));await fs.rm(root,{recursive:true,force:true});}
});
test('App switches preserve original Flow paints, native shadows and 22px thumbs across actual widths',async()=>{
 assert.equal(typeof source.extractSourceToggleArtwork,'function');
 for(const [id,box,checked]of [['1635:110138',[316,471,50,26],false],['1635:112462',[311,365,48,26],true]]){
  const frame=nativeFrames.find(f=>f.id===id),html=await fs.readFile(new URL('../figma-preview/'+frame.file,import.meta.url),'utf8');
  for(const width of [48,50]){const art=source.extractSourceToggleArtwork(html,{box,checked,width});
   assert.equal(art.width,width);assert.equal(art.height,26);assert.match(art.svg,new RegExp('width="'+(width-1)+'" height="25" rx="12.5"'));assert.match(art.svg,/stroke="#E8F0FF"/);
   assert.match(art.svg,new RegExp('<circle cx="'+(checked?width-16:16)+'" cy="13" r="11" fill="'+(checked?'#0F4D88':'#64748B')+'"'));
   assert.match(art.svg,/<feOffset dy="3"\/>/);assert.match(art.svg,/<feGaussianBlur stdDeviation="1"\/>/);assert.doesNotMatch(art.svg,/#195CFA|fill="black"/i);
  }
 }
});
