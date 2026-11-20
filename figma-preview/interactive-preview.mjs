import {sourceFieldFont} from './source-field-appearance.mjs';
import {escapeHtml as e} from './core.mjs';
import {renderNativeFrame} from './native-preview.mjs';
import {componentValue} from './interactive-component-view.mjs';

const own=(object,key)=>Object.prototype.hasOwnProperty.call(object,key);
export const sourceColor=value=>typeof value==='string'?value:value&&typeof value==='object'?'rgba('+[value.r,value.g,value.b].map(x=>Math.round((x||0)*255)).join(',')+','+(value.a??1)+')':'#121212';
const px=value=>Number.isFinite(Number(value))?Number(value):0;
export function interactiveControlPriority(control,controls){
 if(control.type!=='button')return 2;
 const [x,y,w,h]=control.box;
 if(w<=48&&h<=48&&controls.some(field=>field!==control&&field.type!=='button'&&x>=field.box[0]-.1&&y>=field.box[1]-.1&&x+w<=field.box[0]+field.box[2]+.1&&y+h<=field.box[1]+field.box[3]+.1))return 3;
 return 1;
}
function boxStyle(box){return 'left:'+box[0]+'px;top:'+box[1]+'px;width:'+box[2]+'px;height:'+box[3]+'px';}
function validateControl(frame,control){
 const b=control.box;
 if(!Array.isArray(b)||b.length!==4||!b.every(Number.isFinite)||b[0]<-0.02||b[1]<-0.02||b[2]<=0||b[3]<=0||b[0]+b[2]>frame.width+.1||b[1]+b[3]>Math.max(frame.height,frame.scrollHeight||0)+.1)throw Error('Interactive control bounds invalid: '+frame.id+' / '+control.id);
 if(!['button','input','select','checkbox','radio','file','textarea'].includes(control.type))throw Error('Invalid interactive control type');
}
function fieldStyle(control,frame){
 if(control.componentStateId)return 'left:0;top:0;width:100%;height:100%;font:500 14px/22px Roboto,sans-serif;--input-source-color:#121212;text-align:center';
 const slot=control.textSlots?.[0],b=slot?.box||[control.box[0]+12,control.box[1]+Math.max(0,(control.box[3]-20)/2),Math.max(12,control.box[2]-24),20],f=frame?.platform==='app'?sourceFieldFont(control,slot):slot?.font||control.font||{};
 const family=String(f.family||'Roboto').replace(/[^\p{L}\d -]/gu,'');
 return 'left:'+(b[0]-control.box[0])+'px;top:'+(b[1]-control.box[1])+'px;width:'+Math.max(8,Math.min(b[2],control.box[2]-(b[0]-control.box[0])))+'px;height:'+Math.max(b[3],px(f.lineHeight)||20)+'px;font-family:'+family+',sans-serif;font-size:'+(px(f.size)||14)+'px;font-weight:'+(px(f.weight)||400)+';line-height:'+(px(f.lineHeight)||b[3]||20)+'px;--input-source-color:'+sourceColor(f.color)+';text-align:'+(f.align==='CENTER'?'center':f.align==='RIGHT'?'right':'left');
}
function controlHTML(frame,control,session,index){
 validateControl(frame,control);
 const attributes=' data-interactive-control="'+e(control.id)+'" aria-label="'+e(control.label||control.action||control.id)+'"',position=boxStyle(control.box)+';z-index:'+interactiveControlPriority(control,frame.controls||[]),disabled=(control.disabled?' disabled':'')+(control.hidden?' hidden':''),value=control.field&&own(session.values,control.field)?session.values[control.field]:control.value??'',identity='interactive-'+frame.id.replace(':','-')+'-'+index;
 if(control.type==='button')return '<button type="'+(control.submit?'submit':'button')+'" class="interactive-control interactive-button"'+attributes+' style="'+position+'"'+disabled+'></button>';
 const label='<label class="sr-only" for="'+identity+'">'+e(control.label||control.field)+'</label>',name=' id="'+identity+'" name="'+e(control.field||control.id)+'"',common=attributes+name+disabled;
 if(control.type==='checkbox'||control.type==='radio'){const checked=control.type==='radio'?String(value)===String(control.value)&&own(session.values,control.field)||control.checked===true&&!own(session.values,control.field):!!value;return '<span class="interactive-control interactive-check" style="'+position+'"'+(control.hidden?' hidden':'')+'>'+label+'<input type="'+control.type+'"'+common+' value="'+e(control.value??'on')+'"'+(checked?' checked':'')+'></span>';}
 if(control.type==='file')return '<span class="interactive-control interactive-file" style="'+position+'"'+(control.hidden?' hidden':'')+'>'+label+'<input type="file"'+common+' accept="'+e(control.accept||'image/*')+'"></span>';
 const styling=' class="interactive-field-value" style="'+e(fieldStyle(control,frame))+'"';
 if(control.type==='select')return '<span class="interactive-control interactive-field" style="'+position+'"'+(control.hidden?' hidden':'')+'>'+label+'<select'+common+styling+(control.popup?' aria-haspopup="listbox" aria-expanded="false"':'')+'>'+((control.options||[]).map(option=>'<option value="'+e(option.value)+'" '+(String(option.value)===String(value)?'selected':'')+'>'+e(option.label)+'</option>').join(''))+'</select></span>';
 const max=control.maxLength?' maxlength="'+Number(control.maxLength)+'"':'',inputType=control.inputType==='password'&&session.context.visiblePasswords?.[control.field]?'text':['text','password','email','tel','search','date','time','datetime-local','number','url'].includes(control.inputType)?control.inputType:'text';
 if(control.type==='textarea'||control.multiline)return '<span class="interactive-control interactive-field" style="'+position+'"'+(control.hidden?' hidden':'')+'>'+label+'<textarea'+common+styling+max+' spellcheck="false">'+e(value)+'</textarea></span>';
 return '<span class="interactive-control interactive-field" style="'+position+'"'+(control.hidden?' hidden':'')+'>'+label+'<input'+common+styling+' type="'+inputType+'" value="'+e(value)+'"'+max+(control.readOnly?' readonly':'')+' autocomplete="'+e(control.autocomplete||(inputType==='password'?'current-password':inputType==='tel'?'tel':inputType==='email'?'email':'off'))+'" '+(control.inputMode?'inputmode="'+e(control.inputMode)+'"':'')+' autocapitalize="none" spellcheck="false"></span>';
}
export function renderInteractiveFrame(frame,session){
 const controls=frame.controls||[],graphics=(frame.componentStates||[]).map(component=>{const value=componentValue(component,session),state=component.states[value]||Object.values(component.states)[0];return '<span class="interactive-component-art" data-source-component="'+e(component.id)+'" style="'+boxStyle(component.box)+'" '+(!session.dirty.has(component.field)||value===String(component.initialValue)?'hidden':'')+'><img src="'+e(state.file)+'" width="'+state.width+'" height="'+state.height+'" alt=""></span>';}).join(''),outputs=(frame.texts||[]).map(slot=>'<output class="sr-only" data-interactive-output="'+e(slot.id)+'" aria-label="'+e(slot.label||slot.text||slot.field)+'">'+e(slot.field&&session.dirty.has(slot.field)?session.values[slot.field]:slot.text)+'</output>').join(''),overlay='<form class="interactive-overlay" data-interactive-frame="'+frame.id+'" aria-label="'+e(frame.name)+'" novalidate style="width:'+frame.width+'px;height:'+Math.max(frame.height,frame.scrollHeight||0)+'px">'+graphics+controls.map((c,i)=>controlHTML(frame,c,session,i)).join('')+outputs+'</form>';
 return renderNativeFrame(frame,{hotspots:false}).replace('class="native-preview"','class="native-preview interactive-preview"').replace('</div></section>',overlay+'</div></section>');
}
