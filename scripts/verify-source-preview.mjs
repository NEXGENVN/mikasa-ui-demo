import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {nativeFrames} from '../figma-preview/native-frames.mjs';
import {sourceHotspots} from '../figma-preview/source-hotspots.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const base=path.join(root,'figma-preview');
const hash=data=>createHash('sha256').update(data).digest('hex');
const ids=new Map(nativeFrames.map(f=>[f.id,f]));
assert.equal(ids.size,nativeFrames.length,'Duplicate source frame');
let originalSourceChecks=0,hotspots=0;
const assets=new Set(),platforms={web:0,'web-portrait':0,app:0};
for(const frame of nativeFrames){
 assert.equal(frame.sourceKind,'original-svg',frame.id+' needs its own source');
 assert.match(frame.file,/^source-frames\/\d+-\d+\.[a-f\d]{12}\.html$/);
 const html=await fs.readFile(path.join(base,frame.file),'utf8');
 assert.ok(frame.file.includes('.'+hash(html).slice(0,12)+'.'),frame.id+' file digest');
 assert.ok(html.includes('data-source-frame="'+frame.id+'"'),frame.id+' identity');
 assert.ok(html.includes('width:'+frame.width+'px;height:'+frame.height+'px;overflow:hidden'),frame.id+' viewport');
 const svg=html.slice(html.indexOf('<svg'),html.lastIndexOf('</svg>')+6);
 assert.ok(svg.startsWith('<svg')&&svg.endsWith('</svg>'),frame.id+' source vector');
 assert.doesNotMatch(svg,/<script\b|\son\w+\s*=|(?:href|src)=["']https?:/i,frame.id+' active/remote resource');
 try{
  const original=(await fs.readFile(path.join(root,'.audit/svg-extraction/frames',frame.id.replace(':','-')+'.svg'),'utf8')).replace(/^<\?xml[^>]+>\s*/,'');
  assert.equal(svg,original.trimEnd(),frame.id+' original vector changed');originalSourceChecks++;
 }catch(error){if(error.code!=='ENOENT')throw error;}
 for(const match of svg.matchAll(/(?:xlink:)?href="(\.\.\/assets\/[^"#]+)"/g)){
  const asset=path.resolve(base,path.dirname(frame.file),match[1]);
  assert.equal(path.dirname(asset),path.join(base,'assets'));
  assets.add(asset);
 }
 platforms[frame.platform]++;
}
for(const asset of assets){const data=await fs.readFile(asset);assert.equal(hash(data),path.parse(asset).name,'Original image changed');}
for(const [id,targets] of Object.entries(sourceHotspots)){
 const frame=ids.get(id);assert.ok(frame,'Hotspot source absent');
 for(const target of targets){
  const [x,y,w,h]=target.bbox;
  assert.ok([x,y,w,h].every(Number.isFinite)&&x>=0&&y>=0&&w>0&&h>0&&x+w<=frame.width+0.01&&y+h<=frame.height+0.01,'Invalid hotspot '+id);
  assert.ok(target.back||ids.has(target.destinationId),'Hotspot destination absent');hotspots++;
 }
}
const summary={frames:nativeFrames.length,platforms,originalSourceChecks,originalImageAssets:assets.size,prototypeHotspots:hotspots,errors:0};
console.log(JSON.stringify(summary,null,2));
