import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {sourceGlyphLibrary} from '../figma-preview/source-glyph-library.mjs';
import {generateGlyphPaths} from '../figma-preview/source-glyphs.mjs';
import {matchSourceTextSlot,sourceColor} from '../figma-preview/source-text-slots.mjs';
import {readSourceSvgPaths} from './source-svg-paths.mjs';
import {composeSourceComponents} from '../figma-preview/interactive-component-view.mjs';
import {createInteractiveSession} from '../figma-preview/interactive-session.mjs';
import {sourceComponentExtraArtwork} from '../figma-preview/source-component-states.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const appOnly=process.argv.includes('--app');
const manifest=JSON.parse(await fs.readFile(path.join(root,'.audit/svg-extraction/manifest.json'),'utf8'));
const app=(await import('../figma-preview/app-interactive-controls.mjs')).appInteractiveFrames;
let web={};try{web=(await import('../figma-preview/web-interactive-controls.mjs')).webInteractiveFrames;}catch(error){if(error.code!=='ERR_MODULE_NOT_FOUND')throw error;}
const output={format:'source-text-slot-ownership-v2',method:'Original native glyph layouts versus complete original source SVG cubic/line control geometry, normalized only for translation; source frame coordinates and containment gate ownership. Exported path paints are recorded independently of native font metadata. No browser or source SVG mutations.',frames:[],summary:{frames:0,slots:0,editableAndDynamicSlots:0,statuses:{},editableAndDynamicStatuses:{},unsupportedSourcePaths:0,paintDifferences:0,mixedPaintSlots:0,missingExplicitPaintSlots:0,valueFontSlots:0,valueFontDiffersFromSource:0,sourceRunMixedSizes:0,sourceRunVariantGlyphs:0,duplicateCopySlots:0,pathOwnershipCollisions:0}};
const count=(obj,key)=>obj[key]=(obj[key]||0)+1;
const normalizedColor=value=>{const v=sourceColor(value),hex=v.match(/^#([\da-f]{3}|[\da-f]{6}|[\da-f]{8})$/i);if(hex){let h=hex[1];if(h.length===3)h=[...h].map(c=>c+c).join('');return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16),h.length===8?parseInt(h.slice(6,8),16)/255:1].join(',');}const rgba=v.match(/^rgba?\(([^)]+)\)$/);if(rgba){const n=rgba[1].split(',').map(Number);return [...n.slice(0,3),n[3]??1].join(',');}return v.toLowerCase();};
for(const f of manifest.frames){
 if(appOnly&&f.platform!=='app')continue;
 const metadata=app[f.id]||web[f.id];if(!metadata)continue;
 const interactive=composeSourceComponents({...metadata,id:f.id},createInteractiveSession({}),{extraArtwork:sourceComponentExtraArtwork[f.id]||[]});
 const slots=new Map();
 for(const control of interactive.controls||[])for(const s of control.textSlots||[]){const old=slots.get(s.id);slots.set(s.id,{...s,critical:old?.critical||['input','textarea','select'].includes(control.type),controlType:control.type,controlId:control.id,field:control.field,valueFont:control.valueFont});}
 for(const s of interactive.texts||[])slots.set(s.id,{...s,critical:true,controlType:'dynamic'});
 const parsed=readSourceSvgPaths(await fs.readFile(path.join(root,'.audit/svg-extraction',f.file),'utf8'));
 for(const artwork of interactive.extraArtwork||[]){const extra=readSourceSvgPaths(await fs.readFile(path.join(root,'figma-preview',artwork.file),'utf8'));for(const p of extra.paths)parsed.paths.push({...p,index:parsed.paths.length,matrix:{...p.matrix,e:p.matrix.e+artwork.box[0],f:p.matrix.f+artwork.box[1]},bounds:[p.bounds[0]+artwork.box[0],p.bounds[1]+artwork.box[1],p.bounds[2],p.bounds[3]],sourceComponent:artwork.id});parsed.unsupported.push(...extra.unsupported);}
 const records=[];
 for(const slot of slots.values()){
  const box=slot.box||slot.bbox,font=slot.font||{};
  const generated=generateGlyphPaths(sourceGlyphLibrary,{...font,value:slot.text||'',x:box[0],baseline:box[1]+(font.baseline??font.size??14),width:box[2],height:box[3]});
  const result=generated.missingGlyphs.length?{status:'missing-original-glyph'}:matchSourceTextSlot({...slot,box,outline:generated.d},parsed.paths);
  const paints=[...new Set((result.paths||[]).map(p=>p.fill))],metadataPaint=sourceColor(font.color),paintDifference=paints.some(p=>p!=null&&normalizedColor(p)!==normalizedColor(metadataPaint)),mixedSizes=[...new Set(generated.clusters.map(c=>c.size))],variantGlyphs=generated.clusters.filter(c=>c.glyphD!==sourceGlyphLibrary.fonts[generated.fontKey]?.glyphs[c.text]?.d).length;
  const record={id:slot.id,text:slot.text,box,fontKey:generated.fontKey,font,metadataPaint,sourcePaints:paints,paintDifference,status:result.status,critical:slot.critical,controlType:slot.controlType,controlId:slot.controlId,field:slot.field,...(slot.valueFont?{valueFont:slot.valueFont,valueFontMatchesMetadataPaint:normalizedColor(slot.valueFont.color)===normalizedColor(font.color),valueFontDiffersFromSource:paints.some(p=>p!=null&&normalizedColor(slot.valueFont.color)!==normalizedColor(p))}:{}),sourceRunSizes:mixedSizes,sourceRunVariantGlyphs:variantGlyphs,...(generated.missingGlyphs.length?{missingGlyphs:generated.missingGlyphs}:{}),...(result.paths?.length?{sourcePathIndexes:result.paths.map(p=>p.index),translation:result.offset,duplicatePathIndexes:(result.duplicatePaths||[]).map(p=>p.index)}:{})};
  if(paintDifference)output.summary.paintDifferences++;if(paints.length>1)output.summary.mixedPaintSlots++;if(paints.some(p=>p==null))output.summary.missingExplicitPaintSlots++;if(slot.valueFont)output.summary.valueFontSlots++;if(record.valueFontDiffersFromSource)output.summary.valueFontDiffersFromSource++;if(mixedSizes.length>1)output.summary.sourceRunMixedSizes++;if(variantGlyphs)output.summary.sourceRunVariantGlyphs++;if(result.duplicatePaths?.length)output.summary.duplicateCopySlots++;
  records.push(record);count(output.summary.statuses,result.status);output.summary.slots++;
  if(slot.critical){count(output.summary.editableAndDynamicStatuses,result.status);output.summary.editableAndDynamicSlots++;}
 }
 const owners=new Map();for(const slot of records)for(const index of [...(slot.sourcePathIndexes||[]),...(slot.duplicatePathIndexes||[])]){const ids=owners.get(index)||[];ids.push(slot.id);owners.set(index,ids);}
 const collisions=[...owners].filter(([,ids])=>ids.length>1).map(([sourcePathIndex,slotIds])=>({sourcePathIndex,slotIds}));output.summary.pathOwnershipCollisions+=collisions.length;
 output.frames.push({id:f.id,name:f.name,platform:f.platform,slotCount:slots.size,sourcePaths:parsed.paths.length,unsupportedSourcePaths:parsed.unsupported.length,slots:records,...(collisions.length?{pathOwnershipCollisions:collisions}:{})});
 output.summary.frames++;output.summary.unsupportedSourcePaths+=parsed.unsupported.length;
 if(output.summary.frames%100===0)console.log(JSON.stringify({progress:output.summary.frames,slots:output.summary.slots,statuses:output.summary.statuses}));
}
await fs.writeFile(path.join(root,appOnly?'.audit/app-source-text-slot-ownership.json':'.audit/source-text-slot-ownership.json'),JSON.stringify({...output,scope:appOnly?'app':'all'},null,2)+'\n');
console.log(JSON.stringify(output.summary));
