import {appPhoneViewportData} from './app-phone-viewport-data.mjs';
const mounted=new WeakMap();
const contains=(inner,outer)=>inner[0]>=outer[0]-.1&&inner[1]>=outer[1]-.1&&inner[0]+inner[2]<=outer[0]+outer[2]+.1&&inner[1]+inner[3]<=outer[1]+outer[3]+.1;

/** Applied by the interactive App adapter only; gallery frames remain literal. */
export function withAppPhoneViewport(frame){
 const data=frame?.platform==='app'&&appPhoneViewportData[frame.id];
 return data?{...frame,height:844,scrollHeight:Math.max(data.rawHeight,Number(frame.scrollHeight)||0),appPhoneViewport:data}:frame;
}
function regionClone(svg,box,id,top){
 const clone=svg.cloneNode(true),origin=String(svg.getAttribute('viewBox')).trim().split(/[\s,]+/).map(Number),ids=new Map();
 for(const node of [clone,...clone.querySelectorAll('[id]')]){const old=node.getAttribute('id');if(old){const next=id+'-'+old;ids.set(old,next);node.setAttribute('id',next);}}
 for(const node of [clone,...clone.querySelectorAll('*')])for(const attribute of [...node.attributes]){
  let value=attribute.value.replace(/url\(\s*(['"]?)#([^)'"\s]+)\1\s*\)/g,(all,quote,key)=>ids.has(key)?'url(#'+ids.get(key)+')':all);
  if((attribute.name==='href'||attribute.name==='xlink:href')&&value.startsWith('#')&&ids.has(value.slice(1)))value='#'+ids.get(value.slice(1));
  if(value!==attribute.value)node.setAttribute(attribute.name,value);
 }
 clone.setAttribute('data-app-phone-region',id);clone.setAttribute('aria-hidden','true');clone.setAttribute('width',String(box[2]));clone.setAttribute('height',String(box[3]));clone.setAttribute('viewBox',[origin[0]+box[0],origin[1]+box[1],box[2],box[3]].join(' '));
 Object.assign(clone.style,{position:'fixed',left:box[0]+'px',top:top+'px',width:box[2]+'px',height:box[3]+'px',overflow:'hidden',zIndex:'20',pointerEvents:'auto'});return clone;
}
/** Overlay unscaled native Header/Footer crops while the original SVG scrolls. */
export function mountAppPhoneViewport({iframe,frameId}){
 const data=appPhoneViewportData[frameId],doc=iframe?.contentDocument;
 if(!data||Number(iframe?.getAttribute('height'))!==844||!doc?.body)return{regions:[],restore(){}};
 if(mounted.has(doc))return mounted.get(doc);
 const svg=doc.querySelector('svg');if(!svg)return{regions:[],restore(){}};
 const oldRadius=iframe.style?.borderRadius,corner=[...svg.querySelectorAll('rect[rx]')].find(rect=>Number(rect.getAttribute('width'))===390&&Number(rect.getAttribute('height'))===data.rawHeight);
 if(iframe.style&&corner)iframe.style.borderRadius=Number(corner.getAttribute('rx'))+'px';
 const regions=[regionClone(svg,data.header,'phone-'+frameId.replace(':','-')+'-header',data.header[1]),regionClone(svg,data.footer,'phone-'+frameId.replace(':','-')+'-footer',844-data.footer[3])];
 const oldHtml=Object.fromEntries(['overflowY','overflowX','scrollbarWidth'].map(key=>[key,doc.documentElement.style[key]])),oldBody=Object.fromEntries(['margin','position','width','minHeight'].map(key=>[key,doc.body.style[key]]));
 Object.assign(doc.documentElement.style,{overflowY:'auto',overflowX:'hidden',scrollbarWidth:'none'});Object.assign(doc.body.style,{margin:'0',position:'relative',width:'390px',minHeight:data.rawHeight+'px'});
 for(const region of regions)doc.body.appendChild(region);
 const result={regions,restore(){for(const region of regions)region.remove();Object.assign(doc.documentElement.style,oldHtml);Object.assign(doc.body.style,oldBody);if(iframe.style)iframe.style.borderRadius=oldRadius;mounted.delete(doc);}};mounted.set(doc,result);return result;
}
/** Fixed controls stay in the same form so existing event delegation survives. */
export function dockAppPhoneViewportControls({form,frame}){
 const data=frame.appPhoneViewport;if(!data||!form)return()=>{};
 const oldIsolation=form.style.isolation,changes=[];form.style.isolation='auto';
 for(const control of frame.controls||[]){
  const region=contains(control.box,data.header)?data.header:contains(control.box,data.footer)?data.footer:null;if(!region)continue;
  const element=[...form.querySelectorAll('[data-interactive-control]')].find(node=>node.getAttribute('data-interactive-control')===control.id),host=element?.closest('.interactive-control')||element;if(!host)continue;
  const keys=['position','left','top','zIndex'],before=Object.fromEntries(keys.map(key=>[key,host.style[key]]));changes.push([host,before]);
  Object.assign(host.style,{position:'fixed',left:control.box[0]+'px',top:(region===data.footer?844-data.footer[3]+control.box[1]-data.footer[1]:control.box[1])+'px',zIndex:'40'});
 }
 return()=>{form.style.isolation=oldIsolation;for(const [host,before]of changes)Object.assign(host.style,before);};
}
