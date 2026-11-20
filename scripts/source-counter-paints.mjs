import fs from 'node:fs/promises';
import path from 'node:path';
import {nativeFrames} from '../figma-preview/native-frames.mjs';
import {readSourceSvgPaths} from './source-svg-paths.mjs';
const attrs=tag=>Object.fromEntries([...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map(m=>[m[1],m[2]]));
const inside=(a,b)=>a[0]>=b[0]-.01&&a[1]>=b[1]-.01&&a[0]+a[2]<=b[0]+b[2]+.01&&a[1]+a[3]<=b[1]+b[3]+.01;

// The supplied section SVG resolves instance/theme paints. Native .fig masters
// still contain older component values, so their colors cannot override it.
export async function loadSourceCounterPalette(root){
 const source=nativeFrames.find(f=>f.id==='1635:105527'),html=await fs.readFile(path.join(root,'figma-preview',source.file),'utf8'),svg=html.slice(html.indexOf('<svg')),parsed=readSourceSvgPaths(svg);
 const button=[...svg.matchAll(/<rect\b[^>]*>/g)].map(m=>attrs(m[0])).find(a=>a.width==='26'&&a.height==='26'&&a.rx==='13'&&a.fill&&a.fill!=='white');
 if(!button)throw Error('Missing authoritative source OA plus button');
 const box=[Number(button.x)-parsed.viewBox[0],Number(button.y)-parsed.viewBox[1],26,26],strokes=parsed.paths.filter(p=>inside(p.bounds,box)).map(p=>{const i=svg.indexOf('d="'+p.d+'"');return attrs(svg.slice(i,svg.indexOf('>',i))).stroke;}).filter(Boolean);
 if(!strokes.length||new Set(strokes).size!==1)throw Error('Missing authoritative source OA plus glyph paint');
 return {plusFill:button.fill,plusInk:strokes[0]};
}
export function alignCounterSourcePaints(svg,controls,palette){
 const plus=controls.find(c=>c.id==='plus');if(!plus)return svg;
 const parsed=readSourceSvgPaths(svg);let index=0,backgrounds=0,glyphs=0;
 let result=svg.replace(/<rect\b[^>]*>/g,tag=>{const a=attrs(tag);if(a.width==='26'&&a.height==='26'&&a.rx==='13'&&a.fill&&!['white','none'].includes(a.fill)&&!a.stroke){backgrounds++;return tag.replace(/fill="[^"]*"/,'fill="'+palette.plusFill+'"');}return tag;});
 result=result.replace(/<path\b[^>]*>/g,tag=>{const record=parsed.paths[index++];if(!record||record.d!==attrs(tag).d)throw Error('Unexpected counter source path order');if(inside(record.bounds,plus.box)){glyphs++;return tag.replace(/fill="[^"]*"/,'fill="'+palette.plusInk+'"');}return tag;});
 if(backgrounds!==1||glyphs!==2)throw Error('Unexpected native OA plus artwork');return result;
}
