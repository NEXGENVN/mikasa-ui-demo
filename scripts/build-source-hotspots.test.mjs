import test from 'node:test';
import assert from 'node:assert/strict';
import {buildSourceHotspots} from './build-source-hotspots.mjs';

const frames=[{id:'1:1',name:'Nguồn',width:100,height:80},{id:'1:2',name:'Chi tiết',width:100,height:80},{id:'1:3',name:'Lịch sử',width:100,height:80}];
const click=(changes={})=>({nodeId:'2:1',nodeName:'Mở chi tiết',sourceFrameId:'1:1',visible:true,event:{interactionType:'ON_CLICK'},navigationType:'NAVIGATE',destinationId:'1:2',relativeBounds:{x:10.125,y:20.5,width:30.25,height:15.75},action:{navigationType:'NAVIGATE',connectionType:'INTERNAL_NODE'},...changes});

test('keeps exact source coordinates and a catalogue destination',()=>{
 const {hotspots,report}=buildSourceHotspots([click()],frames);
 assert.deepEqual(hotspots['1:1'],[{id:'2:1',bbox:[10.125,20.5,30.25,15.75],destinationId:'1:2',label:'Chi tiết'}]);
 assert.equal(report.includedHotspots,1);
 assert.deepEqual(Object.keys(hotspots['1:1'][0]).sort(),['bbox','destinationId','id','label']);
});

test('excludes hover, inactive nodes, component-only targets, URLs, and variable actions',()=>{
 const links=[click({event:{interactionType:'ON_HOVER'}}),click({visible:false}),click({navigationType:'SWAP_STATE',destinationId:'9:9',action:{navigationType:'SWAP_STATE',connectionType:'INTERNAL_NODE'}}),click({action:{navigationType:'NAVIGATE',connectionType:'EXTERNAL_URL',url:'https://example.com'}}),click({action:{navigationType:'NAVIGATE',connectionType:'INTERNAL_NODE',variableAction:{value:1}}})];
 const {hotspots,report}=buildSourceHotspots(links,frames);
 assert.equal(Object.keys(hotspots).length,0);
 assert.equal(report.skipped.nonClick,1);assert.equal(report.skipped.invisible,1);
 assert.equal(report.skipped.componentOnlyTarget,1);assert.equal(report.skipped.externalAction,1);assert.equal(report.skipped.unsupportedAction,1);
});

test('only actual BACK and CLOSE_OVERLAY metadata creates back actions',()=>{
 const links=[click({nodeId:'2:2',navigationType:'BACK',destinationId:null,action:{navigationType:'BACK'},relativeBounds:{x:0,y:0,width:10,height:10}}),click({nodeId:'2:3',navigationType:'CLOSE_OVERLAY',destinationId:null,action:{navigationType:'CLOSE_OVERLAY'},relativeBounds:{x:20,y:0,width:10,height:10}}),click({nodeId:'2:4',nodeName:'Quay lại',navigationType:null,destinationId:null,action:{},relativeBounds:{x:40,y:0,width:10,height:10}})];
 const {hotspots}=buildSourceHotspots(links,frames);
 assert.equal(hotspots['1:1'].length,2);
 for(const item of hotspots['1:1']){assert.equal(item.back,true);assert.equal('destinationId' in item,false);}
});

test('clamps intersecting bounds and excludes invalid or outside rectangles',()=>{
 const links=[click({relativeBounds:{x:-5,y:70,width:20,height:20}}),click({nodeId:'2:2',relativeBounds:{x:100,y:10,width:10,height:10}}),click({nodeId:'2:3',relativeBounds:{x:0,y:0,width:0,height:10}}),click({nodeId:'2:4',relativeBounds:{x:NaN,y:0,width:10,height:10}})];
 const {hotspots,report}=buildSourceHotspots(links,frames);
 assert.deepEqual(hotspots['1:1'][0].bbox,[0,70,15,10]);
 assert.equal(report.clampedHotspots,1);assert.equal(report.skipped.outsideFrame,1);assert.equal(report.skipped.invalidBounds,2);
});

test('deduplicates same target and bounds while retaining touching targets',()=>{
 const links=[click({relativeBounds:{x:0,y:0,width:10,height:10}}),click({nodeId:'2:2',relativeBounds:{x:0,y:0,width:10,height:10}}),click({nodeId:'2:3',destinationId:'1:3',relativeBounds:{x:10,y:0,width:10,height:10}})];
 const {hotspots,report}=buildSourceHotspots(links,frames);
 assert.equal(hotspots['1:1'].length,2);assert.equal(report.deduplicatedHotspots,1);assert.equal(report.conflicts.length,0);
});

test('reports different-target overlaps and excludes ambiguous hit areas',()=>{
 const links=[click({relativeBounds:{x:0,y:0,width:20,height:20}}),click({nodeId:'2:2',destinationId:'1:3',relativeBounds:{x:10,y:10,width:20,height:20}})];
 const {hotspots,report}=buildSourceHotspots(links,frames);
 assert.equal(Object.keys(hotspots).length,0);assert.equal(report.conflicts.length,1);assert.equal(report.excludedConflictingHotspots,2);
 assert.equal(report.conflicts[0].sourceFrameId,'1:1');
});
