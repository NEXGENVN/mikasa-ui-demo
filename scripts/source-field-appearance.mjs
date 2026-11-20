const shapeKeys=['family','style','size','weight','lineHeight','baseline','align','fontKey'];
const sameShape=(a,b)=>shapeKeys.every(key=>a?.[key]===b?.[key]);
const close=(a,b)=>Math.abs(a-b)<=.5;
const textInset=entry=>{const align=String(entry.slot.font?.align||'left').toLowerCase(),[x,,width]=entry.slot.box,[cx,,cw]=entry.control.box;return align==='center'?x+width/2-cx-cw/2:align==='right'?cx+cw-x-width:x-cx;};
const sameLayout=(a,b)=>close(a.control.box[2],b.control.box[2])&&close(a.control.box[3],b.control.box[3])&&close(a.slot.box[3],b.slot.box[3])&&close(a.slot.box[1]-a.control.box[1],b.slot.box[1]-b.control.box[1])&&close(textInset(a),textInset(b));
const entered=entry=>entry.control.type==='input'&&String(entry.control.value??'')!==''&&!entry.control.placeholder;
const rgba=color=>{if(typeof color==='object'&&color)return [color.r??0,color.g??0,color.b??0].map(v=>Math.round(v*255)).concat(color.a??1).join(',');if(/^#[\da-f]{6}$/i.test(color||''))return [1,3,5].map(i=>parseInt(color.slice(i,i+2),16)).concat(1).join(',');return color;};

/** Source evidence only: never borrow typography from another viewport or field layout. */
export function buildSourceFieldAppearances(frames,coverage){
 const evidence=new Map(coverage.frames.flatMap(frame=>frame.slots.map(slot=>[slot.id,{...slot,frameId:frame.id}])));
 const entries=frames.flatMap(frame=>(frame.controls||[]).filter(control=>['input','textarea','select'].includes(control.type)).flatMap(control=>(control.textSlots||[]).map((slot,index)=>({frame,control,slot,index,evidence:evidence.get(slot.id)}))));
 const proven=entry=>entry.evidence?.status==='matched'&&entry.evidence.sourcePaints?.length===1&&typeof entry.evidence.sourcePaints[0]==='string';
 const appearances={},records=[],summary={fields:0,slots:entries.length,actualSourcePaints:0,enteredReferences:0,currentSourceFallbacks:0,unproven:0,changedValuePaints:0,changedValueTypography:0};
 for(const entry of entries){
  const {frame,control,slot}=entry;
  let reference=entered(entry)&&proven(entry)?entry:null;
  if(!reference&&control.type==='input'){
   let candidates=entries.filter(candidate=>entered(candidate)&&proven(candidate)&&candidate.control.field===control.field&&candidate.frame.platform===frame.platform&&candidate.frame.theme===frame.theme&&candidate.index===entry.index&&sameLayout(candidate,entry));
   const master=candidates.filter(candidate=>control.sourceMasterId&&candidate.control.sourceMasterId===control.sourceMasterId);if(master.length)candidates=master;
   const shape=candidates.filter(candidate=>sameShape(candidate.slot.font,slot.font));if(shape.length)candidates=shape;
   // Conflicting source variants are insufficient evidence for a new style.
   if(candidates.length&&candidates.every(candidate=>sameShape(candidate.slot.font,candidates[0].slot.font)&&candidate.evidence.sourcePaints[0]===candidates[0].evidence.sourcePaints[0]))reference=candidates[0];
  }
  const source=reference||(proven(entry)?entry:null),color=proven(entry)?entry.evidence.sourcePaints[0]:undefined;
  if(color)summary.actualSourcePaints++;
  if(!source){summary.unproven++;records.push({frameId:frame.id,controlId:control.id,slotId:slot.id,status:entry.evidence?.status||'unresolved'});continue;}
  const valueFont={...source.slot.font,color:source.evidence.sourcePaints[0]},mode=reference?'entered-source':'current-source';
  appearances[slot.id]={...(color?{color}:{}),valueFont,reference:{frameId:source.frame.id,slotId:source.slot.id,mode}};
  summary[reference?'enteredReferences':'currentSourceFallbacks']++;
  const old=control.valueFont||slot.font;
  if(rgba(old.color)!==rgba(valueFont.color))summary.changedValuePaints++;
  if(!sameShape(old,valueFont))summary.changedValueTypography++;
  records.push({frameId:frame.id,controlId:control.id,slotId:slot.id,field:control.field,status:entry.evidence?.status||'unresolved',...appearances[slot.id]});
 }
 summary.fields=new Set(entries.map(entry=>entry.control.id)).size;
 return {appearances,records,summary};
}
