import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {nativeFrames} from '../figma-preview/native-frames.mjs';
import {appMessageArtwork} from '../figma-preview/app-message-artwork.mjs';
const module=await import('./build-app-message-artwork.mjs').catch(e=>e.code==='ERR_MODULE_NOT_FOUND'?{}:Promise.reject(e));
const source=id=>fs.readFileSync(new URL('../figma-preview/'+nativeFrames.find(f=>f.id===id).file,import.meta.url),'utf8');

test('source message crops retain the actual native icon paths, badge glyphs and original paints',()=>{
 assert.equal(typeof module.extractNativeMessageRegion,'function');
 const svg=source('784:48201'),icon=module.extractNativeMessageRegion(svg,[25,287,35,35]),badge=module.extractNativeMessageRegion(svg,[262,294,70,25]);
 assert.equal(icon.width,35);assert.equal(icon.height,35);assert.equal(icon.primitiveCount,3);
 assert.match(icon.svg,/#E3F7EB/);assert.match(badge.svg,/width="70" height="25"/);assert.match(badge.svg,/#E3F7EB/);
 const paths=[...badge.svg.matchAll(/<path[^>]*d="([^"]+)"/g)].map(m=>m[1]);assert.ok(paths.length>0);for(const d of paths)assert.ok(svg.includes('d="'+d+'"'),'source glyph path preserved verbatim');
});

test('partial history status keeps its actual label using native glyphs and the source success badge',()=>{
 for(const theme of ['light','dark']){
  const art=appMessageArtwork[theme].history.partial;
  assert.notEqual(art.badge.file,appMessageArtwork[theme].history.success.badge.file);
  const svg=fs.readFileSync(new URL('../figma-preview/'+art.badge.file,import.meta.url),'utf8');
  assert.match(svg,/data-source-value="Một phần"/);assert.ok(!svg.includes('<text'));
 }
});

test('OA result progress crops use the actual source paint primitives and preserve source six-pixel height',()=>{
 assert.equal(typeof module.extractNativeMessageRegion,'function');
 const svg=source('1308:6902');
 for(const box of [[32,588,129,6],[161,588,99.5,6],[260.5,588,99.5,6]]){
  const art=module.extractNativeMessageRegion(svg,box);assert.equal(art.height,6);assert.equal(art.primitiveCount,1);assert.match(art.svg,/<(?:path|rect)/);
 }
});
