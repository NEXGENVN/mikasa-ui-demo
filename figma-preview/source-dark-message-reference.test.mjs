import test from 'node:test';
import assert from 'node:assert/strict';
const m=await import('./source-dark-message-reference.mjs').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return{};throw e;});
const I={a:1,b:0,c:0,d:1,e:0,f:0};
class Element{
 constructor(tag,attrs={},box){this.localName=tag;this.attrs=new Map(Object.entries(attrs));this.children=[];this.box=box;}
 getAttribute(k){return this.attrs.get(k)??null;}setAttribute(k,v){this.attrs.set(k,String(v));}removeAttribute(k){this.attrs.delete(k);}
 get parentNode(){return this.parentElement;}
 append(...nodes){for(const n of nodes){n.remove();n.parentElement=this;this.children.push(n);}}
 insertBefore(n,anchor){n.remove();n.parentElement=this;this.children.splice(this.children.indexOf(anchor),0,n);}
 remove(){if(this.parentElement){this.parentElement.children=this.parentElement.children.filter(n=>n!==this);this.parentElement=null;}}
 cloneNode(){return new Element(this.localName,Object.fromEntries(this.attrs),this.box);}
 closest(){return null;}
 querySelectorAll(selector){return this.children.flatMap(n=>[n,...n.querySelectorAll('*')]).filter(n=>selector==='*'||selector.split(',').some(s=>s.split('[')[0]===n.localName));}
 getBBox(){const b=this.box||[Number(this.getAttribute('x')),Number(this.getAttribute('y')),Number(this.getAttribute('width')),Number(this.getAttribute('height'))];return{x:b[0],y:b[1],width:b[2],height:b[3]};}getCTM(){return I;}
}
function fixture({origin=[9207,1929],rows=[[29,254,40,40],[29,319,40,40],[29,384,40,40],[29,452,40,30]],existing=false}={}){
 const [ox,oy]=origin,svg=new Element('svg',{viewBox:`${ox} ${oy} 390 926`}),group=new Element('g'),paths=[],tiles=[];
 svg.append(group);
 const card=new Element('rect',{x:String(ox+16.5),y:String(oy+204.5),width:'357',height:'300',rx:'9.5',stroke:'#555555'});group.append(card);
 rows.forEach(([x,y,w,h],i)=>{
  if(existing){const tile=new Element('rect',{x:String(ox+x),y:String(oy+y),width:String(w),height:String(h),rx:'6',fill:'#E0F2FE'});group.append(tile);tiles.push(tile);}
  // The confirmed original source icon footprint is inset from its backplate.
  const p=new Element('path',{d:`M${ox+x+12} ${oy+y+10}h16v18`,stroke:i===0||h===30?'#195CFA':'#0F4D88','stroke-width':'1.5'},[ox+x+12,oy+y+10,16,18]);group.append(p);paths.push(p);
 });
 const unrelated=new Element('path',{d:'M9600 2750h12',stroke:'#195CFA'},[ox+300,oy+720,12,0]);group.append(unrelated);
 const doc={querySelector:()=>svg,createElementNS:(_,tag)=>new Element(tag)};
 return{doc,svg,group,paths,tiles,card,unrelated,origin,rows};
}
const values=e=>Object.fromEntries(e.attrs);
const added=f=>f.group.children.filter(e=>e.localName==='rect'&&e!==f.card&&!f.tiles.includes(e));

test('Dark sent, failed and scheduled detail icons gain native backplates without moving their vector ink',()=>{
 assert.equal(typeof m.restoreSourceDarkMessageReference,'function');
 for(const frameId of ['1430:86619','1444:95125','1450:8895','1450:9014','1444:93591']){
  const offset=frameId==='1444:93591'?1:0,rows=[[29,254+offset,40,40],[29,319+offset,40,40],[29,384+offset,40,40],[29,452+offset,40,30]],f=fixture({rows}),ink=f.paths.map(p=>p.getAttribute('d')),card=values(f.card);
  assert.ok(m.restoreSourceDarkMessageReference(f.doc,{frameId})>0);
  assert.deepEqual(added(f).map(e=>['x','y','width','height','rx','fill'].map(a=>e.getAttribute(a))),rows.map(([x,y,w,h])=>[String(x+9207),String(y+1929),String(w),String(h),'6','#E0F2FE']));
  assert.deepEqual(f.paths.map(p=>p.getAttribute('d')),ink);assert.deepEqual(f.paths.map(p=>p.getAttribute('stroke')),Array(4).fill('#0F4D88'));
  for(const p of f.paths)assert.ok(f.group.children.indexOf(added(f).find(t=>Number(t.getAttribute('y'))<=p.box[1]&&Number(t.getAttribute('y'))+Number(t.getAttribute('height'))>=p.box[1]+p.box[3]))<f.group.children.indexOf(p),'backplate paints behind its source glyph');
  assert.deepEqual(values(f.card),card);assert.equal(f.unrelated.getAttribute('stroke'),'#195CFA');
  assert.equal(m.restoreSourceDarkMessageReference(f.doc,{frameId}),0);assert.equal(added(f).length,4);
 }
});

test('confirmation restores its original wider icon tiles and mutes only the white row separators',()=>{
 assert.equal(typeof m.restoreSourceDarkMessageReference,'function');
 for(const frameId of ['1430:88099','1430:88032','1430:88175']){
  const multi=frameId==='1430:88099',rows=multi?[[29,277,44,40],[29,342,48,40]]:[[29,279,44,40],[29,346,48,40],[29,411,44,40]],f=fixture({origin:[4135,1929],rows}),separator=new Element('path',{d:'M4496 2255V2254H4164V2255V2256H4496V2255Z',fill:'#D9D9D9',mask:'url(#original-row)'},[4164,2254,332,2]);f.group.append(separator);
  const geometry=separator.getAttribute('d');m.restoreSourceDarkMessageReference(f.doc,{frameId});
  assert.deepEqual(added(f).map(e=>['x','y','width','height'].map(a=>Number(e.getAttribute(a)))),rows.map(([x,y,w,h])=>[x+4135,y+1929,w,h]));
  assert.equal(separator.getAttribute('fill'),'#454545');assert.equal(separator.getAttribute('d'),geometry);assert.equal(separator.getAttribute('mask'),'url(#original-row)');
 }
});

test('success keeps existing native tiles and retains the two reference clock color variants',()=>{
 assert.equal(typeof m.restoreSourceDarkMessageReference,'function');
 for(const [frameId,color]of [['1450:9130','#0F4D88'],['1450:9522','#195CFA'],['1430:87138','#0F4D88']]){
  const f=fixture({rows:[[29,254,40,40],[29,317,40,40],[29,383,40,30],[29,444,40,30]],existing:true}),tiles=f.tiles.map(values);
  m.restoreSourceDarkMessageReference(f.doc,{frameId});assert.equal(added(f).length,0);assert.deepEqual(f.tiles.map(values),tiles);
  assert.equal(f.paths[2].getAttribute('stroke'),color);assert.equal(f.paths[3].getAttribute('stroke'),color);
 }
});

test('Single sent timeline secondary text uses the reference neutral gray without changing other source text',()=>{
 assert.equal(typeof m.restoreSourceDarkMessageReference,'function');const f=fixture(),note=new Element('path',{d:'M9267 2516h84v8',fill:'#64748B'},[9267,2516,84,8]),unrelated=new Element('path',{d:'M9300 2200h80v8',fill:'#64748B'},[9300,2200,80,8]);f.group.append(note,unrelated);
 m.restoreSourceDarkMessageReference(f.doc,{frameId:'1430:86619'});assert.equal(note.getAttribute('fill'),'#B3B3B3');assert.equal(unrelated.getAttribute('fill'),'#64748B');
 m.revertSourceDarkMessageReference(f.doc);assert.equal(note.getAttribute('fill'),'#64748B');
});

test('reverting removes owned tiles and restores exactly the paints that the helper changed',()=>{
 assert.equal(typeof m.revertSourceDarkMessageReference,'function');const f=fixture(),before=f.group.children.map(values);
 m.restoreSourceDarkMessageReference(f.doc,{frameId:'1430:86619'});assert.ok(m.revertSourceDarkMessageReference(f.doc)>0);
 assert.deepEqual(f.group.children.map(values),before);assert.equal(m.revertSourceDarkMessageReference(f.doc),0);
 assert.ok(m.restoreSourceDarkMessageReference(f.doc,{frameId:'1430:86619'})>0);
});

test('Light, Web, unrelated frames and missing glyphs cannot gain reference artwork',()=>{
 assert.equal(typeof m.restoreSourceDarkMessageReference,'function');for(const frameId of ['784:48201','1308:6902','557:50194','1450:9744',undefined]){
  const f=fixture(),before=f.group.children.map(values);assert.equal(m.restoreSourceDarkMessageReference(f.doc,{frameId}),0);assert.deepEqual(f.group.children.map(values),before);
 }
 const f=fixture();for(const p of f.paths)p.remove();assert.equal(m.restoreSourceDarkMessageReference(f.doc,{frameId:'1430:86619'}),0);assert.equal(added(f).length,0);
 assert.equal(m.restoreSourceDarkMessageReference(null,{frameId:'1430:86619'}),0);
});

test('Full success footer remains readable on the dark background before native fixed cropping',()=>{
 for(const frameId of ['1450:9130','1450:9522']){const f=fixture(),text=new Element('path',{fill:'#121212'},[9207+180,1929+1120,70,16]),arrow=new Element('path',{stroke:'#121212'},[9207+150,1929+1124,12,12]),home=new Element('rect',{fill:'#121212'},[9207+124,1929+1174,142,6]);f.group.append(text,arrow,home);m.restoreSourceDarkMessageReference(f.doc,{frameId});assert.equal(text.getAttribute('fill'),'#F8FAFF');assert.equal(arrow.getAttribute('stroke'),'#F8FAFF');assert.equal(home.getAttribute('fill'),'#F8FAFF');m.revertSourceDarkMessageReference(f.doc);assert.equal(home.getAttribute('fill'),'#121212');}
});
