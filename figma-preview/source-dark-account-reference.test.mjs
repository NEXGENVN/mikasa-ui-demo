import test from 'node:test';
import assert from 'node:assert/strict';
const module=await import('./source-dark-account-reference.mjs').catch(error=>{if(error.code==='ERR_MODULE_NOT_FOUND')return {};throw error;});

class Element{
 constructor(name,attrs={},box){this.localName=name;this.attrs=new Map(Object.entries(attrs));this.children=[];this.box=box;}
 getAttribute(key){return this.attrs.get(key)??null;}setAttribute(key,value){this.attrs.set(key,String(value));}removeAttribute(key){this.attrs.delete(key);}
 append(node){node.parentElement=this;this.children.push(node);}remove(){this.parentElement?.children.splice(this.parentElement.children.indexOf(this),1);}
 querySelectorAll(selector){return this.children.flatMap(node=>[...(selector.split(',').some(part=>part.trim()===node.localName)?[node]:[]),...node.querySelectorAll(selector)]);}
 querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
 closest(selector){for(let node=this;node;node=node.parentElement)if(selector.split(',').includes(node.localName))return node;return null;}
}
function fixture(frameId='1450:9744'){
 const svg=new Element('svg',{viewBox:'958 4291 390 844'}),nodes={};
 const add=(name,attrs,box)=>{const node=new Element(name,attrs,[box[0]+958,box[1]+4291,box[2],box[3]]);svg.append(node);return node;};
 const dialog=['1450:9996','1456:11813'].includes(frameId),dx=dialog?-2:0,dy=dialog?-5:0;
 nodes.title=add('path',{d:'M974.5 4368h85v16h-85Z',fill:'#F8FAFF'},[16.5,76.7,85.3,16.5]);
 nodes.card=add('rect',{x:String(974.5+dx),y:String(4398.5+dy),width:'361',height:'109',rx:'7.5',stroke:'#555555'},[16.5+dx,107.5+dy,361,109]);
 nodes.avatar=add('rect',{x:String(997.5+dx),y:String(4421.5+dy),width:'59',height:'63',rx:'29.5','clip-path':'url(#native-avatar)'},[39.5+dx,130.5+dy,59,63]);
 nodes.name=add('path',{d:'M1069.54 4432.5h35v13h-35Z',fill:'#F8FAFF'},[111.54+dx,141.5+dy,35,13.5]);
 nodes.profile=add('rect',{x:String(1271+dx),y:String(4441+dy),width:'52',height:'24',rx:'10',fill:'#E2E8F0'},[313+dx,150+dy,52,24]);
 nodes.icon=add('path',{d:'M999.5 4579.5C999.5 4577.57 997.933 4576 996 4576',stroke:'#0F4D88','stroke-width':'1.5'},[38+dx,285+dy,3.5,3.5]);
 nodes.chevron=add('path',{d:'M1313 4735L1317 4731L1313 4727',stroke:'#F8FAFF'},[355+dx,436+dy,4,8]);
 nodes.toggle=add('rect',{x:String(1273.5+dx),y:String(4773.5+dy),width:'49',height:'25',rx:'12.5',fill:'white'},[315.5+dx,482.5+dy,49,25]);
 nodes.logout=add('rect',{stroke:'#FFEBEB'},[16.5,691.5,357,41]);
 nodes.logoutIcon=add('path',{d:'M1129 5003H1119',stroke:'#E84552'},[156,704,16,16]);
 nodes.logoutText=add('path',{d:'M1143 5007h53',fill:'#E84552'},[182,706,54,13]);
 nodes.version=add('path',{d:'M1122 5019h62',fill:'#F8FAFF'},[164,728,63,10]);
 nodes.status=add('path',{d:'M1001 4320h44',fill:'#F8FAFF'},[43,29,44,12]);
 nodes.foreground=add('rect',{fill:'#292929'},[0,564,390,280]);
 nodes.dim=add('rect',{width:'390',height:'844',fill:'#121212','fill-opacity':'.5'},[0,0,390,844]);
 const doc={querySelector:selector=>selector==='svg'?svg:null,createElementNS:(_ns,name)=>new Element(name)};
 return{doc,svg,nodes,add,options:{frameId,measure:node=>node.box}};
}
function mappedBox(node){const matrix=/^matrix\(([^)]+)\)/.exec(node.getAttribute('transform')||'');assert.ok(matrix,'native artwork receives its reference transform');const [a,, ,d,e,f]=matrix[1].split(/[ ,]+/).map(Number),[x,y,w,h]=node.box;return[a*x+e-958,d*y+f-4291,w*a,h*d];}
const close=(actual,expected)=>actual.forEach((value,index)=>assert.ok(Math.abs(value-expected[index])<.02,`${actual} must match ${expected}`));

test('main dark account restores screenshot spacing without moving status or version artwork',()=>{
 assert.equal(typeof module.mountSourceDarkAccountReference,'function');const f=fixture(),original=f.nodes.icon.getAttribute('d');module.mountSourceDarkAccountReference(f.doc,f.options);
 close(mappedBox(f.nodes.title),[16.5,86.7,85.3,16.5]);close(mappedBox(f.nodes.avatar),[39.5,147,69,69]);
 close(mappedBox(f.nodes.name),[121.54,161,35,13.5]);close(mappedBox(f.nodes.profile),[313,169.5,52,24]);
 close(mappedBox(f.nodes.icon),[38,307,3.5,3.5]);close(mappedBox(f.nodes.toggle),[315.5,504.5,49,25]);
 assert.equal(f.nodes.status.getAttribute('transform'),null);assert.equal(f.nodes.version.getAttribute('display'),null);assert.equal(f.nodes.version.getAttribute('transform'),null);
 assert.equal(f.nodes.icon.getAttribute('d'),original);assert.equal(f.nodes.avatar.getAttribute('clip-path'),'url(#native-avatar)');
 assert.equal(f.nodes.logout.getAttribute('display'),'none');assert.equal(f.nodes.logoutIcon.getAttribute('display'),'none');assert.equal(f.nodes.logoutText.getAttribute('display'),'none');
});

test('dark account row paint keeps source vectors and preserves active navigation and destructive ink',()=>{
 assert.equal(typeof module.mountSourceDarkAccountReference,'function');for(const frameId of ['1450:9744','1450:9996','1456:11813']){const f=fixture(frameId),active=f.add('path',{stroke:'#3678FF'},[322,774,14,6]),other=f.add('path',{stroke:'#0F4D88'},[150,330,12,12]);module.mountSourceDarkAccountReference(f.doc,f.options);
  assert.equal(f.nodes.icon.getAttribute('stroke'),'#F8FAFF');assert.equal(f.nodes.chevron.getAttribute('stroke'),'#64748B');assert.equal(active.getAttribute('stroke'),'#3678FF');assert.equal(other.getAttribute('stroke'),'#0F4D88');assert.equal(f.nodes.logoutIcon.getAttribute('stroke'),'#E84552');
 }
});

test('fingerprint and success backgrounds follow their screenshot spacing while modal artwork stays native',()=>{
 assert.equal(typeof module.mountSourceDarkAccountReference,'function');for(const [id,avatarY,iconY,toggleY]of [['1450:9996',170,329,526.5],['1456:11813',125,285,482.5]]){const f=fixture(id);module.mountSourceDarkAccountReference(f.doc,f.options);close(mappedBox(f.nodes.avatar),[37.5,avatarY,69,69]);close(mappedBox(f.nodes.icon),[36,iconY,3.5,3.5]);close(mappedBox(f.nodes.toggle),[313.5,toggleY,49,25]);assert.equal(f.nodes.foreground.getAttribute('transform'),null);assert.equal(f.nodes.dim.getAttribute('transform'),null);assert.equal(f.nodes.title.getAttribute('transform'),null);assert.equal(f.svg.children.filter(n=>n===f.nodes.title).length,1);}
});

test('row filters travel with their original SVG groups and modal glyphs never inherit a background row transform',()=>{
 const f=fixture(),row=f.add('g',{filter:'url(#native-row-shadow)'},[16,268,358,42]);f.nodes.icon.remove();row.append(f.nodes.icon);module.mountSourceDarkAccountReference(f.doc,f.options);
 close(mappedBox(row),[16,290,358,42]);assert.equal(f.nodes.icon.getAttribute('transform'),null,'retaining the row filter group prevents its old viewport from cutting off translated ink');
 const dialog=fixture('1450:9996'),title=dialog.add('path',{fill:'#F8FAFF'},[121,589,150,20]);module.mountSourceDarkAccountReference(dialog.doc,dialog.options);assert.equal(title.getAttribute('transform'),null,'foreground title overlaps an old background row geometrically but belongs to the sheet');
});

test('success prompt content follows the reference 30px lower within the original sheet',()=>{
 const f=fixture('1456:11813'),circle=f.add('rect',{x:'1113',y:'4883',width:'80',height:'80',rx:'40',fill:'#E3F7EB'},[155,592,80,80]),title=f.add('path',{fill:'#F8FAFF'},[104,690,182,20]);module.mountSourceDarkAccountReference(f.doc,f.options);
 close(mappedBox(circle),[155,622,80,80]);close(mappedBox(title),[104,720,182,20]);assert.equal(f.nodes.foreground.getAttribute('transform'),null);assert.equal(f.nodes.dim.getAttribute('transform'),null);
 assert.deepEqual(module.darkAccountReferenceLayout['1456:11813'].find(region=>region.box[1]===592),{box:[20,592,350,203],targetBox:[20,622,350,203]});
});

test('data rows keep red delete account paint and remove only the fingerprint scan artifact',()=>{
 assert.equal(typeof module.mountSourceDarkAccountReference,'function');for(const frameId of ['1450:9816','1450:9840','1450:9918','1450:9878','1450:9956']){const f=fixture(frameId),cloud=f.add('path',{stroke:'#0F4D88',d:'M1482 4417H1487'},[27,120,20,15]);module.mountSourceDarkAccountReference(f.doc,f.options);assert.equal(cloud.getAttribute('stroke'),'#F8FAFF');assert.equal(f.nodes.logoutIcon.getAttribute('stroke'),'#E84552');assert.equal(cloud.getAttribute('d'),'M1482 4417H1487');}
 const f=fixture('1450:9996'),scan=f.add('rect',{width:'40',height:'2',rx:'1',fill:'#0F4D88'},[175,687,40,2]),glyph=f.add('path',{stroke:'#64748B'},[176.33,686.67,37.34,46.67]);module.mountSourceDarkAccountReference(f.doc,f.options);assert.equal(scan.getAttribute('display'),'none');assert.equal(glyph.getAttribute('display'),null);assert.equal(glyph.getAttribute('stroke'),'#64748B');
});

test('appearance restores only the native rounded card boundary and preserves selected theme paint',()=>{
 assert.equal(typeof module.mountSourceDarkAccountReference,'function');const f=fixture('1450:10174'),selected=f.add('rect',{x:'984.5',y:'4485',width:'337',height:'49',rx:'9.5',stroke:'#0F4D88'},[26.5,194,337,49]);module.mountSourceDarkAccountReference(f.doc,f.options);const border=f.svg.children.find(n=>n.getAttribute('data-dark-account-reference')==='appearance-outline');assert.ok(border);for(const [key,value]of Object.entries({x:'974.5',y:'4415',width:'357',height:'189',rx:'19.5',stroke:'#555555',fill:'none'}))assert.equal(border.getAttribute(key),value);assert.equal(selected.getAttribute('stroke'),'#0F4D88');
});

test('reference restoration is reversible, idempotent and rejects Light and Web frames',()=>{
 assert.equal(typeof module.mountSourceDarkAccountReference,'function');for(const frameId of ['1635:110138','863:1499','557:50194']){const f=fixture(frameId),before=f.svg.children.map(n=>[...n.attrs]);assert.equal(module.mountSourceDarkAccountReference(f.doc,f.options).changed,0);assert.deepEqual(f.svg.children.map(n=>[...n.attrs]),before);}
 for(const frameId of ['1450:9744','1450:10174']){const f=fixture(frameId),before=f.svg.children.map(n=>[...n.attrs]),length=f.svg.children.length,handle=module.mountSourceDarkAccountReference(f.doc,f.options);assert.ok(handle.changed);assert.equal(module.mountSourceDarkAccountReference(f.doc,f.options),handle);handle.restore();assert.equal(f.svg.children.length,length);assert.deepEqual(f.svg.children.map(n=>[...n.attrs]),before);handle.restore();assert.ok(module.mountSourceDarkAccountReference(f.doc,f.options).changed);}
 assert.deepEqual(module.darkAccountReferenceLayout['1450:9744'].find(region=>region.box[1]===473),{box:[16,473,358,44],targetBox:[16,495,358,44]});
});
