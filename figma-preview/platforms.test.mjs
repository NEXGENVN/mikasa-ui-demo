import test from 'node:test';
import assert from 'node:assert/strict';
import {platforms,parsePreviewHash,isWebPlatform} from './platforms.mjs';
test('preview exposes three distinct source form factors',()=>{
 assert.deepEqual(platforms.map(p=>p.id),['web','web-portrait','app']);
 assert.deepEqual(platforms.map(p=>p.label),['Web ngang','Web dọc','App']);
});
test('old entry URLs remain compatible and portrait hashes resolve independently',()=>{
 const routes={web:[['overview'],['accounts']],'web-portrait':[['overview'],['accounts']],app:[['overview'],['profile']]};
 assert.deepEqual(parsePreviewHash('#web/accounts',routes),{platform:'web',route:'accounts'});
 assert.deepEqual(parsePreviewHash('#web-portrait/accounts',routes),{platform:'web-portrait',route:'accounts'});
 assert.deepEqual(parsePreviewHash('#app/profile',routes),{platform:'app',route:'profile'});
 assert.deepEqual(parsePreviewHash('#web-portrait/profile',routes),{platform:'web-portrait',route:'overview'});
 assert.deepEqual(parsePreviewHash('#unknown/accounts',routes),{platform:'web',route:'overview'});
 assert.deepEqual(parsePreviewHash('#web-portrait/palette',routes),{platform:'web-portrait',route:'palette'});
 assert.equal(isWebPlatform('web'),true);assert.equal(isWebPlatform('web-portrait'),true);assert.equal(isWebPlatform('app'),false);
});
