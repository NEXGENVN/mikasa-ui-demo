import test from 'node:test';import assert from 'node:assert/strict';
const m=await import('./app-phone-viewport.mjs').catch(e=>e.code==='ERR_MODULE_NOT_FOUND'?{}:Promise.reject(e));
class Element{
 constructor(name,attrs={}){this.localName=name;this.attrs=new Map(Object.entries(attrs));this.children=[];this.style={};}
 get attributes(){return[...this.attrs].map(([name,value])=>({name,value}));}getAttribute(k){return this.attrs.get(k)??null;}setAttribute(k,v){this.attrs.set(k,String(v));}removeAttribute(k){this.attrs.delete(k);}
 append(n){n.parentElement=this;this.children.push(n);}appendChild(n){this.append(n);return n;}remove(){this.parentElement.children=this.parentElement.children.filter(n=>n!==this);}
 cloneNode(deep){const n=new Element(this.localName,Object.fromEntries(this.attrs));if(deep)for(const c of this.children)n.append(c.cloneNode(true));return n;}
 querySelectorAll(selector){const all=this.children.flatMap(n=>[n,...n.querySelectorAll('*')]);return selector==='*'?all:selector==='[id]'?all.filter(n=>n.getAttribute('id')):selector==='rect[rx]'?all.filter(n=>n.localName==='rect'&&n.getAttribute('rx')):all.filter(n=>n.localName===selector);}
 querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
}
function fixture(id='1308:7105'){
 const body=new Element('body'),html=new Element('html'),svg=new Element('svg',{width:'390',height:'1199',viewBox:'11772 4345 390 1199'}),defs=new Element('defs'),clip=new Element('clipPath',{id:'source-clip'}),rect=new Element('rect',{width:'390',height:'1199',rx:'14'}),path=new Element('path',{id:'source-ink',d:'unchanged native ink','clip-path':'url(#source-clip)'});clip.append(rect);defs.append(clip);svg.append(defs);svg.append(path);body.append(svg);
 const doc={body,documentElement:html,querySelector:selector=>body.querySelector(selector)},iframe={style:{},contentDocument:doc,getAttribute:k=>({height:'844',width:'390'})[k]},frame={id,platform:'app',height:844,scrollHeight:1199,width:390};return{body,svg,path,rect,doc,iframe,frame};
}
test('flow metadata presents tall detail artwork in an 844 pixel phone while preserving native content bounds',()=>{
 assert.equal(typeof m.withAppPhoneViewport,'function');const f={id:'1308:7105',platform:'app',height:1199,width:390,file:'original.svg',controls:[{box:[16,1117,358,40]}]},result=m.withAppPhoneViewport(f);
 assert.equal(result.height,844);assert.equal(result.scrollHeight,1199);assert.equal(result.file,'original.svg');assert.equal(result.controls,f.controls);assert.equal(f.height,1199);
 const dark=m.withAppPhoneViewport({...f,id:'1430:86619',height:926});assert.deepEqual(dark.appPhoneViewport.footer,[0,836,390,90]);assert.equal(m.withAppPhoneViewport({...f,platform:'web'}).height,1199);assert.equal(m.withAppPhoneViewport({...f,id:'506:23873',height:844}).height,844);
});
test('fixed native crops retain original paths and namespace every SVG reference without resizing the source body',()=>{
 assert.equal(typeof m.mountAppPhoneViewport,'function');const f=fixture(),drawing=m.mountAppPhoneViewport({iframe:f.iframe,frameId:f.frame.id});
 assert.equal(f.svg.getAttribute('viewBox'),'11772 4345 390 1199');assert.equal(f.rect.getAttribute('height'),'1199');assert.equal(f.path.getAttribute('clip-path'),'url(#source-clip)');
 assert.equal(drawing.regions.length,2);const [header,footer]=drawing.regions;assert.equal(header.getAttribute('viewBox'),'11772 4345 390 103');assert.equal(footer.getAttribute('viewBox'),'11772 5446 390 98');assert.equal(footer.style.top,'746px');assert.equal(footer.style.position,'fixed');assert.equal(footer.style.width,'390px');
 assert.equal(f.iframe.style.borderRadius,'14px','scrolled body cannot fill the rounded corners of the fixed footer crop');
 const clonedPath=footer.querySelector('path'),clonedClip=footer.querySelector('clipPath');assert.equal(clonedPath.getAttribute('d'),'unchanged native ink');assert.equal(clonedPath.getAttribute('clip-path'),'url(#'+clonedClip.getAttribute('id')+')');assert.notEqual(clonedClip.getAttribute('id'),'source-clip');assert.equal(m.mountAppPhoneViewport({iframe:f.iframe,frameId:f.frame.id}),drawing);
 drawing.restore();assert.equal(f.body.children.length,1);
});
test('only header/footer controls dock to native viewport coordinates while body controls retain scrolling positions',()=>{
 assert.equal(typeof m.dockAppPhoneViewportControls,'function');const f=fixture(),header=new Element('button'),footer=new Element('button'),body=new Element('button'),form=new Element('form');form.querySelectorAll=()=>[header,footer,body];const ids=['head','foot','body'];[header,footer,body].forEach((n,i)=>{n.setAttribute('data-interactive-control',ids[i]);n.closest=()=>n;form.append(n);});
 f.frame.appPhoneViewport={rawHeight:1199,header:[0,0,390,103],footer:[0,1101,390,98]};f.frame.controls=[{id:'head',box:[18,76,20,20]},{id:'foot',box:[16,1117,358,40]},{id:'body',box:[345,770,24,24]}];
 const cleanup=m.dockAppPhoneViewportControls({form,frame:f.frame});assert.equal(header.style.top,'76px');assert.equal(footer.style.top,'762px');assert.equal(footer.style.position,'fixed');assert.equal(body.style.position,undefined);assert.equal(footer.parentElement,form);assert.equal(form.style.isolation,'auto');
 cleanup();assert.equal(footer.style.position,undefined);
});
test('literal source gallery and ordinary 844 pixel source frames get no viewport overlays',()=>{
 assert.equal(typeof m.mountAppPhoneViewport,'function');const f=fixture();f.iframe.getAttribute=k=>({height:'1199',width:'390'})[k];const gallery=m.mountAppPhoneViewport({iframe:f.iframe,frameId:f.frame.id});assert.equal(gallery.regions.length,0);const native=fixture('506:23873');assert.equal(m.mountAppPhoneViewport({iframe:native.iframe,frameId:native.frame.id}).regions.length,0);
});
