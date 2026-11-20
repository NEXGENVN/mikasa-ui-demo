import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {sourceGlyphLibrary} from '../figma-preview/source-glyph-library.mjs';
import {generateGlyphPaths} from '../figma-preview/source-glyphs.mjs';
import {matchSourceTextSlot} from '../figma-preview/source-text-slots.mjs';
import {readSourceSvgPaths} from './source-svg-paths.mjs';
import {composeSourceComponents} from '../figma-preview/interactive-component-view.mjs';
import {createInteractiveSession} from '../figma-preview/interactive-session.mjs';
import {sourceComponentExtraArtwork} from '../figma-preview/source-component-states.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const manifest=JSON.parse(await fs.readFile(path.join(root,'.audit/svg-extraction/manifest.json'),'utf8'));
const app=(await import('../figma-preview/app-interactive-controls.mjs')).appInteractiveFrames;
let web={};try{web=(await import('../figma-preview/web-interactive-controls.mjs')).webInteractiveFrames;}catch(error){if(error.code!=='ERR_MODULE_NOT_FOUND')throw error;}
const output={format:'source-text-slot-ownership-v1',method:'Original native glyph layouts versus complete original source SVG cubic/line control geometry, normalized only for translation; source frame coordinates and containment gate ownership. No browser or source SVG mutations.',frames:[],summary:{frames:0,slots:0,editableAndDynamicSlots:0,statuses:{},editableAndDynamicStatuses:{},unsupportedSourcePaths:0}};
const count=(obj,key)=>obj[key]=(obj[key]||0)+1;
for(const f of manifest.frames){
 const metadata=app[f.id]||web[f.id];if(!metadata)continue;
 const interactive=composeSourceComponents({...metadata,id:f.id},createInteractiveSession({}),{extraArtwork:sourceComponentExtraArtwork[f.id]||[]});
 const slots=new Map();
 for(const control of interactive.controls||[])for(const s of control.textSlots||[]){const old=slots.get(s.id);slots.set(s.id,{...s,critical:old?.critical||['input','textarea','select'].includes(control.type),controlType:control.type});}
 for(const s of interactive.texts||[])slots.set(s.id,{...s,critical:true,controlType:'dynamic'});
 const parsed=readSourceSvgPaths(await fs.readFile(path.join(root,'.audit/svg-extraction',f.file),'utf8'));
 for(const artwork of interactive.extraArtwork||[]){const extra=readSourceSvgPaths(await fs.readFile(path.join(root,'figma-preview',artwork.file),'utf8'));for(const p of extra.paths)parsed.paths.push({...p,index:parsed.paths.length,matrix:{...p.matrix,e:p.matrix.e+artwork.box[0],f:p.matrix.f+artwork.box[1]},bounds:[p.bounds[0]+artwork.box[0],p.bounds[1]+artwork.box[1],p.bounds[2],p.bounds[3]],sourceComponent:artwork.id});parsed.unsupported.push(...extra.unsupported);}
 const records=[];
 for(const slot of slots.values()){
  const box=slot.box||slot.bbox,font=slot.font||{};
  const generated=generateGlyphPaths(sourceGlyphLibrary,{...font,value:slot.text||'',x:box[0],baseline:box[1]+(font.baseline??font.size??14),width:box[2],height:box[3]});
  const result=generated.missingGlyphs.length?{status:'missing-original-glyph'}:matchSourceTextSlot({...slot,box,outline:generated.d},parsed.paths);
  const record={id:slot.id,text:slot.text,box,fontKey:generated.fontKey,status:result.status,critical:slot.critical,controlType:slot.controlType,...(generated.missingGlyphs.length?{missingGlyphs:generated.missingGlyphs}:{}),...(result.paths?.length?{sourcePathIndex:result.paths[0].index,translation:result.offset}:{})};
  records.push(record);count(output.summary.statuses,result.status);output.summary.slots++;
  if(slot.critical){count(output.summary.editableAndDynamicStatuses,result.status);output.summary.editableAndDynamicSlots++;}
 }
 output.frames.push({id:f.id,name:f.name,platform:f.platform,slotCount:slots.size,sourcePaths:parsed.paths.length,unsupportedSourcePaths:parsed.unsupported.length,slots:records});
 output.summary.frames++;output.summary.unsupportedSourcePaths+=parsed.unsupported.length;
 if(output.summary.frames%100===0)console.log(JSON.stringify({progress:output.summary.frames,slots:output.summary.slots,statuses:output.summary.statuses}));
}
await fs.writeFile(path.join(root,'.audit/source-text-slot-ownership.json'),JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify(output.summary));
