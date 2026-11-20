import test from 'node:test';
import assert from 'node:assert/strict';
import {appMessageArtwork} from './app-message-artwork.mjs';
const module=await import('./app-message-drawing.mjs').catch(e=>e.code==='ERR_MODULE_NOT_FOUND'?{}:Promise.reject(e));
const I={a:1,b:0,c:0,d:1,e:0,f:0};
class Element{
 constructor(name,box){this.localName=name;this.box=box;this.attrs=new Map();this.children=[];}
 setAttribute(k,v){this.attrs.set(k,String(v));}getAttribute(k){return this.attrs.get(k)??null;}removeAttribute(k){this.attrs.delete(k);}
 append(...nodes){for(const n of nodes){n.parentNode=this;this.children.push(n);}}
 insertBefore(n,anchor){n.parentNode=this;this.children.splice(this.children.indexOf(anchor),0,n);}
 remove(){if(this.parentNode)this.parentNode.children=this.parentNode.children.filter(n=>n!==this);this.parentNode=null;}
 contains(n){return this===n||this.children.some(c=>c.contains(n));}closest(){return null;}
 getBBox(){const b=this.box||[0,0,0,0];return{x:b[0],y:b[1],width:b[2],height:b[3]};}getCTM(){return I;}
 querySelectorAll(selector){const all=this.children.flatMap(n=>[n,...n.querySelectorAll('*')]);return selector==='*'?all:all.filter(n=>selector.split(',').includes(n.localName));}
}
function fixture(detail=false){
 const svg=new Element('svg'),doc={querySelector:()=>svg,createElementNS:(ns,name)=>new Element(name)};svg.viewBox={baseVal:{x:0,y:0}};
 const row={id:'row',rowIndex:0,box:[12,275,358,65],iconBox:[25,287,35,35],badgeBox:[262,294,70,25]},oaRows=Array.from({length:5},(_,i)=>({id:'oa'+i,rowIndex:i,box:[32,604+i*28,326,20],badgeBox:[288,604+i*28,70,20]})),progress={id:'progress',box:[32,588,328,6]};
 const boxes=detail?[...oaRows.map(r=>r.badgeBox),progress.box]:[row.iconBox,row.badgeBox];
 const originals=boxes.map(box=>new Element('path',box));svg.append(...originals);
 const frame={id:'fixture',theme:'light',messageDrawing:detail?{history:[],oaRows,progress}:{history:[row],oaRows:[]}},session={values:{},dirty:new Set()};
 return {svg,doc,frame,session,originals};
}

test('history keeps the original source untouched until explicit projection, then replaces both status icon and badge',()=>{
 assert.equal(typeof module.mountAppMessageDrawing,'function');
 const f=fixture(),drawing=module.mountAppMessageDrawing({document:f.doc,frame:f.frame,baseURI:'https://example.test/'});
 drawing.project(f.session);assert.ok(f.originals.every(n=>n.getAttribute('opacity')===null));assert.ok(drawing.entries.every(e=>e.group.getAttribute('display')==='none'));
 Object.assign(f.session.values,{'app.history.projected':true,'app.history.0.state':'failed','app.history.0.visible':true});drawing.project(f.session);
 assert.ok(f.originals.every(n=>n.getAttribute('opacity')==='0'));
 assert.deepEqual(drawing.entries.map(e=>e.image.getAttribute('href')),['https://example.test/'+appMessageArtwork.light.history.failed.icon.file,'https://example.test/'+appMessageArtwork.light.history.failed.badge.file]);
 drawing.project(f.session);assert.ok(f.originals.every(n=>n.getAttribute('opacity')==='0'));
 drawing.restore();assert.ok(f.originals.every(n=>n.getAttribute('opacity')===null));
});

test('two OA results hide unused badges and fill the native bar in their actual one-to-one ratio',()=>{
 assert.equal(typeof module.mountAppMessageDrawing,'function');const f=fixture(true),drawing=module.mountAppMessageDrawing({document:f.doc,frame:f.frame,baseURI:'https://example.test/'});
 Object.assign(f.session.values,{'app.detail.projected':true,'app.detail.successCount':'1 Hoàn thành','app.detail.failedCount':'1 Thất bại','app.detail.pendingCount':'0 Chờ gửi','app.detail.oa.0.state':'success','app.detail.oa.1.state':'failed'});
 for(let i=0;i<5;i++)f.session.values[`app.detail.oa.${i}.visible`]=i<2;
 drawing.project(f.session);
 assert.deepEqual(drawing.entries.map(e=>e.group.getAttribute('display')),['inline','inline','none','none','none']);
 const rects=drawing.progress.segments;assert.deepEqual(rects.map(r=>r.getAttribute('width')),['164','164','0']);assert.deepEqual(rects.map(r=>r.getAttribute('x')),['32','196','360']);
 assert.deepEqual(rects.map(r=>r.getAttribute('fill')),['#05A16E','#E84552','#0284C7']);assert.ok(rects.every(r=>r.getAttribute('height')==='6'));
 drawing.restore();assert.ok(f.originals.every(n=>n.getAttribute('opacity')===null));
});

test('history row visibility hides replacement artwork and unknown state leaves its native source intact',()=>{
 assert.equal(typeof module.mountAppMessageDrawing,'function');const f=fixture(),drawing=module.mountAppMessageDrawing({document:f.doc,frame:f.frame,baseURI:'https://example.test/'});
 Object.assign(f.session.values,{'app.history.projected':true,'app.history.0.state':'scheduled','app.history.0.visible':false});drawing.project(f.session);
 assert.ok(drawing.entries.every(e=>e.group.getAttribute('display')==='none'));assert.ok(f.originals.every(n=>n.getAttribute('opacity')==='0'));
 f.session.values['app.history.0.visible']=true;f.session.values['app.history.0.state']='unknown';drawing.project(f.session);
 assert.ok(drawing.entries.every(e=>e.group.getAttribute('display')==='none'));assert.ok(f.originals.every(n=>n.getAttribute('opacity')===null));
});
