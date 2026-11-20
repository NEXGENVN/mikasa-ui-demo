import fs from 'node:fs/promises';
import path from 'node:path';
import {deserialize} from 'node:v8';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {decodeCommandsBlob} from '../figma-preview/source-glyphs.mjs';
import {sourceColor} from '../figma-preview/source-text-slots.mjs';

const guid=value=>value?`${value.sessionID}:${value.localID}`:null;
const number=value=>String(Math.round(value*1e6)/1e6);
const matrix=t=>`matrix(${[t?.m00??1,t?.m10??0,t?.m01??0,t?.m11??1,t?.m02??0,t?.m12??0].map(number).join(' ')})`;
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');

/** A deliberately narrow native geometry exporter for checkbox/radio/toggle masters. */
export function renderNativeControlArtwork(message,rootId,{width:requestedWidth}={}){
 const raw=new Map(message.nodeChanges.map(n=>[guid(n.guid),n])),children=new Map(),defs=[],warnings=[];
 for(const n of raw.values()){const p=guid(n.parentIndex?.guid);if(!p)continue;if(!children.has(p))children.set(p,[]);children.get(p).push(guid(n.guid));}
 for(const c of children.values())c.sort((a,b)=>{const x=raw.get(a).parentIndex?.position||'',y=raw.get(b).parentIndex?.position||'';return x<y?-1:x>y?1:0;});
 const root=raw.get(rootId);if(!root)throw new Error(`Missing native control ${rootId}`);
 const width=requestedWidth??root.size.x,height=root.size.y,delta=width-root.size.x;
 if(delta&&(root.stackMode!=='HORIZONTAL'||(children.get(rootId)||[]).some(id=>raw.get(id).type!=='ELLIPSE')))throw new Error('Only native horizontal toggle masters support a width variant');
 const cap=Math.min(root.cornerRadius??0,height/2),oldWidth=root.size.x;
 const resizeX=x=>x<=cap?x:x>=oldWidth-cap?x+delta:cap+(x-cap)*(width-2*cap)/(oldWidth-2*cap||1);
 const resizedPath=d=>{let coordinate=0;return d.replace(/[MLQCZ]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?/g,t=>{if(/[MLQCZ]/.test(t)){coordinate=0;return t;}const n=Number(t);return number(coordinate++%2===0?resizeX(n):n);});};
 let seq=0;
 const geometry=(list,paints,resize=false)=>list?.map((g,i)=>{const paint=paints?.[g.styleID??i]||paints?.[0];if(!paint||paint.visible===false)return '';if(paint.type!=='SOLID')throw new Error(`Control paint ${paint.type} requires original exported artwork`);const bytes=message.blobs[g.commandsBlob]?.bytes;if(!bytes)throw new Error(`Missing control geometry blob ${g.commandsBlob}`);const color={...paint.color,a:(paint.color?.a??1)*(paint.opacity??1)},d=decodeCommandsBlob(bytes);return `<path d="${resize?resizedPath(d):d}" fill="${esc(sourceColor(color))}" fill-rule="${g.windingRule==='EVENODD'?'evenodd':'nonzero'}"/>`;}).join('')||'';
 function draw(id,isRoot=false){
  const n=raw.get(id);if(!n||n.visible===false||(n.opacity??1)<=0)return '';
  if(n.type==='INSTANCE')throw new Error(`Nested component ${id} must be resolved before control export`);
  let body;
  if(n.type==='ELLIPSE'||n.cornerRadius!=null){
   const w=isRoot?width:n.size.x,h=n.size.y,r=Math.min(n.cornerRadius??0,w/2,h/2),fill=n.fillPaints?.find(p=>p.visible!==false),stroke=n.strokePaints?.find(p=>p.visible!==false),weight=stroke?n.strokeWeight??1:0,inset=n.strokeAlign==='OUTSIDE'?-weight/2:n.strokeAlign==='INSIDE'?weight/2:0;
   if(fill&&fill.type!=='SOLID'||stroke&&stroke.type!=='SOLID')throw new Error(`Non-solid native control primitive ${id}`);
   const paint=p=>p?esc(sourceColor({...p.color,a:(p.color.a??1)*(p.opacity??1)})):'none';
   const style=` fill="${paint(fill)}"${stroke?` stroke="${paint(stroke)}" stroke-width="${weight}"`:''}`;
   body=n.type==='ELLIPSE'?`<ellipse cx="${w/2}" cy="${h/2}" rx="${w/2-inset}" ry="${h/2-inset}"${style}/>`:`<rect x="${inset}" y="${inset}" width="${w-2*inset}" height="${h-2*inset}" rx="${Math.max(0,r-inset)}"${style}/>`;
  }else body=geometry(n.fillGeometry,n.fillPaints,isRoot&&!!delta)+geometry(n.strokeGeometry,n.strokePaints,isRoot&&!!delta);
  if(!body&&n.fillPaints?.some(p=>p.visible!==false))warnings.push(`No derived source fill geometry on ${id}`);
  const effects=(n.effects||[]).filter(e=>e.visible!==false);
  let filter='';
  if(effects.length){
   if(effects.length!==1||effects[0].type!=='DROP_SHADOW'||(effects[0].spread??0)!==0)throw new Error(`Unsupported native effect on control ${id}`);
   const effect=effects[0],name=`shadow${seq++}`,c=effect.color||{},w=n.size?.x||0,h=n.size?.y||0,r=effect.radius||0,dx=effect.offset?.x||0,dy=effect.offset?.y||0;
   const margin=2*r+Math.max(Math.abs(dx),Math.abs(dy));
   defs.push(`<filter id="${name}" x="${-margin}" y="${-margin}" width="${w+2*margin}" height="${h+2*margin}" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feOffset in="SourceAlpha" dx="${dx}" dy="${dy}" result="offset"/><feGaussianBlur in="offset" stdDeviation="${r/2}" result="blur"/>${effect.showShadowBehindNode===false?'<feComposite in="blur" in2="SourceAlpha" operator="out" result="shadow"/>':''}<feColorMatrix in="${effect.showShadowBehindNode===false?'shadow':'blur'}" type="matrix" values="0 0 0 0 ${c.r||0} 0 0 0 0 ${c.g||0} 0 0 0 0 ${c.b||0} 0 0 0 ${c.a??1} 0" result="paint"/><feMerge><feMergeNode in="paint"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`);
   filter=` filter="url(#${name})"`;
  }
  const descendants=(children.get(id)||[]).map(c=>draw(c)).join('');
  body+=descendants;
  const opacity=n.opacity!=null&&n.opacity!==1?` opacity="${n.opacity}"`:'';
  const positioned=delta&&guid(n.parentIndex?.guid)===rootId&&root.stackPrimaryAlignItems==='MAX'?{...n.transform,m02:(n.transform?.m02||0)+delta}:n.transform;
  return `<g${isRoot?'':` transform="${matrix(positioned)}"`}${opacity}${filter}>${body}</g>`;
 }
 const drawing=draw(rootId,true);
 return {width,height,warnings,svg:`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" overflow="visible">${defs.length?'<defs>'+defs.join('')+'</defs>':''}${drawing}</svg>`};
}

export async function buildSourceControlArtwork({root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),message}={}){
 const raw=message||deserialize(await fs.readFile(path.join(root,'.audit/fig-parser/decoded.v8')));
 const masters=['540:24478','540:24476','540:24475','540:24477','557:34960','557:34962','557:34964','557:34966','64:2770','64:2769','458:18005','458:18006','64:5157','64:5162','540:27698','540:27700','967:65123'];
 const out={},report=[],active=new Set(),directory=path.join(root,'figma-preview/assets/interactive');await fs.mkdir(directory,{recursive:true});
 for(const id of masters)for(const width of id.startsWith('540:244')||id.startsWith('557:349')?[64,50,48]:[undefined]){const artwork=renderNativeControlArtwork(raw,id,{width}),key=width&&width!==64?`${id}@${width}x26`:id,content=artwork.svg+'\n',hash=createHash('sha256').update(content).digest('hex').slice(0,12),filename=`master-${id.replace(':','-')}${width&&width!==64?'-'+width+'x26':''}.${hash}.svg`,file=`assets/interactive/${filename}`;active.add(filename);await fs.writeFile(path.join(root,'figma-preview',file),content);out[key]={file,width:artwork.width,height:artwork.height};report.push({id:key,...out[key],warnings:artwork.warnings});}
 // Remove only generated native-master assets in this exact directory.
 for(const filename of await fs.readdir(directory))if(/^master-\d+-\d+(?:-\d+x\d+)?(?:\.[a-f0-9]{12})?\.svg$/.test(filename)&&!active.has(filename))await fs.unlink(path.join(directory,filename));
 await fs.writeFile(path.join(root,'figma-preview/source-control-artwork.mjs'),'// Exact native control fill/stroke geometry and component state artwork.\nexport const sourceControlArtwork='+JSON.stringify(out)+';\n');
 await fs.writeFile(path.join(root,'.audit/source-control-artwork.json'),JSON.stringify({format:'figma-native-control-artwork-v1',controls:report},null,2)+'\n');
 return report;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(await buildSourceControlArtwork()));
