import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {nativeFrames} from './native-frames.mjs';
const module=await import('./source-scroll-canvas.mjs').catch(error=>{if(error.code==='ERR_MODULE_NOT_FOUND')return{};throw error;});

class Element extends EventTarget{
 constructor(name,attrs={}){super();this.localName=name;this.attributes=new Map(Object.entries(attrs));this.children=[];this.style={};this.dataset={};}
 setAttribute(k,v){this.attributes.set(k,String(v));}
 getAttribute(k){return this.attributes.get(k)??null;}
 appendChild(node){if(node.parentElement)node.parentElement.children=node.parentElement.children.filter(n=>n!==node);node.parentElement=this;const adopt=n=>{n.ownerDocument=this.ownerDocument;for(const c of n.children)adopt(c);};adopt(node);this.children.push(node);return node;}
 contains(node){return this===node||this.children.some(c=>c.contains(node));}
 querySelectorAll(selector){const all=this.children.flatMap(n=>[n,...n.querySelectorAll('*')]);if(selector==='*')return all;if(selector==='clipPath rect')return all.filter(n=>n.localName==='rect'&&ancestor(n,p=>p.localName==='clipPath'));if(selector==='link[rel="stylesheet"]')return all.filter(n=>n.localName==='link'&&n.rel==='stylesheet');if(selector==='style[data-source-scroll-viewport]')return all.filter(n=>n.localName==='style'&&n.dataset.sourceScrollViewport);return all.filter(n=>n.localName===selector);}
 querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
 focus(){this.ownerDocument.activeElement=this;this.focused=true;}
 setSelectionRange(start,end,direction){Object.assign(this,{selectionStart:start,selectionEnd:end,selectionDirection:direction});}
}
const ancestor=(node,fn)=>{for(let p=node.parentElement;p;p=p.parentElement)if(fn(p))return p;return null;};
function fixture(){
 const doc={baseURI:'https://preview.example/figma-preview/source-frames/557-36756.original.html',createElement:n=>{const e=new Element(n);e.ownerDocument=doc;return e;}};
 doc.documentElement=doc.createElement('html');doc.head=doc.createElement('head');doc.body=doc.createElement('body');doc.documentElement.appendChild(doc.head);doc.documentElement.appendChild(doc.body);doc.querySelector=s=>doc.documentElement.querySelector(s);doc.querySelectorAll=s=>doc.documentElement.querySelectorAll(s);
 const svg=new Element('svg',{width:'1440',height:'1024',viewBox:'2943 10637 1440 1024'}),defs=new Element('defs');svg.appendChild(defs);doc.body.appendChild(svg);
 const clip=(attrs,parentAttrs={})=>{const p=new Element('clipPath',parentAttrs),r=new Element('rect',attrs);p.appendChild(r);defs.appendChild(p);return r;};
 const root=clip({x:'2943',y:'10637',width:'1440',height:'1024'}),translated=clip({width:'1440',height:'1024',transform:'translate(2943 10637)'}),component=clip({x:'3344',y:'11013',width:'994',height:'274'}),offset=clip({x:'2943',y:'10638',width:'1440',height:'1024'});
 const parentDoc={baseURI:'https://preview.example/figma-preview/index.html'},form=new Element('form');form.ownerDocument=parentDoc;Object.assign(form.style,{zoom:'0.65',position:'absolute',top:'0px',height:'1024px'});const input=new Element('input');form.appendChild(input);input.ownerDocument=parentDoc;input.value='edited value';parentDoc.activeElement=input;input.setSelectionRange(2,8,'forward');
 const iframe=new Element('iframe',{height:'1024',width:'1440',scrolling:'no'});iframe.contentDocument=doc;iframe.ownerDocument=parentDoc;iframe.style.zoom='.65';
 return{doc,svg,root,translated,component,offset,form,input,iframe,frame:{id:'557:36756',width:1440,height:1024,scrollHeight:1348}};
}

test('no-overflow source frames are a strict no-op',async()=>{
 assert.equal(typeof module.prepareSourceScrollCanvas,'function','Source scroll helper is required');const f=fixture();await module.prepareSourceScrollCanvas({...f,frame:{...f.frame,scrollHeight:1024},stylesheets:[]});assert.equal(f.form.ownerDocument,f.iframe.ownerDocument);assert.equal(f.svg.getAttribute('viewBox'),'2943 10637 1440 1024');assert.equal(f.doc.head.children.length,0);assert.equal(f.form.style.zoom,'0.65');
});
test('overflow keeps the same source origin and 1:1 viewport units while expanding only viewport clips',async()=>{
 assert.equal(typeof module.prepareSourceScrollCanvas,'function');const f=fixture();await module.prepareSourceScrollCanvas({...f,stylesheets:[]});
 assert.equal(f.svg.getAttribute('viewBox'),'2943 10637 1440 1348');assert.equal(f.svg.getAttribute('width'),'1440');assert.equal(f.svg.getAttribute('height'),'1348');assert.equal(f.root.getAttribute('height'),'1348');assert.equal(f.translated.getAttribute('height'),'1348');assert.equal(f.component.getAttribute('height'),'274');assert.equal(f.offset.getAttribute('height'),'1024');assert.equal(f.iframe.getAttribute('height'),'1024');assert.equal(f.iframe.style.zoom,'.65');assert.equal(f.form.style.zoom,'1');assert.equal(f.form.style.height,'1348px');assert.equal(f.form.parentElement,f.doc.body);
 const sourcePoint=[3135,11680],before=sourcePoint.map((v,i)=>v-[2943,10637][i]),view=f.svg.getAttribute('viewBox').split(' ').map(Number),scale=[Number(f.svg.getAttribute('width'))/view[2],Number(f.svg.getAttribute('height'))/view[3]],after=sourcePoint.map((v,i)=>(v-view[i])*scale[i]);assert.deepEqual(after,before);assert.equal(after[1],1043,'A source control below 1024 must remain at its original native y coordinate');
 assert.equal(f.doc.documentElement.style.overflowY,'auto');assert.match(f.doc.head.querySelector('style').textContent,/scrollbar-width\s*:\s*none/);assert.match(f.doc.head.querySelector('style').textContent,/::-webkit-scrollbar/);
});
test('the existing form remains hidden until absolute stylesheets load, preserving values, listeners and selection',async()=>{
 assert.equal(typeof module.prepareSourceScrollCanvas,'function');const f=fixture();let clicks=0;f.input.addEventListener('click',()=>clicks++);const preparing=module.prepareSourceScrollCanvas({...f,stylesheets:['./interactive-preview.css','https://preview.example/figma-preview/assets/fonts/native.css']});
 assert.equal(f.form.style.visibility,'hidden');assert.equal(f.form.ownerDocument,f.doc);const links=f.doc.head.querySelectorAll('link[rel="stylesheet"]');assert.equal(links.length,2);assert.equal(links[0].href,'https://preview.example/figma-preview/interactive-preview.css');links.forEach(link=>link.dispatchEvent(new Event('load')));await preparing;
 assert.equal(f.form.style.visibility,'');assert.equal(f.input.value,'edited value');assert.equal(f.doc.activeElement,f.input);assert.equal(f.input.selectionStart,2);assert.equal(f.input.selectionEnd,8);f.input.dispatchEvent(new Event('click'));assert.equal(clicks,1);
});
test('repeated preparation does not duplicate styles, extend clips twice or reset internal scrolling',async()=>{
 assert.equal(typeof module.prepareSourceScrollCanvas,'function');const f=fixture();await module.prepareSourceScrollCanvas({...f,stylesheets:[]});f.doc.documentElement.scrollTop=220;await module.prepareSourceScrollCanvas({...f,stylesheets:[]});assert.equal(f.doc.head.querySelectorAll('style[data-source-scroll-viewport]').length,1);assert.equal(f.root.getAttribute('height'),'1348');assert.equal(f.doc.documentElement.scrollTop,220);
});
test('a failed overlay stylesheet leaves the form hidden instead of exposing unstyled native controls',async()=>{
 assert.equal(typeof module.prepareSourceScrollCanvas,'function');const f=fixture();const preparing=module.prepareSourceScrollCanvas({...f,stylesheets:['https://preview.example/missing.css']});f.doc.head.querySelector('link').dispatchEvent(new Event('error'));await assert.rejects(preparing,/stylesheet/i);assert.equal(f.form.style.visibility,'hidden');
});
test('the real API-key original has a matching outer clip, and preparation never writes the source artifact',async()=>{
 const frame=nativeFrames.find(f=>f.id==='557:36756');assert.ok(frame);const filename=new URL(frame.file,import.meta.url),before=await fs.readFile(filename,'utf8'),viewBox=before.match(/\bviewBox="([^"]+)"/)[1];
 assert.equal(viewBox,'2943 10637 1440 1024');assert.match(before,/<rect x="2943" y="10637" width="1440" height="1024" rx="10"/);
 const f=fixture();await module.prepareSourceScrollCanvas({...f,frame:{...frame,scrollHeight:1348},stylesheets:[]});assert.equal(f.svg.getAttribute('viewBox'),'2943 10637 1440 1348');assert.equal(await fs.readFile(filename,'utf8'),before);
});
