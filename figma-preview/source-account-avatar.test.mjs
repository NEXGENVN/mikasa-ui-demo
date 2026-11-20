import test from 'node:test';import assert from 'node:assert/strict';
const m=await import('./source-account-avatar.mjs').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return{};throw e;});
class Element{
 constructor(name,attrs={}){this.localName=name;this.attrs=new Map(Object.entries(attrs));this.children=[];}
 getAttribute(k){return this.attrs.get(k)??null;}setAttribute(k,v){this.attrs.set(k,String(v));}removeAttribute(k){this.attrs.delete(k);}
 cloneNode(){return new Element(this.localName,Object.fromEntries(this.attrs));}append(n){n.parentElement=this;this.children.push(n);}
 querySelector(tag){return this.children.find(n=>n.localName===tag)||null;}
}
function fixture(){
 const photo=new Element('rect',{x:'817',y:'2583',width:'58',height:'61.8667',fill:'url(#photo)'}),backing=new Element('rect',{x:'816.5',y:'2582.5',width:'59',height:'63',rx:'29.5',fill:'white'}),outline=backing.cloneNode();outline.removeAttribute('fill');outline.setAttribute('stroke','#CECECE');
 const pattern=new Element('pattern'),use=new Element('use',{'xlink:href':'#avatar',transform:'matrix(0.000925926 0 0 0.000868056 0 -0.0842014)'}),image=new Element('image',{'xlink:href':'../assets/1939fe761b2e4a2fa134ed8c344843fa8e9e93e87ba17eb04de1163dea5e4854.jpg'});pattern.append(use);
 const defs=new Element('defs'),svg=new Element('svg');svg.append(defs);svg.append(backing);svg.append(outline);svg.append(photo);svg.querySelectorAll=()=>[backing,outline,photo];
 const doc={querySelector:()=>svg,getElementById:id=>({photo:pattern,avatar:image})[id],createElementNS:(ns,name)=>new Element(name)};return{doc,svg,defs,photo,backing,outline,use};
}
test('account avatar follows the supplied rounded reference using its original backing shape',()=>{
 assert.equal(typeof m.roundSourceAccountAvatars,'function');for(const frameId of ['1635:110138','1450:9744','1450:9996','1456:11813']){
  const f=fixture(),before=new Map(f.photo.attrs),patternTransform=f.use.getAttribute('transform');assert.equal(m.roundSourceAccountAvatars(f.doc,{frameId}),1);
  for(const [key,value]of before)assert.equal(f.photo.getAttribute(key),value,'photo '+key+' stays at its source geometry');
  const clip=f.defs.children[0];assert.equal(clip.localName,'clipPath');assert.equal(clip.getAttribute('clipPathUnits'),'userSpaceOnUse');
  for(const attr of ['x','y','width','height','rx'])assert.equal(clip.children[0].getAttribute(attr),f.backing.getAttribute(attr));
  assert.equal(f.use.getAttribute('transform'),patternTransform);assert.equal(f.outline.getAttribute('stroke'),'#CECECE');
  assert.match(f.photo.getAttribute('clip-path'),/^url\(#account-avatar-/);assert.equal(m.roundSourceAccountAvatars(f.doc,{frameId}),0);assert.equal(f.defs.children.length,1);
 }
});
test('profile avatars, unrelated Web artwork and already-clipped photos keep their source clips',()=>{
 assert.equal(typeof m.roundSourceAccountAvatars,'function');for(const frameId of ['1456:12239','1635:110900','557:50194']){const f=fixture();assert.equal(m.roundSourceAccountAvatars(f.doc,{frameId}),0);assert.equal(f.photo.getAttribute('clip-path'),null);}
 const f=fixture();f.photo.setAttribute('clip-path','url(#original)');assert.equal(m.roundSourceAccountAvatars(f.doc,{frameId:'1450:9744'}),0);assert.equal(f.photo.getAttribute('clip-path'),'url(#original)');
});
