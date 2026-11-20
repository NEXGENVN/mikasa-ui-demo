const own=(value,key)=>Object.prototype.hasOwnProperty.call(value,key);
const safeField=field=>typeof field==='string'&&field.length>0&&field.length<=256&&!field.split('.').some(part=>['__proto__','constructor','prototype'].includes(part));
export function createInteractiveSession(data){return {data,values:Object.create(null),dirty:new Set(),context:Object.create(null),history:[],currentFrameId:null};}
export function seedInteractiveValues(session,frame){
 for(const control of frame.controls||[]){
  if(!control.field||!safeField(control.field)||session.dirty.has(control.field))continue;
  if(control.type==='radio'){if(control.checked===true)session.values[control.field]=control.value;continue;}
  if(control.value!==undefined)session.values[control.field]=control.value;
  else if(!own(session.values,control.field))session.values[control.field]=control.type==='checkbox'||control.type==='radio'?false:'';
 }
 return session;
}
export function setInteractiveValue(session,field,value){
 if(!safeField(field))throw new Error('Invalid interactive field');
 if(value!==null&&!['string','number','boolean'].includes(typeof value))throw new Error('Invalid interactive field value');
 session.values[field]=value;session.dirty.add(field);return value;
}
export function navigateInteractiveSession(session,targetId,{catalogue,back=false,replace=false}={}){
 const current=catalogue.get(session.currentFrameId);
 if(back){targetId=session.history.at(-1);if(!targetId)return null;}
 const destination=catalogue.get(targetId);
 if(!destination||(current&&current.platform!==destination.platform))return null;
 if(back)session.history.pop();
 else if(session.currentFrameId&&session.currentFrameId!==targetId&&!replace)session.history.push(session.currentFrameId);
 session.currentFrameId=targetId;return targetId;
}
export function interactiveDisplayValue(control,value,{revealed=false}={}){const text=String(value??'');return control.inputType==='password'&&!revealed?(control.maskCharacter||'•').repeat([...text].length):text;}
