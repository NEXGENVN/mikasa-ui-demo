import test from 'node:test';import assert from 'node:assert/strict';
const m=await import('./source-blend-backdrops.mjs').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return{};throw e;});
class Element{
 constructor(name,attributes={}){this.localName=name;this.attrs=new Map(Object.entries(attributes));this.children=[];}
 getAttribute(k){return this.attrs.get(k)??null;}setAttribute(k,v){this.attrs.set(k,String(v));}removeAttribute(k){this.attrs.delete(k);}
 cloneNode(){return new Element(this.localName,Object.fromEntries(this.attrs));}get firstChild(){return this.children[0]||null;}
 append(n){n.parentElement=this;this.children.push(n);}insertBefore(n,before){n.parentElement=this;const i=this.children.indexOf(before);this.children.splice(i<0?this.children.length:i,0,n);}
 querySelector(tag){return this.children.find(n=>n.localName===tag)||null;}
}
function fixture(){
 const rect=new Element('rect',{width:'126',height:'200',fill:'white',transform:'translate(2394 787)'}),clip=new Element('clipPath');clip.append(rect);
 const blur=new Element('feGaussianBlur',{stdDeviation:'21.5',result:'effect1_foregroundBlur_native'}),filter=new Element('filter');filter.append(blur);
 const parent=new Element('g',{'clip-path':'url(#wheel-clip)'}),digits=new Element('g'),band=new Element('g',{filter:'url(#wheel-blur)',style:'mix-blend-mode:color-burn'});parent.append(digits);parent.append(band);
 const svg={querySelectorAll:()=>[band]},doc={querySelector:()=>svg,getElementById:id=>({'wheel-clip':clip,'wheel-blur':filter})[id]};return{doc,rect,clip,filter,blur,parent,digits,band};
}
test('a clipped Figma color-burn wheel blends against its opaque native white surface',()=>{
 assert.equal(typeof m.restoreSourceWheelBackdrops,'function');const f=fixture();assert.equal(m.restoreSourceWheelBackdrops(f.doc),1);
 const background=f.parent.firstChild;assert.equal(background.getAttribute('fill'),'white');assert.equal(background.getAttribute('transform'),'translate(2394 787)');assert.equal(background.getAttribute('height'),'200');assert.equal(f.parent.children[1],f.digits);assert.equal(f.band.getAttribute('style'),'mix-blend-mode:color-burn');assert.equal(f.band.getAttribute('filter'),'url(#wheel-blur)');assert.equal(f.blur.getAttribute('stdDeviation'),'21.5');assert.equal(m.restoreSourceWheelBackdrops(f.doc),0);
});
test('other blend modes and source shadows retain their original drawing and clipping',()=>{
 assert.equal(typeof m.restoreSourceWheelBackdrops,'function');for(const kind of ['shadow','multiply','wrong-viewport']){const f=fixture();if(kind==='shadow')f.blur.setAttribute('result','dropShadow');if(kind==='multiply')f.band.setAttribute('style','mix-blend-mode:multiply');if(kind==='wrong-viewport')f.rect.setAttribute('height','40');assert.equal(m.restoreSourceWheelBackdrops(f.doc),0);assert.equal(f.parent.children.length,2);}
});
