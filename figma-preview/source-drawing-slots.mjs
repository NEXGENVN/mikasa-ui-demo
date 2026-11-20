import {boxFromSvgElement} from './source-text-slots.mjs';
const contains=(outer,inner,t=.8)=>inner[0]>=outer[0]-t&&inner[1]>=outer[1]-t&&inner[0]+inner[2]<=outer[0]+outer[2]+t&&inner[1]+inner[3]<=outer[1]+outer[3]+t;
const pointIn=(box,x,y)=>x>=box[0]&&x<=box[0]+box[2]&&y>=box[1]&&y<=box[1]+box[3];

/** Source regions are exact component rectangles, never inferred text masks. */
export function bindSourceDrawingRegions(document,regions=[]){
 const svg=document.querySelector('svg'),origin=[svg?.viewBox?.baseVal?.x||0,svg?.viewBox?.baseVal?.y||0],records=[],bound=new Map(),patternOriginals=new Map();
 if(!svg)return {setVisible(){},setMapZoom(){},restore(){}};
 for(const element of svg.querySelectorAll('g,path,rect,circle,ellipse,polygon,polyline,line,image')){
  if(element.closest('defs,clipPath,mask,pattern,filter'))continue;
  try{const b=boxFromSvgElement(element,svg);if(b[2]>=0&&b[3]>=0&&(b[2]>0||b[3]>0))records.push({element,box:[b[0]-origin[0],b[1]-origin[1],b[2],b[3]],opacity:element.getAttribute('opacity'),transform:element.getAttribute('transform')});}catch{}
 }
 for(const region of regions){
  if(!region.box)continue;
  const candidates=records.filter(record=>contains(region.box,record.box));
  const selected=candidates.filter(record=>!candidates.some(parent=>parent!==record&&parent.element.contains(record.element)));
  bound.set(region.id,{...region,records:selected,allRecords:candidates});
 }
 const opacity=(record,visible)=>{if(!visible)record.element.setAttribute('opacity','0');else if(record.opacity==null)record.element.removeAttribute('opacity');else record.element.setAttribute('opacity',record.opacity);};
 function setVisible(id,visible){const region=bound.get(id);if(region)for(const record of region.records)opacity(record,visible);}
 function setMapZoom(id,value){
  const region=bound.get(id);if(!region)return;const zoom=Math.max(1,Math.min(1.6,Number(value)||1));
  for(const record of region.allRecords){
   const element=record.element,fill=element.getAttribute('fill')||'',patternId=/url\(\s*#([^\s)]+)\)/.exec(fill)?.[1];
   if(patternId){
    const pattern=document.getElementById(patternId);if(pattern?.localName!=='pattern')continue;
    for(const image of pattern.querySelectorAll('image,use')){
     if(!patternOriginals.has(image))patternOriginals.set(image,image.getAttribute('transform'));
     const original=patternOriginals.get(image)||'',objectUnits=pattern.getAttribute('patternContentUnits')==='objectBoundingBox',cx=objectUnits?.5:region.box[0]+origin[0]+region.box[2]/2,cy=objectUnits?.5:region.box[1]+origin[1]+region.box[3]/2;
     image.setAttribute('transform',zoom===1?original:`translate(${cx} ${cy}) scale(${zoom}) translate(${-cx} ${-cy}) ${original}`);
    }
   }else if(element.localName==='image'){
    const [x,y,w,h]=region.box,cx=x+origin[0]+w/2,cy=y+origin[1]+h/2;
    element.setAttribute('transform',zoom===1?record.transform||'':`translate(${cx} ${cy}) scale(${zoom}) translate(${-cx} ${-cy}) ${record.transform||''}`);
   }
  }
 }
 function restore(){for(const region of bound.values())for(const record of region.records)opacity(record,true);for(const [element,transform]of patternOriginals){if(transform==null)element.removeAttribute('transform');else element.setAttribute('transform',transform);}}
 return {setVisible,setMapZoom,restore,bound,containsControl(region,control){const [x,y,w,h]=control.box;return pointIn(region.box,x+w/2,y+h/2);}};
}
