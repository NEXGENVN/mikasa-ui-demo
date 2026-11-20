import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {nativeFrames} from '../figma-preview/native-frames.mjs';
import {readSourceSvgPaths} from './source-svg-paths.mjs';
import {generateGlyphPaths} from '../figma-preview/source-glyphs.mjs';
import {sourceGlyphLibrary} from '../figma-preview/source-glyph-library.mjs';

const attrs=s=>Object.fromEntries([...s.matchAll(/([\w:.-]+)="([^"]*)"/g)].map(m=>[m[1],m[2]]));
const number=n=>String(Math.round(n*1e6)/1e6);
const I={a:1,b:0,c:0,d:1,e:0,f:0};
const mul=(a,b)=>({a:a.a*b.a+a.c*b.b,b:a.b*b.a+a.d*b.b,c:a.a*b.c+a.c*b.d,d:a.b*b.c+a.d*b.d,e:a.a*b.e+a.c*b.f+a.e,f:a.b*b.e+a.d*b.f+a.f});
function matrix(value=''){
 let out=I;
 for(const t of value.matchAll(/(matrix|translate|scale|rotate)\(([^)]*)\)/g)){
  const n=t[2].split(/[ ,]+/).map(Number);let m=I;
  if(t[1]==='translate')m={...I,e:n[0],f:n[1]||0};
  if(t[1]==='scale')m={...I,a:n[0],d:n[1]??n[0]};
  if(t[1]==='matrix')m=Object.fromEntries(['a','b','c','d','e','f'].map((key,i)=>[key,n[i]]));
  if(t[1]==='rotate'){const r=n[0]*Math.PI/180;m={a:Math.cos(r),b:Math.sin(r),c:-Math.sin(r),d:Math.cos(r),e:0,f:0};if(n.length===3)m=mul(mul({...I,e:n[1],f:n[2]},m),{...I,e:-n[1],f:-n[2]});}
  out=mul(out,m);
 }
 return out;
}
const contains=(a,b)=>b[0]>=a[0]-.1&&b[1]>=a[1]-.1&&b[0]+b[2]<=a[0]+a[2]+.1&&b[1]+b[3]<=a[1]+a[3]+.1;
const paintNames=['fill','fill-opacity','stroke','stroke-width','stroke-opacity','opacity','fill-rule','clip-rule'];

/** Copy native primitives and glyph paths verbatim, retaining inherited paint and transforms. */
export function extractNativeMessageRegion(html,box){
 const xml=html.match(/<svg\b[\s\S]*<\/svg>/)?.[0]||html,parsed=readSourceSvgPaths(xml),origin=parsed.viewBox.slice(0,2),stack=[],parts=[];let index=0;
 const skipped=new Set(['defs','mask','clipPath','filter','pattern','linearGradient','radialGradient']);
 for(const match of xml.matchAll(/<!--[\s\S]*?-->|<\/?[\w:.-]+\b[^>]*>/g)){
  const tag=match[0];if(tag.startsWith('<!'))continue;if(tag.startsWith('</')){stack.pop();continue;}
  const name=tag.match(/^<([\w:.-]+)/)[1],a=attrs(tag),parent=stack.at(-1)||{matrix:I,skip:false,transforms:[],paint:{}},m=mul(parent.matrix,matrix(a.transform)),skip=parent.skip||skipped.has(name)||a.display==='none'||a.opacity==='0',transforms=[...parent.transforms,...(a.transform?[a.transform]:[])],paint={...parent.paint,...Object.fromEntries(paintNames.filter(key=>a[key]!=null).map(key=>[key,a[key]]))};
  let bounds;
  if(!skip&&name==='path'&&a.d)bounds=parsed.paths[index++]?.bounds;
  if(!skip&&['rect','circle','ellipse'].includes(name)){
   const x=Number(a.x||0),y=Number(a.y||0),rx=Number(a.rx||a.r||0),ry=Number(a.ry||a.r||0),b=name==='rect'?[x,y,Number(a.width||0),Number(a.height||0)]:[Number(a.cx)-rx,Number(a.cy)-ry,rx*2,ry*2],points=[[b[0],b[1]],[b[0]+b[2],b[1]],[b[0],b[1]+b[3]],[b[0]+b[2],b[1]+b[3]]].map(([x,y])=>[m.a*x+m.c*y+m.e-origin[0],m.b*x+m.d*y+m.f-origin[1]]),xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);bounds=[Math.min(...xs),Math.min(...ys),Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys)];
  }
  if(bounds&&contains(box,bounds)){
   const inherited=Object.entries(parent.paint).map(([key,value])=>`${key}="${value}"`).join(' '),wrapper=parent.transforms.length?` transform="${parent.transforms.join(' ')}"`:'';
   parts.push(`<g${wrapper}${inherited?' '+inherited:''}>${tag.replace(/>$/,'/>').replace(/\/\/>$/,'/>')}</g>`);
  }
  if(!tag.endsWith('/>'))stack.push({matrix:m,skip,transforms,paint});
 }
 if(!parts.length)throw new Error('No native message ink at '+box.join(','));
 const [x,y,width,height]=box;
 return {width,height,primitiveCount:parts.length,svg:`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${number(origin[0]+x)} ${number(origin[1]+y)} ${width} ${height}" fill="none">${parts.join('')}</svg>`};
}

export async function buildAppMessageArtwork({root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')}={}){
 const source=async id=>fs.readFile(path.join(root,'figma-preview',nativeFrames.find(f=>f.id===id).file),'utf8'),out={};
 const expanded=JSON.parse(await fs.readFile(path.join(root,'.audit/interactive-expanded-source.json'),'utf8'));
 await fs.mkdir(path.join(root,'figma-preview/assets/interactive-app'),{recursive:true});
 async function save(key,id,box){
  const art=extractNativeMessageRegion(await source(id),box),content=art.svg+'\n',hash=createHash('sha256').update(content).digest('hex').slice(0,12),file=`assets/interactive-app/message-${key}.${hash}.svg`;
  await fs.writeFile(path.join(root,'figma-preview',file),content);return {file,width:art.width,height:art.height,sourceFrameId:id,sourceBox:box};
 }
 for(const [theme,history,scheduled,detail]of [['light','784:48201','1085:71117','1308:6902'],['dark','1430:85846','1444:92629','1450:8895']]){
  const hx=theme==='light'?25:29,bx=theme==='light'?262:266;
  const result={history:{},oa:{},segments:{}};out[theme]=result;
  for(const [state,y]of [['success',287],['failed',506],['sent',433]])result.history[state]={icon:await save(`${theme}-icon-${state}`,history,[hx,y,35,35]),badge:await save(`${theme}-history-${state}`,history,[bx,y+7,70,25])};
  result.history.scheduled={icon:await save(`${theme}-icon-scheduled`,scheduled,[29,287,35,35]),badge:await save(`${theme}-history-scheduled`,scheduled,[266,294,70,25])};
  result.history.pending=result.history.scheduled;
  const partialBase=extractNativeMessageRegion(await source(history),[bx,294,70,25]),statusFont=expanded.frames.find(f=>f.id===history).nodes.find(n=>n.name==='Status'&&n.text==='Hoàn thành').font,partialVB=partialBase.svg.match(/viewBox="([^"]+)"/)[1].split(' ').map(Number),glyphs=generateGlyphPaths(sourceGlyphLibrary,{...statusFont,value:'Một phần',x:partialVB[0],baseline:partialVB[1]+6.5+statusFont.baseline,width:70,align:'center'});
  if(glyphs.missingGlyphs.length)throw new Error('Partial native status glyphs are unavailable');
  const partialPaint=partialBase.svg.match(/<path[^>]*fill="([^"]+)"/)?.[1],partialSVG=partialBase.svg.replace(/<path\b[^>]*\/>/g,'').replace('</svg>',`<path d="${glyphs.d}" fill="${partialPaint}" data-source-value="Một phần"/></svg>`)+'\n',partialHash=createHash('sha256').update(partialSVG).digest('hex').slice(0,12),partialFile=`assets/interactive-app/message-${theme}-history-partial.${partialHash}.svg`;
  await fs.writeFile(path.join(root,'figma-preview',partialFile),partialSVG);result.history.partial={icon:result.history.success.icon,badge:{...result.history.success.badge,file:partialFile}};
  for(const [state,y]of [['success',604],['failed',632],['pending',688]])result.oa[state]=await save(`${theme}-oa-${state}`,detail,[288,y,70,20]);
  result.oa.scheduled=result.oa.pending;result.oa.sent=result.oa.pending;
  // The source has no 20px sent badge. Reuse its native 25px sent variant,
  // keeping glyph size and centering while shortening only the background.
  const sentSource=extractNativeMessageRegion(await source(history),[bx,440,70,25]),vb=sentSource.svg.match(/viewBox="([^"]+)"/)[1].split(' ').map(Number);
  const sentSvg=sentSource.svg.replace('height="25"','height="20"').replace(/viewBox="[^"]+"/,`viewBox="${vb[0]} ${vb[1]} 70 20"`).replace(/(<rect\b[^>]*?)height="25"([^>]*?)rx="12.5"/g,'$1height="20"$2rx="10"').replace(/(<path\b[^>]*)(\/>)/g,'<g transform="translate(0 -2.5)">$1$2</g>'),sentContent=sentSvg+'\n',sentHash=createHash('sha256').update(sentContent).digest('hex').slice(0,12),sentFile=`assets/interactive-app/message-${theme}-oa-sent.${sentHash}.svg`;
  await fs.writeFile(path.join(root,'figma-preview',sentFile),sentContent);result.oa.sent={file:sentFile,width:70,height:20,sourceFrameId:history,sourceBox:[bx,440,70,25]};
  for(const [state,box]of [['success',[32,588,129,6]],['failed',[161,588,99.5,6]],['pending',[260.5,588,99.5,6]]]){const art=extractNativeMessageRegion(await source(detail),box);result.segments[state]={...await save(`${theme}-segment-${state}`,detail,box),fill:[...art.svg.matchAll(/fill="([^"]+)"/g)].map(m=>m[1]).find(v=>v!=='none'),radius:3};}
 }
 await fs.writeFile(path.join(root,'figma-preview/app-message-artwork.mjs'),'// Exact native source badge glyphs, status icons and OA segment primitives.\nexport const appMessageArtwork='+JSON.stringify(out)+';\n');
 return out;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(await buildAppMessageArtwork()));
