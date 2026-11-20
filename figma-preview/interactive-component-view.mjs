const inside=(box,region)=>box&&region&&box[0]>=region[0]-.1&&box[1]>=region[1]-.1&&box[0]+box[2]<=region[0]+region[2]+.1&&box[1]+box[3]<=region[1]+region[3]+.1;
const memberKey=control=>control.field?'field:'+control.field:control.action||control.id;
export function componentValue(component,session){const value=session.dirty.has(component.field)?session.values[component.field]:component.initialValue;return String(value??component.initialValue??'1');}
export function composeSourceComponents(frame,session,{popups={},extraArtwork=[]}={}){
 let controls=(frame.controls||[]).map(control=>({...control}));
 const components=frame.componentStates||[];
 for(const component of components){
  const value=componentValue(component,session),state=component.states[value]||component.states[String(component.initialValue)]||Object.values(component.states)[0];
  if(!state)continue;
  const union=new Map();for(const entry of Object.values(component.states))for(const control of entry.controls||[])if(!union.has(memberKey(control)))union.set(memberKey(control),control);
  const current=new Map((state.controls||[]).map(control=>[memberKey(control),control]));
  const replaced=control=>control.componentStateId===component.id||(control.field===component.field||/^app\.oa\./.test(control.action||''))&&inside(control.box,component.box);
  let position=controls.findIndex(replaced);if(position<0)position=controls.length;
  controls=controls.filter(control=>!replaced(control));
  const members=[...union].map(([key,fallback])=>{const control=current.get(key)||fallback,b=control.box;return {...control,id:component.id+';'+key,box:[component.box[0]+b[0],component.box[1]+b[1],b[2],b[3]],componentStateId:component.id,componentMemberKey:key,hidden:!current.has(key),...(control.field===component.field?{value,textSlots:[]}:{})};}).sort((a,b)=>a.box[1]-b.box[1]||a.box[0]-b.box[0]);
  controls.splice(Math.min(position,controls.length),0,...members);
 }
 controls=controls.map(control=>{
  const popup=control.popup||popups[control.id];if(!popup||control.type!=='select')return control;
  const options=[...(popup.options||[])].map(option=>({...option}));
  if(control.value!=null&&!options.some(option=>String(option.value)===String(control.value)))options.unshift({label:control.options?.find(option=>String(option.value)===String(control.value))?.label||String(control.value),value:control.value});
  return {...control,popup,options};
 });
 return {...frame,controls,texts:(frame.texts||[]).filter(slot=>!components.some(component=>component.field===slot.field)),extraArtwork:frame.extraArtwork||extraArtwork};
}
