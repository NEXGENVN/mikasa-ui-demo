import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {sourceComponentPopups as popups,sourceComponentCounters as counters,sourceComponentExtraArtwork as extra,sourceComponentCards as cards} from './source-component-states.mjs';
import {readSourceSvgPaths} from '../scripts/source-svg-paths.mjs';

test('every OA state retains the supplied SVG button paint and light plus sign',async()=>{
 for(const theme of Object.values(counters))for(const state of Object.values(theme.states)){
  const plus=state.controls.find(c=>c.id==='plus');if(!plus)continue;
  const svg=await fs.readFile(new URL(state.file,import.meta.url),'utf8');assert.match(svg,/fill="#0F4D88"/);assert.doesNotMatch(svg,/rgba\(25, 92, 250, 1\)/);
  const paths=readSourceSvgPaths(svg).paths.filter(p=>p.bounds[0]>=plus.box[0]&&p.bounds[1]>=plus.box[1]&&p.bounds[0]+p.bounds[2]<=plus.box[0]+plus.box[2]&&p.bounds[1]+p.bounds[3]<=plus.box[1]+plus.box[3]);
  assert.ok(paths.length);assert.ok(paths.every(p=>p.fill==='#F8FAFF'));
 }
});

test('native gender, sort, role and preference popups retain their supplied option labels and hit areas',()=>{
 const gender=Object.entries(popups).find(([id,p])=>id.startsWith('843:50360;')&&p.masterId==='836:49232')?.[1];assert.ok(gender);assert.deepEqual(gender.options.map(o=>o.label),['Giới tính','Nam','Nữ','Khác']);
 const sort=Object.entries(popups).find(([id])=>id.startsWith('784:48201;'))?.[1];assert.ok(sort.options.some(o=>o.value==='newest'));assert.ok(sort.options.some(o=>o.value==='oldest'));
 const role=Object.values(popups).find(p=>p.masterId==='619:39075');assert.ok(role.options.some(o=>o.label==='QL hệ thống'));
 for(const p of Object.values(popups))for(const o of p.options){const[x,y,w,h]=o.box;assert.ok(x>=-.1&&y>=-.1&&w>0&&h>0&&x+w<=p.width+.1&&y+h<=p.height+.1,p.file+' '+o.label);}
});
test('counter states use actual clipped glyph values and their conditional native button geometry',()=>{
 for(const theme of ['light','dark']){assert.deepEqual(Object.keys(counters[theme].states),['1','2','3','4','5']);for(const [value,state]of Object.entries(counters[theme].states)){assert.equal(state.width,130);assert.ok(state.height===46||state.height===50);assert.equal(state.controls.find(c=>c.id==='count').value,value);assert.equal(state.controls.some(c=>c.id==='minus'),Number(value)>1);assert.equal(state.controls.some(c=>c.id==='plus'),Number(value)<5);for(const c of state.controls){const[x,y,w,h]=c.box;assert.ok(x>=0&&y>=0&&x+w<=state.width+.1&&y+h<=state.height+.1);}}}
});
test('every generated artifact is content-hashed static SVG with finite dimensions and no text approximation',async()=>{
 const assets=new Map();for(const p of Object.values(popups))assets.set(p.file,[p.width,p.height]);for(const theme of Object.values(counters))for(const s of Object.values(theme.states))assets.set(s.file,[s.width,s.height]);for(const regions of Object.values(extra))for(const r of regions)assets.set(r.file,r.box.slice(2));for(const c of Object.values(cards))for(const file of [c.checkedAsset,c.uncheckedAsset])assets.set(file,c.box.slice(2));
 assert.ok(assets.size>400);for(const[file,[width,height]]of assets){assert.match(file,/\.[a-f0-9]{12}\.svg$/);const svg=await fs.readFile(new URL(file,import.meta.url),'utf8');assert.equal(Number(svg.match(/\bwidth="([\d.]+)"/)[1]),width,file);assert.equal(Number(svg.match(/\bheight="([\d.]+)"/)[1]),height,file);assert.doesNotMatch(svg,/<script\b|<foreignObject\b|<text\b|\son\w+=|NaN|Infinity/i,file);}
});
test('off-fold provider inputs remain complete native fields and role-card state backgrounds omit child labels',async()=>{
 const key=extra['557:36756'].find(r=>r.box[1]===1022&&r.box[3]===40);assert.ok(key);assert.equal(key.clipAtFold,true);assert.match(await fs.readFile(new URL(key.file,import.meta.url),'utf8'),/height="40"/);
 assert.ok(Object.keys(cards).length>=30);for(const c of Object.values(cards)){const[on,off]=await Promise.all([c.checkedAsset,c.uncheckedAsset].map(file=>fs.readFile(new URL(file,import.meta.url),'utf8')));assert.notEqual(on,off);assert.doesNotMatch(on,/<path\b/,'Role-card text/radio children must remain in the original source only.');}
});
