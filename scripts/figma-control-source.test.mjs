import test from 'node:test';
import assert from 'node:assert/strict';
import {expandSourceFrames} from './figma-control-source.mjs';

const guid=id=>{const [sessionID,localID]=id.split(':').map(Number);return {sessionID,localID};};
const transform=(x,y)=>({m00:1,m01:0,m02:x,m10:0,m11:1,m12:y});
const node=(id,type,parent,x,y,width,height,extra={})=>({guid:guid(id),type,name:id,...(parent?{parentIndex:{guid:guid(parent),position:id}}:{}),size:{x:width,y:height},transform:transform(x,y),...extra});
function fixture(){
 const nodes=[
  node('1:1','FRAME',null,100,200,300,200,{frameMaskDisabled:false}),
  node('1:2','INSTANCE','1:1',20,30,100,30,{symbolData:{symbolID:guid('2:1'),symbolOverrides:[{guidPath:{guids:[guid('9:2')]},textData:{characters:'Actual'},fontSize:14}],uniformScaleFactor:1},derivedSymbolData:[{guidPath:{guids:[guid('9:2')]},size:{x:50,y:20},transform:transform(10,5),derivedTextData:{baselines:[{position:{x:0,y:15}}],fontMetaData:[{key:{family:'Roboto',style:'Medium'},fontWeight:500}],glyphs:[{commandsBlob:42,position:{x:0,y:15},fontSize:14}]}}]}),
  node('2:1','SYMBOL',null,900,900,100,30,{frameMaskDisabled:false}),
  node('2:2','TEXT','2:1',4,4,20,10,{overrideKey:guid('9:2'),textData:{characters:'Template'},fontName:{family:'Roboto',style:'Regular'},fontSize:12}),
  node('2:3','TEXT','2:1',0,40,60,20,{textData:{characters:'Clipped'}})
 ];
 return {message:{nodeChanges:nodes},frames:[{id:'1:1',name:'Fixture',width:300,height:200}]};
}

test('instance aliases apply actual text and derived geometry without master canvas offsets',()=>{
 const [frame]=expandSourceFrames(fixture());
 const text=frame.nodes.find(n=>n.sourceId==='2:2');
 assert.equal(text.text,'Actual');
 assert.deepEqual(text.bbox,[30,35,50,20]);
 assert.equal(text.id,'1:1;1:2;2:2');
 assert.equal(text.parentId,'1:1;1:2');
 assert.equal(text.font.style,'Medium');
 assert.equal(text.font.weight,500);
 assert.equal(text.font.baseline,15);
});

test('closed component clips its options while keeping the original node bounds',()=>{
 const [frame]=expandSourceFrames(fixture());
 const option=frame.nodes.find(n=>n.sourceId==='2:3');
 assert.deepEqual(option.bbox,[20,70,60,20]);
 assert.equal(option.rendered,false);
 assert.equal(option.clippedBBox[3],0);
});

test('requested glyph geometry is resolved from the instance rather than its template',()=>{
 const [frame]=expandSourceFrames({...fixture(),includeTextGeometry:true});
 assert.equal(frame.nodes.find(n=>n.sourceId==='2:2').textGeometry.glyphs[0].commandsBlob,42);
});

test('nested variant assignments merge with inherited property values and aliases',()=>{
 const f=fixture();
 f.message.nodeChanges.push(
  node('1:3','INSTANCE','1:1',150,40,100,40,{symbolData:{symbolID:guid('3:1'),symbolOverrides:[{guidPath:{guids:[guid('3:2')]},overriddenSymbolID:guid('4:1'),componentPropAssignments:[{defID:guid('8:3'),varValue:{value:{boolValue:true}}}]}]}}),
  node('3:1','SYMBOL',null,1000,1000,100,40),
  node('3:2','INSTANCE','3:1',5,6,90,30,{symbolData:{symbolID:guid('5:1')},componentPropAssignments:[{defID:guid('8:2'),varValue:{value:{textDataValue:{characters:'Bound label'}}}}]}),
  node('4:1','SYMBOL',null,2000,2000,90,30,{componentPropDefs:[{id:guid('8:2'),parentPropDefId:guid('8:1')},{id:guid('8:3')}]}),
  node('4:2','TEXT','4:1',7,8,70,20,{textData:{characters:'Default'},parameterConsumptionMap:{entries:[{variableField:'TEXT_DATA',variableData:{value:{propRefValue:{defId:guid('8:2')}}}},{variableField:'VISIBLE',variableData:{value:{propRefValue:{defId:guid('8:3')}}}}]}}),
  node('5:1','SYMBOL',null,0,0,90,30)
 );
 const [frame]=expandSourceFrames(f);
 const text=frame.nodes.find(n=>n.sourceId==='4:2');
 assert.equal(text.text,'Bound label');
 assert.deepEqual(text.bbox,[162,54,70,20]);
 assert.equal(text.rendered,true);
 assert.equal(frame.nodes.some(n=>n.sourceId==='5:1'),false);
});

test('rotated nodes expose their transformed bounding rectangle',()=>{
 const f=fixture();f.message.nodeChanges.push(node('1:4','FRAME','1:1',0,0,20,10,{transform:{m00:0,m01:-1,m02:100,m10:1,m11:0,m12:50}}));
 const [frame]=expandSourceFrames(f);
 assert.deepEqual(frame.nodes.find(n=>n.sourceId==='1:4').bbox,[90,50,10,20]);
});

test('percentage line heights become pixels and retain native alignment',()=>{
 const f=fixture();f.message.nodeChanges.push(node('1:5','TEXT','1:1',10,150,100,24,{fontSize:16,fontName:{family:'Roboto',style:'Regular'},lineHeight:{value:150,units:'PERCENT'},textAlignHorizontal:'RIGHT',textData:{characters:'Aligned'}}));
 const [frame]=expandSourceFrames(f);const text=frame.nodes.find(n=>n.sourceId==='1:5');assert.equal(text.font.lineHeight,24);assert.equal(text.font.align,'RIGHT');
});
test('guid paths omit ordinary frame ancestors inside a component instance',()=>{
 const f=fixture();f.message.nodeChanges.push(node('2:4','FRAME','2:1',10,0,80,30),node('2:5','TEXT','2:4',0,4,60,15,{overrideKey:guid('9:5'),textData:{characters:'Template name'}}));
 f.message.nodeChanges.find(n=>n.guid.localID===2&&n.guid.sessionID===1).symbolData.symbolOverrides.push({guidPath:{guids:[guid('9:5')]},textData:{characters:'Nguyễn Minh Anh'}});
 const [frame]=expandSourceFrames(f);assert.equal(frame.nodes.find(n=>n.sourceId==='2:5').text,'Nguyễn Minh Anh');
});
test('actual TK2 account-cell historical keys resolve Nguyễn Minh Anh and minhanh_01 typography',()=>{
 const f={frames:[{id:'64:3513',width:1440,height:1024}],message:{nodeChanges:[
  node('64:3513','FRAME',null,3008,7616,1440,1024),
  node('1182:78729','INSTANCE','64:3513',484,366,201,43,{symbolData:{symbolID:guid('3:420'),symbolOverrides:[{guidPath:{guids:[guid('677:26818')]},size:{x:201,y:43}},{guidPath:{guids:[guid('681:26826')]},fontSize:13,fontName:{family:'Roboto',style:'Medium'},textData:{characters:'Nguyễn Minh Anh'}},{guidPath:{guids:[guid('681:26827')]},fontSize:12,fontName:{family:'Roboto',style:'Regular'},textData:{characters:'minhanh_01'}}]},derivedSymbolData:[{guidPath:{guids:[guid('681:26825')]},transform:transform(24,5),size:{x:101,y:33}},{guidPath:{guids:[guid('681:26826')]},size:{x:103,y:15},derivedTextData:{baselines:[{position:{x:0,y:11.943359375}}],glyphs:[{fontSize:13}],fontMetaData:[{key:{family:'Roboto',style:'Medium'},fontWeight:500}]}},{guidPath:{guids:[guid('681:26827')]},transform:transform(0,19),size:{x:66,y:14}}]}),
  node('3:420','SYMBOL',null,0,0,201,43,{overrideKey:guid('677:26818')}),node('3:430','FRAME','3:420',142,6.5,101,30,{overrideKey:guid('681:26825')}),node('3:431','TEXT','3:430',0,0,69,14,{overrideKey:guid('681:26826'),fontName:{family:'Roboto',style:'Regular'},fontSize:12,textData:{characters:'Super Admin'}}),node('3:432','TEXT','3:430',0,18,90,14,{overrideKey:guid('681:26827'),textData:{characters:'admin@gmail.com'}})
 ]}};
 const [frame]=expandSourceFrames(f);const name=frame.nodes.find(n=>n.sourceId==='3:431'),username=frame.nodes.find(n=>n.sourceId==='3:432');assert.equal(name.text,'Nguyễn Minh Anh');assert.deepEqual(name.bbox,[508,371,103,15]);assert.equal(name.font.style,'Medium');assert.equal(name.font.size,13);assert.equal(name.font.baseline,11.943359375);assert.equal(username.text,'minhanh_01');assert.deepEqual(username.bbox,[508,390,66,14]);
});
test('scroll bounds expose source content below the root viewport while preserving component clipping',()=>{
 const f=fixture();f.message.nodeChanges.push(node('1:6','FRAME','1:1',20,220,100,40,{name:'Below-fold input'}));const [frame]=expandSourceFrames(f);const below=frame.nodes.find(n=>n.sourceId==='1:6'),closedOption=frame.nodes.find(n=>n.sourceId==='2:3');assert.equal(below.rendered,false);assert.equal(below.scrollRendered,true);assert.deepEqual(below.scrollBBox,[20,220,100,40]);assert.equal(closedOption.scrollRendered,false);
});
test('an explicit native component state keeps source position and width but uses open-state height and paint geometry',()=>{
 const f=fixture();f.message.nodeChanges.push(node('6:1','SYMBOL',null,0,0,120,80,{frameMaskDisabled:true,fillGeometry:[{commandsBlob:99}],strokePaints:[{type:'SOLID',color:{r:0,g:0,b:1,a:1}}]}),node('6:2','TEXT','6:1',5,45,70,20,{textData:{characters:'Native option'}}));
 const [frame]=expandSourceFrames({...f,includeRaw:true,instanceStateOverrides:{'1:1;1:2':{masterId:'6:1'}}});const instance=frame.nodes.find(n=>n.sourceId==='1:2'),option=frame.nodes.find(n=>n.sourceId==='6:2');assert.deepEqual(instance.bbox,[20,30,100,80]);assert.deepEqual(instance.masterSize,[120,80]);assert.deepEqual(instance.sourceSize,[100,30]);assert.equal(instance.raw.fillGeometry[0].commandsBlob,99);assert.equal(instance.raw.strokePaints[0].color.b,1);assert.equal(option.rendered,true);assert.equal(option.text,'Native option');
});
