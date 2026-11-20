import {bindSourceDrawingRegions} from './source-drawing-slots.mjs';
import {appMessageArtwork} from './app-message-artwork.mjs';

const ns='http://www.w3.org/2000/svg',I={a:1,b:0,c:0,d:1,e:0,f:0};
const multiply=(a,b)=>({a:a.a*b.a+a.c*b.b,b:a.b*b.a+a.d*b.b,c:a.a*b.c+a.c*b.d,d:a.b*b.c+a.d*b.d,e:a.a*b.e+a.c*b.f+a.e,f:a.b*b.e+a.d*b.f+a.f});
const inverse=m=>{const d=m.a*m.d-m.b*m.c;return Math.abs(d)<1e-12?I:{a:m.d/d,b:-m.b/d,c:-m.c/d,d:m.a/d,e:(m.c*m.f-m.d*m.e)/d,f:(m.b*m.e-m.a*m.f)/d};};
const count=value=>Math.max(0,parseInt(value,10)||0);

/** Project sample messages with original native status artwork at its native paint order. */
export function mountAppMessageDrawing({document:doc,frame,baseURI}){
 const svg=doc.querySelector('svg'),drawing=frame.messageDrawing,art=appMessageArtwork[frame.theme||'light'];
 if(!svg||!drawing||!art)return {project(){},restore(){},entries:[]};
 const origin=svg.viewBox?.baseVal||{x:0,y:0},regions=[],entries=[];
 for(const row of drawing.history||[])for(const kind of ['icon','badge'])regions.push({id:`history:${row.rowIndex}:${kind}`,box:row[kind+'Box'],row,kind,domain:'history'});
 for(const row of drawing.oaRows||[])regions.push({id:`oa:${row.rowIndex}`,box:row.badgeBox,row,kind:'badge',domain:'detail'});
 if(drawing.progress)regions.push({...drawing.progress,id:'progress'});
 const bound=bindSourceDrawingRegions(doc,regions);
 function layer(region){
  const original=bound.bound.get(region.id)?.records[0]?.element;if(!original)return null;
  const group=doc.createElementNS(ns,'g'),m=multiply(inverse(original.parentNode.getCTM?.()||I),svg.getCTM?.()||I);
  group.setAttribute('transform',`matrix(${m.a} ${m.b} ${m.c} ${m.d} ${m.e} ${m.f})`);group.setAttribute('data-app-message-drawing',region.id);group.setAttribute('aria-hidden','true');group.setAttribute('pointer-events','none');group.setAttribute('display','none');
  original.parentNode.insertBefore(group,original);return group;
 }
 for(const region of regions.filter(r=>r.domain)){
  const group=layer(region);if(!group)continue;
  const image=doc.createElementNS(ns,'image'),[x,y,w,h]=region.box;
  for(const [key,value]of Object.entries({x:x+origin.x,y:y+origin.y,width:w,height:h,preserveAspectRatio:'none'}))image.setAttribute(key,value);
  group.append(image);entries.push({...region,group,image});
 }
 let progress;
 if(drawing.progress){
  const group=layer({id:'progress'});if(group){
   const [x,y,width,height]=drawing.progress.box,clip=doc.createElementNS(ns,'clipPath'),shape=doc.createElementNS(ns,'rect'),id='app-message-progress-'+frame.id.replaceAll(':','-');clip.setAttribute('id',id);
   for(const [key,value]of Object.entries({x:x+origin.x,y:y+origin.y,width,height,rx:art.segments.success.radius}))shape.setAttribute(key,value);clip.append(shape);group.append(clip);
   const segments=['success','failed','pending'].map(state=>{const rect=doc.createElementNS(ns,'rect');rect.setAttribute('fill',art.segments[state].fill);rect.setAttribute('height',height);rect.setAttribute('y',y+origin.y);rect.setAttribute('clip-path','url(#'+id+')');group.append(rect);return rect;});
   progress={group,segments,box:drawing.progress.box};
  }
 }
 function project(session){
  const values=session.values;
  for(const entry of entries){
   const active=values[`app.${entry.domain}.projected`]===true,prefix=entry.domain==='history'?`app.history.${entry.row.rowIndex}`:`app.detail.oa.${entry.row.rowIndex}`,visible=values[prefix+'.visible']!==false,state=values[prefix+'.state'],asset=entry.domain==='history'?art.history[state]?.[entry.kind]:art.oa[state],changed=active&&Boolean(asset);
   // A hidden row must also hide its newly inserted artwork. The outer drawing
   // binder only owns the primitives that existed when the frame was mounted.
   entry.group.setAttribute('display',changed&&visible?'inline':'none');
   bound.setVisible(entry.id,!active||visible&&!asset);
   if(changed)entry.image.setAttribute('href',new URL(asset.file,baseURI).href);
  }
  if(progress){
   const active=values['app.detail.projected']===true;progress.group.setAttribute('display',active?'inline':'none');bound.setVisible('progress',!active);
   if(active){const counts=['successCount','failedCount','pendingCount'].map(key=>count(values['app.detail.'+key])),total=counts.reduce((a,b)=>a+b,0);let x=progress.box[0]+origin.x;
    progress.segments.forEach((segment,i)=>{const width=total?progress.box[2]*counts[i]/total:0;segment.setAttribute('x',x);segment.setAttribute('width',width);x+=width;});}
  }
 }
 function restore(){for(const entry of entries)entry.group.remove();progress?.group.remove();bound.restore();}
 return {project,restore,entries,progress};
}
