import {bindSourceTextSlots} from './source-text-slots.mjs';
import {generateGlyphPaths} from './source-glyphs.mjs';

const NS='http://www.w3.org/2000/svg',I={a:1,b:0,c:0,d:1,e:0,f:0};
const mul=(a,b)=>({a:a.a*b.a+a.c*b.b,b:a.b*b.a+a.d*b.b,c:a.a*b.c+a.c*b.d,d:a.b*b.c+a.d*b.d,e:a.a*b.e+a.c*b.f+a.e,f:a.b*b.e+a.d*b.f+a.f});
const inv=m=>{const z=m.a*m.d-m.b*m.c;return{a:m.d/z,b:-m.b/z,c:-m.c/z,d:m.a/z,e:(m.c*m.f-m.d*m.e)/z,f:(m.b*m.e-m.a*m.f)/z};};

/** The exported wheel can stop at 23 and contain only three visible glyphs.
 * Own its live numbers independently of that static, already-scrolled list.
 */
export function mountSourceHourWheel({document,wheel,library,onIssue=()=>{}}){
 const svg=document.querySelector('svg'),binder=bindSourceTextSlots(document,wheel.slots,{library}),records=[...binder.ready.values()],origin=[svg.viewBox?.baseVal?.x||0,svg.viewBox?.baseVal?.y||0],pitch=wheel.box[3]/5;
 const rows=Array.from({length:5},(_,i)=>({box:[wheel.box[0],wheel.box[1]+i*pitch,wheel.box[2],pitch]})),distance=(record,y)=>Math.abs(record.slot.box[1]+(record.offset?.[1]||0)+record.slot.box[3]/2-y);
 const center=wheel.box[1]+wheel.box[3]/2,active=records.toSorted((a,b)=>distance(a,center)-distance(b,center))[0],muted=records.filter(r=>r!==active),group=document.createElementNS(NS,'g');
 if(binder.unresolved.length)onIssue({status:'hour-wheel-source-unresolved',slots:binder.unresolved});
 let parent=active?.paths[0]?.element.parentNode;
 while(parent&&parent!==svg){const ref=/url\(#([^\s)]+)\)/.exec(parent.getAttribute('clip-path')||''),rect=ref&&document.getElementById(ref[1])?.querySelector('rect');if(Number(rect?.getAttribute('width'))===wheel.box[2]&&Number(rect?.getAttribute('height'))===wheel.box[3])break;parent=parent.parentNode;}
 parent=parent||svg;
 const local=mul(inv(mul(inv(svg.getCTM()||I),parent.getCTM()||I)),{...I,e:origin[0],f:origin[1]});group.setAttribute('transform',`matrix(${local.a} ${local.b} ${local.c} ${local.d} ${local.e} ${local.f})`);group.setAttribute('pointer-events','none');group.setAttribute('aria-hidden','true');group.setAttribute('data-source-hour-wheel','true');
 const band=[...parent.children].find(n=>/mix-blend-mode\s*:\s*color-burn/.test(n.getAttribute('style')||''));parent.insertBefore(group,band||null);
 const paths=rows.map((row,i)=>{const path=document.createElementNS(NS,'path');path.setAttribute('data-source-hour-row',i);group.append(path);return path;});
 function project(value){
  for(const slot of wheel.slots)binder.hideOriginal(slot);
  rows.forEach((row,i)=>{
   const number=Number(value)+i-2,path=paths[i];path.setAttribute('display',number<7||number>23?'none':'inline');
   if(number<7||number>23){path.removeAttribute('data-source-value');return;}
   const middle=row.box[1]+pitch/2,record=i===2?active:(muted.length?muted:records).toSorted((a,b)=>distance(a,middle)-distance(b,middle))[0],font=record?.slot.font||wheel.slots[0]?.font||{},text=String(number).padStart(2,'0');
   const generated=generateGlyphPaths(library,{...font,value:text,x:row.box[0],baseline:row.box[1]+(font.baseline??font.size??18),width:row.box[2],height:row.box[3]});
   path.setAttribute('d',generated.d);path.setAttribute('fill',record?.paint||(i===2?'#0F4D88':'#B0BAC9'));path.setAttribute('data-source-value',text);
   if(generated.missingGlyphs.length)onIssue({status:'hour-wheel-missing-glyphs',missingGlyphs:generated.missingGlyphs});
  });
 }
 return {rows,selectedIndex:2,project,restore(){group.remove();binder.restore();}};
}
