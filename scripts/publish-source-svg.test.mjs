import test from 'node:test';import assert from 'node:assert/strict';import {assembleSourceCatalogue} from './publish-source-svg.mjs';
test('canonical source vectors take precedence and unmatched prototype screens remain explicit',()=>{
 const inventory=[{id:'1:1',name:'Source',width:390,height:844,platform:'app'}];
 const result=assembleSourceCatalogue({inventory,compiled:[{id:'1:1',file:'native/1-1.1234abcd.html'}],svgFrames:[{id:'1:1',publicFile:'source-frames/1-1.1234abcd1234.svg',width:390,height:844}],flowFrames:[{id:'2:2',name:'Exact copy',width:390,height:844,equivalentSourceIds:['1:1']},{id:'3:3',name:'Different',width:390,height:844,equivalentSourceIds:[]}],flows:new Map()});
 assert.equal(result[0].sourceKind,'original-svg');assert.equal(result[1].sourceKind,'exact-equivalent-svg');assert.equal(result[1].file,result[0].file);assert.equal(result[2].file,null);
});
