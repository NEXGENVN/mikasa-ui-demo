import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {nativeFrames} from './native-frames.mjs';
import {webInteractiveFrames} from './web-interactive-controls.mjs';

test('every Web original exposes valid source hit geometry and stays in its own form factor',()=>{
 const catalogue=new Map(nativeFrames.map(f=>[f.id,f]));const frames=nativeFrames.filter(f=>['web','web-portrait'].includes(f.platform));
 assert.equal(Object.keys(webInteractiveFrames).length,frames.length);
 for(const original of frames){const frame=webInteractiveFrames[original.id];assert.ok(frame.controls.length,original.id+' has no controls');const height=frame.scrollHeight||original.height;for(const c of frame.controls){assert.equal(c.box.length,4);assert.ok(c.box.every(Number.isFinite),c.id);const [x,y,w,h]=c.box;assert.ok(x>=-.1&&y>=-.1&&w>0&&h>0&&x+w<=original.width+.1&&y+h<=height+.1,c.id+' escapes the native scroll canvas');if(c.targetId){assert.ok(catalogue.has(c.targetId),c.id+' has an unknown target');assert.equal(catalogue.get(c.targetId).platform,original.platform,c.id+' crosses form factors');}for(const asset of [c.checkedAsset,c.uncheckedAsset].filter(Boolean))assert.ok(fs.statSync(fileURLToPath(new URL(asset,import.meta.url))).size,c.id+' has missing state artwork');}}
});
test('all original system-error retries have a concrete overview fallback',()=>{
 const ids=['916:61869','916:62196','982:49773','1214:71776','1214:77736','916:62526','916:62896','987:58503','987:58734','987:59434','987:60431','987:61420','1226:90000'];for(const id of ids){const frame=webInteractiveFrames[id],control=frame.controls.find(c=>c.label==='Thử lại');assert.equal(control.action,'web.retry',id);assert.equal(control.targetId,frame.targets.overview,id);assert.ok(control.targetId,id);}
});
test('copied GIF and message source variants retain their native section semantics',()=>{
 const expected={gif:['557:36462','557:36539','458:26002','458:26078','604:35637','604:36284','714:61252','714:61306','1406:77945'],messages:['557:36322','557:36396','458:26292','458:26368','604:35783','604:36431','1000:67627','1000:67862','1000:68097','714:60465','714:61790','714:61844']};for(const [scene,ids]of Object.entries(expected))for(const id of ids)assert.equal(webInteractiveFrames[id].scene,scene,id);
 for(const id of ['557:36462','557:36322','714:60465'])assert.ok(webInteractiveFrames[id].controls.some(c=>c.action==='web.oa.add'),id+' native create button');
});
test('landscape native role-card titles select each available role',()=>{
 const frame=webInteractiveFrames['491:19159'];assert.deepEqual(frame.controls.filter(c=>c.action==='web.role.select').map(c=>c.role),['Director','Delivery Management','Branch Head','Admi KPI','Employee','User']);
});
