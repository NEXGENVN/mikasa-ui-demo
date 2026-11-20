import test from 'node:test';
import assert from 'node:assert/strict';
const module=await import('./build-source-component-states.mjs').catch(error=>{if(error.code==='ERR_MODULE_NOT_FOUND')return{};throw error;});
const matrix=(x=0,y=0)=>({m00:1,m01:0,m02:x,m10:0,m11:1,m12:y});
const solid=color=>({type:'SOLID',color,visible:true,opacity:1});
const white=solid({r:1,g:1,b:1,a:1}),ink=solid({r:15/255,g:23/255,b:42/255,a:1});
function commands(){const bytes=new Uint8Array(1+8+1+8+1+8+1),view=new DataView(bytes.buffer);let offset=0;for(const [op,values]of [[1,[0,0]],[2,[.5,0]],[2,[.5,.7]],[0,[]]]){bytes[offset++]=op;for(const n of values){view.setFloat32(offset,n,true);offset+=4;}}return bytes;}
const node=(id,parentId,type,name,box,raw={})=>({id,sourceId:id,parentId,type,name,bbox:box,clippedBBox:box,scrollBBox:box,visible:true,rendered:true,scrollRendered:true,globalTransform:matrix(box[0],box[1]),raw:{type,name,size:{x:box[2],y:box[3]},transform:matrix(box[0],box[1]),...raw}});
function fixture(){
 const root=node('root',null,'INSTANCE','Dropdown',[0,0,110,30],{frameMaskDisabled:true});
 const header=node('header','root','FRAME','Header',[0,0,110,30],{cornerRadius:4,fillPaints:[white],strokePaints:[ink],strokeWeight:1,strokeAlign:'INSIDE'});
 const row=node('row','root','FRAME','Option',[0,38,110,30],{cornerRadius:4,fillPaints:[white],frameMaskDisabled:false,prototypeInteractions:[{event:{interactionType:'ON_CLICK'},actions:[{navigationType:'SWAP_STATE',transitionNodeID:{sessionID:1,localID:2}}]}]});row.prototypeInteractions=row.raw.prototypeInteractions;
 const text=node('text','row','TEXT','Option text',[15,42,70,22],{fillPaints:[ink],textData:{characters:'A'},derivedTextData:{glyphs:[{commandsBlob:0,fontSize:14,position:{x:2,y:15},firstCharacter:0}],baselines:[{position:{x:0,y:15},lineHeight:20}],fontMetaData:[{key:{family:'Roboto',style:'Regular'},fontWeight:400}]}});text.text='A';
 return{message:{blobs:[{bytes:commands()}]},frame:{id:'fixture',width:110,height:200,nodes:[root,header,row,text]}};
}
test('native popup uses original glyph commands, inset source borders and nested clip paths',()=>{
 assert.equal(typeof module.renderExpandedSourceSvg,'function','Native component state exporter is required');const f=fixture(),out=module.renderExpandedSourceSvg(f.message,f.frame,{rootId:'root'});
 assert.equal(out.width,110);assert.equal(out.height,68);assert.match(out.svg,/x="0.5" y="0.5" width="109" height="29"/);assert.match(out.svg,/clipPath/);assert.match(out.svg,/matrix\(14 0 0 -14 2 15\)/);assert.doesNotMatch(out.svg,/<text\b|<script\b|on\w+=/i);assert.match(out.svg,/rgba\(15, 23, 42, 1\)/);
});
test('popup option hit areas come from native clickable row geometry rather than text bounds',()=>{
 assert.equal(typeof module.renderExpandedSourceSvg,'function');const f=fixture(),out=module.renderExpandedSourceSvg(f.message,f.frame,{rootId:'root'});assert.deepEqual(out.options.map(o=>({label:o.label,box:o.box})),[{label:'A',box:[0,38,110,30]}]);assert.deepEqual(out.headerBox,[0,0,110,30]);
});
test('native STRETCH propagates intrinsic instance width without scaling glyphs or corner radii',()=>{
 assert.equal(typeof module.renderExpandedSourceSvg,'function');const f=fixture();f.frame.nodes[0].sourceSize=[123,30];f.frame.nodes[0].masterSize=[110,30];f.frame.nodes[0].bbox[2]=123;f.frame.nodes[0].raw.size.x=123;f.frame.nodes[1].raw.stackChildAlignSelf='STRETCH';f.frame.nodes[2].raw.stackChildAlignSelf='STRETCH';const out=module.renderExpandedSourceSvg(f.message,f.frame,{rootId:'root'});assert.equal(out.width,123);assert.equal(out.options[0].box[2],123);assert.match(out.svg,/width="122" height="29" rx="3.5"/);assert.match(out.svg,/matrix\(14 0 0 -14 2 15\)/);
});
test('off-fold tiles include the full native control while clipping remains a runtime decision',()=>{
 assert.equal(typeof module.renderExpandedSourceSvg,'function');const f=fixture();for(const n of f.frame.nodes){n.bbox[0]+=3135;n.bbox[1]+=1022;n.globalTransform=matrix(n.bbox[0],n.bbox[1]);}const out=module.renderExpandedSourceSvg(f.message,f.frame,{rootId:'header'});assert.equal(out.width,110);assert.equal(out.height,30);assert.deepEqual(out.sourceBox,[3135,1022,110,30]);assert.match(out.svg,/height="30"/);
});
test('an inner shadow stays over the source fill and does not grow the asset viewport',()=>{
 const f=fixture();f.frame.nodes[1].raw.effects=[{type:'INNER_SHADOW',radius:2,offset:{x:0,y:1},spread:0,color:{r:0,g:0,b:0,a:.15},visible:true}];const out=module.renderExpandedSourceSvg(f.message,f.frame,{rootId:'root'});assert.equal(out.height,68);assert.match(out.svg,/operator="out"/);assert.match(out.svg,/<feMergeNode in="SourceGraphic"\/><feMergeNode in="shadow0"/);
});
test('clipped numeric wheels cannot enlarge the native 46px counter component asset',()=>{
 const f=fixture();f.frame.nodes[0].raw.size={x:110,y:46};f.frame.nodes[0].bbox[3]=46;f.frame.nodes[0].raw.frameMaskDisabled=false;f.frame.nodes[2].raw.size.y=194;f.frame.nodes[2].bbox[3]=194;const out=module.renderExpandedSourceSvg(f.message,f.frame,{rootId:'root'});assert.equal(out.height,46);
});
test('opened components retain the actual source instance header rather than a master placeholder',()=>{
 const opened=fixture(),closed=fixture();const headerText=node('head-text','header','TEXT','Header text',[15,4,70,22],{fillPaints:[ink],derivedTextData:opened.frame.nodes[3].raw.derivedTextData});headerText.text='Master';opened.frame.nodes.push(headerText);closed.frame.nodes.push({...headerText,text:'Actual instance',raw:{...headerText.raw,textData:{characters:'Actual instance'}}});const out=module.renderExpandedSourceSvg(opened.message,opened.frame,{rootId:'root',sourceHeader:closed.frame});assert.equal(out.visibleTexts.find(n=>n.id==='head-text').text,'Actual instance');
});
test('radio-card state tiles preserve native dimensions and omit every child label',()=>{
 const f=fixture(),out=module.renderExpandedSourceSvg(f.message,f.frame,{rootId:'header',backgroundOnly:true,paintFrom:{fillPaints:[white],strokePaints:[ink],strokeAlign:'INSIDE',strokeWeight:2,cornerRadius:4}});assert.equal(out.width,110);assert.equal(out.height,30);assert.match(out.svg,/stroke-width="2"/);assert.doesNotMatch(out.svg,/matrix\(14 0 0 -14/);
});
test('option hit areas honor the original panel clip when a nested row is one pixel wider',()=>{
 const f=fixture(),panel=node('panel','root','FRAME','Options panel',[0,38,110,30],{frameMaskDisabled:false});f.frame.nodes[2].parentId='panel';f.frame.nodes[2].raw.size.x=111;f.frame.nodes[2].bbox[2]=111;f.frame.nodes.splice(2,0,panel);const out=module.renderExpandedSourceSvg(f.message,f.frame,{rootId:'root'});assert.equal(out.width,110);assert.equal(out.options[0].box[2],110);
});
