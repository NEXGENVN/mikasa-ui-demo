import test from 'node:test';import assert from 'node:assert/strict';
const m=await import('./source-bottom-navigation.mjs').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return{};throw e;});
class Element{
 constructor(name,attrs={}){this.localName=name;this.attrs=new Map(Object.entries(attrs));this.children=[];}
 getAttribute(k){return this.attrs.get(k)??null;}setAttribute(k,v){this.attrs.set(k,String(v));}
 cloneNode(){return new Element(this.localName,Object.fromEntries(this.attrs));}append(n){if(n.parentElement){const old=n.parentElement.children;old.splice(old.indexOf(n),1);}n.parentElement=this;this.children.push(n);}
 insertBefore(n,before){n.parentElement=this;this.children.splice(this.children.indexOf(before),0,n);}
 get nextElementSibling(){return this.parentElement?.children[this.parentElement.children.indexOf(this)+1]||null;}
 closest(){return this.parentElement;}
 querySelector(tag){return this.children.find(n=>n.localName===tag)||null;}
}
function fixture(stroke='#C0C0C0'){
 const clip=new Element('clipPath',{id:'nav-clip'}),rect=new Element('rect',{width:'358',height:'60',transform:'translate(795 3208)'});clip.append(rect);
 const group=new Element('g',{'clip-path':'url(#nav-clip)'}),border=new Element('rect',{x:'795.5',y:'3208.5',width:'357',height:'59',rx:'19.5',stroke}),button=new Element('g');group.append(border);group.append(button);
 const svg={querySelectorAll:()=>[border]},doc={querySelector:()=>svg,getElementById:id=>id==='nav-clip'?clip:null};return{doc,clip,rect,group,border,button};
}
test('App bottom navigation keeps its source rounded outline above rectangular menu backgrounds',()=>{
 assert.equal(typeof m.restoreSourceBottomNavigation,'function');for(const [frameId,color]of [['1635:110138','#C0C0C0'],['1450:9744','#333333']]){
  const f=fixture(color),attrs=new Map(f.border.attrs);assert.equal(m.restoreSourceBottomNavigation(f.doc,{frameId}),1);
  assert.equal(f.rect.getAttribute('rx'),'20');assert.equal(f.rect.getAttribute('ry'),'20');assert.equal(f.group.children[1],f.button);
  const outline=f.group.children.at(-1);for(const [k,v]of attrs)assert.equal(outline.getAttribute(k),v);assert.equal(outline.getAttribute('fill'),'none');
  assert.equal(m.restoreSourceBottomNavigation(f.doc,{frameId}),0);assert.equal(f.group.children.length,3);
 }
});
test('Web shapes and unrelated App component clips are not treated as bottom navigation',()=>{
 assert.equal(typeof m.restoreSourceBottomNavigation,'function');const web=fixture();assert.equal(m.restoreSourceBottomNavigation(web.doc,{frameId:'557:50194'}),0);assert.equal(web.rect.getAttribute('rx'),null);
 const app=fixture();app.rect.setAttribute('height','654');assert.equal(m.restoreSourceBottomNavigation(app.doc,{frameId:'1635:110138'}),0);assert.equal(app.group.children.length,2);
});

test('flattened native menu ink is grouped without including the home indicator or moving labels',()=>{
 const f=fixture(),svg=new Element('svg'),defs=new Element('defs');svg.append(defs);svg.querySelectorAll=()=>[f.border];f.rect.setAttribute('height','844');
 f.group.children=[f.border];f.border.box=[795.5,3208.5,357,59];const buttons=[];
 for(const x of [796,885,974,1063]){const button=new Element('rect',{width:'90',height:'60',fill:'white'});button.box=[x,3208,90,60];const ink=new Element('path',{stroke:'#64748B'});ink.box=[x+20,3220,40,30];f.group.append(button);f.group.append(ink);buttons.push(button,ink);}
 const indicator=new Element('rect',{width:'129',height:'6'});indicator.box=[909.5,3280,129,6];f.group.append(indicator);f.doc.querySelector=()=>svg;f.doc.createElementNS=(ns,name)=>new Element(name);
 assert.equal(m.restoreSourceBottomNavigation(f.doc,{frameId:'1635:110138',measure:n=>n.box}),1);
 const wrapper=f.group.children[0];assert.equal(wrapper.localName,'g');assert.equal(f.group.children[1],indicator);assert.deepEqual(wrapper.children.slice(1,-1),buttons);
 const clip=defs.children[0];assert.equal(clip.children[0].getAttribute('rx'),'20');assert.equal(wrapper.children.at(-1).getAttribute('stroke'),'#C0C0C0');
 assert.equal(m.restoreSourceBottomNavigation(f.doc,{frameId:'1635:110138',measure:n=>n.box}),0);
});
