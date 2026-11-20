import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {nativeFrames} from '../figma-preview/native-frames.mjs';

const number=n=>String(Math.round(n*1e6)/1e6);
const attributes=tag=>Object.fromEntries([...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map(([,key,value])=>[key,value]));
const near=(a,b)=>Math.abs(Number(a)-b)<.0001;

/** Copy the original exported radio primitives; the later .fig paints differ. */
export function extractSourceSendModeArtwork(html,{box}){
 const opening=html.match(/<svg\b[^>]*>/)?.[0],viewBox=attributes(opening||'').viewBox?.split(/\s+/).map(Number);
 if(!viewBox||viewBox.length!==4)throw new Error('Original Flow SVG viewBox is required');
 const [x,y,width,height]=box,gx=x+viewBox[0],gy=y+viewBox[1];
 if(width!==18||height!==18)throw new Error('Native App send-mode radios must remain 18 by 18');
 const primitives=(html.match(/<(?:rect|circle)\b[^>]*\/>/g)||[]).filter(tag=>{
  const a=attributes(tag);
  return tag.startsWith('<rect')?near(a.x,gx+.5)&&near(a.y,gy+.5)&&near(a.width,17)&&near(a.height,17)&&near(a.rx,8.5):near(a.cx,gx+9)&&near(a.cy,gy+9)&&near(a.r,4);
 });
 const rects=primitives.filter(tag=>tag.startsWith('<rect')),circles=primitives.filter(tag=>tag.startsWith('<circle'));
 if(rects.length!==2||circles.length>1||!rects.some(tag=>attributes(tag).fill==='white')||!rects.some(tag=>attributes(tag).stroke))throw new Error('Missing original App radio primitives at '+box.join(','));
 const local=primitives.map(tag=>tag.replace(/\b(x|cx|y|cy)="([^"]*)"/g,(_,key,value)=>`${key}="${number(Number(value)-(['x','cx'].includes(key)?gx:gy))}"`)).join('\n');
 return {width,height,checked:circles.length===1,svg:`<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" fill="none">\n${local}\n</svg>`};
}

/** Preserve the native track, thumb and shadow; only its straight width varies. */
export function extractSourceToggleArtwork(html,{box,checked,width=box[2]}){
 const opening=html.match(/<svg\b[^>]*>/)?.[0],viewBox=attributes(opening||'').viewBox?.split(/\s+/).map(Number);
 if(!viewBox||viewBox.length!==4||![48,50].includes(width)||box[3]!==26)throw new Error('Expected an original App 48/50 by 26 toggle');
 const gx=box[0]+viewBox[0],gy=box[1]+viewBox[1],delta=width-box[2],tags=html.match(/<(?:rect|circle)\b[^>]*\/>/g)||[];
 const rects=tags.filter(tag=>{const a=attributes(tag);return tag.startsWith('<rect')&&near(a.x,gx+.5)&&near(a.y,gy+.5)&&near(a.width,box[2]-1)&&near(a.height,25)&&near(a.rx,12.5);});
 const circle=tags.find(tag=>{const a=attributes(tag);return tag.startsWith('<circle')&&near(a.cx,gx+(checked?box[2]-16:16))&&near(a.cy,gy+13)&&near(a.r,11);});
 if(rects.length!==2||!circle)throw new Error('Missing original App toggle primitives');
 const wrapper=html.slice(0,html.indexOf(circle)).match(/<g filter="url\(#([^)]*)\)">\s*$/),filterId=wrapper?.[1];
 const filter=filterId&&html.match(new RegExp('<filter id="'+filterId+'"[\\s\\S]*?<\\/filter>'))?.[0];
 if(!filter)throw new Error('Missing original App toggle thumb shadow');
 const local=(xml,shiftX=0)=>xml.replace(/\b(x|cx|y|cy)="([^"]*)"/g,(_,key,value)=>`${key}="${number(Number(value)-(['x','cx'].includes(key)?gx-shiftX:gy))}"`);
 // Native start/end alignment keeps the thumb 22px; do not scale its circle.
 const track=rects.map(tag=>local(tag).replace(/\bwidth="[^"]*"/,`width="${width-1}"`)).join('\n'),thumb=local(circle,checked?delta:0),shadow=local(filter,checked?delta:0).replace(`id="${filterId}"`,'id="app-toggle-shadow"');
 return {width,height:26,checked,svg:`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="26" viewBox="0 0 ${width} 26" fill="none" overflow="visible">\n<defs>${shadow}</defs>\n${track}\n<g filter="url(#app-toggle-shadow)">${thumb}</g>\n</svg>`};
}

export async function buildAppFlowArtwork({root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),sourceRoot=path.join(root,'figma-preview')}={}){
 const cases=[['1635:109001',[28,532,18,18],true],['1635:109001',[28,565,18,18],false],['1635:105774',[28,617,18,18],true],['1635:105774',[28,584,18,18],false]],variants=new Map();
 for(const [id,box,checked]of cases){
  const frame=nativeFrames.find(frame=>frame.id===id),html=await fs.readFile(path.join(sourceRoot,frame.file),'utf8'),art=extractSourceSendModeArtwork(html,{box});
  if(art.checked!==checked)throw new Error('Original Flow checked state changed on '+id);
  if(variants.has(checked)&&variants.get(checked).svg!==art.svg)throw new Error('Original Flow send-mode artwork differs across confirmation frames');
  variants.set(checked,art);
 }
 const directory=path.join(root,'figma-preview/assets/interactive-app'),out={};await fs.mkdir(directory,{recursive:true});
 for(const [checked,art]of variants){const id=checked?'604:31543':'604:31545',content=art.svg+'\n',hash=createHash('sha256').update(content).digest('hex').slice(0,12),file=`assets/interactive-app/send-mode-${checked?'checked':'unchecked'}.${hash}.svg`;await fs.writeFile(path.join(root,'figma-preview',file),content);out[id]={file,width:art.width,height:art.height};}
 for(const [id,box,checked]of [['1635:110138',[316,471,50,26],false],['1635:112462',[311,365,48,26],true]]){
  const frame=nativeFrames.find(frame=>frame.id===id),html=await fs.readFile(path.join(sourceRoot,frame.file),'utf8');
  for(const width of [48,50]){const art=extractSourceToggleArtwork(html,{box,checked,width}),key=(width===50?(checked?'540:24477':'540:24478'):(checked?'557:34966':'557:34960'))+'@'+width+'x26',content=art.svg+'\n',hash=createHash('sha256').update(content).digest('hex').slice(0,12),file=`assets/interactive-app/toggle-${checked?'checked':'unchecked'}-${width}x26.${hash}.svg`;await fs.writeFile(path.join(root,'figma-preview',file),content);out[key]={file,width:art.width,height:art.height};}
 }
 // This narrow builder never removes or rewrites other native control artwork.
 await fs.writeFile(path.join(root,'figma-preview/app-flow-artwork.mjs'),'// Exact radio primitives from the original uploaded Flow.svg confirmation frames.\nexport const appFlowArtwork='+JSON.stringify(out)+';\n');
 return out;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(await buildAppFlowArtwork()));
