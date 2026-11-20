import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {nativeFrames} from '../figma-preview/native-frames.mjs';
import {appInteractiveFrames} from '../figma-preview/app-interactive-controls.mjs';
import {sourceComponentCounters,sourceComponentPopups} from '../figma-preview/source-component-states.mjs';
import {sourceGlyphLibrary} from '../figma-preview/source-glyph-library.mjs';
import {generateGlyphPaths} from '../figma-preview/source-glyphs.mjs';
import {matchSourceTextSlot,canonicalPath} from '../figma-preview/source-text-slots.mjs';
import {readSourceSvgPaths} from './source-svg-paths.mjs';
const generated=(await import('../figma-preview/dark-app-artwork.mjs').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return{};throw e;})).darkAppArtwork||{};
const builder=await import('./build-dark-app-artwork.mjs').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return{};throw e;});
const read=file=>fs.readFile(new URL('../figma-preview/'+file,import.meta.url),'utf8');
const sourceFrame=async id=>{const f=nativeFrames.find(f=>f.id===id);return(await read(f.file)).match(/<svg[\s\S]*<\/svg>/)[0];};
const numberFont={family:'Roboto',style:'Medium',weight:500,size:16,lineHeight:24,baseline:17.46875,align:'CENTER',fontKey:'Roboto|Medium|500'};
function glyphPaints(svg,value,font=numberFont){const parsed=readSourceSvgPaths(svg),g=generateGlyphPaths(sourceGlyphLibrary,{...font,value,x:0,baseline:font.baseline,width:130,height:50}),match=matchSourceTextSlot({box:[0,0,130,50],font,text:value,outline:g.d},parsed.paths);assert.equal(match.status,'matched');return match.paths.map(p=>p.fill);}

test('changed dark counter digits preserve the light ink of the exported dark count',async()=>{
 for(const [value,state]of Object.entries(generated.counters?.[5]?.states||sourceComponentCounters.dark.states))assert.deepEqual(glyphPaints(await read(state.file),value),['#F8FAFF']);
});

test('each enabled Dark decrement symbol stays visible on the dark surface after count changes',async()=>{
 for(const counter of Object.values(generated.counters))for(const state of Object.values(counter.states)){
  const control=state.controls.find(c=>c.action==='app.oa.minus');if(!control)continue;const svg=await read(state.file),[x,y,w,h]=control.box,minus=readSourceSvgPaths(svg).paths.filter(p=>p.bounds[0]>=x&&p.bounds[1]>=y&&p.bounds[0]+p.bounds[2]<=x+w&&p.bounds[1]+p.bounds[3]<=y+h);assert.equal(minus.length,1);
  const tag=[...svg.matchAll(/<path\b[^>]*>/g)].map(m=>m[0]).find(t=>t.includes('d="'+minus[0].d+'"'));assert.ok(/(?:fill|stroke)="#F8FAFF"/.test(tag),'decrement must use the reference light paint');
 }
});

test('permission cap artwork uses its actual exported digit and minus geometry without a plus',async()=>{
 for(const [cap,id]of [[2,'1432:10827'],[3,'1432:10696'],[4,'1432:10566'],[5,'1430:86331']]){
  const state=generated.counters?.[cap]?.states[String(cap)];assert.ok(state,'Missing exported permission cap '+cap);
  assert.equal(state.width,130);assert.equal(state.height,50);assert.equal(state.controls.some(c=>c.action==='app.oa.plus'),false);
  const a=readSourceSvgPaths(await read(state.file)),b=readSourceSvgPaths(await sourceFrame(id)),within=p=>p.bounds[0]>=244&&p.bounds[1]>=406&&p.bounds[0]+p.bounds[2]<=374&&p.bounds[1]+p.bounds[3]<=456;
  const expected=b.paths.filter(within).map(p=>({d:canonicalPath(p.d,{matrix:{...p.matrix,e:p.matrix.e-244,f:p.matrix.f-406}}),fill:p.fill}));
  assert.equal(a.paths.length,expected.length);for(let i=0;i<a.paths.length;i++){assert.equal(a.paths[i].fill,expected[i].fill);const actual=canonicalPath(a.paths[i].d,{matrix:a.paths[i].matrix});assert.equal(actual.length,expected[i].d.length);for(let j=0;j<actual.length;j++){assert.equal(actual[j][0],expected[i].d[j][0]);for(let k=1;k<actual[j].length;k++)assert.ok(Math.abs(actual[j][k]-expected[i].d[j][k])<.00001);}}
 }
});

test('opening each dark gender menu retains its exact exported header while preserving the supplied menu rows',async()=>{
 const frames=nativeFrames.filter(f=>f.platform==='app'&&f.theme==='dark');let count=0;
 for(const f of frames)for(const c of appInteractiveFrames[f.id].controls.filter(c=>c.field==='app.profile.gender'&&c.popup)){
  count++;const popup=generated.popups?.[c.id]||c.popup,svg=await read(popup.file),source=readSourceSvgPaths(await sourceFrame(f.id)),actual=readSourceSvgPaths(svg),[x,y,w,h]=c.box;
  const header=source.paths.filter(p=>p.bounds[0]>=x&&p.bounds[1]>=y&&p.bounds[0]+p.bounds[2]<=x+w&&p.bounds[1]+p.bounds[3]<=y+h),newHeader=actual.paths.filter(p=>p.bounds[0]>=0&&p.bounds[1]>=0&&p.bounds[0]+p.bounds[2]<=w&&p.bounds[1]+p.bounds[3]<=h);
  assert.deepEqual(newHeader.map(p=>p.fill),header.map(p=>p.fill));assert.deepEqual(newHeader.map(p=>p.d),header.map(p=>p.d));
  for(let i=0;i<header.length;i++){const expected={...header[i].matrix,e:header[i].matrix.e-x,f:header[i].matrix.f-y};for(const key of ['a','b','c','d','e','f'])assert.ok(Math.abs(newHeader[i].matrix[key]-expected[key])<.00001);}
  assert.match(svg,/<rect x="0.5" y="0.5" width="104" height="39" rx="7.5" fill="#292929"\/>/);assert.match(svg,/stroke="#555555"/);
  const nativePopup=sourceComponentPopups[c.id],before=readSourceSvgPaths(await read(nativePopup.file)).paths.filter(p=>p.bounds[1]>=40),after=actual.paths.filter(p=>p.bounds[1]>=40);assert.deepEqual(after.map(p=>({d:p.d,matrix:p.matrix,fill:p.fill})),before.map(p=>({d:p.d,matrix:p.matrix,fill:p.fill})));assert.deepEqual(popup.options,nativePopup.options);
 }
 assert.equal(count,10);assert.equal(Object.keys(generated.popups||{}).length,10);
});

test('dark artwork build writes content-addressed copies and retains original assets and exports',async()=>{
 assert.equal(typeof builder.buildDarkAppArtwork,'function');const root=await fs.mkdtemp(path.join(os.tmpdir(),'mikasa-dark-art-')),directory=path.join(root,'figma-preview/assets/interactive-app');await fs.mkdir(directory,{recursive:true});await fs.writeFile(path.join(directory,'retained.svg'),'<svg/>');
 try{const result=await builder.buildDarkAppArtwork({root,sourceRoot:path.resolve('figma-preview')});assert.deepEqual(Object.keys(result.counters),['2','3','4','5']);assert.equal(Object.keys(result.popups).length,10);
  for(const art of [...Object.values(result.counters).flatMap(c=>Object.values(c.states)),...Object.values(result.popups)]){const contents=await fs.readFile(path.join(root,'figma-preview',art.file),'utf8'),hash=createHash('sha256').update(contents).digest('hex').slice(0,12);assert.ok(art.file.endsWith('.'+hash+'.svg'));}
  assert.equal(await fs.readFile(path.join(directory,'retained.svg'),'utf8'),'<svg/>');
 }finally{assert.ok(!path.relative(os.tmpdir(),root).startsWith('..'));await fs.rm(root,{recursive:true,force:true});}
});
