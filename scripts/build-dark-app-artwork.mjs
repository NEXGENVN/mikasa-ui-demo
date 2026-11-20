import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {nativeFrames} from '../figma-preview/native-frames.mjs';
import {appInteractiveFrames} from '../figma-preview/app-interactive-controls.mjs';
import {sourceComponentCounters,sourceComponentPopups} from '../figma-preview/source-component-states.mjs';
import {readSourceSvgPaths} from './source-svg-paths.mjs';
import {sourceGlyphLibrary} from '../figma-preview/source-glyph-library.mjs';
import {generateGlyphPaths} from '../figma-preview/source-glyphs.mjs';
import {matchSourceTextSlot} from '../figma-preview/source-text-slots.mjs';

const attrs=tag=>Object.fromEntries([...tag.matchAll(/([\w:-]+)="([^"]*)"/g)].map(([,key,value])=>[key,value]));
const number=n=>String(Math.round(n*1e6)/1e6);
const inside=(a,b)=>a[0]>=b[0]-.001&&a[1]>=b[1]-.001&&a[0]+a[2]<=b[0]+b[2]+.001&&a[1]+a[3]<=b[1]+b[3]+.001;
const counterSources={2:'1432:10827',3:'1432:10696',4:'1432:10566',5:'1430:86331'};

// These regions contain untransformed exported rects and explicit path paints.
// Preserve their complete geometry, including the original chevron strokes.
function sourceRegion(svg,box){
 const parsed=readSourceSvgPaths(svg),[ox,oy]=parsed.viewBox,[x,y,w,h]=box,drawing=svg.slice(svg.indexOf('</defs>')+7),rects=[];
 for(const match of drawing.matchAll(/<rect\b[^>]*\/>/g)){
  const a=attrs(match[0]);if(a.transform||a.x==null||a.y==null)continue;
  const b=[Number(a.x)-ox,Number(a.y)-oy,Number(a.width),Number(a.height)];
  if(!inside(b,box))continue;
  rects.push(match[0].replace(/\bx="[^"]*"/,`x="${number(b[0]-x)}"`).replace(/\by="[^"]*"/,`y="${number(b[1]-y)}"`));
 }
 const paths=parsed.paths.filter(p=>inside(p.bounds,box)).map(p=>{
  const tag=[...drawing.matchAll(/<path\b[^>]*\/>/g)].map(m=>m[0]).find(tag=>attrs(tag).d===p.d&&attrs(tag).fill===p.fill);
  if(!tag)throw Error('Missing original source path attributes');
  const m={...p.matrix,e:p.matrix.e-x,f:p.matrix.f-y},transform=`matrix(${[m.a,m.b,m.c,m.d,m.e,m.f].map(number).join(' ')})`;
  return tag.replace(/\s+transform="[^"]*"/,'').replace('/>',` transform="${transform}"/>`);
 });
 if(!rects.length||!paths.length)throw Error('Missing original source region '+box.join(','));
 return {width:w,height:h,body:[...rects,...paths].join('\n')};
}

function replacePopupHeader(svg,body){
 const start=svg.indexOf('</defs>')+7;let depth=0,headerStart=-1;
 for(const match of svg.slice(start).matchAll(/<\/?g\b[^>]*>/g)){
  const closing=match[0].startsWith('</');if(closing){depth--;if(depth===1&&headerStart>=0)return svg.slice(0,headerStart)+'<g>'+body+'</g>'+svg.slice(start+match.index+match[0].length);}
  else{depth++;if(depth===2&&headerStart<0){if(!/transform="matrix\(1 0 0 1 0 0\)"/.test(match[0]))throw Error('Unexpected popup header transform');headerStart=start+match.index;}}
 }
 throw Error('Missing native popup header group');
}

/** Copy only source-proved dark paints and exact exported cap/header geometry. */
export async function buildDarkAppArtwork({root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),sourceRoot=path.join(root,'figma-preview')}={}){
 const directory=path.join(root,'figma-preview/assets/interactive-app');await fs.mkdir(directory,{recursive:true});
 const read=file=>fs.readFile(path.join(sourceRoot,file),'utf8'),sources=new Map();
 async function sourceSvg(id){if(!sources.has(id)){const frame=nativeFrames.find(f=>f.id===id);if(!frame)throw Error('Unknown original dark frame '+id);const html=await read(frame.file),svg=html.match(/<svg[\s\S]*<\/svg>/)?.[0];if(!svg)throw Error('Missing original source SVG '+id);sources.set(id,svg);}return sources.get(id);}
 async function write(svg,label){const contents=svg.trim()+'\n',hash=createHash('sha256').update(contents).digest('hex').slice(0,12),file=`assets/interactive-app/${label}.${hash}.svg`;await fs.writeFile(path.join(root,'figma-preview',file),contents);return file;}
 const counters={},popups={};
 for(const [cap,sourceId]of Object.entries(counterSources)){
  const region=sourceRegion(await sourceSvg(sourceId),[244,406,130,50]);
  // Original cap screenshots have only a minus button and the current digit.
  // The exported number is light; the supplied minus stroke remains dark.
  const capPaths=readSourceSvgPaths(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 130 50">${region.body}</svg>`).paths;
  if(capPaths.length!==2||capPaths.filter(p=>p.fill==='#F8FAFF').length!==1||!region.body.includes('stroke="#121212"'))throw Error('Unexpected original dark cap artwork '+sourceId);
  const states={};
  for(const [value,state]of Object.entries(sourceComponentCounters.dark.states).filter(([value])=>Number(value)<=Number(cap))){
   let svg=await read(state.file);const controls=state.controls.map(c=>({...c,box:[...c.box]}));
   if(value===cap){svg=`<svg xmlns="http://www.w3.org/2000/svg" width="130" height="50" viewBox="0 0 130 50" fill="none">\n${region.body}\n</svg>`;for(let i=controls.length-1;i>=0;i--)if(controls[i].action==='app.oa.plus')controls.splice(i,1);}
   else{
    // Unexported intermediate states retain the supplied native component
    // geometry and already source-aligned plus paints. Match the actual digit
    // outline so the equally dark native minus is never recolored.
    const font={family:'Roboto',style:'Medium',weight:500,size:16,lineHeight:24,baseline:17.46875,align:'CENTER',fontKey:'Roboto|Medium|500'},outline=generateGlyphPaths(sourceGlyphLibrary,{...font,value,x:0,baseline:font.baseline,width:130,height:50}),match=matchSourceTextSlot({box:[0,0,130,50],font,text:value,outline:outline.d},readSourceSvgPaths(svg).paths);
    if(match.status!=='matched'||match.paths.length!==1||match.paths[0].fill!=='rgba(18, 18, 18, 1)')throw Error('Missing native dark numeric glyph '+value);
    let changed=0;svg=svg.replace(/<path\b[^>]*>/g,tag=>{if(attrs(tag).d!==match.paths[0].d)return tag;changed++;return tag.replace(/fill="[^"]*"/,'fill="#F8FAFF"');});if(changed!==1)throw Error('Ambiguous native dark numeric glyph '+value);
   }
   states[value]={...state,...(value===cap?{width:130,height:50}:{}),file:await write(svg,`dark-counter-cap-${cap}-${value}`),controls};
  }
  counters[cap]={states};
 }
 for(const f of nativeFrames.filter(f=>f.platform==='app'&&f.theme==='dark'))for(const c of appInteractiveFrames[f.id]?.controls.filter(c=>c.field==='app.profile.gender'&&c.popup)||[]){
  const popup=sourceComponentPopups[c.id]||c.popup,header=sourceRegion(await sourceSvg(f.id),c.box),original=await read(popup.file),svg=replacePopupHeader(original,header.body);
  popups[c.id]={...popup,file:await write(svg,'dark-gender-'+f.id.replace(':','-'))};
 }
 if(Object.keys(popups).length!==10)throw Error('Expected the ten supplied dark gender popups');
 const out={counters,popups};await fs.writeFile(path.join(root,'figma-preview/dark-app-artwork.mjs'),'// Exact exported dark counter/header geometry and paints; native intermediate states/menu rows remain intact.\nexport const darkAppArtwork='+JSON.stringify(out)+';\n');return out;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){const out=await buildDarkAppArtwork();console.log(JSON.stringify({counterCaps:Object.keys(out.counters),counterStates:Object.values(out.counters).reduce((n,c)=>n+Object.keys(c.states).length,0),popups:Object.keys(out.popups).length}));}
