/** Native FIG glyph outlines. Original SVG artwork remains the default renderer. */
const number=value=>String(Math.round(value*1e6)/1e6);
const tokenPattern=/[MLQCZmlqcz]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?/g;
const counts={M:2,L:2,Q:4,C:6,Z:0};

export function decodeCommandsBlob(input){
 const bytes=input instanceof Uint8Array?input:Uint8Array.from(input||[]);
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),parts=[];
 let offset=0,started=false;
 while(offset<bytes.length){
  const op=bytes[offset++],command={0:'Z',1:'M',2:'L',3:'Q',4:'C'}[op];
  if(!command)throw new Error(`Unsupported FIG path opcode ${op}`);
  if(!op){if(started)parts.push('Z');continue;}
  const count=counts[command];
  if(offset+count*4>bytes.length)throw new Error('Truncated FIG path command');
  const values=[];
  for(let i=0;i<count;i++,offset+=4){const value=view.getFloat32(offset,true);if(!Number.isFinite(value))throw new Error('Non-finite FIG path coordinate');values.push(number(value));}
  parts.push(command+values.join(' '));started=true;
 }
 return parts.join(' ');
}

export function transformGlyphPath(path,{a=1,b=0,c=0,d=1,e=0,f=0}={}){
 const tokens=path.match(tokenPattern)||[],out=[];let index=0;
 while(index<tokens.length){const command=tokens[index++].toUpperCase(),count=counts[command];if(count==null)throw new Error('Unsupported glyph path');const values=[];for(let i=0;i<count;i+=2){const x=Number(tokens[index++]),y=Number(tokens[index++]);values.push(number(a*x+c*y+e),number(b*x+d*y+f));}out.push(command+values.join(' '));}
 return out.join(' ');
}

export function fontKeyFor({family='Roboto',style='Regular',weight}={}){
 const resolved=weight??(/black/i.test(style)?900:/extra.?bold/i.test(style)?800:/semi.?bold/i.test(style)?600:/bold/i.test(style)?700:/medium/i.test(style)?500:/light/i.test(style)?300:400);
 return `${family}|${style}|${resolved}`;
}
const pathKey=value=>JSON.stringify(value?.guids||[]);
const weightFor=(style='Regular')=>Number(fontKeyFor({style}).split('|').at(-1));

/** Build-time only: accepts the already decoded local FIG message. */
export function buildGlyphLibrary(message){
 const library={format:'figma-native-glyphs-v1',fonts:{}},decoded=new Map(),variantIndexes=new Map(),seenGeometry=new WeakMap();
 const outline=id=>{if(!decoded.has(id))decoded.set(id,decodeCommandsBlob(message.blobs?.[id]?.bytes||[]));return decoded.get(id);};
 function collect(text,geometry,fontName,fontSize){
  const glyphs=geometry?.glyphs;if(!text||!glyphs?.length)return;
  const fm=geometry.fontMetaData?.[0];
  const font={family:fm?.key?.family||fontName?.family||'Roboto',style:fm?.key?.style||fontName?.style||'Regular',weight:fm?.fontWeight??weightFor(fontName?.style)};
  const key=fontKeyFor(font),entry=library.fonts[key]??={...font,glyphs:{},pairs:{},runs:{},variants:[]};
  const visited=seenGeometry.get(geometry)||new Set();if(visited.has(text+'\0'+key))return;visited.add(text+'\0'+key);seenGeometry.set(geometry,visited);
  if(!variantIndexes.has(key))variantIndexes.set(key,new Map());
  const starts=[...new Set(glyphs.map(g=>g.firstCharacter))].sort((a,b)=>a-b),base=glyphs[0],size=base.fontSize||fontSize||1,items=[];
  const groups=new Map();for(const glyph of glyphs){if(!groups.has(glyph.firstCharacter))groups.set(glyph.firstCharacter,[]);groups.get(glyph.firstCharacter).push(glyph);}
  for(let i=0;i<starts.length;i++){
   const start=starts[i],end=starts[i+1]??text.length,cluster=text.slice(start,end),group=groups.get(start);
   if(!cluster||!group.length)continue;
   const first=group[0],s=first.fontSize||size;
   const d=group.length===1?outline(first.commandsBlob):group.map(g=>transformGlyphPath(outline(g.commandsBlob),{a:(g.fontSize||s)/s,d:(g.fontSize||s)/s,e:(g.position.x-first.position.x)/s,f:-(g.position.y-first.position.y)/s})).filter(Boolean).join(' ');
   const advance=group.reduce((sum,g)=>sum+(g.advance||0)*(g.fontSize||s)/s,0);
   if(!entry.glyphs[cluster])entry.glyphs[cluster]={d,advance};
   const item=[cluster,(first.position.x-base.position.x)/size,(first.position.y-base.position.y)/size,s/size];
   if(entry.glyphs[cluster].d!==d){const indexes=variantIndexes.get(key);if(!indexes.has(d)){indexes.set(d,entry.variants.length);entry.variants.push(d);}item.push(indexes.get(d));}
   items.push(item);
   const next=groups.get(starts[i+1])?.[0];
   if(next&&Math.abs(next.position.y-first.position.y)<.01){const nextCluster=text.slice(starts[i+1],starts[i+2]??text.length);const gap=(next.position.x-first.position.x)/s-advance;if(Math.abs(gap)<.3)entry.pairs[cluster+'\0'+nextCluster]=gap;}
  }
  const last=glyphs.at(-1),width=(last.position.x-base.position.x+(last.advance||0)*(last.fontSize||size))/size;
  const run={items,width,size,layoutWidth:geometry.layoutSize?.x??null,layoutHeight:geometry.layoutSize?.y??null};
  const runs=entry.runs[text]??=[];
  if(!runs.some(r=>r.size===run.size&&r.layoutWidth===run.layoutWidth&&r.layoutHeight===run.layoutHeight&&JSON.stringify(r.items)===JSON.stringify(items)))runs.push(run);
 }
 for(const node of message.nodeChanges||[]){
  if(node.derivedTextData)collect(node.textData?.characters,node.derivedTextData,node.fontName,node.fontSize);
  for(const data of node.derivedSymbolData||[]){if(!data.derivedTextData)continue;const override=node.symbolData?.symbolOverrides?.find(o=>pathKey(o.guidPath)===pathKey(data.guidPath)&&o.textData);if(override)collect(override.textData.characters,data.derivedTextData,override.fontName,override.fontSize);}
 }
 return library;
}

function resolveFont(library,options){
 const fonts=library?.fonts||{},key=options.fontKey||fontKeyFor(options);
 if(fonts[key])return [key,fonts[key]];
 // Omitted style can be resolved by the exact family and weight. Explicit styles never substitute.
 if(!options.fontKey&&!options.style){const found=Object.entries(fonts).find(([,f])=>f.family===(options.family||'Roboto')&&f.weight===(options.weight||400));if(found)return found;}
 return [key,null];
}

/** Produce paths from native outlines, with no browser font shaping or rasterization. */
export function generateGlyphPaths(library,options={}){
 const value=String(options.value??''),size=Number(options.size||14),[fontKey,font]=resolveFont(library,options),missingGlyphs=[],items=[];
 const runs=font?.runs?.[value];
 const variants=Array.isArray(runs)?runs:runs?[runs]:[];
 const known=options.useSourceRun===false?null:[...variants].sort((a,b)=>Math.abs(a.size-size)-Math.abs(b.size-size)||Math.abs((a.layoutHeight??options.height??0)-(options.height??a.layoutHeight??0))-Math.abs((b.layoutHeight??options.height??0)-(options.height??b.layoutHeight??0))||Math.abs((a.layoutWidth??options.width??0)-(options.width??a.layoutWidth??0))-Math.abs((b.layoutWidth??options.width??0)-(options.width??b.layoutWidth??0)))[0];
 let width=0;
 if(known){items.push(...known.items);width=known.width*size;}
 else{
  const keys=Object.keys(font?.glyphs||{}).filter(k=>!/[\r\n]/.test(k)).sort((a,b)=>b.length-a.length);let index=0,previous=null,line=0,maxWidth=0;
  while(index<value.length){
   if(value[index]==='\n'){maxWidth=Math.max(maxWidth,width);width=0;line++;previous=null;index++;continue;}
   const key=keys.find(k=>value.startsWith(k,index));
   if(!key){const char=String.fromCodePoint(value.codePointAt(index));missingGlyphs.push(char);index+=char.length;previous=null;continue;}
   if(previous)width+=(font.pairs[previous+'\0'+key]||0)*size;
   items.push([key,width/size,line*(options.lineHeight==null?1.2:options.lineHeight/size),1]);width+=font.glyphs[key].advance*size;previous=key;index+=key.length;
  }
  width=Math.max(maxWidth,width);
 }
 const align=String(options.align||'left').toLowerCase();
 const shift=align==='center'?((options.width||0)-width)/2:align==='right'?(options.width||0)-width:0;
 const x=Number(options.x||0)+shift,baseline=Number(options.baseline||0);
 let character=0;
 const clusters=items.map(([key,ox,oy,scale,variant])=>{const glyphD=variant==null?font.glyphs[key]?.d||'':font.variants[variant],start=character;character+=key.length;return {text:key,start,end:character,size:size*scale,x:x+ox*size,baseline:baseline+oy*size,glyphD,d:transformGlyphPath(glyphD,{a:size*scale,d:-size*scale,e:x+ox*size,f:baseline+oy*size})};});
 const d=clusters.map(c=>c.d).filter(Boolean).join(' ');
 return {d,width,fontKey,clusters,missingGlyphs:[...new Set(missingGlyphs)]};
}
