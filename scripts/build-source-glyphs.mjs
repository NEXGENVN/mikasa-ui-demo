import fs from 'node:fs/promises';
import path from 'node:path';
import {deserialize} from 'node:v8';
import {fileURLToPath} from 'node:url';
import {buildGlyphLibrary} from '../figma-preview/source-glyphs.mjs';
import {expandSourceFrames} from './figma-control-source.mjs';

export async function buildSourceGlyphs({root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),message}={}){
 const source=message||deserialize(await fs.readFile(path.join(root,'.audit/fig-parser/decoded.v8')));
 let nodes=source.nodeChanges;
 if(!message){
  const inventory=JSON.parse(await fs.readFile(path.join(root,'.audit/fig-current-inventory.json'),'utf8'));
  const frames=JSON.parse(await fs.readFile(path.join(root,'.audit/svg-extraction/manifest.json'),'utf8')).frames;
  const expanded=expandSourceFrames({inventory,message:source,frames,includeTextGeometry:true});
  nodes=[...nodes,...expanded.flatMap(f=>f.nodes.filter(n=>n.type==='TEXT'&&n.textGeometry&&n.rendered).map(n=>({type:'TEXT',textData:{characters:n.text},fontName:{family:n.font.family,style:n.font.style},fontSize:n.font.size,derivedTextData:n.textGeometry})))];
 }
 const library=buildGlyphLibrary({...source,nodeChanges:nodes});
 const output='export const sourceGlyphLibrary='+JSON.stringify(library)+';\n';
 await fs.writeFile(path.join(root,'figma-preview/source-glyph-library.mjs'),output);
 return {fonts:Object.keys(library.fonts).length,glyphs:Object.values(library.fonts).reduce((n,f)=>n+Object.keys(f.glyphs).length,0),sourceRuns:Object.values(library.fonts).reduce((n,f)=>n+Object.keys(f.runs).length,0),bytes:Buffer.byteLength(output)};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(await buildSourceGlyphs()));
