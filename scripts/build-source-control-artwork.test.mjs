import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {sourceControlArtwork} from '../figma-preview/source-control-artwork.mjs';
import {renderNativeControlArtwork} from './build-source-control-artwork.mjs';

const blob=Uint8Array.of(0,1,0,0,0,0,0,0,0,0,2,0,0,160,65,0,0,0,0,2,0,0,160,65,0,0,160,65,0);
const guid=(localID)=>({sessionID:1,localID});
test('retains original fill and stroke outlines with native child placement',()=>{
 const message={blobs:[{bytes:blob}],nodeChanges:[{guid:guid(1),type:'SYMBOL',size:{x:20,y:20},transform:{m00:1,m01:0,m02:500,m10:0,m11:1,m12:600},fillGeometry:[{commandsBlob:0,windingRule:'NONZERO'}],fillPaints:[{type:'SOLID',color:{r:1,g:0,b:0,a:1}}]},{guid:guid(2),parentIndex:{guid:guid(1)},type:'VECTOR',transform:{m00:1,m01:0,m02:3,m10:0,m11:1,m12:4},size:{x:20,y:20},strokeGeometry:[{commandsBlob:0,windingRule:'EVENODD'}],strokePaints:[{type:'SOLID',color:{r:0,g:0,b:1,a:1}}]}]};
 const result=renderNativeControlArtwork(message,'1:1');
 assert.equal(result.width,20);assert.equal(result.height,20);
 assert.match(result.svg,/viewBox="0 0 20 20"/);
 assert.doesNotMatch(result.svg,/500|600/);
 assert.match(result.svg,/matrix\(1 0 0 1 3 4\)/);
 assert.match(result.svg,/fill="rgba\(0, 0, 255, 1\)" fill-rule="evenodd"/);
 assert.equal((result.svg.match(/<path /g)||[]).length,2);
});

test('carries native drop shadow offsets, blur radius, alpha and visibility',()=>{
 const message={blobs:[{bytes:blob}],nodeChanges:[{guid:guid(1),type:'SYMBOL',size:{x:20,y:20},fillGeometry:[{commandsBlob:0}],fillPaints:[{type:'SOLID',color:{r:1,g:1,b:1,a:1}}],effects:[{type:'DROP_SHADOW',visible:true,offset:{x:0,y:3},radius:2,spread:0,color:{r:0,g:0,b:0,a:.25},showShadowBehindNode:false}]}]};
 const result=renderNativeControlArtwork(message,'1:1');
 assert.match(result.svg,/dx="0" dy="3"/);assert.match(result.svg,/stdDeviation="1"/);assert.match(result.svg,/0\.25/);
});

test('resizes a native toggle track while keeping the thumb size and right auto-layout margin',()=>{
 const message={blobs:[{bytes:blob}],nodeChanges:[{guid:guid(1),type:'SYMBOL',size:{x:20,y:20},cornerRadius:10,stackMode:'HORIZONTAL',stackPrimaryAlignItems:'MAX',fillGeometry:[{commandsBlob:0}],fillPaints:[{type:'SOLID',color:{r:1,g:1,b:1,a:1}}]},{guid:guid(2),parentIndex:{guid:guid(1)},type:'ELLIPSE',size:{x:4,y:4},transform:{m00:1,m01:0,m02:15,m10:0,m11:1,m12:8},fillGeometry:[{commandsBlob:0}],fillPaints:[{type:'SOLID',color:{r:0,g:0,b:1,a:1}}]}]};
 const result=renderNativeControlArtwork(message,'1:1',{width:30});
 assert.equal(result.width,30);
 assert.match(result.svg,/viewBox="0 0 30 20"/);
 assert.match(result.svg,/matrix\(1 0 0 1 25 8\)/);
 assert.doesNotMatch(result.svg,/scale\(/);
});

test('uses native primitive bounds and inside stroke alignment for rounded tracks',()=>{
 const message={blobs:[],nodeChanges:[{guid:guid(1),type:'SYMBOL',size:{x:50,y:26},cornerRadius:31,strokeWeight:1,strokeAlign:'INSIDE',fillPaints:[{type:'SOLID',color:{r:1,g:1,b:1,a:1}}],strokePaints:[{type:'SOLID',color:{r:0,g:0,b:0,a:1}}]}]};
 const result=renderNativeControlArtwork(message,'1:1');
 assert.match(result.svg,/<rect x="0\.5" y="0\.5" width="49" height="25" rx="12\.5"/);
 assert.match(result.svg,/stroke-width="1"/);
});

test('content-addresses every shipped native control artwork asset',()=>{
 for(const asset of Object.values(sourceControlArtwork)){
  const bytes=fs.readFileSync(new URL('../figma-preview/'+asset.file,import.meta.url)),hash=createHash('sha256').update(bytes).digest('hex').slice(0,12);
  assert.ok(asset.file.endsWith('.'+hash+'.svg'),asset.file);
 }
});
