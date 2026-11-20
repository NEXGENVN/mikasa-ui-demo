import test from 'node:test';
import assert from 'node:assert/strict';
import {decodeCommandsBlob,buildGlyphLibrary,generateGlyphPaths,fontKeyFor} from './source-glyphs.mjs';

function commands(...parts){
 const bytes=[];
 for(const [op,...values] of parts){bytes.push(op);for(const value of values){const b=new Uint8Array(4);new DataView(b.buffer).setFloat32(0,value,true);bytes.push(...b);}}
 return Uint8Array.from(bytes);
}
const outline=commands([0],[1,0,.7],[2,.5,.7],[2,.5,0],[2,0,0],[0]);
const source=(text,positions)=>({type:'TEXT',fontName:{family:'Roboto',style:'Regular'},fontSize:10,textData:{characters:text},derivedTextData:{fontMetaData:[{key:{family:'Roboto',style:'Regular'},fontWeight:400}],glyphs:positions.map((x,i)=>({commandsBlob:0,position:{x,y:8},fontSize:10,firstCharacter:i,advance:.6}))}});

test('decodes FIG outlines and rejects malformed command streams',()=>{
 assert.match(decodeCommandsBlob(outline),/^M0 0\.7/);
 assert.throws(()=>decodeCommandsBlob(Uint8Array.of(9)),/Unsupported/);
 assert.throws(()=>decodeCommandsBlob(Uint8Array.of(1,0)),/Truncated/);
});

test('uses original glyph layout and converts font y coordinates around the baseline',()=>{
 const library=buildGlyphLibrary({nodeChanges:[source('AA',[0,5])],blobs:[{bytes:outline}]});
 const result=generateGlyphPaths(library,{value:'AA',family:'Roboto',style:'Regular',weight:400,size:20,x:100,baseline:50});
 assert.equal(result.width,22);
 assert.deepEqual(result.missingGlyphs,[]);
 assert.match(result.d,/M100 36/);
 assert.match(result.d,/M110 36/);
});

test('reports missing glyphs without silently substituting an unrelated style',()=>{
 const library=buildGlyphLibrary({nodeChanges:[source('A',[0])],blobs:[{bytes:outline}]});
 assert.deepEqual(generateGlyphPaths(library,{value:'A☃',fontKey:fontKeyFor({family:'Roboto',style:'Regular',weight:400}),size:10}).missingGlyphs,['☃']);
 assert.deepEqual(generateGlyphPaths(library,{value:'A',family:'Roboto',style:'Bold',weight:700,size:10}).missingGlyphs,['A']);
});

test('extracts nested instance text geometry and preserves contextual advances',()=>{
 const text=source('AV',[0,5]);
 const library=buildGlyphLibrary({nodeChanges:[{type:'INSTANCE',symbolData:{symbolOverrides:[{guidPath:{guids:[{sessionID:1,localID:2}]},textData:text.textData}]},derivedSymbolData:[{guidPath:{guids:[{sessionID:1,localID:2}]},derivedTextData:text.derivedTextData}]}],blobs:[{bytes:outline}]});
 const result=generateGlyphPaths(library,{value:'AVA',family:'Roboto',style:'Regular',weight:400,size:10,x:0,baseline:8});
 assert.deepEqual(result.missingGlyphs,[]);
 assert.equal(result.width,17);
 assert.match(result.d,/M5 1/);
});

test('uses the actual derived instance font instead of an inherited master font name',()=>{
 const n=source('A',[0]);n.fontName={family:'Roboto',style:'Bold'};n.fontSize=20;
 const library=buildGlyphLibrary({nodeChanges:[n],blobs:[{bytes:outline}]});
 const result=generateGlyphPaths(library,{value:'A',family:'Roboto',style:'Regular',weight:400,size:10});
 assert.equal(result.width,6);
 assert.deepEqual(result.missingGlyphs,[]);
});

test('uses pixel line height for newly composed multiline values',()=>{
 const library=buildGlyphLibrary({nodeChanges:[source('A',[0])],blobs:[{bytes:outline}]});
 const result=generateGlyphPaths(library,{value:'A\nA',family:'Roboto',style:'Regular',weight:400,size:10,baseline:8,lineHeight:16});
 assert.match(result.d,/M0 17/);
});

test('retains native spacing for each source size instead of rescaling a different size exemplar',()=>{
 const small=source('AA',[0,5.08]),large=source('AA',[0,10]);large.fontSize=20;large.derivedTextData.glyphs.forEach(g=>g.fontSize=20);
 const library=buildGlyphLibrary({nodeChanges:[large,small],blobs:[{bytes:outline}]});
 assert.match(generateGlyphPaths(library,{value:'AA',family:'Roboto',style:'Regular',weight:400,size:10}).d,/M5\.08 /);
});

test('honors native uppercase CENTER alignment',()=>{
 const library=buildGlyphLibrary({nodeChanges:[source('A',[0])],blobs:[{bytes:outline}]});
 assert.match(generateGlyphPaths(library,{value:'A',family:'Roboto',style:'Regular',weight:400,size:10,x:0,baseline:8,align:'CENTER',width:20}).d,/M7 1/);
});

test('selects the original multiline layout with the matching text-box height',()=>{
 const short=source('A\nA',[0,0]),tall=source('A\nA',[0,0]);
 for(const [n,height,y] of [[short,32,24],[tall,36,26]]){n.derivedTextData.layoutSize={x:10,y:height};n.derivedTextData.glyphs[1].firstCharacter=2;n.derivedTextData.glyphs[1].position.y=y;}
 const library=buildGlyphLibrary({nodeChanges:[short,tall],blobs:[{bytes:outline}]});
 assert.match(generateGlyphPaths(library,{value:'A\nA',family:'Roboto',style:'Regular',weight:400,size:10,x:0,baseline:8,width:10,height:36}).d,/M0 19/);
 assert.match(generateGlyphPaths(library,{value:'A\nAA',family:'Roboto',style:'Regular',weight:400,size:10,x:0,baseline:8,lineHeight:18}).d,/M0 19/);
});
