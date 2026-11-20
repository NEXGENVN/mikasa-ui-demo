const prepared=new WeakMap(),stylesheetLoads=new WeakMap();
const identity=()=>[1,0,0,1,0,0];
const multiply=(a,b)=>[a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]];
const approximately=(a,b)=>Math.abs(a-b)<.05;
const numericAttribute=(element,name,fallback=0)=>{const value=element.getAttribute(name);return value===null?fallback:/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(value.trim())?Number(value):NaN;};

function transformMatrix(element){
 const source=element.getAttribute('transform')||'';let matrix=identity();
 for(const match of source.matchAll(/(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)/g)){
  const values=match[2].trim().split(/[\s,]+/).map(Number);if(!values.every(Number.isFinite))return null;
  let next=identity();const [x=0,y=0]=values;
  if(match[1]==='matrix'){if(values.length!==6)return null;next=values;}
  else if(match[1]==='translate')next=[1,0,0,1,x,y];
  else if(match[1]==='scale')next=[x,0,0,values[1]??x,0,0];
  else if(match[1]==='rotate'){const angle=x*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle),cx=values[1]||0,cy=values[2]||0;next=[c,s,-s,c,cx-c*cx+s*cy,cy-s*cx-c*cy];}
  else if(match[1]==='skewX')next=[1,0,Math.tan(x*Math.PI/180),1,0,0];
  else next=[1,Math.tan(x*Math.PI/180),0,1,0,0];
  matrix=multiply(matrix,next);
 }
 return matrix;
}

// Clip paths in the original exports use either absolute rect coordinates or a
// translated rect. Only a complete, source-aligned viewport clip may grow.
function expandViewportClips(svg,viewBox,height){
 for(const rect of svg.querySelectorAll('clipPath rect')){
  let matrix=identity(),valid=true;
  for(let element=rect;element&&element!==svg;element=element.parentElement){
   if(element.localName==='clipPath'&&element.getAttribute('clipPathUnits')==='objectBoundingBox'){valid=false;break;}
   const local=transformMatrix(element);if(!local){valid=false;break;}matrix=multiply(local,matrix);
  }
  if(!valid||!approximately(matrix[1],0)||!approximately(matrix[2],0)||matrix[0]<=0||matrix[3]<=0)continue;
  const x=numericAttribute(rect,'x'),y=numericAttribute(rect,'y'),width=numericAttribute(rect,'width',NaN),oldHeight=numericAttribute(rect,'height',NaN);
  const bounds=[matrix[0]*x+matrix[4],matrix[3]*y+matrix[5],matrix[0]*width,matrix[3]*oldHeight];
  if(!bounds.every((value,index)=>Number.isFinite(value)&&approximately(value,viewBox[index])))continue;
  rect.setAttribute('height',String(oldHeight+(height-viewBox[3])/matrix[3]));
 }
}

function loadStylesheet(doc,href){
 let link=[...doc.head.querySelectorAll('link[rel="stylesheet"]')].find(link=>link.href===href);
 if(link?.sheet||link?.dataset.sourceScrollLoaded==='true')return Promise.resolve();
 if(link&&stylesheetLoads.has(link))return stylesheetLoads.get(link);
 let created=false;if(!link){link=doc.createElement('link');link.rel='stylesheet';link.href=href;created=true;}
 const promise=new Promise((resolve,reject)=>{
  const loaded=()=>{link.dataset.sourceScrollLoaded='true';link.removeEventListener('error',failed);resolve();};
  const failed=()=>{link.removeEventListener('load',loaded);reject(new Error('Unable to load source overlay stylesheet: '+href));};
  link.addEventListener('load',loaded,{once:true});link.addEventListener('error',failed,{once:true});
 });
 stylesheetLoads.set(link,promise);if(created)doc.head.appendChild(link);return promise;
}

/**
 * Enable vertical scrolling inside this interactive iframe only. Source files,
 * original iframe viewport dimensions and nested component clips stay intact.
 * Call after iframe load and before source-slot binding / enabling the form.
 * Stylesheet URLs resolve against the form's original document, then load inside
 * the iframe. Relative SVG image URLs keep their original source-document base.
 */
export async function prepareSourceScrollCanvas({iframe,form,frame,stylesheets=[]}){
 if(frame?.appPhoneViewport?.compact)return;
 if(!(Number(frame?.scrollHeight)>Number(frame?.height)))return;
 const doc=iframe?.contentDocument,svg=doc?.querySelector('svg');if(!svg||!form)return;
 const previous=prepared.get(form);if(previous?.doc===doc)return previous.promise;
 const viewBox=String(svg.getAttribute('viewBox')||'').trim().split(/[\s,]+/).map(Number),height=Number(frame.scrollHeight),width=Number(frame.width);
 if(viewBox.length!==4||!viewBox.every(Number.isFinite)||viewBox[2]<=0||viewBox[3]<=0||!Number.isFinite(height)||!Number.isFinite(width))throw new Error('Source scroll canvas requires a valid native viewBox and dimensions.');
 const originalDoc=form.ownerDocument,baseURI=originalDoc?.baseURI||iframe.ownerDocument?.baseURI||doc.baseURI,hrefs=[...new Set(stylesheets.map(value=>new URL(typeof value==='string'?value:value.href,baseURI).href))];
 const visibility=form.style.visibility||'',focused=originalDoc?.activeElement&&form.contains(originalDoc.activeElement)?originalDoc.activeElement:null;
 let selection;try{if(focused&&typeof focused.selectionStart==='number')selection=[focused.selectionStart,focused.selectionEnd,focused.selectionDirection];}catch{}
 form.style.visibility='hidden';
 const promise=(async()=>{
  expandViewportClips(svg,viewBox,height);
  svg.setAttribute('height',String(height));svg.setAttribute('viewBox',[viewBox[0],viewBox[1],viewBox[2],height].join(' '));
  Object.assign(svg.style,{height:height+'px'});
  Object.assign(doc.documentElement.style,{width:width+'px',height:'auto',minHeight:frame.height+'px',overflowX:'hidden',overflowY:'auto',scrollbarWidth:'none'});
  Object.assign(doc.body.style,{position:'relative',margin:'0',padding:'0',width:width+'px',height:'auto',minHeight:height+'px',overflow:'visible',scrollbarWidth:'none'});
  if(!doc.head.querySelector('style[data-source-scroll-viewport]')){const style=doc.createElement('style');style.dataset.sourceScrollViewport='true';style.textContent='html,body{scrollbar-width:none}html::-webkit-scrollbar,body::-webkit-scrollbar{display:none;width:0;height:0}';doc.head.appendChild(style);}
  iframe.setAttribute('scrolling','auto');
  Object.assign(form.style,{position:'absolute',left:'0px',top:'0px',width:width+'px',height:height+'px',margin:'0',padding:'0',zoom:'1',transformOrigin:'top left'});
  // moveBefore intentionally cannot move between different documents. Adoption
  // via appendChild retains this same form, its input values and event listeners.
  if(form.parentElement!==doc.body)doc.body.appendChild(form);
  await Promise.all(hrefs.map(href=>loadStylesheet(doc,href)));
  form.style.visibility=visibility;
  if(focused&&(!originalDoc.activeElement||originalDoc.activeElement===focused||originalDoc.activeElement===originalDoc.body)){
   focused.focus({preventScroll:true});if(selection)try{focused.setSelectionRange(...selection);}catch{}
  }
 })();
 prepared.set(form,{doc,promise});return promise;
}
