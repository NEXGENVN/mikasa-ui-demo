import {boxFromSvgElement,bindSourceTextSlots} from './source-text-slots.mjs';
import {sourceGlyphLibrary} from './source-glyph-library.mjs';
import {mountSourceMinuteWheel} from './source-hour-wheel.mjs';
const mounted=new WeakMap(),stepFrames=new Set(['1430:86270','1430:86331','1442:90757','1442:90887','1442:91017','1442:91147','1432:10566','1432:10696','1432:10827','1430:88032','1430:88099','1430:88175','1430:87964','1430:87483']),editFrames=new Set(['1444:94357','1444:94627']);
const sendFrames=new Set(['1430:86270','1430:86331','1442:90757','1442:90887','1442:91017','1442:91147','1432:10566','1432:10696','1432:10827']);
const contains=(outer,box)=>box[0]>=outer[0]-.1&&box[1]>=outer[1]-.1&&box[0]+box[2]<=outer[0]+outer[2]+.1&&box[1]+box[3]<=outer[1]+outer[3]+.1;
const editLabels=[
 {id:'edit-schedule-title',text:'Hẹn giờ gửi',value:'Đổi lịch gửi',box:[20,232,260,30],font:{fontKey:'Roboto|Bold|700',family:'Roboto',style:'Bold',size:20,weight:700,baseline:18.3359375}},
 {id:'edit-schedule-date',text:'Ngày gửi ',value:'Ngày gửi mới',box:[20,316,350,20],font:{fontKey:'Roboto|Bold|700',family:'Roboto',style:'Bold',size:14,weight:700,baseline:14.78515625}},
 {id:'edit-schedule-time',text:'Giờ gửi ',value:'Giờ gửi mới',box:[20,519,350,20],font:{fontKey:'Roboto|Bold|700',family:'Roboto',style:'Bold',size:14,weight:700,baseline:14.78515625}}
];
const editMinuteSample={field:'app.schedule.minute',box:[224,564,126,200],selectedIndex:0,slots:[
 {id:'edit-minute-active',text:'00',box:[224,644,126,40],font:{fontKey:'Roboto|Medium|500',family:'Roboto',style:'Medium',size:20,weight:500,baseline:26.8359375,align:'CENTER'}},
 {id:'edit-minute-muted',text:'30',box:[224,684,126,40],font:{fontKey:'Roboto|Regular|400',family:'Roboto',style:'Regular',size:18,weight:400,baseline:26.15234375,align:'CENTER'}}
]};
/** Screenshot ZIP overrides for the Dark progress component and edit-schedule sheet. */
export function mountSourceDarkFlowReference(document,{frameId,measure=boxFromSvgElement}={}){
 const empty=()=>({changed:0,issues:[],restore(){}});if(!stepFrames.has(frameId)&&!editFrames.has(frameId))return empty();
 const svg=document?.querySelector('svg');if(!svg)return empty();if(mounted.has(svg))return mounted.get(svg);
 const [ox=0,oy=0]=(svg.getAttribute('viewBox')||'').trim().split(/[\s,]+/).map(Number),changes=[],issues=[];let hasMinuteSource=false;
 for(const node of svg.querySelectorAll('path,circle,rect,line')){
  if(node.closest('defs,clipPath,mask,pattern,filter'))continue;let box;try{const b=measure(node,svg);box=[b[0]-ox,b[1]-oy,b[2],b[3]];}catch{continue;}
  if(frameId==='1444:94627'&&node.localName==='path'&&contains([224,644,126,80],box)&&['#0F4D88','#195CFA','#64748B'].includes(node.getAttribute('fill')))hasMinuteSource=true;
  if(sendFrames.has(frameId)&&contains([258,416,30,30],box))for(const key of ['fill','stroke'])if(node.getAttribute(key)==='#121212'){changes.push([node,key,'#121212']);node.setAttribute(key,'#F8FAFF');}
  for(const key of ['fill','stroke']){const original=node.getAttribute(key),value=stepFrames.has(frameId)&&contains([16,99,358,62],box)&&['#0F4D88','#14538E'].includes(original)?'#F34B26':sendFrames.has(frameId)&&contains([40,349,28,44],box)&&['#0F4D88','#195CFA'].includes(original)?'#F8FAFF':frameId==='1444:94627'&&key==='fill'&&original==='#121212'&&contains([57.5,33,307,20],box)?'#F59E0B':null;if(value){changes.push([node,key,original]);node.setAttribute(key,value);}}
 }
 const binder=editFrames.has(frameId)?bindSourceTextSlots(document,editLabels,{library:sourceGlyphLibrary}):null;
 if(binder)for(const slot of editLabels){const result=binder.setTextSlot(slot,slot.value);if(!result.ok)issues.push({slotId:slot.id,...result});}
 const minuteSample=hasMinuteSource?mountSourceMinuteWheel({document,wheel:editMinuteSample,library:sourceGlyphLibrary,onIssue:issue=>issues.push(issue)}):null;
 if(minuteSample){minuteSample.group.setAttribute('data-source-minute-sample','true');minuteSample.project(30);}
 const handle={changed:changes.length+(binder?.ready.size||0)+(minuteSample?2:0),issues,restore(){minuteSample?.restore();binder?.restore();for(const [node,key,value]of changes)node.setAttribute(key,value);mounted.delete(svg);}};mounted.set(svg,handle);return handle;
}
