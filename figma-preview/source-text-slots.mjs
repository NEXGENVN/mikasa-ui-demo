import {generateGlyphPaths} from './source-glyphs.mjs';

const tokens=/[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?/g;
const identity={a:1,b:0,c:0,d:1,e:0,f:0};
let clipSequence=0;
const hiddenSourceText=new WeakSet();
/** Other source drawing owners must not reveal glyph ink that has a replacement. */
export const isSourceTextHidden=element=>hiddenSourceText.has(element);
const apply=(m,x,y)=>[m.a*x+m.c*y+m.e,m.b*x+m.d*y+m.f];
const multiply=(a,b)=>({a:a.a*b.a+a.c*b.b,b:a.b*b.a+a.d*b.b,c:a.a*b.c+a.c*b.d,d:a.b*b.c+a.d*b.d,e:a.a*b.e+a.c*b.f+a.e,f:a.b*b.e+a.d*b.f+a.f});
const inverse=m=>{const det=m.a*m.d-m.b*m.c;if(!det)throw new Error('Singular SVG transform');return {a:m.d/det,b:-m.b/det,c:-m.c/det,d:m.a/det,e:(m.c*m.f-m.d*m.e)/det,f:(m.b*m.e-m.a*m.f)/det};};

/** Absolute line/cubic representation; quadratic and shorthand SVG commands normalize identically. */
export function canonicalPath(d,{matrix=identity,normalizeOrigin=false}={}){
 const input=String(d||'').match(tokens)||[],segments=[];let index=0,command=null,x=0,y=0,sx=0,sy=0,previous=null,control=null;
 const point=(px,py)=>apply(matrix,px,py);
 const add=(type,...coords)=>segments.push([type,...coords.flatMap(([px,py])=>point(px,py))]);
 const get=()=>{if(index>=input.length||/^[a-z]$/i.test(input[index]))throw new Error('Invalid SVG path coordinate');const n=Number(input[index++]);if(!Number.isFinite(n))throw new Error('Invalid SVG path coordinate');return n;};
 while(index<input.length){
  if(/^[a-z]$/i.test(input[index]))command=input[index++];
  if(!command)throw new Error('Missing SVG path command');
  const relative=command===command.toLowerCase(),op=command.toUpperCase(),ox=x,oy=y;
  const pair=()=>{const px=get(),py=get();return [relative?px+ox:px,relative?py+oy:py];};
  let end;
  if(op==='M'){end=pair();[x,y]=end;[sx,sy]=end;add('M',end);command=relative?'l':'L';control=null;}
  else if(op==='L'){end=pair();add('L',[x,y],end);[x,y]=end;control=null;}
  else if(op==='H'){const n=get();end=[relative?x+n:n,y];add('L',[x,y],end);[x,y]=end;control=null;}
  else if(op==='V'){const n=get();end=[x,relative?y+n:n];add('L',[x,y],end);[x,y]=end;control=null;}
  else if(op==='C'){const c1=pair(),c2=pair();end=pair();add('C',[x,y],c1,c2,end);[x,y]=end;control=c2;}
  else if(op==='S'){const c1=['C','S'].includes(previous)&&control?[2*x-control[0],2*y-control[1]]:[x,y],c2=pair();end=pair();add('C',[x,y],c1,c2,end);[x,y]=end;control=c2;}
  else if(op==='Q'||op==='T'){const c1=op==='Q'?pair():['Q','T'].includes(previous)&&control?[2*x-control[0],2*y-control[1]]:[x,y];end=pair();add('C',[x,y],[x+(c1[0]-x)*2/3,y+(c1[1]-y)*2/3],[end[0]+(c1[0]-end[0])*2/3,end[1]+(c1[1]-end[1])*2/3],end);[x,y]=end;control=c1;}
  else if(op==='Z'){if(Math.hypot(x-sx,y-sy)>1e-8)add('L',[x,y],[sx,sy]);x=sx;y=sy;command=null;control=null;}
  else throw new Error(`Unsupported SVG text path command ${op}`);
  previous=op;
 }
 if(normalizeOrigin&&segments.length){const [,ox,oy]=segments[0];for(const segment of segments)for(let i=1;i<segment.length;i+=2){segment[i]-=ox;segment[i+1]-=oy;}}
 return segments;
}

const near=(a,b,tolerance=.12)=>a.length===b.length&&a.every((segment,i)=>segment.length===b[i].length&&segment[0]===b[i][0]&&segment.slice(1).every((v,j)=>Math.abs(v-b[i][j+1])<=tolerance));
const contained=(a,b,t=.5)=>a[0]>=b[0]-t&&a[1]>=b[1]-t&&a[0]+a[2]<=b[0]+b[2]+t&&a[1]+a[3]<=b[1]+b[3]+t;

export function sourceColor(value){
 if(typeof value==='string')return value;
 if(value&&typeof value==='object')return `rgba(${Math.round((value.r??0)*255)}, ${Math.round((value.g??0)*255)}, ${Math.round((value.b??0)*255)}, ${value.a??1})`;
 return '#0F172A';
}

/** Exact outline matching fails closed when source ownership is uncertain. */
export function matchSourceTextSlot(slot,records,{tolerance=.12}={}){
 if(slot.text===''&&!slot.outline)return {status:'empty',paths:[],offset:[0,0]};
 if(!slot.outline)return {status:'unresolved',paths:[]};
 let expected,original;
 try{original=canonicalPath(slot.outline);expected=canonicalPath(slot.outline,{normalizeOrigin:true});}catch{return {status:'unresolved',paths:[]};}
 const clip=slot.sourceClipBox;
 if(Array.isArray(clip)&&clip.length===4&&clip.every(Number.isFinite)&&clip[2]>=0&&clip[3]>=0&&original.length){
  // Cubic control points enclose their curve: a disjoint hull proves there
  // cannot be original glyph ink inside the supplied native ancestor clip.
  const xs=original.flatMap(s=>s.slice(1).filter((_,i)=>i%2===0)),ys=original.flatMap(s=>s.slice(1).filter((_,i)=>i%2===1));
  if(Math.max(...xs)<=clip[0]||Math.min(...xs)>=clip[0]+clip[2]||Math.max(...ys)<=clip[1]||Math.min(...ys)>=clip[1]+clip[3])return {status:'empty-clipped',paths:[],offset:[0,0]};
 }
 const candidates=records.filter(p=>(!p.tag||p.tag==='path')&&p.d&&contained(p.bounds,slot.box,Math.max(.5,slot.font?.size*.08||0)));
 const prepared=candidates.flatMap(path=>{try{return [{path,geometry:canonicalPath(path.d,{matrix:path.matrix||identity})}];}catch{return [];}}),matches=[];
 let ambiguous=false;
 function search(index,chosen,origin){
  if(ambiguous)return;
  if(index===expected.length){
   const geometry=chosen.flatMap(p=>p.part.geometry),first=matches[0];
   // The native off-fold tile and the original compound SVG run can both
   // contain the same text. Own every complete coincident copy, using the
   // same tolerance as source-export rounding; independent text stays ambiguous.
   if(first&&(!near(first.geometry,geometry,tolerance)||matches.length>=64)){ambiguous=true;return;}
   matches.push({chosen,origin,geometry});return;
  }
  if(chosen.length>=12)return;
  for(const part of prepared){
   if(chosen.some(p=>p.part===part)||!part.geometry.length||index+part.geometry.length>expected.length)continue;
   const start=origin||[part.geometry[0][1],part.geometry[0][2]];
   const normalized=part.geometry.map(s=>s.map((n,i)=>i? n-start[(i-1)%2]:n));
   if(!near(expected.slice(index,index+part.geometry.length),normalized,tolerance))continue;
   search(index+part.geometry.length,[...chosen,{part,start:index,end:index+part.geometry.length}],start);
  }
 }
 search(0,[],null);
 if(ambiguous||!matches.length)return {status:ambiguous?'ambiguous':'unresolved',paths:[]};
 const result=matches[0];
 const paths=result.chosen.map(p=>p.part.path),duplicatePaths=[...new Set(matches.slice(1).flatMap(m=>m.chosen.map(p=>p.part.path)))].filter(p=>!paths.includes(p));
 return {status:'matched',paths,duplicatePaths,ranges:result.chosen.map(p=>({start:p.start,end:p.end})),offset:[result.origin[0]-original[0][1],result.origin[1]-original[0][2]]};
}

function relativeMatrix(element,svg){return multiply(inverse(svg.getCTM()||identity),element.getCTM()||identity);}
export function boxFromSvgElement(element,svg){
 const b=element.getBBox(),m=relativeMatrix(element,svg),points=[[b.x,b.y],[b.x+b.width,b.y],[b.x,b.y+b.height],[b.x+b.width,b.y+b.height]].map(([x,y])=>apply(m,x,y)),xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
 return [Math.min(...xs),Math.min(...ys),Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys)];
}

function sourcePaintParts(slot,original,match,library){
 if(match.paths.length<2)return null;
 let segment=0;
 const clusters=original.clusters.map(c=>{const start=segment;segment+=c.d?canonicalPath(c.d).length:0;return {...c,segmentStart:start,segmentEnd:segment};});
 const parts=match.ranges.map((range,i)=>{
  const glyphs=clusters.filter(c=>c.segmentEnd>c.segmentStart&&c.segmentStart>=range.start&&c.segmentEnd<=range.end),first=glyphs[0];
  if(!first)return null;
  let fontKey=original.fontKey;
  const base=library?.fonts?.[fontKey];if(!base)return null;
  const fontMatches=Object.entries(library.fonts).filter(([,f])=>f.family===base.family&&f.glyphs[first.text]?.d===first.glyphD);
  if(!fontMatches.some(([key])=>key===fontKey)&&fontMatches.length)fontKey=fontMatches[0][0];
  const font=library.fonts[fontKey],start=first.start,lineIndex=String(slot.text).slice(0,start).split('\n').length-1,lineStart=String(slot.text).lastIndexOf('\n',start-1)+1;
  return {pathIndex:i,start,end:glyphs.at(-1).end,lineIndex,column:start-lineStart,x:first.x+match.offset[0],baseline:first.baseline+match.offset[1],font:{family:font.family,style:font.style,weight:font.weight,fontKey,size:first.size},paint:match.paths[i].element.getAttribute('fill')||sourceColor(slot.font?.color)};
 });
 if(parts.some(p=>!p))return null;
 for(let i=0;i<parts.length;i++){const next=parts[i+1];parts[i].end=next&&next.lineIndex===parts[i].lineIndex?next.start:parts[i].end;parts[i].text=String(slot.text).slice(parts[i].start,parts[i].end);}
 return parts;
}

/** Bind only; all original drawing attributes remain untouched until setTextSlot changes a value. */
export function bindSourceTextSlots(document,slots,{library,sourceBounds}={}){
 const svg=document.documentElement?.localName==='svg'?document.documentElement:document.querySelector('svg');
 const ready=new Map(),unresolved=[];
 if(!svg)return {ready,unresolved:slots.map(s=>s.id),setTextSlot:()=>({ok:false,status:'unresolved',missingGlyphs:[]}),restore(){}};
 const view=svg.viewBox?.baseVal||{},origin=[sourceBounds?.x??view.x??0,sourceBounds?.y??view.y??0],records=[];
 for(const element of svg.querySelectorAll('path')){
  if(element.closest('defs,clipPath,mask,pattern,filter'))continue;
  try{const b=boxFromSvgElement(element,svg),m=relativeMatrix(element,svg);records.push({element,tag:'path',d:element.getAttribute('d'),bounds:[b[0]-origin[0],b[1]-origin[1],b[2],b[3]],matrix:{...m,e:m.e-origin[0],f:m.f-origin[1]}});}catch{/* Non-rendered source definitions are never candidates. */}
 }
 for(const slot of slots){
  const font=slot.font||{},box=slot.box||slot.bbox;
  if(!box)continue;
  const original=generateGlyphPaths(library,{...font,value:slot.text??'',x:box[0],baseline:box[1]+(font.baseline??font.size??14),width:box[2],height:box[3]});
  const match=matchSourceTextSlot({...slot,box,outline:slot.outline||(!original.missingGlyphs.length?original.d:undefined)},records);
  if(['matched','empty','empty-clipped'].includes(match.status))ready.set(slot.id,{slot:{...slot,box},...match,paint:match.paths[0]?.element.getAttribute('fill')||sourceColor(font.color),parts:sourcePaintParts(slot,original,match,library),replacement:null,partLayers:[],changed:false,originalOpacity:match.paths.map(p=>p.element.getAttribute('opacity')),duplicateOpacity:(match.duplicatePaths||[]).map(p=>p.element.getAttribute('opacity'))});
  else unresolved.push({id:slot.id,status:match.status});
 }
 function restoreOpacity(record,i){const opacity=record.originalOpacity[i],element=record.paths[i].element;hiddenSourceText.delete(element);if(opacity==null){if(element.getAttribute('opacity')!=null)element.removeAttribute('opacity');}else if(element.getAttribute('opacity')!==opacity)element.setAttribute('opacity',opacity);}
 function clearLayers(record){record.replacement?.remove();for(const p of record.partLayers)p.remove();record.partLayers=[];record.replacement=null;record.clip?.remove();record.clip=null;}
 function applySourceClip(record,node){
  const box=record.slot.sourceClipBox;if(!box)return;
  if(!record.clip){const clip=document.createElementNS('http://www.w3.org/2000/svg','clipPath'),rect=document.createElementNS('http://www.w3.org/2000/svg','rect');clip.setAttribute('id','source-text-clip-'+(++clipSequence));clip.setAttribute('clipPathUnits','userSpaceOnUse');for(const [i,name]of ['x','y','width','height'].entries())rect.setAttribute(name,box[i]);clip.append(rect);svg.append(clip);record.clip=clip;}
  node.setAttribute('clip-path','url(#'+record.clip.getAttribute('id')+')');
 }
 function restoreRecord(record){record.paths.forEach((p,i)=>restoreOpacity(record,i));(record.duplicatePaths||[]).forEach((p,i)=>{const opacity=record.duplicateOpacity[i];hiddenSourceText.delete(p.element);if(opacity==null)p.element.removeAttribute('opacity');else p.element.setAttribute('opacity',opacity);});clearLayers(record);record.changed=false;record.nativeFallback=false;}
 function hideCopies(record){for(const p of record.duplicatePaths||[]){hiddenSourceText.add(p.element);p.element.setAttribute('opacity','0');}}
 function hideRecord(record){for(const p of record.paths){hiddenSourceText.add(p.element);p.element.setAttribute('opacity','0');}hideCopies(record);record.changed=true;}
 function setTextSlot(slotOrId,value,{font:fontOverride,nativeFallback=false}={}){
  const id=typeof slotOrId==='string'?slotOrId:slotOrId?.id,record=ready.get(id);
  if(!record)return {ok:false,status:'unresolved',missingGlyphs:[]};
  const text=String(value??''),{slot}=record;
  if(text===String(slot.text??'')){if(record.changed)restoreRecord(record);return {ok:true,status:'original',missingGlyphs:[]};}
  const font={...slot.font,...fontOverride},box=slot.box,[dx,dy]=record.offset;
  const resolvedPaint=fontOverride?.color!=null?sourceColor(fontOverride.color):record.paint;
  if(fontOverride&&!fontOverride.fontKey&&['family','style','weight'].some(k=>Object.hasOwn(fontOverride,k)))delete font.fontKey;
  if(record.parts){
   const lines=text.split('\n'),lineParts=new Map();for(const p of record.parts)lineParts.set(p.lineIndex,(lineParts.get(p.lineIndex)||0)+1);
   const planned=record.parts.map((part,i)=>{
    const next=record.parts[i+1],line=lines[part.lineIndex]||'',value=lineParts.get(part.lineIndex)===1?line:line.slice(part.column,next?.lineIndex===part.lineIndex?next.column:undefined),style={...font,...part.font,...fontOverride};
    if(fontOverride&&!fontOverride.fontKey&&['family','style','weight'].some(k=>Object.hasOwn(fontOverride,k)))delete style.fontKey;
    return {part,value,style,generated:generateGlyphPaths(library,{...style,value,x:part.x,baseline:part.baseline}),original:value===part.text};
   });
   const missing=[...new Set(planned.flatMap(p=>p.generated.missingGlyphs))];
   if(missing.length&&!nativeFallback){hideRecord(record);clearLayers(record);return {ok:false,status:'missing-glyphs',sourceHidden:true,missingGlyphs:missing};}
   hideCopies(record);clearLayers(record);record.changed=true;
   for(const {part,value,style,generated,original} of planned){
    if(original){restoreOpacity(record,part.pathIndex);continue;}
    const source=record.paths[part.pathIndex].element;hiddenSourceText.add(source);source.setAttribute('opacity','0');
    const native=generated.missingGlyphs.length>0,node=document.createElementNS('http://www.w3.org/2000/svg',native?'text':'path'),local=multiply(inverse(relativeMatrix(source.parentNode,svg)),{...identity,e:origin[0],f:origin[1]});
    node.setAttribute('transform',`matrix(${local.a} ${local.b} ${local.c} ${local.d} ${local.e} ${local.f})`);node.setAttribute('aria-hidden','true');node.setAttribute('pointer-events','none');node.setAttribute('fill',fontOverride?.color!=null?sourceColor(fontOverride.color):part.paint);node.setAttribute('data-source-text-slot',slot.id);node.setAttribute('data-source-value',text);
    if(native){node.setAttribute('x',part.x);node.setAttribute('y',part.baseline);node.setAttribute('font-family',style.family);node.setAttribute('font-size',style.size);node.setAttribute('font-weight',style.weight);node.setAttribute('font-style',/italic/i.test(style.style||'')?'italic':'normal');node.textContent=value;}else node.setAttribute('d',generated.d);
    applySourceClip(record,node);source.parentNode.insertBefore(node,source.nextSibling);record.partLayers.push(node);
   }
   return {ok:true,status:missing.length?'font-fallback':'changed',missingGlyphs:missing};
  }
  const generated=generateGlyphPaths(library,{...font,value:text,x:box[0]+dx,baseline:box[1]+(font.baseline??font.size??14)+dy,width:box[2],height:box[3]});
  if(generated.missingGlyphs.length){
   hideRecord(record);clearLayers(record);
   if(nativeFallback){
    const node=document.createElementNS('http://www.w3.org/2000/svg','text'),last=record.paths.at(-1)?.element,parentMatrix=last?relativeMatrix(last.parentNode,svg):identity,local=multiply(inverse(parentMatrix),{...identity,e:origin[0],f:origin[1]});
    node.setAttribute('transform',`matrix(${local.a} ${local.b} ${local.c} ${local.d} ${local.e} ${local.f})`);node.setAttribute('aria-hidden','true');node.setAttribute('pointer-events','none');node.setAttribute('fill',resolvedPaint);node.setAttribute('font-family',font.family||'Roboto');node.setAttribute('font-size',font.size||14);node.setAttribute('font-weight',font.weight||400);node.setAttribute('data-source-text-slot',slot.id);node.setAttribute('data-source-value',text);
    const align=String(font.align||'left').toLowerCase(),x=box[0]+dx+(align==='center'?box[2]/2:align==='right'?box[2]:0),baseline=box[1]+(font.baseline??font.size??14)+dy;
    node.setAttribute('text-anchor',align==='center'?'middle':align==='right'?'end':'start');node.setAttribute('font-style',/italic/i.test(font.style||'')?'italic':'normal');
    text.split('\n').forEach((line,i)=>{const span=document.createElementNS('http://www.w3.org/2000/svg','tspan');span.setAttribute('x',x);span.setAttribute('y',baseline+i*(font.lineHeight||font.size*1.2||17));span.textContent=line;node.append(span);});
    applySourceClip(record,node);if(last)last.parentNode.insertBefore(node,last.nextSibling);else svg.append(node);record.replacement=node;record.nativeFallback=true;
    return {ok:true,status:'font-fallback',missingGlyphs:generated.missingGlyphs,sourceHidden:true};
   }
   return {ok:false,status:'missing-glyphs',missingGlyphs:generated.missingGlyphs,sourceHidden:true};
  }
  if(record.nativeFallback){record.replacement?.remove();record.replacement=null;record.nativeFallback=false;}
  if(!record.replacement){
   const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('aria-hidden','true');path.setAttribute('pointer-events','none');
   path.setAttribute('fill',resolvedPaint);
   const last=record.paths.at(-1)?.element;
   const parentMatrix=last?relativeMatrix(last.parentNode,svg):identity;
   const local=multiply(inverse(parentMatrix),{...identity,e:origin[0],f:origin[1]});
   path.setAttribute('transform',`matrix(${local.a} ${local.b} ${local.c} ${local.d} ${local.e} ${local.f})`);
   applySourceClip(record,path);if(last)last.parentNode.insertBefore(path,last.nextSibling);else svg.append(path);
   record.replacement=path;
   hideRecord(record);
  }
  record.replacement.setAttribute('fill',resolvedPaint);
  record.replacement.setAttribute('data-source-text-slot',slot.id);record.replacement.setAttribute('data-source-value',text);
  record.replacement.setAttribute('d',generated.d);
  return {ok:true,status:'changed',missingGlyphs:[]};
 }
 function restore(id){if(id!=null){const record=ready.get(typeof id==='string'?id:id.id);if(record?.changed)restoreRecord(record);}else for(const record of ready.values())if(record.changed)restoreRecord(record);}
 function hideOriginal(id){const record=ready.get(typeof id==='string'?id:id.id);if(!record)return false;hideRecord(record);clearLayers(record);return true;}
 return {ready,unresolved,setTextSlot,restore,hideOriginal};
}
