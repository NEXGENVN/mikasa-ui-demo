import fs from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

const workspace = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const identity = () => ({m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0});
const guid = value => value ? `${value.sessionID}:${value.localID}` : null;
const json = value => JSON.stringify(value, (_, item) => typeof item === 'bigint' ? item.toString() : item);

export function multiplyTransforms(a, b) {
  return {
    m00: a.m00*b.m00+a.m01*b.m10, m01: a.m00*b.m01+a.m01*b.m11,
    m02: a.m00*b.m02+a.m01*b.m12+a.m02,
    m10: a.m10*b.m00+a.m11*b.m10, m11: a.m10*b.m01+a.m11*b.m11,
    m12: a.m10*b.m02+a.m11*b.m12+a.m12
  };
}

export function transformedBounds(transform, width, height) {
  if (width == null || height == null) return null;
  const points = [[0,0],[width,0],[0,height],[width,height]].map(([x,y]) => [
    transform.m00*x+transform.m01*y+transform.m02,
    transform.m10*x+transform.m11*y+transform.m12
  ]);
  const xs=points.map(point=>point[0]), ys=points.map(point=>point[1]);
  return {x:Math.min(...xs),y:Math.min(...ys),width:Math.max(...xs)-Math.min(...xs),height:Math.max(...ys)-Math.min(...ys)};
}

/** Read ZIP entries without extracting or modifying the user archive. */
export function readZipEntries(buffer) {
  let eocd=-1;
  for(let offset=buffer.length-22;offset>=Math.max(0,buffer.length-65557);offset--) {
    if(buffer.readUInt32LE(offset)===0x06054b50){eocd=offset;break;}
  }
  if(eocd<0)throw new Error('ZIP end-of-directory record not found');
  const count=buffer.readUInt16LE(eocd+10),entries=new Map();
  let cursor=buffer.readUInt32LE(eocd+16);
  for(let index=0;index<count;index++){
    if(buffer.readUInt32LE(cursor)!==0x02014b50)throw new Error('Invalid ZIP central directory');
    const flags=buffer.readUInt16LE(cursor+8),method=buffer.readUInt16LE(cursor+10);
    const compressedSize=buffer.readUInt32LE(cursor+20),size=buffer.readUInt32LE(cursor+24);
    const nameLength=buffer.readUInt16LE(cursor+28),extraLength=buffer.readUInt16LE(cursor+30),commentLength=buffer.readUInt16LE(cursor+32);
    const localOffset=buffer.readUInt32LE(cursor+42),name=buffer.subarray(cursor+46,cursor+46+nameLength).toString('utf8');
    if(flags&1)throw new Error('Encrypted ZIP entries are not supported');
    if([compressedSize,size,localOffset].includes(0xffffffff))throw new Error('ZIP64 archive requires a ZIP64 reader');
    entries.set(name,{name,size,compressedSize,method,read(){
      if(buffer.readUInt32LE(localOffset)!==0x04034b50)throw new Error('Invalid ZIP local header');
      const start=localOffset+30+buffer.readUInt16LE(localOffset+26)+buffer.readUInt16LE(localOffset+28);
      const compressed=buffer.subarray(start,start+compressedSize);
      const data=method===0?compressed:method===8?zlib.inflateRawSync(compressed):null;
      if(!data||data.length!==size)throw new Error(`Unsupported or invalid ZIP entry ${name}`);
      return data;
    }});
    cursor+=46+nameLength+extraLength+commentLength;
  }
  return entries;
}

export async function decodeFigFile(filename,{dependencyRoot=path.join(workspace,'.audit/fig-parser')}={}) {
  const bytes=await fs.readFile(filename),sha256=createHash('sha256').update(bytes).digest('hex');
  const zipped=bytes.readUInt32LE(0)===0x04034b50;
  const entries=zipped?readZipEntries(bytes):null;
  const canvas=zipped?entries.get('canvas.fig')?.read():bytes;
  if(!canvas||canvas.subarray(0,8).toString()!=='fig-kiwi')throw new Error('No supported fig-kiwi canvas found');
  const chunks=[];let cursor=12;
  while(cursor+4<=canvas.length){const size=canvas.readUInt32LE(cursor);cursor+=4;if(cursor+size>canvas.length)throw new Error('Invalid fig-kiwi chunk size');chunks.push(canvas.subarray(cursor,cursor+size));cursor+=size;}
  if(chunks.length<2)throw new Error('Canvas does not contain a schema and message');
  const decompress=chunk=>chunk.readUInt32LE(0)===0xfd2fb528?zlib.zstdDecompressSync(chunk):zlib.inflateRawSync(chunk);
  const require=createRequire(path.join(dependencyRoot,'package.json'));
  const kiwi=require('kiwi-schema');
  const schema=kiwi.decodeBinarySchema(decompress(chunks[0]));
  const message=kiwi.compileSchema(schema).decodeMessage(decompress(chunks[1]));
  const archiveMeta=entries?.has('meta.json')?JSON.parse(entries.get('meta.json').read().toString('utf8')):null;
  return {message,schema,source:{path:path.resolve(filename),bytes:bytes.length,sha256,canvasVersion:canvas.readUInt32LE(8),chunkBytes:chunks.map(chunk=>chunk.length),exportedAt:archiveMeta?.exported_at||null,archiveMeta,entries:entries?[...entries.values()].map(({name,size,compressedSize,method})=>({name,size,compressedSize,method})):null}};
}

export function buildFigInventory(message,source={}) {
  const raw=new Map(),duplicates=[];
  for(const node of message.nodeChanges||[]){const id=guid(node.guid);if(raw.has(id))duplicates.push(id);raw.set(id,node);}
  const children=new Map();
  for(const [id,node]of raw){const parentId=guid(node.parentIndex?.guid);if(parentId){if(!children.has(parentId))children.set(parentId,[]);children.get(parentId).push(id);}}
  for(const ids of children.values())ids.sort((a,b)=>{const x=raw.get(a).parentIndex?.position||'',y=raw.get(b).parentIndex?.position||'';return x<y?-1:x>y?1:0;});
  const resolved=new Map(),resolving=new Set(),missingParents=new Set();
  function resolve(id){
    if(resolved.has(id))return resolved.get(id);
    if(resolving.has(id))throw new Error('Node-parent cycle at '+id);
    resolving.add(id);const node=raw.get(id),parentId=guid(node.parentIndex?.guid);
    if(parentId&&!raw.has(parentId))missingParents.add(parentId);
    const parent=parentId&&raw.has(parentId)?resolve(parentId):null;
    const relativeTransform=node.transform||identity();
    const globalTransform=parent?multiplyTransforms(parent.globalTransform,relativeTransform):relativeTransform;
    const width=node.size?.x??null,height=node.size?.y??null;
    const opacity=node.opacity??1,effectiveOpacity=opacity*(parent?.effectiveOpacity??1);
    const visible=node.visible!==false,effectiveVisible=visible&&(parent?.effectiveVisible??true)&&effectiveOpacity>0;
    const record={id,type:node.type,name:node.name||'',parentId,order:node.parentIndex?.position||null,
      pageId:node.type==='CANVAS'?id:parent?.pageId||null,
      sectionId:node.type==='SECTION'?id:parent?.sectionId||null,
      x:relativeTransform.m02,y:relativeTransform.m12,width,height,
      globalX:globalTransform.m02,globalY:globalTransform.m12,relativeTransform,globalTransform,
      globalBounds:transformedBounds(globalTransform,width,height),visible,effectiveVisible,opacity,effectiveOpacity,
      clipsContent:node.frameMaskDisabled==null?null:!node.frameMaskDisabled,
      childIds:children.get(id)||[]};
    if(node.prototypeInteractions?.length)record.prototypeInteractions=node.prototypeInteractions;
    if(node.prototypeStartingPoint)record.prototypeStartingPoint=node.prototypeStartingPoint;
    if(node.prototypeDevice)record.prototypeDevice=node.prototypeDevice;
    if(node.overlayBackgroundInteraction)record.overlayBackgroundInteraction=node.overlayBackgroundInteraction;
    if(node.textData?.characters)record.text=node.textData.characters;
    resolved.set(id,record);resolving.delete(id);return record;
  }
  const nodes=[...raw.keys()].map(resolve),pages=nodes.filter(n=>n.type==='CANVAS'),sections=nodes.filter(n=>n.type==='SECTION');
  const frameTypes=new Set(['FRAME','SYMBOL','INSTANCE']);
  const frames=nodes.filter(n=>frameTypes.has(n.type));
  const topLevelFrames=frames.filter(n=>['CANVAS','SECTION'].includes(resolved.get(n.parentId)?.type));
  const screenFrames=frames.filter(n=>n.type==='FRAME'&&((Math.abs(n.width-390)<1&&n.height>=700)||(Math.abs(n.width-1440)<1&&n.height>=700)||(Math.abs(n.width-1024)<1&&n.height>=1000)));
  const byType={};for(const node of nodes)byType[node.type]=(byType[node.type]||0)+1;
  const summaries=pages.map(page=>({id:page.id,name:page.name,visible:page.visible,nodeCount:nodes.filter(n=>n.pageId===page.id).length,topLevelFrameCount:topLevelFrames.filter(n=>n.pageId===page.id).length,screenCandidateCount:screenFrames.filter(n=>n.pageId===page.id).length}));
  return {source,counts:{nodes:nodes.length,pages:pages.length,sections:sections.length,frames:frames.length,topLevelFrames:topLevelFrames.length,screenCandidates:screenFrames.length,prototypeNodes:nodes.filter(n=>n.prototypeInteractions?.length).length,byType},diagnostics:{duplicateIds:duplicates,missingParentIds:[...missingParents]},pageSummary:summaries,pages,sections,topLevelFrames,screenFrames,nodes};
}

export async function writeFigInventory(filename,{outputDir=path.join(workspace,'.audit'),dependencyRoot}={}) {
  const {message,source}=await decodeFigFile(filename,{dependencyRoot});
  const inventory=buildFigInventory(message,source);await fs.mkdir(outputDir,{recursive:true});
  await fs.writeFile(path.join(outputDir,'fig-current-inventory.json'),json(inventory)+'\n');
  await fs.writeFile(path.join(outputDir,'fig-current-node-map.json'),json(Object.fromEntries(inventory.nodes.map(node=>[node.id,node])))+'\n');
  await fs.writeFile(path.join(outputDir,'fig-current-frames.json'),json({source:inventory.source,counts:inventory.counts,pages:inventory.pages,sections:inventory.sections,frames:inventory.topLevelFrames,screenCandidates:inventory.screenFrames})+'\n');
  return inventory;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const filename=process.argv[2];if(!filename)throw new Error('Usage: node scripts/fig-source-inventory.mjs <source.fig> [output-directory]');
  const inventory=await writeFigInventory(filename,{...(process.argv[3]?{outputDir:path.resolve(process.argv[3])}:{})});
  console.log(json({source:inventory.source.path,counts:inventory.counts,pages:inventory.pageSummary,diagnostics:inventory.diagnostics}));
}
